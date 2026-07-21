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
import { loadDiagnosisRaw, getDiagnosisExpiry, clearDiagnosisIfNotOwner, adoptDiagnosisIfOwnerless, loadDiagnosisFromServer } from "@/lib/diagnosisStore";
import { isAdminEmail } from "@/lib/admin";

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
  const [diagExpiry, setDiagExpiry] = useState<Date | null>(null);
  // ★ 관리자(대표님) 여부 — 결제 내역 삭제 버튼은 관리자에게만 노출 ★
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) 로그인 세션 확인
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!mounted) return;

      if (user) {
        setEmail(user.email ?? null);
        // ★ 관리자(대표님) 계정이면 결제 내역 삭제 버튼을 보여준다 ★
        setIsAdmin(isAdminEmail(user.email));
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

      // ★ 진단 입양 ★ 비회원으로 진단을 마친 뒤 로그인한 경우(소유자 미기록)
      //   지금 로그인 계정을 소유자로 연결해 결과가 사라지지 않게 한다. (진단 먼저 → 로그인 나중 대응)
      adoptDiagnosisIfOwnerless(user?.id ?? null);

      // ★ 계정 분리 ★ 현재 로그인 계정이 저장된 진단의 소유자와 다르면
      //   (예: 공용 PC에서 다른 사람이 진단 후 내가 로그인) → 남의 진단을 즉시 삭제.
      clearDiagnosisIfNotOwner(user?.id ?? null);

      // ★ 서버(Supabase) 동기화 ★ 로그인 계정이 있으면 서버에 저장된 본인 최근 진단(30일 이내)을
      //   먼저 불러와 localStorage 에 심는다. → 같은 PC에서 다른 계정으로 로그인했다 돌아와도,
      //   폰↔PC 다른 기기에서 봐도, 로그인 순서와 무관하게 본인 진단이 항상 보인다.
      //   (관리자 '결과보기' 임시 데이터가 떠 있으면 그건 건드리지 않는다.)
      if (user?.id) {
        try {
          const existing = loadDiagnosisRaw();
          const isAdminTemp =
            !!existing && (() => {
              try {
                return !!JSON.parse(existing)._adminLabel;
              } catch {
                return false;
              }
            })();
          if (!isAdminTemp) {
            await loadDiagnosisFromServer(user.id);
          }
        } catch {
          /* 서버 조회 실패 시 localStorage 폴백 */
        }
      }

      if (!mounted) return;

      // 3) 진단 결과 요약 (localStorage · 30일 유지)
      //   ★ 관리자 '결과보기'로 심어둔 고객 임시 데이터(_adminLabel 존재)는
      //      대표님 본인 마이페이지에 섞이면 안 되므로 여기서는 무시한다. ★
      try {
        const raw = loadDiagnosisRaw();
        if (raw) {
          const profile = JSON.parse(raw);
          if (!profile._adminLabel) {
            setDiagName(profile.name || "");
            // 대시보드에 실제 안내되는 항목 전부 합산(기관 + 기관별 상품 + 지원제도)
            setMatchCount(countMatchedItems(profile).total);
            // 진단 결과 유지 만료일(저장 후 30일)
            if (mounted) setDiagExpiry(getDiagnosisExpiry());
          }
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

  // ★ 결제 건 삭제 (관리자 전용) ★
  //   관리자 서버함수(admin_delete_payment)를 호출해 매출 통계·결제 내역에서 완전히 제거.
  //   일반 고객에게는 버튼 자체가 노출되지 않으며, 서버에서도 관리자만 실행 가능하다.
  async function handleDeletePayment(orderId: string) {
    if (
      !window.confirm(
        `[${orderId}] 결제 건을 삭제할까요?\n매출 통계·결제 내역에서 완전히 제거되며 되돌릴 수 없습니다.`
      )
    )
      return;
    setDeletingOrder(orderId);
    try {
      const { error } = await supabase.rpc("admin_delete_payment", {
        p_order_id: orderId,
      });
      if (error) {
        alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
      } else {
        // 화면 목록에서도 즉시 제거
        setPayments((prev) => prev.filter((p) => p.order_id !== orderId));
      }
    } catch (e) {
      alert(`삭제 중 오류가 발생했습니다: ${String(e)}`);
    } finally {
      setDeletingOrder(null);
    }
  }

  async function handleLogout() {
    // ★ 진단 결과 30일 유지 ★ 로그아웃해도 진단 결과를 삭제하지 않는다.
    //   같은 계정으로 다시 로그인하면 그대로 볼 수 있고(owner 일치),
    //   다른 계정이 로그인하면 clearDiagnosisIfNotOwner()가 자동으로 정리한다.
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <PageShell pageKey="mypage">
      <Header />
      <main className="bg-gray-50 px-4 py-6">
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
                className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
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
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  🎯 나의 진단 결과
                </h2>
                {matchCount === null ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-brand-gray">
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
                  <div className="mt-3 rounded-3xl border border-brand-red/10 bg-gradient-to-br from-brand-yellow/25 to-brand-orange/10 p-5 text-center sm:p-6">
                    <p className="break-keep text-sm leading-relaxed text-brand-dark/70 sm:text-base">
                      {diagName ? `${diagName} 대표님 ` : "대표님 "}사업장에 딱 맞는 지원사업
                    </p>
                    <p className="mt-1.5 break-keep text-2xl font-black tracking-tight text-brand-dark sm:text-3xl">
                      총 <span className="text-brand-red">{matchCount}개</span> 매칭 완료
                    </p>
                    <Link
                      href="/matching-preview?analyze=1"
                      className="btn-red group mt-4 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold tracking-tight shadow-lg shadow-brand-red/20 sm:text-base"
                    >
                      진단 결과 전체 확인하기
                      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </Link>
                    {diagExpiry && (
                      <p className="mt-3 break-keep text-xs leading-relaxed text-brand-dark/50">
                        📅 이 진단 결과는{" "}
                        <b className="text-brand-dark/70">
                          {diagExpiry.getFullYear()}년 {diagExpiry.getMonth() + 1}월{" "}
                          {diagExpiry.getDate()}일
                        </b>{" "}
                        까지 확인하실 수 있습니다.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* 추가 신청 (전문가 도움 요청) — 결제 내역 '위'로 배치 (대표님 요청) */}
              <section
                id="mypage-extra-services"
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <h2 className="text-lg font-extrabold text-brand-dark">
                  🤝 전문가 도움이 더 필요하신가요?
                </h2>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                  직접 하기 어려운 부분은 저희 전문가가 도와드립니다. 아래 항목은{" "}
                  <b className="text-brand-dark">신청하신 분에 한해</b> 별도로 진행됩니다. 필요하신 항목을 눌러 편하게 문의해 주세요.
                </p>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {[
                    { icon: "📊", name: "회사 IR 자료 제작", price: "50만원", accent: true },
                    { icon: "📝", name: "사업계획서 첨삭", price: "50만원", accent: true },
                    { icon: "📑", name: "IR + 사업계획서 첨삭", price: "90만원", accent: true },
                    { icon: "💰", name: "정책자금 전화자문", price: "10만원", accent: true },
                    { icon: "🚀", name: "예비창업패키지 · 초기창업패키지", price: "문의", accent: false },
                    { icon: "🧾", name: "세무조사 · 조정계산 · 기장", price: "문의", accent: false },
                    { icon: "🌏", name: "수출 관련 관세사 상담", price: "문의", accent: false },
                    { icon: "🖥️", name: "사업장 POS", price: "문의", accent: false },
                    { icon: "🚗", name: "사업용 자동차 문의", price: "문의", accent: false },
                    { icon: "🛡️", name: "보험 관련 문의", price: "문의", accent: false },
                  ].map((s) => (
                    <a
                      key={s.name}
                      href="http://pf.kakao.com/_VxfWxan/chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/60 px-3.5 py-3 transition hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 text-base">{s.icon}</span>
                        <span className="break-keep text-[13px] font-bold leading-snug text-brand-dark">
                          {s.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`whitespace-nowrap text-[13px] font-extrabold ${
                            s.accent ? "text-brand-orange" : "text-brand-gray"
                          }`}
                        >
                          {s.price}
                        </span>
                        <span className="whitespace-nowrap rounded-full bg-brand-dark px-2.5 py-1 text-[11px] font-bold text-white transition group-hover:opacity-90">
                          신청 문의
                        </span>
                      </span>
                    </a>
                  ))}
                </div>

                <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-gray">
                  ※ 위 서비스는 AI 올인원 패키지에 포함되지 않는 <b>별도 유료 서비스</b>입니다.
                  <br />
                  버튼을 누르면 공식 카카오톡 채널톡으로 연결됩니다.
                  <br />
                  담당자가 세부 내용과 금액을 안내해 드립니다.
                </p>
              </section>

              {/* 결제완료 회원 전용 — 1:1 채널톡 상담 (오픈채팅방 운영 중단, 대표님 요청)
                  (현재 유효한 이용기간(결제 후 1개월 이내)인 회원에게만 노출.
                   결제했더라도 1개월이 지나 만료된 회원에게는 보이지 않음) */}
              {viewStatus?.isActive && (
                <section
                  id="mypage-consult"
                  className="mt-4 overflow-hidden rounded-3xl border-2 border-[#FEE500] bg-[#FEE500]/10 p-5 shadow-card"
                >
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FEE500] text-3xl shadow-sm">
                      💬
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-keep text-lg font-extrabold text-brand-dark">
                        결제 회원 전용 1:1 상담
                      </h2>
                      <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                        결제해주신 대표님을 위한 <b className="text-brand-dark">1:1 전용 상담 채널</b>입니다.
                        정부지원사업 최신 정보, 승인 후기, 실전 노하우까지 궁금하신 점은 무엇이든
                        편하게 물어보세요.
                      </p>
                    </div>
                    {/* 1:1 채널톡 상담하기 버튼만 유지 (오픈채팅방 제거) */}
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                      <a
                        href="http://pf.kakao.com/_VxfWxan/chat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full whitespace-nowrap rounded-full bg-[#FEE500] px-7 py-3.5 text-center text-sm font-extrabold text-brand-dark transition hover:brightness-95"
                      >
                        💬 1:1 채널톡 상담하기
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* 결제 내역 — 커뮤니티 '아래'로 배치 (대표님 요청) */}
              <section
                id="mypage-payments"
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-extrabold text-brand-dark">
                    🧾 결제 내역
                  </h2>
                  {isAdmin && payments.length > 0 && (
                    <span className="rounded-full bg-brand-red/10 px-2.5 py-1 text-[11px] font-bold text-brand-red">
                      관리자 · 삭제 가능
                    </span>
                  )}
                </div>
                {payments.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-brand-gray">
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
                          <div className="flex items-center gap-3">
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
                            {/* 관리자(대표님)에게만 보이는 결제 건 삭제 버튼 */}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeletePayment(p.order_id)}
                                disabled={deletingOrder === p.order_id}
                                title="이 결제 건 삭제 (관리자 전용)"
                                className="shrink-0 rounded-lg border border-brand-red/40 px-3 py-1.5 text-xs font-bold text-brand-red transition hover:bg-brand-red/10 disabled:opacity-50"
                              >
                                {deletingOrder === p.order_id ? "삭제 중…" : "삭제"}
                              </button>
                            )}
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

              <p className="mt-5 break-keep text-center text-xs leading-relaxed text-brand-gray">
                ⚠️ 본 서비스는 정부지원사업을 안내·추천하는 매칭 서비스이며 정부지원사업
                승인을 보장하지 않습니다.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
