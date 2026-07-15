"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
import { TIER_MAP } from "@/lib/products";

type Status = "processing" | "success" | "fail";

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  // ── 토스페이먼츠 결제 결과 파라미터 ──
  const paymentKey = params.get("paymentKey");
  const orderIdParam = params.get("orderId");
  const amountParam = params.get("amount");
  // 결제 실패(failUrl) 시 붙는 표시 + 토스가 함께 넘겨주는 에러 코드/메시지
  const payFail = params.get("payFail") === "1";
  const failCode = params.get("code");
  const failMessage = params.get("message");

  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState<string>("결제를 확인하고 있습니다...");
  const [tierId, setTierId] = useState<string>("basic");

  // 결제 성공 확정 후 공통 저장 처리 (Supabase insert + localStorage + 마이페이지 이동)
  const finishSuccess = async (opts: {
    orderId: string;
    amount: number;
    paymentKey: string;
    tier: string;
  }) => {
    // Supabase 결제 내역 저장 (인증된 사용자 세션 기준 → RLS 통과)
    //  ★ 중요 ★ 결제는 이미 승인됐는데 이 저장이 실패하면
    //    "돈은 냈는데 열람권이 안 생기는" 최악의 상황이 됩니다.
    //    → 일시적 네트워크 오류에 대비해 최대 3회까지 재시도합니다.
    //    order_id 에 unique 제약이 있어 중복 저장은 자동 방지됩니다.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      // ★ 관리자(운영자) 계정 결제는 DB에 기록하지 않음 (대표님 요청 — 매출/통계에 안 섞이게) ★
      //   단, 결과 열람은 되도록 localStorage 표시는 그대로 진행됩니다.
      if (user && !isAdminEmail(user.email)) {
        const row = {
          user_id: user.id,
          order_id: opts.orderId,
          tier: opts.tier,
          amount: opts.amount,
          status: "paid",
          payment_key: opts.paymentKey,
          email: user.email,
          paid_at: new Date().toISOString(),
        };
        let saved = false;
        for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
          const { error } = await supabase.from("payments").insert(row);
          if (!error) {
            saved = true;
            break;
          }
          // 이미 저장된 주문(중복 키)이면 성공으로 간주하고 중단
          const em = (error.message || "").toLowerCase();
          if (em.includes("duplicate") || em.includes("unique") || error.code === "23505") {
            saved = true;
            break;
          }
          // 마지막 시도가 아니면 잠깐 쉬고 재시도
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 700 * attempt));
          }
        }
        if (!saved) {
          // 3회 모두 실패 → 관리자가 수동 확인할 수 있도록 흔적을 남긴다.
          //  (order_id 를 로컬에 보관 → 추후 재동기화/문의 대응용)
          try {
            localStorage.setItem("mpp_unsynced_order", opts.orderId);
          } catch {}
          console.error("[payment] 결제 저장 3회 실패 - order_id:", opts.orderId);
        }
      }
    } catch (e) {
      // 저장 실패해도 결제 자체는 성공 → 사용자 경험 우선
      console.error("[payment] 결제 저장 예외:", e);
    }

    try {
      sessionStorage.removeItem("mpp_pending_payment");
    } catch {}

    // 결제 완료 표시 저장 → 대시보드에서 전체 결과 잠금 해제 판단에 사용
    //  localStorage 사용(탭을 닫아도 유지). tier(결제 플랜)도 함께 저장.
    try {
      localStorage.setItem("mpp_paid", "true");
      localStorage.setItem("mpp_paid_tier", opts.tier);
      localStorage.setItem("mpp_paid_at", new Date().toISOString());
    } catch {}

    setStatus("success");
    setMessage("결제가 완료되었습니다!");

    // 잠시 후 마이페이지로 이동
    //    ★ 대표님 요청 ★ 결제 직후 곧바로 대시보드로 튕기면 "설문을 다시 해야 하나?"
    //    오해가 생김. → 마이페이지에서 결과를 '클릭해서' 확인하도록 유도한다.
    setTimeout(() => router.replace("/mypage"), 2200);
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // 임시 저장한 결제 메타 읽기 (tier 백업용)
      let pending: { tier?: string; email?: string } = {};
      try {
        pending = JSON.parse(sessionStorage.getItem("mpp_pending_payment") || "{}");
      } catch {}

      // ─────────────────────────────────────────────
      //  토스페이먼츠 결제 결과 처리
      // ─────────────────────────────────────────────
      //  (a) 결제 실패(failUrl)로 돌아온 경우 → 토스가 넘겨준 사유를 그대로 안내
      if (payFail || failCode) {
        setStatus("fail");
        setMessage(
          failMessage
            ? `${failMessage}${failCode ? ` (${failCode})` : ""}`
            : "결제가 취소되었거나 완료되지 않았습니다. 다시 시도해 주세요."
        );
        return;
      }

      //  (b) 정상 성공 경로: paymentKey·orderId·amount 확인
      if (!paymentKey || !orderIdParam || !amountParam) {
        setStatus("fail");
        setMessage("결제 정보가 확인되지 않았습니다.");
        return;
      }

      const tier = pending.tier || "basic";
      setTierId(tier);

      // 서버 승인
      try {
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId: orderIdParam, amount: Number(amountParam) }),
        });
        const data = await res.json();

        if (!data.ok) {
          setStatus("fail");
          setMessage("결제 승인에 실패했습니다. 결제가 완료되지 않았다면 다시 시도해 주세요.");
          return;
        }

        await finishSuccess({
          orderId: orderIdParam,
          amount: Number(amountParam),
          paymentKey,
          tier,
        });
      } catch {
        setStatus("fail");
        setMessage("결제 확인 중 오류가 발생했습니다.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const product = TIER_MAP[tierId];

  return (
    <PageShell pageKey="payment-success">
      <Header />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        {status === "processing" && (
          <>
            <div className="mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-dark" />
            <h1 className="text-xl font-extrabold text-brand-dark">결제 확인 중</h1>
            <p className="mt-2 text-sm text-brand-gray">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15 text-3xl">
              ✅
            </div>
            <h1 className="text-2xl font-extrabold text-brand-dark">결제가 완료되었습니다!</h1>
            {product && (
              <p className="mt-2 text-sm text-brand-gray">
                {product.icon} {product.name} 플랜 · {product.priceLabel}
              </p>
            )}
            <p className="mt-4 break-keep text-sm text-brand-gray">
              잠시 후 마이페이지로 이동합니다.
              <br />
              마이페이지에서 &lsquo;전체 결과 확인하기&rsquo;를 눌러 주세요.
              <br />
              매칭 결과를 보실 수 있습니다.
            </p>
            <Link
              href="/mypage"
              className="mt-6 w-full rounded-xl bg-brand-dark py-3.5 text-base font-extrabold text-white transition hover:opacity-90"
            >
              마이페이지로 가기
            </Link>
            {/* 결제 완료 시 플랜(베이직/프리미어/프로) 무관하게 1:1 상담 버튼 공통 노출 */}
            <a
              href="http://pf.kakao.com/_VxfWxan/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full rounded-xl border-2 border-brand-dark bg-white py-3.5 text-base font-extrabold text-brand-dark transition hover:bg-gray-50"
            >
              💬 1:1 채팅 상담 열기
            </a>
            <p className="mt-3 break-keep text-xs leading-relaxed text-brand-gray">
              궁금한 점은 카카오톡으로 실시간 문의하세요. (안내·추천 전용 · 대행 없음)
            </p>
          </>
        )}

        {status === "fail" && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/15 text-3xl">
              ⚠️
            </div>
            <h1 className="text-xl font-extrabold text-brand-dark">결제를 완료하지 못했습니다</h1>
            <p className="mt-2 text-sm text-brand-gray">{message}</p>
            <Link
              href="/pricing"
              className="mt-6 w-full rounded-xl bg-brand-dark py-3.5 text-base font-extrabold text-white transition hover:opacity-90"
            >
              플랜 다시 선택하기
            </Link>
          </>
        )}
      </main>
      <Footer />
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-brand-gray">불러오는 중...</div>}>
      <SuccessInner />
    </Suspense>
  );
}
