"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import ScrollReveal from "@/components/ScrollReveal";
import KakaoFloatingButton from "@/components/KakaoFloatingButton";
import InstallAppButton from "@/components/InstallAppButton";
import TrustBadges from "@/components/home/TrustBadges";
import MobileCollapsibleDetails from "@/components/home/MobileCollapsibleDetails";
import { BETA_FREE, OFFICIAL_PRICE_LABEL } from "@/lib/betaConfig";

const TRUST_BADGES = [
  { icon: "🏛️", text: "공식 정부 사이트 매일 자동 크롤링" },
  { icon: "📚", text: "정부 부처 공문 팩트체크" },
  { icon: "🎯", text: "내 사업장에 진짜 되는 것만 매칭" },
  { icon: "🗂️", text: "정책자금·지원금·바우처·인증" },
  { icon: "📝", text: "신청 방법·필요 서류·순서까지 안내" },
  { icon: "🚫", text: "행정 대행 없음 · 승인 수수료 0원" },
  { icon: "💳", text: "부담 없는 1회성 결제" },
];

const VALUES = [
  "어떤 자금·지원사업이 나에게 맞는지",
  "어디서 어떻게 신청하는지",
  "서류는 뭐가 필요한지",
  "지원사업을 신청하는 순서까지",
];

const FAQS = [
  {
    q: "Q1. 자동결제인가요?",
    a: (
      <>
        아닙니다. 1회성 결제입니다.
        <br />
        자동으로 재결제되지 않습니다.
        <br />
        만족하시면 1개월 단위로 연장하실 수 있습니다.
      </>
    ),
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: (
      <>
        아닙니다. 저희는 매칭 플랫폼입니다.
        <br />
        서류 발급과 신청은 이용자님이 직접 하십니다.
        <br />
        저희는 신청 가능한 사업을 추천·안내해 드립니다.
      </>
    ),
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: (
      <>
        아닙니다. 저희는 추천·안내 서비스입니다.
        <br />
        승인 여부는 정부 기관 심사로 결정됩니다.
        <br />
        승인을 보장하지 않습니다.
      </>
    ),
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
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
        열람 전에는 7일 이내 100% 환불됩니다.
        <br />
        전자상거래법을 따릅니다.
        <br />
        단, 열람 후에는 관련 법령에 따라 환불이 불가합니다.
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
        최신 공고 및 공고를 팩트체크 후 반영합니다.
      </>
    ),
  },
];

export default function Home() {
  return (
    <PageShell pageKey="home">
      <ScrollReveal />
      <Header />
      <main>
        {/* 히어로 */}
        <section
          id="hero-section"
          className="relative overflow-hidden px-4 pb-5 pt-6 sm:pb-9 sm:pt-12"
        >
          <div className="hero-glass mx-auto max-w-3xl rounded-3xl px-5 py-8 text-center animate-fadeUp sm:px-10 sm:py-12">
            {/* 상단 배지 (노란색 서비스 소개 배지) */}
            <div className="mb-5 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <Editable
                id="hero-badge"
                as="div"
                className="inline-block rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-dark sm:text-base"
              >
                정부지원사업 AI 통합 매칭 플랫폼
              </Editable>
            </div>
            <Editable
              id="hero-headline-v2"
              as="h1"
              className="break-keep text-[21px] font-black leading-[1.35] text-brand-dark xs:text-[25px] sm:text-[38px] sm:leading-tight"
            >
              대표님 사업장이 받을 수 있는 모든
              <br />
              <span className="text-brand-red">정부지원사업</span> AI가 찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-sm leading-relaxed text-brand-gray sm:text-base"
            >
              AI가 대표님이 지원 가능한 사업만을 알아서
            </Editable>

            {/* 오픈 베타 무료 앵커링 — 원래 39,900원인데 지금은 전부 무료 */}
            {BETA_FREE && (
              <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border-2 border-brand-red/30 bg-brand-red/5 px-5 py-3">
                <span className="text-sm font-semibold text-brand-gray sm:text-base">
                  원래{" "}
                  <span className="font-bold text-brand-dark line-through decoration-brand-red decoration-2">
                    {OFFICIAL_PRICE_LABEL}
                  </span>{" "}
                  →
                </span>
                <span className="text-base font-black text-brand-red sm:text-lg">
                  오픈 베타 기간 전부 0원
                </span>
              </div>
            )}

            {/* 핵심 혜택 — 가로 컴팩트 배지 */}
            <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
              {["맞춤 AI 매칭", "신청 가능 사업만", "서류·신청까지 안내"].map(
                (t, i) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm sm:text-sm"
                  >
                    <span className="text-brand-orange">✓</span>
                    <Editable id={`hero-check-${i}`} as="span">
                      {t}
                    </Editable>
                  </li>
                )
              )}
            </ul>

            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Editable
                id="hero-cta-primary"
                as="a"
                href="/diagnosis"
                className="btn-brand w-full rounded-full px-8 py-3.5 text-base animate-pulseGlow sm:w-auto sm:py-4 sm:text-lg"
              >
                {BETA_FREE ? "지금 무료로 진단 시작하기" : "무료 진단 시작하기"}
              </Editable>
              <Editable
                id="hero-cta-secondary"
                as="a"
                href={BETA_FREE ? "#result-sample-section" : "/pricing"}
                className="btn-outline w-full rounded-full px-8 py-3.5 text-base sm:w-auto sm:py-4 sm:text-lg"
              >
                {BETA_FREE ? "무엇을 알려주나요?" : "상품 자세히 보기"}
              </Editable>
            </div>

            {/* 면책 고지 — 광고 심사/표시광고법 대응 (대표님 요청) */}
            <Editable
              id="hero-disclaimer"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-[11px] leading-relaxed text-brand-gray/70 sm:text-xs"
            >
              본 서비스는 정부지원사업을 안내·매칭하는 플랫폼이며, 지원사업의 승인·선정·수령을 보장하지 않습니다.
            </Editable>
          </div>
        </section>

        {/* 신뢰 배지 + 핵심 강점 (7칸 통합) */}
        {/* 가치 제안 4단계 — (대표님 요청) 7네모칸 섹션보다 위로 배치 */}
        {/* 구간 구분 — 얇은 회색 가로줄 */}
        <div className="section-divider" aria-hidden="true" />
        <section className="bg-gray-50 px-4 py-7 sm:py-11">
          <div className="reveal mx-auto max-w-4xl text-center">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                🎯 서비스 안내
              </span>
              <Editable
                id="home-value-title-v2"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                {BETA_FREE ? (
                  <>
                    원래{" "}
                    <span className="text-brand-gray line-through decoration-brand-red decoration-2">
                      39,900원
                    </span>
                    , 지금은 <span className="text-brand-red">전부 무료</span>로 알려드립니다.
                  </>
                ) : (
                  <>
                    <span className="text-brand-red">39,900원</span>으로 이 모든 걸 알려드립니다.
                  </>
                )}
              </Editable>
              <Editable
                id="home-value-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                {BETA_FREE ? (
                  <>
                    복잡한 정부지원사업을 정리해 드립니다.
                    <br />
                    오픈 베타 기간 동안 무엇을·어디서·어떻게까지 <b className="text-brand-dark">한 푼도 안 받고</b> 전부 알려드립니다.
                  </>
                ) : (
                  <>
                    복잡한 정부지원사업을 정리해 드립니다.
                    <br />
                    무엇을·어디서·어떻게까지 한 번에 알려드립니다.
                  </>
                )}
              </Editable>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="hover-lift flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-card"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
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
          </div>
        </section>

        {/* 신뢰 배지 7칸 — (대표님 요청) 서비스 안내 섹션보다 아래로 배치 */}
        <section className="border-y border-gray-100 bg-gray-50 px-4 py-7 sm:py-10">
          <div className="reveal mx-auto max-w-4xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <Editable
                id="home-compare-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                아직 몰라서 못 받고 있는 정부지원사업
              </Editable>
              <Editable
                id="home-compare-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm leading-relaxed text-brand-gray"
              >
                내 사업장이 받을 수 있는 <b className="text-brand-dark">모든 정부지원사업</b>을 AI가 한 번에 찾아드립니다.
              </Editable>
            </div>
            <TrustBadges badges={TRUST_BADGES} />
          </div>
        </section>

        {/* AI 매칭 결과 예시본 — 실제 결과 화면(대시보드)과 동일한 구조로 재현 */}
        <section id="result-sample-section" className="scroll-mt-20 border-y border-gray-100 bg-white px-4 py-7 sm:scroll-mt-24 sm:py-11">
          <div className="reveal mx-auto max-w-3xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                🔍 실제 결과 화면 예시
              </span>
              <Editable
                id="home-sample-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                AI가 내 사업장 맞춤 정부지원사업을 한 번에
              </Editable>
              <Editable
                id="home-sample-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                신청 가능한 기관·상품과 신청 방법까지 안내
              </Editable>
            </div>

            {/* 실제 대시보드 목업(그대로 재현) — 노트북 프레임 안에 담아 '화면'처럼 */}
            <div className="relative mt-7">
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

                {/* 진단 완료 배너 + 3칸 통계 (선명하게 노출 — '이만큼 매칭됐다'를 확실히 보여줌) */}
                <div className="p-4 pb-0 sm:p-6 sm:pb-0">
                  <div className="rounded-2xl border-2 border-brand-orange bg-brand-grad p-4 shadow-card">
                    <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                      🎉 진단 완료! 대표님이 지금 신청해볼 수 있는 것들을
                      안내해드립니다.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { n: "6", l: "정책자금" },
                        { n: "8", l: "지원금·바우처" },
                        { n: "5", l: "지금 신청 대상" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="rounded-xl bg-white/70 px-2 py-2.5 text-center"
                        >
                          <p className="text-xl font-extrabold text-brand-dark sm:text-2xl">
                            {s.n}
                          </p>
                          <p className="mt-0.5 break-keep text-[11px] font-bold text-brand-dark/70">
                            {s.l}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 결과 본문 — 아코디언(접기/펼치기) 구조: 한눈에 목차처럼, 클릭하면 상세 (대표님 요청: A안) */}
                <div className="space-y-3 p-4 text-left sm:p-6">
                  {/* 정책금융기관 섹션 (기본 펼침) */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border-2 border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-start gap-2 p-4 sm:p-5">
                      <div className="min-w-0 flex-1">
                        {/* 제목 — 포인트색 배경 바 + 흰 글자 (대표님 요청: 검정으로 통일) */}
                        <p className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-block whitespace-nowrap rounded-lg bg-brand-dark px-2.5 py-1.5 text-[13px] font-extrabold text-white sm:px-3 sm:text-lg">
                            🏦 대표님이 이용할 수 있는 정책금융기관
                          </span>
                          <span className="shrink-0 rounded-full bg-brand-dark px-2 py-0.5 text-[10px] font-bold text-white">몰라서 못 받은 융자</span>
                        </p>
                        <p className="mt-1.5 break-keep text-xs text-brand-dark/60">
                          업종·직원수·매출 등 대표님 조건을 봅니다.
                          실제 신청 자격이 열리는 정책자금을 한 번에 안내합니다.
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-lg text-brand-dark/40 transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    {/* 개별 상품·기관명 — 베타 기간엔 블러 없이 공개, 정식 땐 블러 */}
                    <div className={`divide-y divide-gray-200 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        {
                          inst: "중소벤처기업진흥공단",
                          cat: "정책자금",
                          catCls: "bg-blue-100 text-blue-700",
                          prod: "신성장기반자금 · 신시장진출지원자금",
                          hook: "직접대출 최대 60억, 금리 2%대 · 시설/운전자금 모두 가능",
                        },
                        {
                          inst: "소상공인시장진흥공단",
                          cat: "정책자금",
                          catCls: "bg-blue-100 text-blue-700",
                          prod: "성장가속화자금 · 강한소상공인자금 · 대환대출자금",
                          hook: "저금리 정책자금으로 고금리 대출 갈아타기(대환) 대상",
                        },
                        {
                          inst: "신용보증기금 / 기술보증기금 / 무역보험공사 / 신용보증재단",
                          cat: "보증서",
                          catCls: "bg-indigo-100 text-indigo-700",
                          prod: "보증서 발급 → 은행 대리대출 연계",
                          hook: "담보 없이 보증서로 은행 대출 실행 가능",
                        },
                      ].map((m, i) => (
                        <div key={i} className="py-3 first:pt-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-brand-dark">
                              {m.inst}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.catCls}`}
                            >
                              {m.cat}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-brand-green">
                              ✅ 신청 가능
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold text-brand-orange">
                              📑 상품 보기
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/30 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                              🔗 신청 사이트
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">
                              ☎ 콜센터
                            </span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] text-brand-gray">
                            {m.prod}
                          </p>
                          <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">
                            💡 {m.hook}
                          </p>
                          {/* 신청 방법 메뉴얼 박스 — '신청 방법까지 알려준다' 각인 (대표님 요청: 주황 포인트색) */}
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-2.5 py-1.5">
                            <span className="text-xs">📄</span>
                            <span className="break-keep text-[11px] font-bold text-brand-orange">
                              신청 방법 메뉴얼
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </details>

                  {/* 정부지원제도 섹션 — 구간 구별용 불투명 포인트 박스 (대표님 요청) / 아코디언
                      모바일에선 접힌 상태로 시작(정보 압축), PC는 펼침 그대로 */}
                  <MobileCollapsibleDetails
                    collapseOnMobile={false}
                    className="result-accordion group overflow-hidden rounded-2xl border-2 border-brand-orange/25 bg-brand-orange/5 shadow-card"
                    summary={
                    <summary className="flex cursor-pointer list-none items-start gap-2 p-4 sm:p-5">
                      <div className="min-w-0 flex-1">
                        {/* 제목 — 포인트색 배경 바 + 흰 글자 (대표님 요청) */}
                        <p className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-block whitespace-nowrap rounded-lg bg-brand-orange px-2.5 py-1.5 text-[13px] font-extrabold text-white sm:px-3 sm:text-lg">
                            🎁 대표님이 신청할 수 있는 정부지원제도
                          </span>
                          <span className="shrink-0 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">놓치면 아까운 혜택</span>
                        </p>
                        <p className="mt-1.5 break-keep text-xs text-brand-dark/60">
                          대출이 아닙니다. 지원금·바우처·인증·교육까지 챙깁니다.
                          받을 수 있는 제도를 모두 찾아 신청 방법과 함께 안내합니다.
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-lg text-brand-orange/50 transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    }
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    {/* 개별 제도 — 상세 박스(둥근 카드) 형태 (대표님 요청: 정책금융기관처럼) */}
                    <div className={`space-y-2.5 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { t: "소상공인 경영안정 바우처", c: "바우처", cls: "bg-purple-100 text-purple-700", easy: true, d: "사업체당 25만원. 공과금·4대보험료·연료비 등 9개 항목에 사용 가능.", hook: "연매출 약 1억400만원 미만이면 온라인 신청만으로 지급됩니다." },
                        { t: "소상공인 부담경감 크레딧", c: "지원금", cls: "bg-green-100 text-green-700", easy: true, d: "50만원 상당. 공공요금(전기·가스·수도)과 4대보험료 납부에 사용.", hook: "연매출 3억원 이하면 카드 연동으로 간편 신청됩니다." },
                        { t: "두루누리 사회보험료 지원", c: "고용", cls: "bg-teal-100 text-teal-700", easy: true, d: "신규 채용 근로자·사업주의 국민연금·고용보험료 최대 80% 지원.", hook: "근로자 10명 미만 사업장은 4대보험 신고 시 함께 신청돼 사실상 자동입니다." },
                      ].map((g, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl border p-3.5 sm:p-4 ${g.easy ? "border-brand-green/40 bg-brand-green/5" : "border-gray-200 bg-white"}`}
                        >
                          {g.easy && (
                            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                              ✅ 받기 쉬움 · 먼저 신청 추천
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="break-keep text-sm font-extrabold text-brand-dark">
                              {g.t}
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${g.cls}`}>
                              {g.c}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-brand-green">
                              ✅ 신청 가능
                            </span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] text-brand-gray">
                            {g.d}
                          </p>
                          <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">
                            💡 {g.hook}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold text-brand-orange">
                              📑 지원 내용 보기
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/30 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                              🔗 신청 사이트
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">
                              ☎ 문의처
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </MobileCollapsibleDetails>

                  {/* 추가 감면 혜택 섹션 — 구간 구별용 불투명 포인트 박스 (대표님 요청) / 아코디언
                      모바일에선 접힌 상태로 시작(정보 압축), PC는 펼침 그대로 */}
                  <MobileCollapsibleDetails
                    collapseOnMobile={false}
                    className="result-accordion group overflow-hidden rounded-2xl border-2 border-brand-red/25 bg-brand-red/5 shadow-card"
                    summary={
                    <summary className="flex cursor-pointer list-none items-start gap-2 p-4 sm:p-5">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-base font-extrabold sm:text-lg">
                          <span className="inline-block whitespace-nowrap rounded-lg bg-brand-red px-2.5 py-1.5 text-[13px] font-extrabold text-white sm:px-3 sm:text-lg">
                            🎁 지원사업 말고 이런 것까지 챙겨드려요
                          </span>
                          <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold text-white">
                            놓치기 쉬운 절세·감면
                          </span>
                        </p>
                        <p className="mt-1.5 break-keep text-xs text-brand-dark/60">
                          대부분 몰라서 못 챙기는 세금·수수료 감면 혜택.
                          대표님 조건에 맞는 것만 골라 신청 방법과 함께 알려드립니다.
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-lg text-brand-red/50 transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    }
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    {/* 개별 감면 — 상세 박스(둥근 카드) 형태 (대표님 요청: 정책금융기관처럼) */}
                    <div className={`space-y-2.5 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { t: "노란우산공제 소득공제", c: "소득공제", cls: "bg-rose-100 text-rose-700", easy: true, d: "납입액을 연 최대 600만원까지 소득공제. 폐업 시 퇴직금처럼 목돈 회수.", hook: "가입만 하면 자동 적용돼 심사 탈락이 없습니다. 자영업자 필수." },
                        { t: "창업중소기업 세액감면", c: "세액감면", cls: "bg-rose-100 text-rose-700", easy: true, d: "창업 후 5년간 소득세·법인세를 50~100% 감면(청년·수도권 외 100%).", hook: "요건만 맞으면 세무신고 때 자동 적용, 별도 경쟁이 없습니다." },
                        { t: "중소기업 특별세액감면", c: "세액감면", cls: "bg-rose-100 text-rose-700", easy: true, d: "업종·지역·규모별로 소득세·법인세를 5~30% 감면하는 상시형 감면.", hook: "창업감면 기간이 끝난 사업자도 계속 받을 수 있습니다." },
                        { t: "카드수수료 우대·감면", c: "수수료", cls: "bg-rose-100 text-rose-700", easy: true, d: "연매출 30억원 이하 영세·중소가맹점 우대수수료율 적용.", hook: "매출 구간만 맞으면 별도 신청 없이 자동 적용됩니다." },
                      ].map((b, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl border p-3.5 sm:p-4 ${b.easy ? "border-brand-green/40 bg-brand-green/5" : "border-brand-red/20 bg-white"}`}
                        >
                          {b.easy && (
                            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                              ✅ 받기 쉬움 · 먼저 챙기기 추천
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="break-keep text-sm font-extrabold text-brand-dark">
                              💰 {b.t}
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.cls}`}>
                              {b.c}
                            </span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] text-brand-gray">
                            {b.d}
                          </p>
                          <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">
                            💡 {b.hook}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 break-keep rounded-xl bg-brand-yellow/40 px-3 py-2 text-center text-[12px] font-bold text-brand-dark">
                      ✨ 요건에 맞게 챙기면 세액감면만으로 수백~수천만원 절감도 가능
                    </p>
                    </div>
                  </MobileCollapsibleDetails>
                </div>

                {/* 하단 페이드 — 베타 땐 뒤에 더 있다는 느낌만, 정식 땐 잠금 페이드 */}
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent ${BETA_FREE ? "h-24" : "h-44"}`} />
              </div>

              {/* 오버레이 안내 — 베타: '지금 무료로 전부 공개' / 정식: '결제하면 공개' */}
              <div className="relative -mt-24 flex flex-col items-center pb-2">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-xl ${
                    BETA_FREE ? "bg-brand-red animate-pulseGlow" : "bg-brand-dark"
                  }`}
                >
                  {BETA_FREE ? "🎁" : "🔒"}
                </span>
                <p className="mt-3 break-keep text-center text-base font-extrabold text-brand-dark sm:text-lg">
                  {BETA_FREE
                    ? "이 모든 결과, 지금은 무료로 전부 열립니다"
                    : "이 모든 결과가 대표님을 기다리고 있어요"}
                </p>
                <p className="mt-1 break-keep text-center text-[13px] font-semibold leading-relaxed text-brand-gray">
                  <b className="text-brand-orange">신청 사이트 · 필요 서류 · 승인 전략</b>
                  {BETA_FREE ? "까지 오픈 베타 기간 0원" : "까지 공개"}
                </p>
              </div>
            </div>

            <Editable
              id="home-sample-cta"
              as="a"
              href="/diagnosis"
              className="btn-brand mx-auto mt-5 block max-w-md rounded-full py-4 text-center text-base font-bold sm:text-lg"
            >
              {BETA_FREE
                ? "지금 무료로 내 결과 전부 받아보기"
                : "내 사업장 무료로 진단해보기"}
            </Editable>
            <p className="mt-3 text-center text-xs text-brand-gray/70">
              * 위 화면은 실제 결과 화면을 재구성한 예시입니다.
              실제 결과는 사업장 정보에 따라 달라집니다.
            </p>
          </div>
        </section>

        {/* 가격표 */}
        <section
          id="pricing-section"
          className="scroll-mt-20 px-4 py-7 sm:scroll-mt-24 sm:py-11"
        >
          <div className="reveal mx-auto max-w-5xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                💳 서비스 이용료
              </span>
              <Editable
                id="home-pricing-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                AI 올인원 패키지
              </Editable>
              <Editable
                id="home-pricing-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                {BETA_FREE ? (
                  <>
                    정식 오픈가는 39,900원(1회성 결제)입니다.
                    <br />
                    <b className="text-brand-red">오픈 베타 기간에는 결제 없이 전부 무료로 이용</b>하실 수 있습니다.
                  </>
                ) : (
                  <>1회성 결제이며 월 구독 결제가 아닙니다.</>
                )}
              </Editable>
            </div>
            <div className="mt-6">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        {/* 구간 구분 — 얇은 회색 가로줄 */}
        <div className="section-divider" aria-hidden="true" />
        {/* 섹션 상하 여백 통일: 위쪽 섹션과 동일하게 py-7 sm:py-11 */}
        <section className="bg-gray-50 px-4 py-7 sm:py-11">
          <div className="reveal mx-auto max-w-3xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                💬 자주 묻는 질문
              </span>
              <Editable
                id="home-faq-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                궁금한 점, 미리 확인하세요
              </Editable>
              <Editable
                id="home-faq-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                결제 전 가장 많이 묻는 질문들을 모았습니다.
              </Editable>
            </div>
            <div className="mt-6 space-y-3">
              {FAQS.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition open:border-brand-orange/40"
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

        {/* 하단 CTA — 후기란 하단과 동일한 어두운 카드 디자인으로 통일 (대표님 요청) */}
        <section className="px-4 py-7 sm:py-11">
          <div className="reveal hover-lift mx-auto max-w-2xl rounded-3xl bg-brand-dark p-8 text-center shadow-card sm:p-10">
            <Editable
              id="home-cta-title"
              as="h2"
              className="break-keep text-xl font-black text-white sm:text-2xl"
            >
              {BETA_FREE
                ? "오픈 베타 기간, 지금은 전부 무료입니다"
                : "지금 무료로 진단받아 보세요"}
            </Editable>
            <Editable
              id="home-cta-sub"
              as="p"
              className="mx-auto mt-3 max-w-md break-keep text-sm leading-relaxed text-gray-300"
            >
              {BETA_FREE ? (
                <>
                  1분이면 내 사업장에 알맞은 정부지원사업을 전부 확인할 수 있습니다.
                </>
              ) : (
                <>1분이면 내 사업장에 알맞은 정부지원사업을 찾을 수 있습니다.</>
              )}
            </Editable>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* 왼쪽 — 무료 진단 시작하기 (주 버튼, 빨간색) */}
              <a
                id="home-cta-button"
                href="/diagnosis"
                className="btn-red w-full rounded-full px-8 py-3.5 text-base font-bold sm:w-auto"
              >
                {BETA_FREE ? "무료로 진단 시작하기" : "무료 진단 시작하기"}
              </a>
              {/* 오른쪽 — 1:1 채널톡 상담하기 (보조 버튼, 흰색 아웃라인) */}
              <a
                id="home-cta-kakao"
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full border-2 border-white bg-transparent px-8 py-3.5 text-base font-bold text-white transition hover:bg-white/10 sm:w-auto"
              >
                💬 1:1 채널톡 상담하기
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {/* 오른쪽 하단 고정 — 앱 설치 버튼(위) + 카카오톡 1:1 상담 버튼(아래) */}
      <InstallAppButton />
      <KakaoFloatingButton />
    </PageShell>
  );
}
