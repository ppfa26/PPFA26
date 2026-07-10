"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";
import { matchPrograms } from "@/lib/matching";

type Payment = {
  order_id: string;
  tier: string;
  amount: number;
  status: string;
  paid_at: string | null;
};

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [diagName, setDiagName] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) 로그인 세션 확인
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!mounted) return;

      if (user) {
        setEmail(user.email ?? null);
        // 2) 결제 내역 조회
        try {
          const { data } = await supabase
            .from("payments")
            .select("order_id, tier, amount, status, paid_at")
            .eq("user_id", user.id)
            .order("paid_at", { ascending: false });
          if (mounted && data) setPayments(data as Payment[]);
        } catch {
          /* RLS/네트워크 실패 시 무시 */
        }
      }

      // 3) 진단 결과 요약 (sessionStorage)
      try {
        const raw = sessionStorage.getItem("mpp_diagnosis");
        if (raw) {
          const profile = JSON.parse(raw);
          setDiagName(profile.name || "");
          setMatchCount(matchPrograms(profile).length);
        }
      } catch {
        /* noop */
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <PageShell pageKey="mypage">
      <Header />
      <main className="bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
            마이페이지
          </h1>

          {loading ? (
            <p className="mt-8 text-center text-brand-gray">불러오는 중…</p>
          ) : (
            <>
              {/* 계정 정보 */}
              <section
                id="mypage-account"
                className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  👤 계정 정보
                </h2>
                {email ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-brand-dark">
                      로그인 이메일:{" "}
                      <b className="font-semibold">{email}</b>
                    </p>
                    <button
                      onClick={handleLogout}
                      className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-brand-gray hover:bg-gray-50"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-brand-gray">
                      로그인이 필요합니다. 로그인하면 결제 내역과 이용 정보를
                      확인할 수 있습니다.
                    </p>
                    <Link
                      href="/signup"
                      className="btn-brand mt-4 inline-block rounded-full px-8 py-3"
                    >
                      로그인 / 회원가입
                    </Link>
                  </div>
                )}
              </section>

              {/* 진단 결과 요약 (위로) */}
              <section
                id="mypage-diagnosis"
                className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  🎯 나의 진단 결과
                </h2>
                {matchCount === null ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-brand-gray">
                    아직 진단 결과가 없습니다.
                    <br />
                    <Link
                      href="/diagnosis"
                      className="mt-2 inline-block font-bold text-brand-orange underline"
                    >
                      무료 진단 받으러 가기
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-brand-yellow/30 p-5 text-center">
                    <p className="text-brand-dark">
                      {diagName ? `${diagName} 대표님께 ` : ""}맞는 지원사업{" "}
                      <b className="text-brand-orange">{matchCount}개</b>가
                      매칭되었습니다.
                    </p>
                    <Link
                      href="/dashboard"
                      className="btn-brand mt-4 inline-block rounded-full px-8 py-3"
                    >
                      대시보드에서 전체 결과 보기
                    </Link>
                  </div>
                )}
              </section>

              {/* 결제 내역 (아래로) */}
              <section
                id="mypage-payments"
                className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  🧾 결제 내역
                </h2>
                {payments.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-brand-gray">
                    아직 결제 내역이 없습니다.
                    <br />
                    <Link
                      href="/pricing"
                      className="mt-2 inline-block font-bold text-brand-orange underline"
                    >
                      상품 보러 가기
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-gray-100">
                    {payments.map((p) => {
                      const tier = TIER_MAP[p.tier];
                      return (
                        <li
                          key={p.order_id}
                          className="flex flex-wrap items-center justify-between gap-2 py-4"
                        >
                          <div>
                            <p className="font-bold text-brand-dark">
                              {tier?.name || p.tier}
                            </p>
                            <p className="text-xs text-brand-gray">
                              주문번호 {p.order_id}
                              {p.paid_at
                                ? ` · ${new Date(p.paid_at).toLocaleDateString("ko-KR")}`
                                : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-brand-dark">
                              {p.amount.toLocaleString()}원
                            </p>
                            <span
                              className={`text-xs font-semibold ${
                                p.status === "paid"
                                  ? "text-brand-green"
                                  : "text-brand-gray"
                              }`}
                            >
                              {p.status === "paid" ? "결제완료" : p.status}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-3 text-xs text-brand-gray">
                  ✅ 일시불 1회 결제 · 자동결제(정기결제) 없음
                </p>
              </section>

              <p className="mt-6 break-keep text-center text-xs leading-relaxed text-brand-gray">
                ⚠️ 본 서비스는 신청 가능 상품 안내 및 자문 서비스이며 정부지원사업
                승인을 보장하지 않습니다. 대행 신청·승인 수수료가 없습니다.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
