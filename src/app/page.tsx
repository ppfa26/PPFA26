"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import ScrollReveal from "@/components/ScrollReveal";
import KakaoFloatingButton from "@/components/KakaoFloatingButton";
import InstallAppButton from "@/components/InstallAppButton";
import StickyDiagnosisBar from "@/components/StickyDiagnosisBar";
import TrustBadges from "@/components/home/TrustBadges";
import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";
import { BETA_FREE } from "@/lib/betaConfig";

const TRUST_BADGES = [
  { icon: "🏛️", text: "공식 정부 사이트 매일 크롤링" },
  { icon: "📚", text: "정부 부처 공문 팩트체크" },
  { icon: "🗂️", text: "정책자금·지원금·바우처·인증" },
  { icon: "🎯", text: "대표님 사업장에 가능한 것만 매칭" },
  { icon: "📝", text: "신청 방법·필요 서류·순서까지" },
  { icon: "🤝", text: "정부지원사업 정식자문" },
  { icon: "💳", text: "부담 없는 1회성 결제" },
  { icon: "💬", text: "1:1 카카오톡 상담 운영" },
];

const VALUES = [
  "어떤 자금·지원사업이 대표님께 맞는지",
  "어디서 어떻게 신청하는지",
  "서류는 뭐가 필요한지",
  "지원사업을 신청하는 순서까지",
];

const FAQS = [
  {
    q: "Q1. 자동결제인가요?",
    a: <>아닙니다. 1회성 결제입니다.</>,
  },
  {
    q: "Q2. 정확히 무엇을 알려주시나요?",
    a: (
      <>
        대표님 사업장이 신청 가능한 정부지원사업을 찾아드립니다.
        <br />
        각 사업의 신청 방법·필요 서류·신청 순서·최신 공고까지 안내드리며,
        <br />
        서류 발급과 최종 신청은 대표님께서 직접 진행하시면 됩니다.
      </>
    ),
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: (
      <>
        아닙니다. 본 서비스는 안내·추천·매칭 플랫폼입니다.
        <br />
        승인 여부는 정부 기관 심사로 결정되며,
        <br />
        정부지원사업 승인을 보장하지 않습니다.
      </>
    ),
  },
  {
    q: "Q4. 결제 후 추가 수수료가 있나요?",
    a: (
      <>
        없습니다.
        <br />
        서비스 이용료 외 추가 수수료는 없습니다.
      </>
    ),
  },
  {
    q: "Q5. 환불되나요?",
    a: (
      <>
        열람 후에는 관련 법령에 따라 환불이 불가합니다.
        <br />
        단, 열람 전에는 7일 이내는 100% 환불됩니다.
        <br />
        본 사이트는 전자상거래법을 따릅니다.
      </>
    ),
  },
  {
    q: "Q6. 어떤 지원사업까지 안내되나요?",
    a: (
      <>
        정부 지원금·바우처·정책자금·감면제도를 안내합니다.
        <br />
        K-Startup, 창업패키지, 지자체 사업도 포함합니다.
        <br />
        국내 모든 정부지원사업 안내를 목표로 합니다.
      </>
    ),
  },
  {
    q: "Q7. 정보는 얼마나 최신인가요?",
    a: (
      <>
        매일 정부 공식 사이트를 자동으로 확인합니다.
        <br />
        최신 공고를 팩트체크 후 반영합니다.
      </>
    ),
  },
];

export default function Home() {
  return (
    <PageShell pageKey="home">
      <ScrollReveal />
      <Header />
      {/* ★ 하단 플로팅 버튼(앱 설치·1:1 상담)이 마지막 콘텐츠를 가리지 않도록
          모바일에서 본문 아래에 안전 여백을 확보 (데스크톱은 버튼이 화면 밖 우측이라 영향 적음) */}
      <main className="pb-24 sm:pb-0">
        {/* 히어로 */}
        <section
          id="hero-section"
          className="relative overflow-hidden px-4 pb-4 pt-4 sm:pb-8 sm:pt-8"
        >
          <div className="hero-glass mx-auto max-w-3xl rounded-3xl px-6 py-6 text-center animate-fadeUp sm:px-12 sm:py-12">
            {/* 상단 배지 (노란색 서비스 소개 배지) */}
            <div className="mb-5 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <Editable
              id="hero-badge"
                as="div"
                className="inline-block rounded-full bg-brand-yellow px-5 py-2 text-sm font-extrabold tracking-[-0.01em] text-brand-dark sm:px-6 sm:py-2.5 sm:text-base"
              >
                정부지원사업 AI 통합 매칭 플랫폼
              </Editable>
            </div>
            <Editable
              id="hero-headline-v3"
              as="h1"
              className="break-keep text-[23px] font-black leading-[1.26] tracking-[-0.03em] text-brand-dark xs:text-[26px] sm:text-[42px] sm:leading-[1.16] sm:tracking-[-0.035em]"
            >
              AI를 활용해 내 사업장에 알맞은
              <br />
              <span className="text-brand-red">정부지원사업</span>을 찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-[15px] font-medium leading-relaxed text-brand-gray sm:mt-5 sm:text-[19px] sm:leading-relaxed"
            >
              대표님 사업장이 받을 수 있는 정부지원사업
              <br />
              AI가 <b className="text-brand-dark">찾아서 신청 방법까지</b> 알려드립니다.
            </Editable>

            {/* ── 서비스 범위(무엇을 해주는지) - 체크칩 3개를 서브카피 바로 아래에 배치해
                "이 회사가 뭘 해주는 곳인지"를 첫눈에 인지시킴 ── */}
            <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:mt-5 sm:gap-x-3">
              {["맞춤 AI 매칭", "신청 가능 사업만", "서류·신청까지 안내"].map(
                (t, i) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold tracking-[-0.01em] text-brand-dark shadow-sm sm:text-sm"
                  >
                    <span className="text-brand-orange">✓</span>
                    <Editable id={`hero-check-${i}`} as="span">
                      {t}
                    </Editable>
                  </li>
                )
              )}
            </ul>

            {/* ── 신뢰 바(증거) - 흩어져 있던 300개·24개 두 배지를 한 줄 pill 하나로 통합.
                가운뎃점으로 묶어 노이즈를 줄이고 "얼마나 검증됐는지"를 한 번에 전달 ── */}
            <div className="mx-auto mt-5 flex w-fit max-w-lg flex-wrap items-center justify-center gap-x-2.5 gap-y-1 whitespace-nowrap rounded-full border border-brand-red/25 bg-brand-red/[0.06] px-5 py-2 sm:mt-5 sm:gap-x-3.5 sm:px-6">
              <span className="inline-flex items-baseline gap-1 break-keep text-[12.5px] font-bold text-brand-dark/80 sm:text-[15px]">
                이미
                <b className="text-[19px] font-black leading-none tracking-[-0.03em] text-brand-red sm:text-[23px]">300</b>
                <b className="text-[13px] font-extrabold text-brand-red sm:text-[15px]">개+</b>
                기업이 이용중
              </span>
              <span className="text-brand-dark/15" aria-hidden="true">·</span>
              <span className="inline-flex items-baseline gap-1 break-keep text-[12.5px] font-bold text-brand-dark/80 sm:text-[15px]">
                평균 지원사업
                <b className="text-[19px] font-black leading-none tracking-[-0.03em] text-brand-orange sm:text-[23px]">24</b>
                <b className="text-[13px] font-extrabold text-brand-orange sm:text-[15px]">개</b>
                매칭
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:mt-6 sm:flex-row sm:gap-3">
              {/* 주 CTA - 최우선 행동. 부 버튼보다 살짝 크고 굵게(위계 강화) */}
              <Editable
                id="hero-cta-primary"
                as="a"
                href="/diagnosis-chat"
                className="btn-red w-full whitespace-nowrap rounded-full px-6 py-3.5 text-[16px] font-extrabold tracking-[-0.02em] animate-pulseGlow sm:w-auto sm:px-10 sm:py-4 sm:text-[18px] sm:tracking-[-0.01em]"
              >
                지금 내 지원사업 확인하기
              </Editable>
              {/* 부 CTA - 보조 행동이므로 조금 차분하게(작게) 두어 주 버튼이 도드라지게 */}
              <Editable
                id="hero-cta-secondary"
                as="a"
                href={BETA_FREE ? "#result-sample-section" : "/pricing"}
                className="btn-outline w-full whitespace-nowrap rounded-full px-8 py-3 text-[15px] font-bold sm:w-auto sm:py-3.5 sm:text-base"
              >
                {BETA_FREE ? "무엇을 알려주나요?" : "상품 자세히 보기"}
              </Editable>
            </div>

            {/* ── 보조 링크 - 흩어져 있던 링크(카톡 상담·더 알아보기)를 CTA 아래 한 곳에 모아
                상단은 깔끔하게, 부가 행동은 여기서 유도(이탈 방지) ── */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:mt-5">
              <Editable
                id="hero-review-link"
                as="a"
                href="https://link.inpock.co.kr/ppfa25"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-keep text-[13px] font-bold text-brand-dark/70 underline decoration-brand-dark/25 underline-offset-4 transition hover:text-brand-red sm:text-sm"
              >
                🔎 모두의사업친구 더 알아보기 →
              </Editable>
              <span className="hidden text-brand-dark/15 sm:inline" aria-hidden="true">·</span>
              <Editable
                id="hero-cta-kakao"
                as="a"
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 break-keep text-[13px] font-bold text-brand-dark/70 underline decoration-brand-dark/25 underline-offset-4 transition hover:text-brand-dark sm:text-sm"
              >
                💬 카카오톡으로 1:1 상담받기 →
              </Editable>
            </div>

            {/* 면책 고지 - 광고 심사/표시광고법 대응 (대표님 요청) */}
            <Editable
              id="hero-disclaimer"
              as="p"
              className="mx-auto mt-6 max-w-xl break-keep text-[11px] leading-relaxed text-brand-gray/70 sm:mt-6 sm:text-xs"
            >
              본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며, 정부지원사업 승인을 보장하지 않습니다.
            </Editable>
          </div>
        </section>

        {/* 구간 구분 - 얇은 회색 가로줄 (대표님 요청: 히어로↔서비스안내 사이에도 구분선 추가) */}
        <div className="section-divider" aria-hidden="true" />
        {/* 서비스 안내 (통합) - (대표님 요청) 기존 '🎯 서비스 안내' 박스 + '아직 몰라서 못 받고 있는 정부지원사업' 7칸 배지를
            하나의 설명 섹션으로 통합. 순서: 제목/서브문구 → 4칸 체크리스트(VALUES) → 7칸 배지(TrustBadges) */}
        <section className="bg-gray-50 px-4 py-6 sm:py-10">
          <div className="reveal mx-auto max-w-3xl text-center">
            {/* (대표님 요청) 가로폭 조금 확대(is-wide-value=40rem) */}
            <div className="section-title-glass is-wide-value mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm">
                🎯 서비스 안내
              </span>
              <Editable
                id="home-value-title-v2"
                as="h2"
                className="break-keep text-[22px] font-black tracking-[-0.03em] text-brand-dark sm:text-[26px]"
              >
                아직 몰라서 못 받고 있는 정부지원사업
              </Editable>
              <Editable
                id="home-value-sub-v3"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium leading-relaxed text-brand-gray"
              >
                내 사업장이 받을 수 있는 <b className="text-brand-dark">모든 정부지원사업</b>을
                <br />
                AI가 모두 찾아 무엇을·어디서·어떻게까지 알려줍니다.
              </Editable>
            </div>

            {/* 소제목 ① - 무엇을 알려주는지 (상·하 여백 동일하게 mt-4) */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
              <Editable
                id="home-value-step1"
                as="span"
                className="break-keep text-[13px] font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm"
              >
                이런걸 알려드려요
              </Editable>
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
            </div>

            {/* 해드리는 것 4칸 (VALUES) */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="hover-lift flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 text-left shadow-card sm:p-5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white sm:h-8 sm:w-8">
                    ✓
                  </span>
                  <Editable
                    id={`home-value-${i}`}
                    as="span"
                    className="break-keep text-sm font-semibold text-brand-dark sm:text-base"
                  >
                    {v}
                  </Editable>
                </div>
              ))}
            </div>

            {/* 소제목 ② - 어떻게 찾아드리는지 (상·하 여백 동일하게 mt-4) */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
              <Editable
                id="home-value-step2"
                as="span"
                className="break-keep text-[13px] font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm"
              >
                이렇게 알려드려요
              </Editable>
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
            </div>

            {/* 어떻게 찾아드리는지 7칸 배지 (TRUST_BADGES) */}
            <div className="mt-4">
              <TrustBadges badges={TRUST_BADGES} />
            </div>

            {/* 소제목 ③ - 실제 결과 예시 (대표님 요청: 위 소제목과 동일한 주황 라인으로
                '서비스 안내'와 '결과 예시본'을 하나의 카테고리처럼 연결) */}
            <div
              id="result-sample-section"
              className="mt-4 flex scroll-mt-20 items-center justify-center gap-2 sm:scroll-mt-24"
            >
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
              <Editable
                id="home-value-step3"
                as="span"
                className="break-keep text-[13px] font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm"
              >
                결과는 이렇게 나와요
              </Editable>
              <span className="h-px w-6 bg-brand-orange/40" aria-hidden="true" />
            </div>

            {/* 실제 대시보드 목업(그대로 재현) - 노트북 프레임 안에 담아 '화면'처럼 · 목업은 max-w-3xl로 좁게 유지 */}
            <div className="relative mx-auto mt-4 max-w-3xl text-left">
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                {/* 브라우저 상단 바 */}
                <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 truncate text-[11px] text-gray-400">
                    모두의사업친구 · 내 사업장 진단 결과
                  </span>
                </div>

                {/* 진단 완료 배너 - 실제 결과창 상단 히어로와 동일한 구조·문구·순서로 재현.
                    ★ 배지 4종·순서(🏅정부지원제도 → 💳정책금융상품 → 💎추가 감면 혜택 → 📢그 외 지원사업)를
                      실제 matching-preview 히어로와 100% 일치시킴 · 합계 24 = 5+8+6+5 */}
                <div className="p-4 pb-0 sm:p-6 sm:pb-0">
                  <div className="rounded-3xl border-2 border-brand-orange/60 bg-gradient-to-r from-brand-orange/10 to-white p-3 shadow-[0_10px_30px_rgba(255,140,0,0.15)] sm:p-3.5">
                    <p className="break-keep text-center text-[15px] font-bold leading-snug text-brand-dark/80 sm:text-[17px]">
                      🎉 진단 완료! <b className="font-black text-brand-orange">지금 신청해볼 수 있는 정부지원사업</b>이에요.
                    </p>
                    {/* 가로형: 왼쪽 큰 숫자 + 오른쪽 세로 요약 (실제 결과창 히어로와 동일 구조).
                        (대표님 요청) 왼쪽 '24개' 강조 확대 + 오른쪽 배지 가로 공백 축소 */}
                    <div className="mt-3 flex flex-row items-stretch gap-2 sm:gap-3">
                      {/* 왼쪽: 총 개수 큰 숫자 - 첫 화면 최대 후킹 포인트라 크게 강조(대표님 요청) */}
                      <div className="flex shrink-0 flex-col items-center justify-center border-r border-brand-orange/25 pr-2.5 sm:pr-3.5">
                        <span className="break-keep text-[11px] font-bold leading-tight text-brand-dark/70 sm:text-[13px]">
                          받을 수 있는
                          <br />
                          지원사업
                        </span>
                        <span className="mt-0.5 flex items-end gap-0.5">
                          <b className="text-5xl font-black leading-none text-brand-orange sm:text-6xl">24</b>
                          <b className="pb-0.5 text-xl font-extrabold text-brand-orange sm:text-2xl">개</b>
                        </span>
                        <span className="mt-1 break-keep text-[10px] font-bold text-brand-dark/50 sm:text-[11px]">
                          매칭 완료 🎉
                        </span>
                      </div>
                      {/* 오른쪽: 세로 요약 배지 4종 - 실제 결과창(matching-preview)과 동일 스타일로 통일
                          (대표님 요청: 결과창 버전이 더 마음에 듦 → bg-white/70 박스 + 라벨 어둡게 + 건수 오렌지) */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        {[
                          { icon: "🏅", l: "정부지원제도", n: "5건" },
                          { icon: "💳", l: "정책금융상품", n: "8건" },
                          { icon: "💎", l: "추가 감면 혜택", n: "6건" },
                          { icon: "📢", l: "그 외 지원사업", n: "5건" },
                        ].map((s) => (
                          <span
                            key={s.l}
                            className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-bold text-brand-dark sm:text-[15px]"
                          >
                            {s.icon}{" "}
                            <span className="whitespace-nowrap text-brand-dark/70">{s.l}</span>
                            <b className="ml-auto text-[14px] text-brand-orange sm:text-lg">{s.n}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 결과 본문 - 실제 결과창 AccordionCard(흰 배경·얇은 테두리·검정 제목·부제·우측 원형 화살표)와
                    동일한 겉모양으로 재현. 순서도 실제 결과창과 100% 일치:
                    🌱창업지원 → 🏅제도+감면 통합 → 💳정책금융상품(기관별) → 📢그 외 지원사업.
                    (홈은 정적 목업이라 details/summary로 접기 구현 - 겉보기만 실제 카드와 동일하게 맞춤) */}
                <div className="space-y-3 p-4 text-left sm:p-6">

                  {/* ★ 상단 사용 안내 배너 - 실제 결과창(AdvancedScreeningPanel)과 동일 문구 */}
                  <div className="rounded-2xl border border-brand-orange/70 bg-brand-grad px-4 py-3 shadow-card">
                    <p className="break-keep text-[13px] font-semibold leading-relaxed text-brand-dark/80">
                      👇 <b>✅ 표시</b>된 곳이 <b>지금 바로 신청 가능한 곳</b>이에요.{" "}
                      <b>&ldquo;상품 보기&rdquo;</b>를 누르면 신청 방법을 순서대로 알려드려요.
                    </p>
                  </div>

                  {/* ⓪ 🌱 예비·초기·청년창업자 지원사업 (실제 결과창 맨 위 카드) - 기본 펼침.
                      무상 사업화 자금 중심. 실제 PRE_FOUNDER_PROGRAMS 데이터와 동일 문구. */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">🌱</span>
                          <span className="min-w-0 break-keep">예비·초기·청년창업자 지원사업</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          창업 단계 대표님을 위한 무상 사업화 자금이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3">
                      <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                        아래는 <b>예비·초기·청년 창업자</b>가 신청할 수 있는 대표적인 <b>사업화 자금(무상)</b> 지원사업이에요.
                        <br />
                        갚지 않아도 되는 지원금이니 창업 단계에서 꼭 챙기시길 권장드립니다.
                      </p>
                    </div>
                    <div className={`mt-3 space-y-2.5 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { t: "초기창업패키지", amount: "최대 1억원 (평균 약 7,000만원 · 사업화 자금)", target: "창업 3년 이내 초기 창업기업 대표자" },
                        { t: "청년창업사관학교 (창업성공패키지)", amount: "최대 1억원 (총사업비의 70% 이내 · 평균 약 7,000만원)", target: "만 39세 이하 예비창업자 및 창업 3년 이내 대표자" },
                        { t: "스타트업 원스톱 지원센터", amount: "무료 (정부 지원사업 통합 안내·상담 창구)", target: "예비창업자 및 모든 창업기업 (누구나 이용 가능)" },
                      ].map((p, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2 break-keep text-sm font-extrabold text-brand-dark">
                              <span className="shrink-0 rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">사업화 자금</span>
                              {p.t}
                            </span>
                            <span className="break-keep text-xs font-bold text-brand-green">{p.amount}</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/60">
                            <b className="text-brand-dark/80">대상</b> · {p.target}
                          </p>
                          {/* 4버튼(신청하러 가기 / 신청 방법·서류 / 소요기간 / 연락처) — 미리보기라 비활성 */}
                          <div className="mt-2.5 flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-block cursor-default break-keep rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,140,0,0.4)]">📝 신청하러 가기 →</span>
                              <span className="inline-block cursor-default break-keep rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange">📋 신청 방법·서류</span>
                              <span className="inline-block cursor-default break-keep rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange">⏱️ 소요기간 통상 6~10주</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex cursor-default items-center gap-1 break-keep rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">📞 1357</span>
                              <span className="break-keep text-[11px] leading-relaxed text-brand-dark/45">창업·정부지원 통합콜센터(1357)로 문의하면 K-Startup 신청 안내가 빠릅니다.</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-dark/45">
                      ※ 공고 시기·지원금·자격은 매년 달라질 수 있어요. 신청 전 각 기관 공식 공고를 꼭 확인하세요.
                    </p>
                    </div>
                  </details>

                  {/* ① 🏅 신청·감면 혜택 한번에 챙기기 (실제 결과창 = 제도 + 감면 통합 카드) - 기본 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">🏅</span>
                          <span className="min-w-0 break-keep">신청·감면 혜택 한번에 모두 챙기기</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          신청 가능한 제도와 세금 아끼는 감면을 모았어요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    {/* ── 제도 subsection 안내 (실제 결과창 초록 박스와 동일 문구) ── */}
                    <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3">
                      <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                        아래는 대표님 진단 결과 <b>지금 바로 신청할 수 있는 정부지원제도</b>만 추린 목록이에요.
                        <br />
                        대출과 별개로 병행 신청할 수 있으니, 놓치지 말고 하나씩 확인해보시길 권장드립니다.
                      </p>
                    </div>
                    {/* 개별 제도 카드 - 실제 결과창 카드(흰 배경·얇은 테두리·제목+뱃지→안내→설명→회색 신청방법→버튼 2종) */}
                    <div className={`mt-4 space-y-3 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { icon: "🏭", t: "중소기업 혁신바우처", badge: "신청 가능", badgeCls: "bg-brand-green", d: "컨설팅·기술지원·마케팅 등 바우처 형태로 지원(매출 규모별 차등).", hook: "제조 소기업이면 우선 지원 대상이라 선정 확률이 높습니다.", locked: "🔒 신청 사이트 주소 · 제출 서류 목록 · 신청 순서 · 마감일까지 결제 후 공개" },
                        { icon: "🧑‍💼", t: "고용촉진장려금 (고용24)", badge: "조건 충족 시 가능", badgeCls: "bg-brand-orange/90", d: "취업취약계층을 정규직으로 채용하면 1인당 최대 720만원 지원.", hook: "채용 계획이 있으면 채용 전 신청해야 대상이 됩니다.", locked: "🔒 지원 대상 요건 체크 · 신청 순서 · 담당 기관 연락처까지 결제 후 공개" },
                        { icon: "🛡️", t: "두루누리 사회보험료 지원", badge: "신청 가능", badgeCls: "bg-brand-green", d: "신규 채용 근로자·사업주의 국민연금·고용보험료 최대 80% 지원.", hook: "근로자 10명 미만 사업장은 4대보험 신고 시 함께 신청돼 사실상 자동입니다.", locked: "🔒 지원 대상 요건 체크 · 신고 시 신청 방법 · 담당 기관 연락처까지 결제 후 공개" },
                      ].map((g, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="text-base">{g.icon}</span>
                            <span className="text-[14px] font-extrabold text-brand-dark">{g.t}</span>
                            <span className={`shrink-0 break-keep rounded-full ${g.badgeCls} px-2 py-0.5 text-[10px] font-bold text-white`}>{g.badge}</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[12px] font-semibold leading-relaxed text-brand-green">
                            💡 {g.hook}
                          </p>
                          <p className="mt-1 break-keep text-[12px] leading-relaxed text-brand-gray">{g.d}</p>
                          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
                            <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                              <span className="font-bold text-brand-dark">📝 신청방법 </span>
                              <span className="align-middle text-brand-dark/70">{g.locked}</span>
                            </p>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg bg-brand-dark px-3 py-2 text-[11px] font-bold text-white">🔒 이 상품 신청하러 가기 →</span>
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[11px] font-bold text-brand-orange">🔒 상세 · 소요기간 · 연락처 →</span>
                          </div>
                        </div>
                      ))}
                      {/* 조건 충족 시 가능한 다른 제도 더 보기 (실제 결과창과 동일 버튼) */}
                      <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange/[0.06] px-3 py-2.5 text-[12px] font-extrabold text-brand-orange">
                        조건 충족 시 가능한 다른 제도 2개 더 보기 ▼
                      </span>
                    </div>

                    {/* ── 💎 챙기면 좋은 감면 혜택 (실제 결과창 = 같은 🏅 아코디언 안에 통합) ── */}
                    <div className="mt-5 border-t border-dashed border-brand-dark/15 pt-4">
                      <span className="flex items-center gap-2 text-[15px] font-extrabold leading-snug text-brand-dark">
                        <span className="shrink-0">💎</span>
                        <span className="min-w-0 break-keep">챙기면 좋은 감면 혜택</span>
                      </span>
                      <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                        세금·수수료를 아낄 수 있는 혜택이에요
                      </span>
                      <div className={`mt-3 space-y-2.5 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                        {[
                          { t: "카드 수수료 우대율", c: "수수료", cCls: "bg-rose-100 text-rose-700", saving: "연 약 60만원 절감", hook: "연매출 30억원 이하 영세·중소가맹점이면 별도 신청 없이 자동 적용됩니다.", applyName: "카드사·여신금융협회" },
                          { t: "청년창업중소기업 세액감면", c: "세액감면", cCls: "bg-rose-100 text-rose-700", saving: "소득세·법인세 50% 감면 (수도권)", hook: "만 34세 이하·창업 5년 이내면 세무신고 때 자동 적용, 경쟁이 없습니다.", applyName: "홈택스" },
                          { t: "창업중소기업 세액감면", c: "세액감면", cCls: "bg-rose-100 text-rose-700", saving: "소득세·법인세 50% 감면 (수도권)", hook: "창업 5년 이내면 요건 충족 시 신고 때 자동 적용됩니다.", applyName: "홈택스" },
                        ].map((b, i) => (
                          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="break-keep text-sm font-extrabold text-brand-dark">💰 {b.t}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.cCls}`}>{b.c}</span>
                              <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">신청 가능</span>
                            </div>
                            <p className="mt-1.5 break-keep text-[12px] font-bold text-brand-green">📉 {b.saving}</p>
                            <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">💡 {b.hook}</p>
                            {/* 실제 결과창과 동일한 '신청하러 가기' 버튼 — 미리보기라 비활성 */}
                            <span className="mt-2.5 inline-block cursor-default break-keep rounded-lg bg-brand-orange px-3 py-2 text-[11px] font-bold text-white">
                              🔗 {b.applyName} 신청하러 가기 →
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 break-keep rounded-xl bg-brand-yellow/40 px-3 py-2 text-center text-[12px] font-bold text-brand-dark">
                        💡 요건에 맞게 챙기면 첫 해 <span className="whitespace-nowrap">연 최대 700만원 절감</span> 가능
                      </p>
                    </div>
                    </div>
                  </details>

                  {/* ② 💳 이용 가능한 정책금융상품 (실제 결과창 = 기관별 상세: 기보/중진공/소진공) - 기본 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">💳</span>
                          <span className="min-w-0 break-keep">바로 신청 가능한 정책금융상품</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          낮은 금리로 받을 수 있는 자금이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    {/* 안내 (실제 결과창 파란 박스와 동일 문구) */}
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                        아래는 대표님이 <b>낮은 금리로 이용할 수 있는 정책금융상품</b>이에요.
                        지원금(무상)과 달리 <b>갚아야 하는 자금</b>이지만,
                        <br />
                        시중 대출보다 금리·조건이 유리하니 필요할 때 활용하시길 권장드립니다.
                      </p>
                    </div>
                    {/* 기관별 상세 - 실제 결과창(기관명+대리/직접대출 배지 → 안내 → 상품 보기 버튼) */}
                    <div className={`mt-2 divide-y divide-gray-200 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { inst: "기술보증기금", nature: "대리대출", natCls: "bg-purple-100 text-purple-700", isGuarantee: true, criteria: "기술력 보유 중소·벤처기업 대상 기술보증서 발급. 보증서로 은행 대출 실행.", prodCount: 3, siteLabel: "기술보증기금 사이트", pdfLabel: "정책자금 상품안내 확인하기", tel: "1544-****", telNote: "기술평가 기반 보증은 기보로 문의하면 상담이 빠릅니다." },
                        { inst: "중소벤처기업진흥공단", nature: "직접대출", natCls: "bg-purple-100 text-purple-700", isGuarantee: false, criteria: "신성장기반자금·신시장진출자금 등 공단이 직접 저금리로 융자. 시설·운전자금 모두 가능.", prodCount: 3, siteLabel: "중소벤처기업진흥공단 사이트", pdfLabel: "정책자금 상품안내 확인하기", tel: "1811-****", telNote: "정책자금 전용번호가 일반문의보다 대기가 짧습니다." },
                        { inst: "소상공인시장진흥공단", nature: "직접대출", natCls: "bg-purple-100 text-purple-700", isGuarantee: false, criteria: "혁신성장촉진자금·대환대출 등 소상공인 전용 저금리 정책자금.", prodCount: 2, siteLabel: "소상공인정책자금 사이트", pdfLabel: "정책자금 상품안내 확인하기", tel: "1533-****", telNote: "중진공·소진공·중기부 통합상담도 가능합니다." },
                      ].map((m, i) => (
                        <div key={i} className="py-4 first:pt-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[14px] font-extrabold text-brand-dark">{m.inst}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.natCls}`}>{m.nature}</span>
                            <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">✅ 신청 가능</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-brand-gray">{m.criteria}</p>
                          {m.isGuarantee ? (
                            <p className="mt-2 break-keep rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-brand-dark/80">
                              <b>ℹ️ 대리대출(보증)</b> · 이 기관은 <b>보증서를 발급</b>해 드리면 그 보증서로 <b>은행에서 대출</b>이 실행돼요.
                            </p>
                          ) : (
                            <p className="mt-2 break-keep rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-brand-dark/80">
                              <b>ℹ️ 직접대출</b> · 이 상품은 <b>은행을 거치지 않고</b> 기관에서 <b>대출이 바로 실행</b>돼요.
                            </p>
                          )}
                          <div className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-2">
                            <span className="break-keep text-[12px] font-extrabold text-brand-orange">💳 신청 가능 상품 {m.prodCount}개 보기</span>
                            <span className="shrink-0 text-brand-orange">▼</span>
                          </div>
                          {/* 실제 결과창과 동일한 버튼 4종(신청 매뉴얼 / 사이트 / 안내자료 / 연락처) — 미리보기라 비활성 */}
                          <div className="mt-2.5 flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-block cursor-default rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange opacity-90">📄 신청 매뉴얼</span>
                              <span className="inline-block cursor-default rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,140,0,0.4)]">🔗 {m.siteLabel}</span>
                              <span className="inline-block cursor-default rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange opacity-90">📑 {m.pdfLabel}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex cursor-default items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">📞 {m.tel}</span>
                              <span className="break-keep text-[11px] leading-relaxed text-brand-dark/45">{m.telNote}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </details>

                  {/* ④ 📢 추가적인 그 외 정부지원사업 (실제 결과창 네 번째 카드 · 기업마당 실공고) - 예시라 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">📢</span>
                          <span className="min-w-0 break-keep">그 외 놓치기 쉬운 지원사업</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          추가로 챙겨볼 만한 정부지원이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    {/* 실제 결과창 공고 카드(제목+지원규모 태그 → 🗓️신청기간 배지 → 🏛️기관·대상 + 원문 버튼)와 동일 */}
                    <div className={`mt-4 space-y-3 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { title: "2026년 스마트 제조혁신 지원사업(스마트공장 구축)", scale: "최대 6천만원", deadline: "2026년 통합공고 진행", org: "중소벤처기업부", target: "제조 중소기업" },
                        { title: "2026년 인천 소상공인 경영환경개선 지원사업", scale: "항목별 최대 250만원", deadline: "예산 소진 시 마감", org: "인천광역시", target: "인천 소상공인" },
                        { title: "2026년 수출바우처 사업(수출지원기반활용)", scale: "최대 1억원", deadline: "연중 차수별 모집", org: "산업통상자원부", target: "수출 희망 중소기업" },
                      ].map((it, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="break-keep text-[14px] font-extrabold leading-snug text-brand-dark">{it.title}</span>
                            <span className="shrink-0 break-keep rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">{it.scale}</span>
                          </div>
                          <span className="mt-2 inline-block shrink-0 break-keep rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-dark">🗓️ {it.deadline}</span>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-[12px] leading-relaxed text-brand-gray">
                              🏛️ {it.org}<span className="mx-1.5 text-brand-dark/25">·</span>
                              <span className="font-bold text-brand-dark/70">대상 </span>{it.target}
                            </p>
                            <span className="shrink-0 break-keep rounded-lg bg-brand-orange px-3 py-2 text-[11px] font-bold text-white">공고 원문 보러 가기 →</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 🔖 정부 사이트 안내 - '추가적인 그 외 정부지원사업' 목차 최하단에 포함(대표님 요청).
                        예시본이라 클릭 비활성(후킹용: '이런 것도 알려주는구나'). 실제 이동은 결과창에서만. */}
                    <div
                      aria-hidden="true"
                      className="mt-3 flex select-none flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 break-keep text-[14px] font-extrabold leading-snug text-brand-dark sm:text-[15px]">
                          🔖 대표님들이 알아두면 좋은 정부 사이트
                        </span>
                        <span className="mt-0.5 block break-keep text-[12px] leading-relaxed text-brand-gray">
                          알아두면 좋은 정부 기관 공식 사이트예요
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-brand-orange/40 bg-white px-3.5 py-1.5 text-[12px] font-bold text-brand-orange">
                        사이트 바로가기
                      </span>
                    </div>
                    </div>
                  </details>

                  {/* 결제 유도 배너 - 예시본 하단(대표님 요청: '이 정도로 상세하게 알려주는구나 → 결제해봐야겠다'
                      마음이 들도록). 지금 가려진 신청 방법·서류·연락처·버튼이 결제 후 전부 열린다는 안내 */}
                  <div
                    aria-hidden="true"
                    className="select-none rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-amber-50 to-orange-50 p-5 text-center sm:p-6"
                  >
                    <p className="break-keep text-[15px] font-extrabold leading-snug text-brand-dark sm:text-[16px]">
                      <span className="text-brand-orange">🔒 잠긴 부분</span>은 진단 완료시 전부 공개됩니다.
                    </p>
                    <ul className="mx-auto mt-3 flex w-fit max-w-full flex-col items-start gap-1.5 text-left text-[12px] leading-relaxed text-brand-dark/80 sm:text-[13px]">
                      {[
                        "제도별 신청 사이트 주소 · 접수 페이지 링크",
                        "필요 서류 목록 · 신청 순서 · 마감일",
                        "담당 기관 및 고객센터 연락처",
                        "「이 상품 신청하러 가기」 등 모든 버튼 활성화",
                      ].map((t, i) => (
                        <li key={i} className="flex items-center gap-2 break-keep sm:whitespace-nowrap">
                          <span className="shrink-0 text-brand-green">✅</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* 구간 구분 - 얇은 회색 가로줄 (대표님 요청: 결과예시↔이용료 사이에도 구분선 추가) */}
        <div className="section-divider" aria-hidden="true" />
        {/* 가격표 */}
        <section
          id="pricing-section"
          className="scroll-mt-20 px-4 py-6 sm:scroll-mt-24 sm:py-10"
        >
          <div className="reveal mx-auto max-w-5xl">
            {/* (대표님 요청) 상단 헤더 박스 - 가로폭 조금 축소(is-wide-pricing=38rem) */}
            <div className="section-title-glass is-wide-pricing mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm">
                💳 서비스 이용 플랜
              </span>
              <Editable
                id="home-pricing-title"
                as="h2"
                className="break-keep text-[22px] font-black tracking-[-0.03em] text-brand-dark sm:text-[26px]"
              >
                PRO AI 진단 리포트
              </Editable>
              <Editable
                id="home-pricing-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium text-brand-gray"
              >
                1회성 결제이며, 월 구독이 아닙니다.
              </Editable>
            </div>
            <div className="mt-6">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        {/* 구간 구분 - 얇은 회색 가로줄 */}
        <div className="section-divider" aria-hidden="true" />
        {/* 섹션 상하 여백 - 하단 여백 축소(대표님 요청) */}
        <section className="bg-gray-50 px-4 py-6 sm:py-10">
          <div className="reveal mx-auto max-w-4xl">
            <div className="section-title-glass is-wide mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm">
                💬 자주 묻는 질문
              </span>
              <Editable
                id="home-faq-title"
                as="h2"
                className="break-keep text-[22px] font-black tracking-[-0.03em] text-brand-dark sm:text-[26px]"
              >
                궁금한 점, 미리 확인하세요
              </Editable>
              <Editable
                id="home-faq-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium text-brand-gray"
              >
                결제 전 가장 많이 묻는 질문들을 모았습니다.
              </Editable>
            </div>
            {/* (대표님 요청) 아코디언 목록 가로폭 축소 - 제목 박스(is-wide=max-w-2xl)와 통일 */}
            <div className="mx-auto mt-6 max-w-2xl space-y-3">
              {FAQS.map((f, i) => (
                <details
                  key={i}
                  className="faq-accordion group rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition open:border-brand-orange/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <Editable
                      id={`home-faq-q-${i}`}
                      as="span"
                      className="break-keep text-sm font-bold text-brand-dark sm:text-base"
                    >
                      {f.q}
                    </Editable>
                    <span className="shrink-0 text-brand-orange transition group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <Editable
                    id={`home-faq-a-${i}`}
                    as="p"
                    className="mt-3 break-keep text-sm leading-relaxed text-brand-gray"
                  >
                    {f.a}
                  </Editable>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 하단 CTA - 후기란 하단과 동일한 어두운 카드 디자인으로 통일 (대표님 요청).
            카드 아래(Footer 사이) 세로 공백을 조금 줄여 답답하지 않게 조정 (대표님 요청) */}
        <section className="px-4 pt-3 pb-3 sm:pt-4 sm:pb-5">
          <div className="reveal hover-lift mx-auto max-w-2xl rounded-3xl bg-brand-dark p-6 text-center shadow-card sm:p-8">
            <Editable
              id="home-cta-title"
              as="h2"
              className="break-keep text-[22px] font-black tracking-[-0.03em] text-white sm:text-[26px]"
            >
              오늘도 예산은 줄어들고 있습니다
            </Editable>
            <Editable
              id="home-cta-sub"
              as="p"
              className="mx-auto mt-3 max-w-md break-keep text-sm leading-relaxed text-gray-300"
            >
              정부지원사업은 대부분 선착순·예산 소진으로 마감됩니다.
              <br />
              1분 진단으로 대표님 사업장이 받을 수 있는 사업부터 먼저 확인하세요.
            </Editable>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* 왼쪽 - 진단 시작하기 (주 버튼, 빨간색) */}
              <a
                id="home-cta-button"
                href="/diagnosis-chat"
                className="btn-red w-full rounded-full px-8 py-3.5 text-base font-bold sm:w-auto"
              >
                지금 내 지원사업 확인하기
              </a>
              {/* 오른쪽 - 1:1 카카오톡 상담하기 (보조 버튼, 흰색 아웃라인) */}
              <a
                id="home-cta-kakao"
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full border-2 border-white bg-transparent px-8 py-3.5 text-base font-bold text-white transition hover:bg-white/10 sm:w-auto"
              >
                💬 1:1 카카오톡 상담하기
              </a>
            </div>
            {/* ★ 하단 신뢰 링크 - 실제 후기(당근·블로그) 링크트리로 마지막 신뢰 보강 */}
            <Editable
              id="home-cta-learnmore-link"
              as="a"
              href="https://link.inpock.co.kr/ppfa25"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1 break-keep text-[13px] font-bold text-gray-300 underline decoration-gray-500 underline-offset-4 transition hover:text-white"
            >
              🔎 모두의사업친구 더 알아보기 →
            </Editable>
          </div>
        </section>
      </main>
      {/* ── 쿠팡 파트너스 광고 (첫 페이지 하단 · 푸터 위) ── */}
      <div className="border-t border-brand-dark/5 px-4 py-2.5">
        <CoupangPartnersBanner
          iframeSrc="https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=680&height=140&tsource="
          iframeHeight={140}
        />
      </div>
      <Footer />
      {/* 오른쪽 하단 고정 - 앱 설치 버튼(위) + 카카오톡 1:1 상담 버튼(아래) */}
      <InstallAppButton />
      <KakaoFloatingButton />
      {/* 모바일 전용 하단 고정 CTA - 어디를 보고 있든 진단 시작 가능 (진단 시작률 개선) */}
      <StickyDiagnosisBar />
    </PageShell>
  );
}
