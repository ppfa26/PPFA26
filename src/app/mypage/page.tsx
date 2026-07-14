"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";
import { countMatchedItems } from "@/lib/supportPrograms";
import { fetchViewStatus, type ViewStatus } from "@/lib/viewCredits";

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
  const [viewStatus, setViewStatus] = useState<ViewStatus | null>(null);
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

        // 2-1) 유효 이용기간(결제 후 1개월 이내) 여부 확인 — 서버(RPC) 기준
        //      커뮤니티 노출은 "현재 유효한 결제자"에게만 하기 위함.
        try {
          const st = await fetchViewStatus();
          if (mounted) setViewStatus(st);
        } catch {
          /* 실패 시 미노출(안전) */
        }
      }

      // 3) 진단 결과 요약 (sessionStorage)
      try {
        const raw = sessionStorage.getItem("mpp_diagnosis");
        if (raw) {
          const profile = JSON.parse(raw);
          setDiagName(profile.name || "");
          // 대시보드에 실제 안내되는 항목 전부 합산(기관 + 기관별 상품 + 지원제도)
          setMatchCount(countMatchedItems(profile).total);
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

              {/* 결제완료 회원 전용 — 오픈채팅 커뮤니티
                  (현재 유효한 이용기간(결제 후 1개월 이내)인 회원에게만 노출.
                   결제했더라도 1개월이 지나 만료된 회원에게는 보이지 않음) */}
              {viewStatus?.isActive && (
                <section
                  id="mypage-openchat"
                  className="mt-5 overflow-hidden rounded-3xl border-2 border-[#FEE500] bg-[#FEE500]/10 p-6 shadow-card"
                >
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FEE500] text-3xl shadow-sm">
                      💬
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-keep text-lg font-extrabold text-brand-dark">
                        🎉 결제 회원 전용 카카오톡 커뮤니티
                      </h2>
                      <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                        결제해주신 대표님만 입장하실 수 있는 <b className="text-brand-dark">비공개 오픈채팅방</b>입니다.
                        정부지원사업 최신 정보 및 승인 후기 등과 실전 노하우, 대표님들끼리의 정보 교류하는 곳입니다.
                      </p>
                    </div>
                    <a
                      href="https://open.kakao.com/o/gvjec0Di"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full shrink-0 whitespace-nowrap rounded-full bg-[#FEE500] px-7 py-3.5 text-center text-sm font-extrabold text-brand-dark transition hover:brightness-95 sm:w-auto"
                    >
                      💬 오픈채팅방 입장하기
                    </a>
                  </div>

                  {/* 오픈채팅방 참여 비밀번호 — 결제 회원에게만 노출 */}
                  <div className="mt-4 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#FEE500] bg-white/70 px-4 py-3.5 text-center sm:flex-row sm:gap-2.5">
                    <span className="break-keep text-sm font-semibold text-brand-gray">
                      🔒 오픈채팅방 참여 비밀번호
                    </span>
                    <span className="select-all rounded-lg bg-brand-dark px-4 py-1.5 text-base font-extrabold tracking-widest text-white">
                      ppfa25
                    </span>
                  </div>
                </section>
              )}

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
                    <p className="break-keep text-brand-dark">
                      {diagName ? `${diagName} 대표님 ` : "대표님 "}사업장에 딱 맞는 지원사업{" "}
                      <b className="text-brand-orange">{matchCount}개</b>가
                      매칭되었습니다.
                    </p>
                    <Link
                      href="/dashboard"
                      className="btn-brand mt-4 inline-block rounded-full px-8 py-3"
                    >
                      대시보드에서 전체 결과 확인하기
                    </Link>
                  </div>
                )}
              </section>

              {/* 추가 신청 (전문가 도움 요청) — 결제 내역 '위'로 배치 (대표님 요청) */}
              <section
                id="mypage-extra-services"
                className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  🤝 전문가 도움이 더 필요하신가요?
                </h2>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                  직접 하기 어려운 부분은 저희 전문가가 도와드립니다.
                  <br />
                  아래 항목은 <b className="text-brand-dark">신청하신 분에 한해</b> 별도로 진행됩니다.
                  <br />
                  필요하신 항목을 눌러 편하게 문의해 주세요.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: "📊", name: "회사 IR 자료 제작", price: "50만원", accent: true },
                    { icon: "📝", name: "사업계획서 첨삭", price: "50만원", accent: true },
                    { icon: "📑", name: "IR + 사업계획서 제작", price: "90만원", accent: true },
                    { icon: "💰", name: "정책자금 상담 신청", price: "문의", accent: false },
                    { icon: "🚀", name: "예비창업패키지 · 초기창업패키지", price: "문의", accent: false },
                    { icon: "🧾", name: "세무조사 · 조정계산 · 기장", price: "문의", accent: false },
                    { icon: "🌏", name: "수출 관련 관세사 상담", price: "문의", accent: false },
                    { icon: "🖥️", name: "사업장 POS", price: "문의", accent: false },
                  ].map((s) => (
                    <a
                      key={s.name}
                      href="http://pf.kakao.com/_VxfWxan/chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3.5 transition hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="text-lg">{s.icon}</span>
                        <span className="break-keep text-sm font-bold text-brand-dark">
                          {s.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`whitespace-nowrap text-sm font-extrabold ${
                            s.accent ? "text-brand-orange" : "text-brand-gray"
                          }`}
                        >
                          {s.price}
                        </span>
                        <span className="whitespace-nowrap rounded-full bg-brand-dark px-3 py-1 text-[11px] font-bold text-white transition group-hover:opacity-90">
                          신청 문의
                        </span>
                      </span>
                    </a>
                  ))}
                </div>

                <p className="mt-4 break-keep text-[11px] leading-relaxed text-brand-gray">
                  ※ 위 서비스는 AI 올인원 패키지에 포함되지 않는 <b>별도 유료 서비스</b>입니다.
                  <br />
                  버튼을 누르면 공식 카카오톡 채널톡으로 연결됩니다.
                  <br />
                  담당자가 세부 내용과 금액을 안내해 드립니다.
                </p>
              </section>

              {/* 결제 내역 — 전문가 도움 '아래'로 배치 (대표님 요청) */}
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
