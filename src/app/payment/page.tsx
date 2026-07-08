"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP, COMMON_NOTES } from "@/lib/products";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string;

function makeOrderId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `mpp_${Date.now()}_${rand}`;
}

function PaymentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = (params.get("tier") as "basic" | "premier" | "pro" | null) || "basic";
  const product = TIER_MAP[tier];

  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 로그인 확인 + 위젯 렌더
  useEffect(() => {
    let mounted = true;

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
        const customerKey = user.id || "ANONYMOUS";
        const widget = await loadPaymentWidget(CLIENT_KEY, customerKey);
        if (!mounted) return;
        widget.renderPaymentMethods("#payment-widget", { value: product.price });
        widget.renderAgreement("#agreement");
        widgetRef.current = widget;
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
    const widget = widgetRef.current;
    if (!widget) return;

    setPaying(true);
    const orderId = makeOrderId();

    // 결제 정보를 sessionStorage에 임시 저장 (success 페이지에서 확인용)
    try {
      sessionStorage.setItem(
        "mpp_pending_payment",
        JSON.stringify({ orderId, tier, amount: product.price, email })
      );
    } catch {}

    const origin = window.location.origin;
    try {
      await widget.requestPayment({
        orderId,
        orderName: `모두의공공조달 ${product.name} 플랜`,
        customerName: userName || "고객",
        customerEmail: email || undefined,
        successUrl: `${origin}/payment/success`,
        failUrl: `${origin}/payment?tier=${tier}&fail=1`,
      });
    } catch {
      setPaying(false);
      setNotice("결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  // ⚠️ [데모 전용] 실제 결제 없이 "결제 완료" 처리 후 대시보드로 이동.
  // 실결제 키(live) 연동 후에는 반드시 이 함수와 아래 버튼을 삭제하세요.
  const handleDemoPay = async () => {
    setPaying(true);
    const orderId = makeOrderId();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        await supabase.from("payments").insert({
          user_id: user.id,
          order_id: orderId,
          tier,
          amount: product.price,
          status: "demo", // 데모 결제 표시(실결제와 구분)
          payment_key: "DEMO",
          email: user.email,
          paid_at: new Date().toISOString(),
        });
      }
    } catch {
      // 저장 실패해도 데모 흐름은 계속 진행
    }
    router.replace("/dashboard");
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold text-brand-dark">
                {product.icon} {product.name} 플랜
              </p>
              <p className="mt-0.5 text-xs text-brand-gray">
                {product.subtitle} · {product.period}
              </p>
            </div>
            <p className="text-2xl font-extrabold text-brand-dark">{product.priceLabel}</p>
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

        {/* Toss 위젯 */}
        <div id="payment-widget" className="min-h-[120px]" />
        <div id="agreement" />

        {/* 동의 체크 */}
        <label className="mt-4 flex items-start gap-2 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="break-keep leading-relaxed">
            1회 결제(자동결제 없음)이며, 본 서비스는 신청 가능 상품 안내 및 자문
            서비스로{" "}
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
          className="mt-5 w-full rounded-xl bg-brand-dark py-3.5 text-base font-extrabold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {paying ? "결제창을 여는 중..." : `${product.priceLabel} 결제하기`}
        </button>

        {/* ⚠️ [데모 전용 버튼] 실결제 키 연동 후 반드시 삭제 */}
        <div className="mt-4 rounded-xl border border-dashed border-brand-orange bg-brand-yellow/10 p-3">
          <p className="mb-2 text-center text-[11px] font-semibold text-brand-orange">
            🧪 데모 모드 · 실제 결제 없이 화면 흐름을 확인합니다 (배포 시 제거)
          </p>
          <button
            onClick={handleDemoPay}
            disabled={paying}
            className="w-full rounded-xl border-2 border-brand-dark bg-white py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-dark hover:text-white disabled:opacity-60"
          >
            결제했다고 가정하고 다음으로 넘어가기 →
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-brand-gray">
          결제에 문제가 있나요?{" "}
          <Link href="/pricing" className="underline">플랜 다시 선택하기</Link>
        </p>
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
