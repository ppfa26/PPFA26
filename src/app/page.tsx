"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import ScrollReveal from "@/components/ScrollReveal";

const TRUST_BADGES = [
  { icon: "🏛️", text: "정부 사이트 크롤링" },
  { icon: "📚", text: "관련 부처 최신 공문 자문" },
  { icon: "🔒", text: "승인 보장 X · 자문 플랫폼" },
  { icon: "🚫", text: "대행 없음 · 승인 수수료 없음" },
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
        아닙니다. 1회성 결제이며, 자동으로 재결제되지 않습니다. 만족하시면
        1개월 단위로 추가 결제 후 자유롭게 연장할 수 있습니다.
      </>
    ),
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: (
      <>
        아닙니다. 저희는 방법을 알려드리는 경영 자문 플랫폼입니다. 서류 발급부터
        신청까지는 대표님이 직접 진행하시게 됩니다. 신청 방법만 정확히 아신다면
        직접 신청도 충분히 가능합니다.
      </>
    ),
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: (
      <>
        아닙니다. 저희는 정부지원사업을 안내하고 방법을 자문해드리는
        플랫폼입니다. 자금 승인 여부는 각 정책자금 정부 기관의 심사에 따라
        결정됩니다. 저희 서비스는 대표님에게 알맞는 정부지원사업을 안내하고
        신청방법을 자문해드리는 것을 목표로 합니다.
      </>
    ),
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
    a: (
      <>
        없습니다. 저희는 사업장에 알맞는 정부지원사업을 AI로 찾아서 추천 및
        신청방법을 자문해드리는 플랫폼이며 모두의사업친구 서비스 이용료 외
        추가적인 수수료는 없습니다.
      </>
    ),
  },
  {
    q: "Q5. 환불되나요?",
    a: (
      <>
        서비스 이용(열람) 전에는 7일 이내 100% 환불 가능합니다. 「전자상거래
        등에서의 소비자보호에 관한 법률(전자상거래법)」을 따릅니다. 단, 서비스
        이용(열람) 이후에는 관련 법령·법규에 따라 환불이 불가합니다.
      </>
    ),
  },
  {
    q: "Q6. 어떤 지원사업까지 안내되나요?",
    a: (
      <>
        정책자금 대출뿐 아니라 정부 지원금, 청년창업사관학교, K-Startup,
        예비창업패키지, 창업대학, 지자체 지원사업, 바우처, 각종 인증제도까지 국내
        모든 정부 지원 사업을 포괄 안내합니다.
      </>
    ),
  },
  {
    q: "Q7. 정보는 얼마나 최신인가요?",
    a: (
      <>
        매일 자동으로 89개 공식 사이트를 크롤링하여 최신 공고를 반영합니다. 또한
        40여 개 부처의 최신 공문 자료를 기반으로 정확한 팩트체크 후 답변합니다.
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
          className="relative overflow-hidden px-4 pb-7 pt-7 sm:pb-12 sm:pt-16"
        >
          <div className="mx-auto max-w-3xl text-center animate-fadeUp">
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
              className="break-keep text-[24px] font-black leading-[1.3] text-brand-dark xs:text-[28px] sm:text-[40px] sm:leading-tight"
            >
              AI를 활용해 내 사업장에 알맞는
              <br />
              <span className="text-brand-red">정부지원사업</span>을
              찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-sm leading-relaxed text-brand-gray sm:text-base"
            >
              모든 정부기관 사이트를 AI가 정밀 분석해,
              <br className="hidden sm:inline" />{" "}
              대표님 사업장에 딱 맞는 정부지원사업과 신청 방법까지
              안내해드립니다.
            </Editable>

            {/* 핵심 혜택 — 가로 컴팩트 배지 */}
            <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
              {["맞춤 AI 매칭", "신청 가능 사업만", "서류·신청까지 안내"].map(
                (t, i) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/30 bg-brand-green/5 px-3 py-1.5 text-xs font-semibold text-brand-dark sm:text-sm"
                  >
                    <span className="text-brand-green">✓</span>
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

        {/* 신뢰 배지 */}
        <section className="border-y border-gray-100 bg-gray-50 px-4 py-6">
          <div className="reveal mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {TRUST_BADGES.map((b, i) => (
              <div
                key={i}
                className="hover-lift flex flex-col items-center gap-1.5 rounded-xl bg-white px-3 py-4 text-center shadow-sm"
              >
                <span className="text-2xl">{b.icon}</span>
                <Editable
                  id={`home-trust-${i}`}
                  as="span"
                  className="break-keep text-[13px] font-semibold leading-tight text-brand-dark"
                >
                  {b.text}
                </Editable>
              </div>
            ))}
          </div>
        </section>

        {/* 비교 섹션 */}
        <section className="px-4 py-9 sm:py-14">
          <div className="reveal mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                ☕ 하루 커피 한 잔 값
              </span>
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
                하루 커피 한 잔 값으로, 내 사업장이 받을 수 있는 <b className="text-brand-dark">모든 정부지원사업</b>을 AI가 한 번에 찾아드립니다.
              </Editable>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="hover-lift flex flex-col items-center gap-1.5 rounded-2xl border border-brand-dark/10 bg-white p-5 text-center shadow-card">
                <div className="text-2xl">🔍</div>
                <p className="break-keep text-sm font-bold leading-snug text-brand-dark">
                  내 사업장 맞춤<br />지원사업 자동 매칭
                </p>
              </div>
              <div className="hover-lift flex flex-col items-center gap-1.5 rounded-2xl border border-brand-dark/10 bg-white p-5 text-center shadow-card">
                <div className="text-2xl">🤖</div>
                <p className="break-keep text-sm font-bold leading-snug text-brand-dark">
                  AI가 한 번에<br />전부 찾아 정리
                </p>
              </div>
              <div className="hover-lift flex flex-col items-center gap-1.5 rounded-2xl border-2 border-brand-green bg-white p-5 text-center shadow-card">
                <div className="text-2xl">💳</div>
                <Editable
                  id="home-compare-us"
                  as="p"
                  className="break-keep text-sm font-bold leading-snug text-brand-dark"
                >
                  <b className="text-brand-green">19,900원</b>으로<br />부담 없이 시작
                </Editable>
              </div>
            </div>
          </div>
        </section>

        {/* 가치 제안 4단계 */}
        <section className="bg-gray-50 px-4 py-9 sm:py-14">
          <div className="reveal mx-auto max-w-4xl text-center">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-green/10 px-4 py-1.5 text-xs font-bold text-brand-green sm:text-sm">
                🎯 서비스 안내
              </span>
              <Editable
                id="home-value-title-v2"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                19,900원으로 이 모든 걸 알려드립니다.
              </Editable>
              <Editable
                id="home-value-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                복잡한 정부지원사업, 무엇을·어디서·어떻게까지 한 번에 정리해드립니다.
              </Editable>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="hover-lift flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-card"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
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

        {/* AI 매칭 결과 예시본 — 실제 결과 화면(대시보드)과 동일한 구조로 재현 */}
        <section id="result-sample-section" className="border-y border-gray-100 bg-white px-4 py-9 sm:py-14">
          <div className="reveal mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                🔍 실제 결과 화면 예시
              </span>
              <Editable
                id="home-sample-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                정보 입력 시, AI가 내 사업장에 알맞는
                <br className="hidden sm:inline" /> 모든 정부지원사업을 한 번에
                안내해드립니다.
              </Editable>
              <Editable
                id="home-sample-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                진단을 마치면 아래와 똑같은 결과 화면으로, 신청 가능한 기관·상품과
                신청 방법까지 실제로 이렇게 안내됩니다.
              </Editable>
            </div>

            {/* 실제 대시보드 목업(그대로 재현) — 노트북 프레임 안에 담아 '화면'처럼 */}
            <div className="relative mt-8">
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
                      🎉 진단 완료! 대표님이 지금 신청해볼 수 있는 것들이
                      정리됐어요
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
                      업종·직원수·매출 등 대표님 조건을 기준으로 실제 신청 자격이
                      열리는 정책자금을 한 번에 안내합니다.
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
                      대출이 아닌 지원금·바우처·인증·교육까지, 받을 수 있는 제도를
                      모두 찾아 신청 방법과 함께 안내합니다.
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
                <p className="mt-1 break-keep text-center text-[13px] font-semibold text-brand-gray">
                  각 항목의 <b className="text-brand-orange">신청 사이트 · 필요 서류 · 승인 전략</b>까지
                  <br className="hidden sm:inline" /> 결제 후 전부 공개됩니다.
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
              * 위 화면은 실제 결과 화면을 재구성한 예시이며, 실제 결과는 사업장
              정보에 따라 달라집니다.
            </p>
          </div>
        </section>

        {/* 가격표 */}
        <section
          id="pricing-section"
          className="scroll-mt-20 px-4 py-9 sm:scroll-mt-24 sm:py-14"
        >
          <div className="reveal mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-yellow/20 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                💳 서비스 이용료
              </span>
              <Editable
                id="home-pricing-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                딱 하나면 충분, 올인원 패키지
              </Editable>
              <Editable
                id="home-pricing-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                1회성 결제이며 월 구독 결제가 아닙니다.
              </Editable>
            </div>
            <div className="mt-8">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 px-4 py-9 sm:py-14">
          <div className="reveal mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-dark/5 px-4 py-1.5 text-xs font-bold text-brand-dark sm:text-sm">
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
            <div className="mt-8 space-y-3">
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

        {/* 하단 CTA */}
        <section className="px-4 pb-6 pt-9 sm:pb-8 sm:pt-14">
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
            <Editable
              id="home-cta-button"
              as="a"
              href="/diagnosis"
              className="mt-6 inline-block w-full rounded-full bg-brand-dark px-10 py-3.5 text-base font-bold text-white hover:opacity-90 sm:w-auto sm:py-4 sm:text-lg"
            >
              무료 진단 시작하기
            </Editable>
          </div>
        </section>
      </main>
      <Footer />
    </PageShell>
  );
}
