"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";

type Status = "processing" | "success" | "fail";

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");

  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState<string>("결제를 확인하고 있습니다...");
  const [tierId, setTierId] = useState<string>("basic");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!paymentKey || !orderId || !amount) {
        setStatus("fail");
        setMessage("결제 정보가 확인되지 않았습니다.");
        return;
      }

      // 임시 저장한 결제 메타 읽기
      let pending: { tier?: string; email?: string } = {};
      try {
        pending = JSON.parse(sessionStorage.getItem("mpp_pending_payment") || "{}");
      } catch {}
      const tier = pending.tier || "basic";
      setTierId(tier);

      // 1) 서버 승인
      try {
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        });
        const data = await res.json();

        if (!data.ok) {
          setStatus("fail");
          setMessage("결제 승인에 실패했습니다. 결제가 완료되지 않았다면 다시 시도해 주세요.");
          return;
        }

        // 2) Supabase 결제 내역 저장 (인증된 사용자 세션 기준 → RLS 통과)
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData.session?.user;
          if (user) {
            await supabase.from("payments").insert({
              user_id: user.id,
              order_id: orderId,
              tier,
              amount: Number(amount),
              status: "paid",
              payment_key: paymentKey,
              email: user.email,
              paid_at: new Date().toISOString(),
            });
          }
        } catch {
          // 저장 실패해도 결제 자체는 성공 → 사용자 경험 우선
        }

        try {
          sessionStorage.removeItem("mpp_pending_payment");
        } catch {}

        setStatus("success");
        setMessage("결제가 완료되었습니다!");

        // 3) 잠시 후 대시보드로 이동
        setTimeout(() => router.replace("/dashboard"), 2200);
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
            <p className="mt-4 text-sm text-brand-gray">
              잠시 후 대시보드로 이동합니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 w-full rounded-xl bg-brand-dark py-3.5 text-base font-extrabold text-white transition hover:opacity-90"
            >
              바로 대시보드로 가기
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
              궁금한 점은 카카오톡으로 실시간 문의하세요. (자문 전용 · 대행 없음)
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
