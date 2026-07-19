"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP, COMMON_NOTES } from "@/lib/products";
import { getPaymentBlockReasons } from "@/lib/diagnosisConfig";
import { loadDiagnosisRaw } from "@/lib/diagnosisStore";

// 토스페이먼츠(TossPayments) 클라이언트 키 (공개 키). 브라우저에 노출되어도 안전한 값입니다.
//  ★ 폴백 ★ 환경변수가 비어있으면(예: 배포 환경변수 미설정) 토스 '공식 문서 테스트 클라이언트 키'로 자동 대체.
//     → 실제 돈은 빠지지 않는 테스트 결제로 처리됩니다.
//     심사 통과 후 운영 클라이언트 키를 배포 환경변수(NEXT_PUBLIC_TOSS_CLIENT_KEY)에 넣으면 그 값이 우선 사용됩니다.
//     ※ 서버(confirm 라우트)의 시크릿 키와 반드시 '세트'여야 합니다. (테스트-테스트 / 운영-운영)
const TOSS_TEST_CLIENT_KEY = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

// ★ 키 방어 로직 ★
//   v2 결제창 SDK(tossPayments.payment)는 'API 개별 연동 키'(client: test_ck_ / live_ck_)만 지원합니다.
//   '결제위젯 연동 키'(client: test_gck_ / live_gck_)를 넣으면 NOT_SUPPORTED_WIDGET_KEY 에러가 납니다.
//   배포 환경변수에 위젯 키(gck)가 잘못 남아 있을 수 있으므로, 그런 경우엔 환경변수를 무시하고
//   올바른 개별 연동 테스트 키로 자동 대체합니다.
function pickIndividualClientKey(): string {
  const envKey = (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string) || "";
  // 위젯 키(_gck_)는 사용 불가 → 폴백. 개별 연동 키(_ck_)만 허용.
  const isWidgetKey = envKey.includes("_gck_");
  const isIndividualKey = envKey.includes("_ck_") && !isWidgetKey;
  if (isIndividualKey) return envKey;
  return TOSS_TEST_CLIENT_KEY;
}
const TOSS_CLIENT_KEY = pickIndividualClientKey();
// 토스페이먼츠 결제창 JS SDK URL (Version 2 · 최신 표준 SDK)
const TOSS_SDK_SRC = "https://js.tosspayments.com/v2/standard";

// 토스페이먼츠 v2 결제창 객체 타입
//  v2는 amount를 { currency, value } 객체로 받고, method를 대문자("CARD")로 씁니다.
type TossPaymentInstance = {
  requestPayment: (options: {
    method: string;
    amount: { currency: string; value: number };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
  }) => Promise<void>;
};

type TossPaymentsSDK = {
  payment: (options: { customerKey: string }) => TossPaymentInstance;
};

// TossPayments 팩토리 함수. 비회원 결제용 ANONYMOUS 상수는 이 함수에 붙어 있습니다.
type TossPaymentsFactory = ((clientKey: string) => TossPaymentsSDK) & {
  ANONYMOUS: string;
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

function makeOrderId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `mpp_${Date.now()}_${rand}`;
}

function PaymentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = (params.get("tier") as "basic" | "premier" | "pro" | null) || "basic";
  const product = TIER_MAP[tier];

  const sdkLoadedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 토스페이먼츠 결제창 SDK 로드 (한 번만)
  const loadTossSdk = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("no window"));
      if (window.TossPayments) {
        sdkLoadedRef.current = true;
        return resolve();
      }
      // 이미 script 태그가 있으면 로드 완료를 기다림
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TOSS_SDK_SRC}"]`
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("sdk load error")));
        if (window.TossPayments) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = TOSS_SDK_SRC;
      script.async = true;
      script.onload = () => {
        sdkLoadedRef.current = true;
        resolve();
      };
      script.onerror = () => reject(new Error("sdk load error"));
      document.head.appendChild(script);
    });
  }, []);

  // 로그인 확인 + 결제 SDK 준비
  useEffect(() => {
    let mounted = true;

    // ── 이중 안전장치: 신청 불가 상태(파산·회생 진행중/세금체납/자본잠식)면 결제 차단 ──
    //  matching-preview에서 이미 막지만, URL 직접 접근 등을 대비해 결제 페이지에서도 재확인.
    try {
      const raw = loadDiagnosisRaw();
      const profile = raw ? JSON.parse(raw) : {};
      if (getPaymentBlockReasons(profile).length > 0) {
        router.replace("/matching-preview");
        return;
      }
    } catch {}

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/signup?tier=${tier}`);
        return;
      }
      const user = data.session.user;
      if (mounted) {
        setEmail(user.email || "");
        setUserName((user.user_metadata?.name as string) || "");
      }

      try {
        await loadTossSdk();
        if (!mounted) return;
        setReady(true);
      } catch {
        setNotice("결제 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const handlePay = async () => {
    if (!agree) {
      setNotice("결제 진행을 위해 안내 사항에 동의해 주세요.");
      return;
    }
    if (!window.TossPayments) {
      setNotice("결제 모듈이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setPaying(true);
    const orderId = makeOrderId();

    // 결제 정보를 sessionStorage에 임시 저장 (success 페이지에서 tier 확인용)
    try {
      sessionStorage.setItem(
        "mpp_pending_payment",
        JSON.stringify({ orderId, tier, amount: product.price, email })
      );
    } catch {}

    const origin = window.location.origin;
    try {
      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
      // v2: 결제창 인스턴스 생성 (비회원 결제 → ANONYMOUS)
      //  ★ 주의 ★ ANONYMOUS 상수는 인스턴스가 아니라 TossPayments 함수 자체에 있습니다.
      //     (tossPayments.ANONYMOUS 는 undefined → customerKey 누락 오류 발생)
      const payment = tossPayments.payment({
        customerKey: window.TossPayments!.ANONYMOUS,
      });

      // v2는 옵션에 undefined 값이 들어가면 검증에서 걸릴 수 있어
      //  실제 값이 있는 필드만 담아서 전달합니다.
      const payOptions: {
        method: string;
        amount: { currency: string; value: number };
        orderId: string;
        orderName: string;
        successUrl: string;
        failUrl: string;
        customerName?: string;
        customerEmail?: string;
      } = {
        method: "CARD",
        amount: { currency: "KRW", value: product.price },
        orderId,
        orderName: `모두의사업친구 ${product.name} 플랜`,
        // 결제 성공 시 successUrl(/payment/success)로 리다이렉트되며
        //  paymentKey·orderId·amount 쿼리가 붙어 옵니다.
        //  → success 페이지의 '토스 경로'가 /api/payment/confirm 을 호출해 승인 확정합니다.
        successUrl: `${origin}/payment/success`,
        // 실패 시엔 별도 쿼리(payFail=1)로 구분해 성공 페이지가 실패 안내를 띄웁니다.
        failUrl: `${origin}/payment/success?payFail=1`,
      };
      if (userName) payOptions.customerName = userName;
      if (email) payOptions.customerEmail = email;

      await payment.requestPayment(payOptions);
    } catch (err) {
      // 사용자가 결제창을 닫거나(취소) 오류가 난 경우
      setPaying(false);
      const e = err as { code?: string; message?: string };
      // 사용자가 스스로 창을 닫은 경우(USER_CANCEL)는 조용히 넘어갑니다.
      if (e?.code === "USER_CANCEL") {
        setNotice(null);
        return;
      }
      const msg =
        (e?.message ? `${e.message}${e.code ? ` (${e.code})` : ""}` : null) ||
        "결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.";
      setNotice(msg);
    }
  };

  return (
    <PageShell pageKey="payment">
      <Header />
      <main className="mx-auto min-h-[70vh] w-full max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <Editable id="payment-title" as="h1" className="text-2xl font-extrabold text-brand-dark">
            결제하기
          </Editable>
          <Editable id="payment-desc" as="p" className="mt-2 text-sm text-brand-gray">
            안전한 결제를 위해 토스페이먼츠를 사용합니다.
          </Editable>
        </div>

        {/* 주문 요약 */}
        <section
          id="payment-summary"
          className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-keep text-base font-extrabold leading-snug text-brand-dark">
                {product.icon} {product.name} 플랜
              </p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
                {product.subtitle} · {product.period}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-xl font-extrabold text-brand-dark">
                {product.priceLabel}
              </p>
              <p className="mt-0.5 text-xs text-brand-gray">(VAT 포함)</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-dark">
                <span className="text-brand-green">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 안내 문구 */}
        <ul className="mb-5 space-y-1 rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed text-brand-gray">
          {COMMON_NOTES.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>

        {/* 결제 수단 안내 (토스페이먼츠 결제창은 버튼 클릭 시 결제창으로 이동합니다) */}
        <div className="mb-1 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-bold text-brand-dark">💳 신용/체크카드 결제</p>
          <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-gray">
            아래 버튼을 누르면 <strong>토스페이먼츠(TossPayments)</strong> 결제창이 열립니다. 카드사 정식 인증 절차를 거쳐 안전하게 결제됩니다.
          </p>
        </div>

        {/* 동의 체크 */}
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-red"
          />
          <span className="break-keep leading-relaxed">
            1회성 결제(자동결제 없음)이며, 본 서비스는 정부지원사업을 안내·추천하는
            매칭 서비스로{" "}
            <strong>정부지원사업 승인을 보장하지 않음</strong>을 확인했습니다.
          </span>
        </label>

        {notice && (
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-brand-dark">
            {notice}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={!ready || paying}
          className={`mt-5 w-full rounded-xl py-4 text-base font-extrabold text-white shadow-md transition disabled:cursor-not-allowed ${
            agree
              ? "bg-brand-red shadow-brand-red/30 hover:opacity-90 disabled:opacity-60"
              : "bg-gray-300 shadow-none"
          }`}
        >
          {paying ? "결제창을 여는 중..." : `${product.priceLabel} 결제하기`}
        </button>

        <p className="mt-4 text-center text-xs text-brand-gray">
          결제에 문제가 있나요?{" "}
          <Link href="/pricing" className="underline">플랜 다시 선택하기</Link>
        </p>

        {/* 결제 화면 필수 고지 링크 (약관·개인정보·환불/청약철회) */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] text-brand-gray">
          <Link href="/terms" className="underline hover:text-brand-dark">이용약관</Link>
          <span className="text-gray-300">·</span>
          <Link href="/privacy" className="underline hover:text-brand-dark">개인정보처리방침</Link>
          <span className="text-gray-300">·</span>
          <Link href="/refund" className="underline hover:text-brand-dark">환불·청약철회 규정</Link>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-brand-gray">불러오는 중...</div>}>
      <PaymentInner />
    </Suspense>
  );
}
