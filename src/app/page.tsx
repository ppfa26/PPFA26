"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import ScrollReveal from "@/components/ScrollReveal";
import KakaoFloatingButton from "@/components/KakaoFloatingButton";

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
            <Editable
              id="hero-badge"
              as="div"
              className="mb-5 inline-block rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-dark sm:text-base"
            >
              정부지원사업 AI 통합 매칭 플랫폼
            </Editable>
            <Editable
              id="hero-headline-v2"
              as="h1"
              className="break-keep text-[21px] font-black leading-[1.35] text-brand-dark xs:text-[25px] sm:text-[38px] sm:leading-tight"
            >
              AI를 활용해 내 사업장에 알맞는
              <br />
              <span className="text-brand-red">정부지원사업</span>을 찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-sm leading-relaxed text-brand-gray sm:text-base"
            >
              모든 정부기관 사이트를 AI가 정밀 분석합니다.
              <br />
              대표님 사업장에 딱 맞는 사업과 신청 방법까지 안내해 드립니다.
            </Editable>

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
                무료 진단 시작하기
              </Editable>
              <Editable
                id="hero-cta-secondary"
                as="a"
                href="/pricing"
                className="btn-outline w-full rounded-full px-8 py-3.5 text-base sm:w-auto sm:py-4 sm:text-lg"
              >
                상품 자세히 보기
              </Editable>
            </div>
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
                <span className="text-brand-red">29,900원</span>으로 이 모든 걸 알려드립니다.
              </Editable>
              <Editable
                id="home-value-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                복잡한 정부지원사업을 정리해 드립니다.
                <br />
                무엇을·어디서·어떻게까지 한 번에 알려드립니다.
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
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {TRUST_BADGES.map((b, i) => (
                <div
                  key={i}
                  className="hover-lift flex w-[calc(50%-0.375rem)] flex-col items-center justify-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-card sm:w-[calc(25%-0.6rem)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xl">
                    {b.icon}
                  </span>
                  <Editable
                    id={`home-trust-${i}`}
                    as="span"
                    className="flex min-h-[2.4rem] items-center break-keep text-[13px] font-semibold leading-tight text-brand-dark"
                  >
                    {b.text}
                  </Editable>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 매칭 결과 예시본 — 실제 결과 화면(대시보드)과 동일한 구조로 재현 */}
        <section id="result-sample-section" className="border-y border-gray-100 bg-white px-4 py-7 sm:py-11">
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

                {/* 결과 본문 — 섹션 제목(목차)은 선명하게 열고, 내부 항목만 블러 처리 */}
                <div className="space-y-4 p-4 text-left sm:p-6">
                  {/* 정책금융기관 섹션 */}
                  <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-4 shadow-card sm:p-5">
                    {/* 제목·설명은 선명하게 공개 → '무엇을 알려주는지' 파악 가능 */}
                    <p className="text-base font-extrabold text-brand-dark sm:text-lg">
                      🏦 대표님이 이용할 수 있는 정책금융기관
                    </p>
                    <p className="mt-1 break-keep text-xs text-brand-dark/60">
                      업종·직원수·매출 등 대표님 조건을 봅니다.
                      실제 신청 자격이 열리는 정책자금을 한 번에 안내합니다.
                    </p>
                    {/* 개별 상품·기관명은 블러 처리 */}
                    <div className="preview-film mt-3 divide-y divide-gray-200" aria-hidden="true">
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
                          inst: "신용보증기금 / 지역신용보증재단",
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
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 정부지원제도 섹션 */}
                  <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-4 shadow-card sm:p-5">
                    {/* 제목·설명은 선명하게 공개 */}
                    <p className="text-base font-extrabold text-brand-dark sm:text-lg">
                      🎁 대표님이 신청할 수 있는 정부지원제도
                    </p>
                    <p className="mt-1 break-keep text-xs text-brand-dark/60">
                      대출이 아닙니다. 지원금·바우처·인증·교육까지 챙깁니다.
                      받을 수 있는 제도를 모두 찾아 신청 방법과 함께 안내합니다.
                    </p>
                    {/* 개별 제도명은 블러 처리 */}
                    <div className="preview-film mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden="true">
                      {[
                        { t: "스마트상점 기술보급 지원", c: "지원금", cls: "bg-green-100 text-green-700" },
                        { t: "수출바우처 지원", c: "바우처", cls: "bg-purple-100 text-purple-700" },
                        { t: "데이터바우처 지원", c: "바우처", cls: "bg-purple-100 text-purple-700" },
                        { t: "소상공인 경영개선 지원", c: "지원금", cls: "bg-green-100 text-green-700" },
                        { t: "일자리 안정·고용 지원금", c: "지원금", cls: "bg-green-100 text-green-700" },
                        { t: "이노비즈·메인비즈 인증", c: "인증", cls: "bg-amber-100 text-amber-700" },
                        { t: "소상공인 역량강화 교육", c: "교육", cls: "bg-sky-100 text-sky-700" },
                        { t: "정책자금 연계 컨설팅", c: "제도", cls: "bg-gray-100 text-gray-700" },
                      ].map((g, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                        >
                          <span className="break-keep text-[12px] font-bold text-brand-dark">
                            {g.t}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${g.cls}`}
                          >
                            {g.c}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 하단 페이드 + 잠금 (뒤에 더 많다는 느낌) */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white via-white/95 to-transparent" />
              </div>

              {/* 잠금 오버레이 안내 — '이만큼 준다, 결제하면 전부 공개' */}
              <div className="relative -mt-24 flex flex-col items-center pb-2">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-2xl text-white shadow-xl">
                  🔒
                </span>
                <p className="mt-3 break-keep text-center text-base font-extrabold text-brand-dark sm:text-lg">
                  이 모든 결과가 대표님을 기다리고 있어요
                </p>
                <p className="mt-1 break-keep text-center text-[13px] font-semibold leading-relaxed text-brand-gray">
                  <b className="text-brand-orange">신청 사이트 · 필요 서류 · 승인 전략</b>까지 공개
                </p>
              </div>
            </div>

            <Editable
              id="home-sample-cta"
              as="a"
              href="/diagnosis"
              className="btn-brand mx-auto mt-5 block max-w-md rounded-full py-4 text-center text-base font-bold sm:text-lg"
            >
              내 사업장 무료로 진단해보기
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
                1회성 결제이며 월 구독 결제가 아닙니다.
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
        {/* 대표님 요청: 가로줄 아래 제목 글래스 박스와의 위쪽 공간을 살짝 더 띄움.
            하단 여백은 줄여 아래 CTA와의 빈 공간을 축소. */}
        <section className="bg-gray-50 px-4 pb-5 pt-10 sm:pb-6 sm:pt-14">
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

        {/* 하단 CTA (대표님 요청: FAQ와 CTA 사이 빈 공간 축소 → 상단 여백 줄임) */}
        <section className="px-4 pb-3 pt-2 sm:pb-4 sm:pt-3">
          <div className="reveal hover-lift mx-auto max-w-2xl rounded-3xl bg-brand-grad p-8 text-center shadow-card sm:p-10">
            <Editable
              id="home-cta-title"
              as="h2"
              className="break-keep text-xl font-black text-brand-dark sm:text-2xl"
            >
              지금 무료로 진단받아 보세요
            </Editable>
            <Editable
              id="home-cta-sub"
              as="p"
              className="mx-auto mt-3 max-w-md break-keep text-sm text-brand-dark/70"
            >
              1분이면 내 사업장에 알맞는 정부지원사업을 찾을 수 있습니다.
            </Editable>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              {/* 왼쪽 — 카카오톡 1:1 채팅 문의 (가로 알약형) */}
              <a
                id="home-cta-kakao"
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FEE500] px-7 py-4 shadow-card transition hover:brightness-95"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark/10 text-lg">
                  💬
                </span>
                <span className="break-keep text-base font-extrabold text-brand-dark">
                  카톡 1:1 문의하기
                </span>
              </a>
              {/* 오른쪽 — 무료 진단 시작하기 (가로 알약형, 재생 버튼) */}
              <a
                id="home-cta-button"
                href="/diagnosis"
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-dark px-7 py-4 text-white shadow-card transition animate-pulseGlow hover:opacity-90"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF0000] text-[11px] leading-none text-white shadow-sm">
                  ▶
                </span>
                <span className="break-keep text-base font-extrabold">
                  무료 진단 시작하기
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {/* 오른쪽 하단 고정 카카오톡 1:1 상담 버튼 (대표님 요청) */}
      <KakaoFloatingButton />
    </PageShell>
  );
}
