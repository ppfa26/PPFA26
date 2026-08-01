"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";
import MobilePcRecommendBar from "@/components/MobilePcRecommendBar";
// (성능) 결과 상세 패널은 페이지에서 가장 무거운 컴포넌트(약 1.6천 줄).
//  next/dynamic 으로 별도 청크로 분리해 초기 First Load JS 를 줄인다.
//  ssr: true(기본) 유지 → SEO·초기 콘텐츠·결과 계산 로직은 100% 동일.
const AdvancedScreeningPanel = dynamic(
  () => import("@/components/AdvancedScreeningPanel"),
  {
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center p-8 text-sm text-brand-gray">
        결과를 불러오는 중…
      </div>
    ),
  }
);
import { countMatchedItems, getMatchedTitles, type MatchedTitle } from "@/lib/supportPrograms";
import {
  getPaymentBlockReasons,
  PAYMENT_BLOCK_TEXT,
  type PaymentBlockReason,
} from "@/lib/diagnosisConfig";
import { BETA_FREE } from "@/lib/betaConfig";
import { loadDiagnosisRaw, clearDiagnosisIfNotOwner, loadAdminDiagnosisRaw, adoptDiagnosisIfOwnerless, loadDiagnosisFromServer } from "@/lib/diagnosisStore";
import { supabase } from "@/lib/supabaseClient";
import { checkFreeView } from "@/lib/viewCredits";

export default function MatchingPreview() {
  const [name, setName] = useState("");
  // 관리자 열람 배너 전용 식별 라벨(이름→연락처→이메일). name이 비어도 '누구 결과'인지 표시.
  const [adminLabel, setAdminLabel] = useState("");
  const [blockReasons, setBlockReasons] = useState<PaymentBlockReason[]>([]);
  // 관리자 열람 모드: /matching-preview?admin=1 로 열면 잠금(previewLock) 없이
  //   전체 결과를 그대로 보여준다. (대표님이 상담 시 고객과 같은 결과창을 보기 위함)
  //   결제·조회권 차감이 없는 이 미리보기 페이지를 재사용하므로 부작용이 없다.
  const [adminView, setAdminView] = useState(false);
  // 로그인(회원가입) 게이트 상태:
  //   "checking" = 세션 확인 중 · "guest" = 비로그인(결과 잠금) · "ready" = 로그인 완료(결과 공개)
  //   ※ 관리자 열람 모드(?admin=1)는 게이트를 통과시켜 항상 "ready".
  const [gate, setGate] = useState<"checking" | "guest" | "analyzing" | "ready" | "limited">("checking");
  // 무료 조회 한도 초과 시 안내 문구(계정당 서로 다른 사업자 N곳 제한)
  const [limitMsg, setLimitMsg] = useState("");
  // 분석 연출 진행 단계(0~3) - "AI가 실제로 판독 중"이라는 신뢰감을 주기 위한 짧은 연출
  const [analyzeStep, setAnalyzeStep] = useState(0);
  // ★ 비회원 게이트 '맛보기'용: 실제 매칭된 항목 제목 리스트(기관명 등).
  //   개수는 counts/total로, 이 리스트에서 앞 3개만 흐리게 보여줘 "이렇게 많다"를 체감시킨다.
  //   (스코어링 값은 그대로 - 표시만 부분 공개)
  const [matchedTitles, setMatchedTitles] = useState<MatchedTitle[]>([]);
  const [counts, setCounts] = useState<{
    total: number;
    institutions: number;
    products: number;
    supports: number;
    benefits: number;
  } | null>(null);
  // ★ 실제 결과 화면(AdvancedScreeningPanel)이 '실제로 그린' 4개 카테고리 실측 갯수 ★
  //   요약 배너 숫자를 화면 아코디언과 100% 일치시키기 위해, 도착하면 이 값으로 배너를 갱신한다.
  //   supports=정부지원제도, products=정책금융상품, benefits=추가 감면, announcements=그 외 정부지원사업
  const [liveCounts, setLiveCounts] = useState<{
    supports: number;
    products: number;
    benefits: number;
    announcements: number;
  } | null>(null);
  // 관련 실공고(기업마당) 매칭용 - 진단 프로필 원본을 보관
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const isAdmin =
          new URLSearchParams(window.location.search).get("admin") === "1";
        setAdminView(isAdmin);

        // ★ 관리자 결과보기 ★ 새 탭은 sessionStorage 를 공유하지 않으므로,
        //   관리자가 localStorage 임시 키(mpp_diagnosis_admin)에 심어둔 '그 고객'의 진단을
        //   이 탭의 sessionStorage(mpp_diagnosis)로 복사해, 하위 컴포넌트(AdvancedScreeningPanel)까지
        //   전부 동일한 '그 고객' 데이터를 읽게 한다. → 이름이 대표님(신주엽)으로 섞이는 버그 방지.
        if (isAdmin) {
          const adminRaw = loadAdminDiagnosisRaw();
          if (adminRaw) {
            try {
              sessionStorage.setItem("mpp_diagnosis", adminRaw);
            } catch {
              /* noop */
            }
          }
        }

        // ★ 계정 분리 ★ 관리자 열람이 아닐 때만, 현재 로그인 계정이 저장된 진단의
        //   소유자와 다르면(남의 기기에 남은 진단) 즉시 삭제한다.
        if (!isAdmin) {
          const { data } = await supabase.auth.getSession();
          const uid = data.session?.user?.id ?? null;
          // 비회원 진단 후 로그인한 경우 → 지금 계정을 소유자로 연결(입양)해 결과 유지
          adoptDiagnosisIfOwnerless(uid);
          clearDiagnosisIfNotOwner(uid);
          // ★ 서버 동기화 ★ 로그인 계정이면 서버에 저장된 본인 최근 진단(30일 이내)을
          //   불러와 localStorage 에 심는다. → 기기·로그인 순서 무관하게 결과 유지.
          if (uid) {
            await loadDiagnosisFromServer(uid);
          }
        }

        const raw = isAdmin ? (loadAdminDiagnosisRaw() ?? loadDiagnosisRaw()) : loadDiagnosisRaw();
        const profile = raw ? JSON.parse(raw) : {};
        setName(profile.name || "");
        setAdminLabel(
          profile._adminLabel || profile.name || profile.phone || profile.email || ""
        );
        setBlockReasons(getPaymentBlockReasons(profile));
        setCounts(countMatchedItems(profile));
        try {
          setMatchedTitles(getMatchedTitles(profile));
        } catch {
          setMatchedTitles([]);
        }
        setProfileData(profile);
      } catch {
        setCounts(null);
      }
    })();
  }, []);

  // ── 로그인(회원가입) 게이트 ──
  //  결과를 보려면 반드시 카카오/구글/이메일로 로그인해야 한다. (대표님 요청)
  //  · 관리자 열람 모드(?admin=1)는 그대로 통과 (상담 시 고객 결과 열람용)
  //  · 로그인 완료 시 접속 로그(IP·기기)를 기록해 관리자 통계에 잡히게 한다.
  useEffect(() => {
    (async () => {
      const isAdmin =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("admin") === "1";
      if (isAdmin) {
        setGate("ready");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        // 결과를 바로 띄우지 않고, 짧은 'AI 분석 중' 연출을 거쳐 신뢰감을 준다.
        //  ★ ?analyze=1 로 들어오면(무료진단 완료 직후 / 마이페이지 '확인하기') 무조건 연출 ★
        //  · 그 외(결과 화면 내 뒤로가기·새로고침 등)에서는 이미 본 적 있으면 연출 생략.
        const forceAnalyze =
          new URLSearchParams(window.location.search).get("analyze") === "1";
        let seen = false;
        try {
          seen = sessionStorage.getItem("mpp_result_seen") === "1";
        } catch {
          /* sessionStorage 접근 불가 시 무시 */
        }
        setGate(forceAnalyze || !seen ? "analyzing" : "ready");
        // 접속 기록(IP·기기)은 이제 루트 레이아웃의 <AccessLogger />가 모든
        // 페이지에서 자동으로 남기므로(회원/비회원 공통), 여기서 개별 호출은 제거했다.
      } else {
        setGate("guest");
      }
    })();
  }, []);

  // ── [무료 베타 어뷰징 차단] 계정당 서로 다른 사업자 N곳까지만 열람 허용 ──
  //   한 아이디로 사업자만 바꿔가며 무제한 조회하는 도용/수집을 서버(RPC)에서 차단.
  //   · profileData(사업자 지문)를 서버로 판정 → 한도 초과면 결과 대신 안내 화면.
  //   · 이미 본 사업자(재열람)·식별불가 빈 지문·서버오류는 통과(정상 고객 오탐 방지).
  //   · 관리자 열람(?admin=1)은 제외. gate 가 analyzing/ready 로 넘어간 뒤에만 판정.
  useEffect(() => {
    if (adminView) return;
    if (gate !== "analyzing" && gate !== "ready") return;
    if (!profileData) return;
    let cancelled = false;
    (async () => {
      try {
        const fv = await checkFreeView(profileData, true);
        if (!cancelled && fv && !fv.allowed) {
          setLimitMsg(fv.message || "");
          setGate("limited");
        }
      } catch {
        /* 판정 실패 시 통과(오탐 방지) */
      }
    })();
    return () => {
      cancelled = true;
    };
    // gate 가 처음 analyzing/ready 로 바뀔 때 1회 판정하면 충분(profileData 도착 기준).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData, adminView]);

  // ★ 요약 배너에 실제로 '표시되는' 4개 카테고리 값 - 단일 소스로 도출해
  //   큰 숫자(total)와 배지 숫자가 항상 100% 일치하도록 한다. (대표님 요청: 숫자 정확히 맞추기)
  //   실측 콜백(liveCounts)이 도착하면 그 값을, 아직이면 초기 계산값(counts)을 쓴다.
  //   ⚠️ '그 외 지원사업'(announcements)은 실측 콜백에만 있으므로, 도착 전에는 0으로 표시하고
  //      total에서도 0으로 잡아, 화면 배지 합(=total)이 항상 어긋나지 않게 한다.
  const shownSupports = liveCounts?.supports ?? counts?.supports ?? 0;
  const shownProducts = liveCounts?.products ?? counts?.products ?? 0;
  const shownBenefits = liveCounts?.benefits ?? counts?.benefits ?? 0;
  const shownAnnouncements = liveCounts?.announcements ?? 0;
  // ★ 큰 숫자 = 화면에 보이는 배지 4개의 합 (항상 일치) ★
  const total = shownSupports + shownProducts + shownBenefits + shownAnnouncements;
  const isBlocked = blockReasons.length > 0;

  // ── 'AI 분석 중' 연출 진행 (analyzing → 약 2.2초 후 ready) ──
  //  단계별 문구가 순차 점등되며 실제 판독하는 느낌을 준다. 끝나면 결과 공개 + '본 적 있음' 표시.
  useEffect(() => {
    if (gate !== "analyzing") return;
    setAnalyzeStep(0);
    // 4단계가 순차 점등되며 '정밀 분석 중' 느낌 → 약 2.3초 후 결과 공개
    const t1 = setTimeout(() => setAnalyzeStep(1), 550);
    const t2 = setTimeout(() => setAnalyzeStep(2), 1050);
    const t3 = setTimeout(() => setAnalyzeStep(3), 1550);
    const done = setTimeout(() => {
      try {
        sessionStorage.setItem("mpp_result_seen", "1");
      } catch {
        /* 무시 */
      }
      setGate("ready");
    }, 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(done);
    };
  }, [gate]);

  // ── 세션 확인 중 로딩 화면 ──
  if (gate === "checking") {
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        <main className="flex min-h-[50vh] items-center justify-center px-4 py-20">
          <p className="text-sm font-semibold text-brand-gray">불러오는 중...</p>
        </main>
        <Footer />
      </PageShell>
    );
  }

  // ── AI 분석 중 연출 화면 ──
  if (gate === "analyzing") {
    const steps = [
      { icon: "🏢", label: "사업장 정보 확인" },
      { icon: "🏦", label: "지원가능 기관매칭" },
      { icon: "💳", label: "정부지원사업 판독" },
      { icon: "🎯", label: "맞춤 결과 정리" },
    ];
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        {/* 로딩 화면 — 화면 정중앙 정렬 + 박스/글씨를 조금 키워 시인성 향상(대표님 요청) */}
        <main className="flex min-h-[78vh] items-center justify-center px-4 py-16">
          <div className="mx-auto w-full max-w-xl rounded-3xl border-2 border-brand-orange/40 bg-white p-9 text-center shadow-card sm:p-14">
            <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-brand-orange/10">
              <span className="inline-block h-14 w-14 animate-spin rounded-full border-4 border-brand-orange/20 border-t-brand-orange" />
            </div>
            <p className="break-keep text-2xl font-extrabold leading-snug text-brand-dark sm:text-3xl">
              대표님 사업장을 <span className="text-brand-orange">AI가 분석</span>하고 있어요
            </p>
            <p className="mt-3 text-base text-brand-gray sm:text-lg">
              전국 정부지원사업 데이터와 대조 중입니다
            </p>

            <ul className="mt-8 space-y-3.5 text-left">
              {steps.map((s, i) => {
                const active = analyzeStep >= i;
                const done = analyzeStep > i;
                return (
                  <li
                    key={s.label}
                    className={`flex items-center gap-3.5 rounded-xl border px-6 py-4 transition-all duration-300 ${
                      active
                        ? "border-brand-orange/40 bg-brand-yellow/10 opacity-100"
                        : "border-gray-100 bg-gray-50 opacity-40"
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="flex-1 text-base font-bold text-brand-dark sm:text-lg">{s.label}</span>
                    {done ? (
                      <span className="text-lg font-extrabold text-green-600">✓</span>
                    ) : active ? (
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </main>
        <Footer />
      </PageShell>
    );
  }

  // ── [무료 베타] 계정당 사업자 조회 한도 초과 안내 화면 ──
  //  한 아이디로 서로 다른 사업자를 한도(기본 3곳) 넘게 조회하려 할 때 노출.
  //  (도용/대량 수집 차단용 · 정상 사용자는 거의 걸리지 않음)
  if (gate === "limited") {
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
          <div className="mx-auto w-full max-w-md rounded-3xl border-2 border-brand-orange/40 bg-white p-7 text-center shadow-card sm:p-9">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10 text-3xl">
              🔒
            </div>
            <h1 className="break-keep text-lg font-extrabold leading-snug text-brand-dark sm:text-xl">
              조회 한도에 도달했어요
            </h1>
            <p className="mt-3 break-keep text-sm leading-relaxed text-brand-dark/70">
              {limitMsg ||
                "한 계정에서는 서로 다른 사업자 여러 곳의 결과를 무제한으로 확인할 수 없습니다."}
            </p>
            <p className="mt-3 break-keep text-xs leading-relaxed text-brand-dark/50">
              여러 사업장 진단이 필요하시면 아래 채널로 문의해 주세요.
              이미 조회하셨던 사업장 결과는 마이페이지에서 계속 확인하실 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/mypage"
                className="btn-red inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold sm:text-base"
              >
                마이페이지로 가기
              </Link>
              <a
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-dark/15 bg-white px-6 py-2.5 text-sm font-bold text-brand-dark/70 transition hover:bg-gray-50 sm:text-base"
              >
                💬 카카오톡으로 문의하기
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </PageShell>
    );
  }

  // ── 로그인(회원가입) 게이트 화면 (비로그인 시) ──
  //  A안(맛보기 공개): 결과를 통째로 잠그지 않고 ①카테고리별 개수 ②실제 매칭 항목
  //  '앞 3개'를 흐리게(preview-film) 보여준 뒤, 나머지는 가입으로 유도한다.
  //  → 방문자가 '가치'를 눈으로 먼저 확인하고 나서 가입하므로 전환율이 오른다.
  //  진단(mpp_diagnosis)은 localStorage 에 그대로 남아 있으므로,
  //  로그인/가입 후 이 페이지로 돌아오면 곧바로 결과가 열린다.
  if (gate === "guest") {
    // 카테고리별 개수(요약 배너와 동일 계산값) - 스코어링 로직은 손대지 않고 표시만 한다.
    const catCards = [
      { icon: "🏛️", label: "정부지원제도", n: counts?.supports ?? 0 },
      { icon: "💰", label: "정책금융 상품", n: counts?.products ?? 0 },
      { icon: "🎁", label: "추가 감면·혜택", n: counts?.benefits ?? 0 },
    ].filter((c) => c.n > 0);
    // 맛보기 리스트: 실제 매칭 제목 앞 3개만 흐리게 노출(나머지는 가입 후)
    const teaser = matchedTitles.slice(0, 3);
    const restCount = Math.max(0, total - teaser.length);
    // ★ 미래 결제 전환 대비 세팅 ★
    //   지금(BETA_FREE=true): '무료 가입'으로 유도. 상세는 가입만 하면 전부 무료 공개.
    //   나중(BETA_FREE=false): 동일 UI에서 문구/버튼이 '가입 후 결제'로 자동 전환된다.
    //   → 스위치 하나(betaConfig)로 맛보기→가입→결제 퍼널이 그대로 이어진다.
    const ctaLabel = BETA_FREE ? "🔓 무료 회원가입하고 전체 결과 보기" : "🔓 회원가입하고 전체 결과 열기";
    const unlockNote = BETA_FREE
      ? "지금은 오픈 베타 기간이라 가입만 하면 전체 결과를 무료로 확인하실 수 있습니다."
      : "가입 후 결제하시면 기관명·신청방법·서류까지 전체 결과가 열립니다.";
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        {/* (대표님 요청) 모바일 PC 화면 권장 안내 띠 - 미리보기(분석완료) 화면에도 노출 */}
        <MobilePcRecommendBar />
        <main className="px-4 py-10">
          <div className="mx-auto max-w-md">
            {/* ── 히어로: 개수를 크게 강조해 '이렇게 많아?' 체감 ── */}
            <div className="rounded-3xl border-2 border-brand-orange/50 bg-white p-6 text-center shadow-card sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10 text-3xl">
                🎉
              </div>
              <h1 className="mt-3 break-keep text-base font-extrabold text-brand-dark sm:text-2xl">
                {name ? `${name} 대표님 ` : "대표님 "}사업장의 분석이 완료되었습니다.{" "}
                <span className="whitespace-nowrap font-extrabold tracking-wide text-brand-orange">(PRO AI 진단 리포트)</span>
              </h1>
              <p className="mt-2 break-keep text-2xl font-black leading-tight text-brand-orange sm:text-3xl">
                총 {total}개 매칭 🎯
              </p>
              <p className="mt-1 break-keep text-sm text-brand-dark/60">
                대표님 사업장에 해당되는 정부지원사업을 찾았어요.
              </p>

              {/* 카테고리별 개수 - 여기까지는 가입 없이 그대로 공개 */}
              {catCards.length > 0 && (
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {catCards.map((c) => (
                    <div
                      key={c.label}
                      className="break-keep rounded-2xl border border-brand-orange/20 bg-brand-yellow/10 px-2 py-3"
                    >
                      <div className="text-xl">{c.icon}</div>
                      <div className="mt-1 text-xl font-black text-brand-orange">{c.n}</div>
                      <div className="mt-0.5 text-[11px] font-bold leading-tight text-brand-dark/70">
                        {c.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 맛보기 리스트: 실제 매칭 항목 3개를 흐리게 → '진짜 결과가 있다' 증명 ── */}
            {teaser.length > 0 && (
              <div className="relative mt-4 overflow-hidden rounded-3xl border-2 border-brand-orange/30 bg-white p-5 shadow-card">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-brand-dark">
                  <span>🔎</span> 이런 항목들이 매칭됐어요
                </p>
                <ul className="space-y-2.5">
                  {teaser.map((t, i) => (
                    <li
                      key={`${t.kind}-${i}`}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <span className="text-lg">{t.icon}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <span className="block text-[11px] font-bold text-brand-orange">
                          {t.kind}
                        </span>
                        {/* 제목만 흐리게 - '내용은 있는데 정확히 뭔지는 가입해야 안다' */}
                        <span className="preview-lock-text block truncate text-sm font-bold text-brand-dark">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-sm">🔒</span>
                    </li>
                  ))}
                </ul>
                {restCount > 0 && (
                  <p className="mt-3 break-keep text-center text-xs font-bold text-brand-dark/60">
                    + 나머지 <span className="text-brand-orange">{restCount}개</span> 결과가 더
                    기다리고 있어요
                  </p>
                )}
                {/* 아래쪽 페이드로 '더 있다'는 느낌 강조 */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>
            )}

            {/* ── 가입 유도(CTA) ── */}
            <div className="mt-4 rounded-3xl border-2 border-brand-orange/50 bg-white p-6 text-center shadow-card">
              <p className="break-keep text-sm leading-relaxed text-brand-dark/75">
                <b className="text-brand-dark">기관명·신청방법·필요서류</b>까지 전체 결과는
                <br />
                <b className="text-brand-orange">카카오·구글·이메일</b> 10초 가입 후 바로 열립니다.
              </p>
              <Link
                href="/signup?next=%2Fmatching-preview"
                className="btn-brand mt-5 block rounded-full py-3.5 text-center text-base font-bold"
              >
                {ctaLabel}
              </Link>
              <p className="mt-3 break-keep text-xs text-brand-gray">
                이미 가입하셨나요?{" "}
                <Link
                  href="/signup?next=%2Fmatching-preview"
                  className="font-bold text-brand-dark underline"
                >
                  로그인
                </Link>
              </p>
              <div className="mt-5 break-keep rounded-2xl bg-brand-yellow/10 px-4 py-3 text-left text-xs leading-relaxed text-brand-dark/70">
                💡 {unlockNote} 방금 분석한 결과는 안전하게 보관됩니다.
              </div>
              <p className="mt-4 break-keep text-[11px] leading-relaxed text-brand-dark/50">
                ⚠️ 본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며,
                <br />
                정부지원사업 승인을 보장하지 않습니다.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </PageShell>
    );
  }

  // ── 결제 차단 화면 (파산·회생 진행 중 / 세금 체납 / 자본잠식) ──
  //  안 되는데 결제받으면 환불 요청이 뻔하므로, 결제 유도 대신 정직하게 안내한다.
  if (isBlocked) {
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        <main className="px-4 py-10">
          <div className="mx-auto max-w-xl">
            <div className="rounded-3xl border-2 border-brand-red/40 bg-white p-7 text-center shadow-card">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/10 text-3xl">
                ⚠️
              </div>
              <h1 className="mt-4 break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
                {name ? `${name} 대표님, ` : ""}지금은 신청이 어려운 상태입니다
              </h1>
              <p className="mt-3 break-keep text-sm leading-relaxed text-brand-dark/70">
                아래 사유로 현재는 정책자금·정부지원사업 승인이 어려워{" "}
                <b className="text-brand-red">결제를 진행하지 않습니다.</b> 솔직하게 먼저 안내드리는 것이
                대표님께 도움이 된다고 판단했습니다.
              </p>

              <div className="mt-5 space-y-3 text-left">
                {blockReasons.map((r) => (
                  <div
                    key={r}
                    className="break-keep rounded-2xl border border-brand-red/30 bg-brand-red/5 px-4 py-3"
                  >
                    <p className="text-sm font-extrabold text-brand-red">
                      🚫 {PAYMENT_BLOCK_TEXT[r].title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-dark/70">
                      {PAYMENT_BLOCK_TEXT[r].detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 break-keep rounded-2xl bg-brand-yellow/10 px-4 py-3 text-left text-xs leading-relaxed text-brand-dark/80">
                💡 위 사유가 <b>해소된 후 다시 진단</b>해 주세요.
                <br />
                그러면 정상적으로 매칭 결과를 확인하실 수 있습니다.
                <br />
                궁금한 점은 언제든 상담으로 도와드립니다.
              </div>

              <a
                href="/diagnosis-chat"
                className="btn-brand mt-6 block rounded-full py-3.5 text-center text-base font-bold"
              >
                진단 다시 하기
              </a>
              <a
                href="/"
                className="mt-3 block text-center text-sm text-brand-gray underline"
              >
                홈으로 돌아가기
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </PageShell>
    );
  }

  return (
    <PageShell pageKey="matching-preview">
      <Header />
      {/* (대표님 요청) 모바일 접속자에게 'PC 화면 권장' 안내 띠 - 결과 페이지 상단, 닫으면 기억 */}
      <MobilePcRecommendBar />
      {/* 하단 여백(pb-40)으로 sticky 결제 박스에 콘텐츠가 가려지지 않게
          상단 여백(pt-8/pt-10)으로 헤더와 '분석 완료' 문구 사이에 숨통을 준다 (대표님 요청) */}
      <main className={`px-4 pt-4 sm:pt-5 ${adminView || BETA_FREE ? "pb-0" : "pb-40"}`}>
        {/* 결과창 폭(대표님 재요청: 모바일에서 너무 넓다 → 조금 줄임).
            max-w-5xl(1024) → max-w-3xl(768). 모바일 820→720 확대뷰에서
            좌우 여백이 자연스럽고, 데스크톱에서도 과하게 퍼지지 않는다. */}
        <div className="mx-auto max-w-3xl">
          {/* ── 관리자 열람 모드 안내 배너 (대표님만 보임) ── */}
          {adminView && (
            <div className="mb-6 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 p-4 text-center">
              <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                🔓 관리자 열람 모드 -{" "}
                <span className="text-brand-orange">
                  {adminLabel
                    ? name
                      ? `${adminLabel}\u00A0님`
                      : adminLabel
                    : "이 고객"}
                </span>
                {"\u00A0"}결과 전체 보기
              </p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/70">
                이 화면은 대표님(관리자)만 보는 잠금 해제 결과창입니다. 상담 시 고객과 같은 화면을 보며 안내하세요.
              </p>
            </div>
          )}

          {/* ── 상단 히어로: 가로형으로 개수를 크게 강조해 '와, 이렇게 많아?' 느낌 ──
                (대표님 요청) '000 대표님 사업장의 분석이 완료되었습니다.' + PRO AI 진단 리포트 뱃지 */}
          <div className="text-center">
            <p className="break-keep text-sm font-bold leading-snug text-brand-gray sm:text-lg">
              {name ? (
                <>
                  <span className="font-black text-brand-orange">{name} 대표님</span> 사업장의{" "}
                </>
              ) : (
                "대표님 사업장의 "
              )}
              분석이 완료되었습니다.{" "}
              <span className="whitespace-nowrap font-extrabold tracking-wide text-brand-orange">(PRO AI 진단 리포트)</span>
            </p>

            {/* 가로형 카드: 왼쪽=큰 숫자, 오른쪽=매칭 요약 배지 (모바일에서도 한 줄 유지) */}
            <div className="mt-4 flex flex-row items-stretch gap-3 rounded-3xl border-2 border-brand-orange/60 bg-gradient-to-r from-brand-orange/10 to-white px-3.5 py-2.5 shadow-[0_10px_30px_rgba(255,140,0,0.15)] sm:mt-5 sm:gap-5 sm:px-5 sm:py-3">
              {/* 왼쪽: 큰 숫자 */}
              <div className="flex shrink-0 flex-col items-center justify-center border-r border-brand-orange/25 pr-3 sm:pr-5">
                <span className="break-keep text-[11px] font-bold leading-tight text-brand-dark/80 sm:text-sm">
                  받을 수 있는
                  <br />
                  지원사업
                </span>
                <span className="mt-0.5 flex items-end gap-0.5">
                  <b className="text-5xl font-black leading-none text-brand-orange sm:text-[3.25rem]">
                    {total}
                  </b>
                  <b className="pb-1 text-xl font-extrabold text-brand-orange sm:text-2xl">
                    개
                  </b>
                </span>
                <span className="mt-1 break-keep text-[10px] font-bold text-brand-dark/60 sm:text-xs">
                  매칭 완료 🎉
                </span>
              </div>

              {/* 오른쪽: 매칭 요약 (세로로 쌓아 가로 공간 절약 → 모바일에서도 안 짤림)
                  ★ 화면 아코디언 순서·갯수와 100% 일치: 🏅제도 → 💳정책금융상품 → 💎감면 → 📢그외사업
                  ★ 실측 콜백(liveCounts)이 도착하면 그 값을, 아직이면 초기 계산값을 표시. */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-left">
                {counts && total > 0 ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-bold text-brand-dark sm:text-base">
                      🏅 <span className="whitespace-nowrap text-brand-dark/70">정부지원제도</span>
                      <b className="ml-auto text-[15px] text-brand-orange sm:text-lg">{shownSupports}건</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-bold text-brand-dark sm:text-base">
                      💳 <span className="whitespace-nowrap text-brand-dark/70">정책금융상품</span>
                      <b className="ml-auto text-[15px] text-brand-orange sm:text-lg">{shownProducts}건</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-bold text-brand-dark sm:text-base">
                      💎 <span className="whitespace-nowrap text-brand-dark/70">추가 감면 혜택</span>
                      <b className="ml-auto text-[15px] text-brand-orange sm:text-lg">{shownBenefits}건</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-bold text-brand-dark sm:text-base">
                      📢 <span className="whitespace-nowrap text-brand-dark/70">그 외 지원사업</span>
                      <b className="ml-auto text-[15px] text-brand-orange sm:text-lg">{shownAnnouncements}건</b>
                    </span>
                  </>
                ) : (
                  <span className="break-keep text-sm font-bold text-brand-dark/70">
                    대표님 조건으로 매칭된 지원사업을 정리했어요.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── (대표님 요청) '이런 내용을 알려드립니다' 목차 박스 삭제 - 세로 길이 축소 ── */}

          {/* ── (대표님 요청) '무료 베타 오픈중' 안내 문구 삭제 - 화면 간결화 ── */}

          {/* ── 중간 결제 유도 박스 (정식 유료 모드 전용) ──
               결과를 스크롤하기 전, 화면 중간에서 바로 '어디서 결제하는지' 찾을 수 있게 배치.
               최하단 박스·하단 sticky 바와 함께 3중으로 결제 진입점을 노출 */}
          {!adminView && !BETA_FREE && (
          <div className="mt-6 rounded-2xl border-2 border-brand-orange bg-gradient-to-br from-brand-orange/10 to-white p-4 text-center shadow-[0_8px_28px_rgba(255,140,0,0.18)] sm:p-5">
            <p className="break-keep text-base font-extrabold text-brand-dark sm:text-lg">
              🔓 지금 결제하면 위 <span className="text-brand-orange">{total}개</span> 항목의 상세 내용이 모두 공개됩니다
            </p>
            <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm">
              💳 부담 없는 1회성 결제로 내 사업장에 맞는 모든 정부지원사업을 확인하세요. (VAT 포함)
            </p>
            <a
              href="/pricing"
              className="btn-brand mt-3.5 block rounded-full py-3 text-center text-sm font-bold sm:text-base"
            >
              💳 지금 결제하고 전체 결과 확인하기
            </a>
          </div>
          )}

          {/* ── 실제 결과 전체를 그대로 렌더링 (내용 대부분 공개) ──
               제목·설명·안내는 선명하게 열어 '무엇을 알려주는지' 충분히 이해시키고,
               기관명·상품명·신청 방법(버튼/링크)만 흐리게 + 클릭 차단으로 잠금 표시 */}
          {!adminView && !BETA_FREE && (
          <p className="mt-6 break-keep text-center text-xs text-brand-gray">
            👇 아래는 대표님만을 위해 분석된 <b>실제 결과 화면</b>입니다. 어떤 내용을 알려드리는지 대부분 열어뒀고,
            <b className="text-brand-orange"> 기관명·상품명·신청 방법</b>만 결제 후 공개됩니다.
          </p>
          )}
          {/* ── (대표님 요청) '아래는 실제 결과 화면입니다' 안내 문구 삭제 - 화면 간결화 ── */}
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {/* 실제 대시보드 결과창 - 내용은 열고 이름/버튼만 부분 잠금(previewLock).
                관리자 열람 모드 또는 오픈 베타(무료) 모드에서는 previewLock을 꺼서
                전체 결과를 그대로 보여준다. (베타: 결제 없이 전부 무료 공개) */}
            <AdvancedScreeningPanel
              autoRun
              previewLock={!adminView && !BETA_FREE}
              relatedProfile={profileData}
              onCounts={setLiveCounts}
            />
          </div>

          {/* ── (대표님 요청) 오픈 베타(무료) 안내 한 줄 문구 삭제 ── */}

          {/* ── 결과창 맨 하단 CTA - 홈 하단과 동일한 어두운 카드 디자인으로 통일 (대표님 요청) ── */}
          <section className="mt-4 px-0 pb-0">
            <div className="mx-auto max-w-2xl rounded-3xl bg-brand-dark p-4 text-center shadow-card sm:p-6">
              <Editable
                id="preview-bottom-cta-title"
                as="h2"
                className="break-keep text-xl font-black leading-snug text-white sm:text-2xl"
              >
                더 궁금한 점이 있으신가요?
              </Editable>
              <Editable
                id="preview-bottom-cta-sub"
                as="p"
                className="mx-auto mt-1.5 max-w-md break-keep text-sm leading-snug text-gray-300"
              >
                서비스 이용에 어려움을 겪고 있으시다면 1:1 채널톡 상담하기를 클릭하세요.
              </Editable>
              <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                {/* 왼쪽 - 다시 진단하기 (보조 버튼, 흰색 아웃라인) */}
                <a
                  id="preview-bottom-cta-button"
                  href="/diagnosis-chat"
                  className="w-full rounded-full border-2 border-white bg-transparent px-8 py-3 text-base font-bold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  다시 진단하기
                </a>
                {/* 오른쪽 - 1:1 채널톡 상담하기 (주 버튼, 빨간색) */}
                <a
                  id="preview-bottom-cta-kakao"
                  href="http://pf.kakao.com/_VxfWxan/chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-red w-full rounded-full px-8 py-3 text-base font-bold sm:w-auto"
                >
                  💬 1:1 채널톡 상담하기
                </a>
              </div>
            </div>
          </section>

          {/* ── 결제 유도 박스 (최하단, 정식 유료 모드 전용) ── */}
          {!adminView && !BETA_FREE && (
          <div className="mt-8 rounded-2xl border-2 border-brand-orange bg-white p-4 text-center shadow-[0_8px_28px_rgba(0,0,0,0.12)] sm:p-5">
            <Editable
              id="preview-lock-title"
              as="p"
              className="break-keep text-base font-extrabold text-brand-dark sm:text-lg"
            >
              🔒 결제하면 위 모든 항목의 상세 내용이 공개됩니다
            </Editable>
            <Editable
              id="preview-lock-sub"
              as="p"
              className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm"
            >
              내 사업장에 맞는 모든 정부지원사업을 찾아보세요.
              <br />
              기관·상품·신청 사이트·필요 서류·승인 전략까지 한 번에 확인하실 수 있습니다.
            </Editable>
            <Editable
              id="preview-lock-cta"
              as="a"
              href="/pricing"
              className="btn-brand mt-3.5 block rounded-full py-3 text-center text-sm font-bold sm:text-base"
            >
              지금 결제하고 전체 결과 확인하기
            </Editable>
            <Editable
              id="preview-lock-note"
              as="p"
              className="mt-2.5 break-keep text-[11px] text-brand-dark/50"
            >
              ⚠️ 안내·추천·매칭 서비스 · 승인 보장 없음
            </Editable>
          </div>
          )}
        </div>
      </main>

      {/* ── 쿠팡 파트너스 광고 (결과 하단 · 푸터 위) ──
           partnersId 를 넣으면 다이나믹 위젯 광고가 표시됩니다.
           승인/발급 전에는 placeholder(광고 자리) 로만 노출 → 가짜 광고 방지. */}
      <div className="border-t border-brand-dark/5 px-4 py-2.5">
        <CoupangPartnersBanner
          iframeSrc="https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=680&height=140&tsource="
          iframeHeight={140}
        />
      </div>

      {/* 오픈 베타(무료) 기간에는 하단 고정 바 없이 깔끔하게 둔다. */}

      {/* ── 스크롤을 따라다니는 하단 고정(sticky) 결제 유도 박스 (정식 유료 모드 전용) ──
           스크린샷의 오렌지 결제 유도 박스를 그대로 하단에 고정 → 스크롤 내내 결제 유도
           (관리자 열람 모드에서는 숨김) */}
      {!adminView && !BETA_FREE && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-brand-orange bg-white/97 px-4 py-3 shadow-[0_-6px_24px_rgba(255,140,0,0.22)] backdrop-blur">
        {/* 결제바도 본문 폭(max-w-3xl)에 맞춰 정렬 */}
        <div className="mx-auto max-w-3xl">
          <Editable
            id="preview-sticky-title"
            as="p"
            className="break-keep text-center text-sm font-extrabold text-brand-dark sm:text-base"
          >
            🔒 결제하면 위 모든 항목의 상세 내용이 공개됩니다
          </Editable>
          <Editable
            id="preview-sticky-sub"
            as="p"
            className="mt-1 hidden break-keep text-center text-[11px] leading-relaxed text-brand-dark/60 sm:block sm:text-xs"
          >
            💳 부담 없는 1회성 결제로 내 사업장에 해당되는 모든 정부지원사업을 확인하세요. (VAT 포함)
          </Editable>
          <Editable
            id="preview-sticky-cta"
            as="a"
            href="/pricing"
            className="btn-brand mt-2 block w-full rounded-full py-3 text-center text-sm font-bold sm:text-base"
          >
            💳 지금 결제하고 전체 결과 확인하기
          </Editable>
        </div>
      </div>
      )}

      {/* (대표님 요청) 결과창 하단 CTA와 푸터 사이 세로 빈 공간 축소 → 푸터 상단 여백 줄임 (너무 좁아 아주 살짝 넓힘) */}
      <Footer topGap="mt-5" />
    </PageShell>
  );
}
