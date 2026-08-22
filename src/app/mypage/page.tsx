"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { countMatchedItems } from "@/lib/supportPrograms";
import { fetchViewStatus, type ViewStatus } from "@/lib/viewCredits";
import { loadDiagnosisRaw, getDiagnosisExpiry, clearDiagnosisIfNotOwner, adoptDiagnosisIfOwnerless, loadDiagnosisFromServer } from "@/lib/diagnosisStore";
import AdFitBanner from "@/components/AdFitBanner";
import { ADFIT_UNIT_PC_728x90 } from "@/lib/adfitConfig";

type Payment = {
  order_id: string;
  tier: string;
  amount: number;
  status: string;
  paid_at: string | null;
};

export default function MyPage() {
  const router = useRouter();

  // ── 마이페이지도 진입 즉시 화면 폭에 맞게 보이도록 fit-to-width (대표님 요청) ──
  //  layout.tsx 가 서버에서 device-width 로 렌더링 → 여기서 width=820(initial-scale 없음)으로
  //  '전환'하면 브라우저(삼성인터넷·사파리)가 폭에 맞게 자동 축소한다(결과창과 동일한 검증 방식).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement | null;
    if (!meta) return;
    const prev = meta.getAttribute("content");
    meta.setAttribute("content", "width=820, maximum-scale=5, user-scalable=yes");
    return () => {
      if (prev) meta.setAttribute("content", prev);
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [viewStatus, setViewStatus] = useState<ViewStatus | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [diagName, setDiagName] = useState("");
  const [diagExpiry, setDiagExpiry] = useState<Date | null>(null);

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

        // 2-1) 유효 이용기간(결제 후 1개월 이내) 여부 확인 - 서버(RPC) 기준
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

      // ★ 서버(Supabase) 동기화 ★ 로그인 계정이 있으면 서버에 저장된 본인 최근 진단(7일 이내)을
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

      // 3) 진단 결과 요약 (localStorage · 7일 유지)
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
            // 진단 결과 유지 만료일(저장 후 7일)
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

  async function handleLogout() {
    // ★ 진단 결과 7일 유지 ★ 로그아웃해도 진단 결과를 삭제하지 않는다.
    //   같은 계정으로 다시 로그인하면 그대로 볼 수 있고(owner 일치),
    //   다른 계정이 로그인하면 clearDiagnosisIfNotOwner()가 자동으로 정리한다.
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <PageShell pageKey="mypage">
      <Header />
      {/* "마이페이지" 제목 위 상단 공백 축소(대표님 요청: 광고 하단 여백과 비슷하게) */}
      <main className="bg-gray-50 px-4 pt-3 pb-0 sm:pt-5 sm:pb-0">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
            마이페이지
          </h1>

          {loading ? (
            <p className="mt-8 text-center text-brand-gray">불러오는 중…</p>
          ) : (
            <>
              {/* 한눈 요약 스탯 - 로그인 회원에게만. 진단결과·이용권·상담채널 상태를 3칸으로 즉시 파악 */}
              {email && (
                <div
                  id="mypage-summary"
                  className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3"
                >
                  {/* ① 진단 결과 매칭 개수 */}
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 text-center shadow-card transition-shadow duration-200 hover:shadow-cardHover sm:p-3.5">
                    <span className="text-xl sm:text-2xl">🎯</span>
                    <p className="mt-1 text-[11px] font-semibold text-brand-gray sm:text-xs">
                      진단 결과
                    </p>
                    <span className="mt-1.5 inline-block whitespace-nowrap rounded-full bg-brand-dark px-3 py-1 text-sm font-black leading-none text-white sm:text-base">
                      {matchCount === null ? "–" : `${matchCount}개`}
                    </span>
                  </div>
                  {/* ② 이용권(열람) 상태 */}
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 text-center shadow-card transition-shadow duration-200 hover:shadow-cardHover sm:p-3.5">
                    <span className="text-xl sm:text-2xl">🎟️</span>
                    <p className="mt-1 text-[11px] font-semibold text-brand-gray sm:text-xs">
                      이용권
                    </p>
                    <span
                      className={`mt-1.5 inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-black leading-none text-white sm:text-base ${
                        viewStatus?.isActive ? "bg-brand-dark" : "bg-brand-dark/40"
                      }`}
                    >
                      {viewStatus?.isActive ? "이용중" : "없음"}
                    </span>
                  </div>
                  {/* ③ 결제 건수 */}
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 text-center shadow-card transition-shadow duration-200 hover:shadow-cardHover sm:p-3.5">
                    <span className="text-xl sm:text-2xl">🧾</span>
                    <p className="mt-1 text-[11px] font-semibold text-brand-gray sm:text-xs">
                      결제 내역
                    </p>
                    <span className="mt-1.5 inline-block whitespace-nowrap rounded-full bg-brand-dark px-3 py-1 text-sm font-black leading-none text-white sm:text-base">
                      {payments.length}건
                    </span>
                  </div>
                </div>
              )}

              {/* 계정 정보 */}
              <section
                id="mypage-account"
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <h2 className="text-base font-extrabold text-brand-dark sm:text-lg">
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
                      className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-brand-gray transition duration-150 hover:scale-[1.02] hover:bg-gray-50 active:scale-[0.97]"
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
                      className="btn-red mt-4 inline-block rounded-full px-8 py-3 font-bold transition hover:scale-[1.02]"
                    >
                      로그인 / 회원가입
                    </Link>
                  </div>
                )}
              </section>

              {/* 진단 결과 요약 (위로) */}
              <section
                id="mypage-diagnosis"
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-card sm:p-5"
              >
                <h2 className="text-base font-extrabold text-brand-dark sm:text-lg">
                  🎯 나의 진단 결과
                </h2>
                {matchCount === null ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-brand-gray">
                    아직 진단 결과가 없습니다.
                    <br />
                    <Link
                      href="/diagnosis-chat"
                      className="mt-2 inline-block font-bold text-brand-orange underline"
                    >
                      무료 진단 받으러 가기
                    </Link>
                  </div>
                ) : (
                  <div className="mt-3 rounded-3xl border border-gray-200 bg-gradient-to-br from-brand-yellow/25 to-brand-orange/10 p-4 text-center sm:p-5">
                    <p className="break-keep text-[13px] leading-snug text-brand-dark/70 sm:text-sm">
                      {diagName ? `${diagName} 대표님 ` : "대표님 "}사업장에 딱 맞는 지원사업
                    </p>
                    <p className="mt-1 break-keep text-xl font-black tracking-tight text-brand-dark sm:text-2xl">
                      총 <span className="text-brand-red">{matchCount}개</span> 매칭 완료
                    </p>
                    <Link
                      href="/matching-preview?analyze=1"
                      className="btn-red group mt-3 inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold tracking-tight shadow-lg shadow-brand-red/20 transition hover:scale-[1.02] sm:text-base"
                    >
                      진단 결과 전체 확인하기
                      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </Link>
                    {diagExpiry && (
                      <p className="mt-3 break-keep text-xs leading-snug text-brand-dark/50">
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

              {/* 추가 신청 (전문가 도움 요청) - 결제 내역 '위'로 배치 (대표님 요청) */}
              <section
                id="mypage-extra-services"
                className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <h2 className="text-base font-extrabold text-brand-dark sm:text-lg">
                  🤝 전문가 도움이 더 필요하신가요?
                </h2>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                  직접 하기 어려운 부분을 아래 항목과 같이 구분하고{" "}
                  <b className="text-brand-dark">신청을 원하시는 분에 한해</b> 별도로 상담을 진행합니다.
                </p>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {[
                    { icon: "📊", name: "회사 IR 자료 제작", price: "30만원", accent: true },
                    { icon: "📝", name: "사업계획서 첨삭", price: "30만원", accent: true },
                    { icon: "📑", name: "IR + 사업계획서 첨삭", price: "50만원", accent: true },
                    { icon: "💰", name: "정부지원사업 정식자문", price: "문의", accent: false },
                    { icon: "🧾", name: "세무조사 · 기장", price: "문의", accent: false },
                    { icon: "🌏", name: "수출 관세 상담", price: "문의", accent: false },
                  ].map((s) => (
                    <a
                      key={s.name}
                      href="http://pf.kakao.com/_VxfWxan/chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/60 px-3.5 py-3 transition duration-150 hover:scale-[1.02] hover:border-brand-orange hover:bg-brand-orange/5 active:scale-[0.98]"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 text-base">{s.icon}</span>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[14px] font-bold leading-snug text-brand-dark">
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
                  ※ 위 서비스는 AI 진단 리포트에 포함되지 않는 <b>별도 유료 서비스</b>입니다.
                </p>
              </section>

              {/* 결제완료 회원 전용 - 1:1 채널톡 상담 (오픈채팅방 운영 중단, 대표님 요청)
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
                      <h2 className="break-keep text-base font-extrabold text-brand-dark sm:text-lg">
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
                        className="w-full whitespace-nowrap rounded-full bg-[#FEE500] px-7 py-3.5 text-center text-sm font-extrabold text-brand-dark transition hover:scale-[1.02] hover:brightness-95"
                      >
                        💬 1:1 채널톡 상담하기
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* 🧾 결제 내역 섹션 삭제됨 (대표님 요청) */}

              <p className="mt-6 break-keep text-center text-xs leading-relaxed text-brand-gray">
                ⚠️ 본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며, 정부지원사업
                승인을 보장하지 않습니다.
              </p>
            </>
          )}
        </div>
      </main>

      {/* ── 카카오 애드핏 광고 (마이페이지 하단 · 푸터 위) ──
           광고단위 ID(DAN-...)는 src/lib/adfitConfig.ts 에서 관리.
           광고(728px)를 본문과 동일한 max-w-3xl 폭 안에서 중앙 정렬.
           하단 흐름의 세로 공백을 py-6(24px)으로 균일화(대표님 요청). */}
      <div className="border-t border-brand-dark/5 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <AdFitBanner adUnitPc={ADFIT_UNIT_PC_728x90} />
        </div>
      </div>

      {/* 광고 래퍼가 이미 하단 여백을 갖고 있어 푸터 상단 간격은 줄여 붙인다(첫 페이지와 동일). */}
      <Footer topGap="mt-0" />
    </PageShell>
  );
}
