"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

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
        아닙니다. 저희는 방법을 알려드리는 경영 자문 플랫폼입니다. 서류발급부터
        신청까지 대표님이 직접 하셔야 합니다. 정부지원사업 브로커 대행 시 승인
        수수료는 1억 승인 시 약 500만원이며 너무 큰 돈입니다. 신청하는 방법만
        안다면 직접 신청은 그렇게 어렵지 않습니다.
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
              className="mb-5 inline-block rounded-full bg-brand-yellow px-6 py-2.5 text-base font-bold text-brand-dark sm:text-lg"
            >
              정부지원사업 AI 통합 매칭 플랫폼
            </Editable>
            <Editable
              id="hero-headline-v2"
              as="h1"
              className="break-keep text-[22px] font-black leading-tight text-brand-dark xs:text-[26px] sm:text-4xl"
            >
              AI를 활용해 내 사업장에 알맞는
              <br />
              <span className="text-brand-red">정부지원사업</span>을
              찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-6 max-w-2xl break-keep text-sm leading-relaxed text-brand-gray xs:text-base"
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

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Editable
                id="hero-cta-primary"
                as="a"
                href="/diagnosis"
                className="btn-brand w-full rounded-full px-8 py-4 text-lg animate-pulseGlow sm:w-auto"
              >
                무료 진단 시작하기
              </Editable>
              <Editable
                id="hero-cta-secondary"
                as="a"
                href="/pricing"
                className="btn-outline w-full rounded-full px-8 py-4 text-lg sm:w-auto"
              >
                상품 자세히 보기
              </Editable>
            </div>
          </div>
        </section>

        {/* 신뢰 배지 */}
        <section className="border-y border-gray-100 bg-gray-50 px-4 py-6">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {TRUST_BADGES.map((b, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-xl bg-white px-3 py-4 text-center shadow-sm"
              >
                <span className="text-2xl">{b.icon}</span>
                <Editable
                  id={`home-trust-${i}`}
                  as="span"
                  className="text-xs font-semibold leading-tight text-brand-dark"
                >
                  {b.text}
                </Editable>
              </div>
            ))}
          </div>
        </section>

        {/* 비교 섹션 */}
        <section className="px-4 py-7 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-red/10 px-4 py-1.5 text-xs font-bold text-brand-red sm:text-sm">
                💰 가격 비교
              </span>
              <Editable
                id="home-compare-title"
                as="h2"
                className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
              >
                혁신적인 서비스 이용료
              </Editable>
              <span className="mt-3 h-1 w-12 rounded-full bg-brand-yellow" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-red/30 bg-white p-6">
                <div className="shrink-0 text-2xl">❌</div>
                <Editable
                  id="home-compare-broker"
                  as="p"
                  className="break-keep text-[13px] font-bold leading-snug text-brand-dark sm:text-sm"
                >
                  정부지원사업 브로커 대행 수수료 : 최소 500만원
                </Editable>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-green bg-white p-6">
                <div className="shrink-0 text-2xl">✅</div>
                <Editable
                  id="home-compare-us"
                  as="p"
                  className="break-keep text-[13px] font-bold leading-snug text-brand-dark sm:text-sm"
                >
                  모두의사업친구 : 297,000원부터 ~
                </Editable>
              </div>
            </div>
          </div>
        </section>

        {/* 가치 제안 4단계 */}
        <section className="bg-gray-50 px-4 py-7 sm:py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-green/10 px-4 py-1.5 text-xs font-bold text-brand-green sm:text-sm">
                🎯 서비스 안내
              </span>
              <Editable
                id="home-value-title-v2"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                297,000원부터 이 모든 걸 알려드립니다.
              </Editable>
              <span className="mt-3 h-1 w-12 rounded-full bg-brand-yellow" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                    ✓
                  </span>
                  <Editable
                    id={`home-value-${i}`}
                    as="span"
                    className="font-semibold text-brand-dark"
                  >
                    {v}
                  </Editable>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 매칭 결과 예시본 */}
        <section id="result-sample-section" className="px-4 py-7 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Editable
              id="home-sample-badge"
              as="div"
              className="mb-4 inline-block rounded-full bg-brand-yellow/20 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm"
            >
              AI 매칭 결과 예시
            </Editable>
            <Editable
              id="home-sample-title"
              as="h2"
              className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
            >
              정보 입력 시 AI가 내 사업장에 알맞는
              <br className="hidden sm:inline" /> 모든 정부지원사업을 한 번에
              안내해드립니다.
            </Editable>
            <Editable
              id="home-sample-sub"
              as="p"
              className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
            >
              아래는 실제 매칭 결과 화면의 예시입니다. 진단을 마치면 내 사업장에
              딱 맞는 지원사업 목록과 신청 방법을 확인할 수 있습니다.
            </Editable>

            {/* 결과 카드 목업 */}
            <div className="relative mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-card sm:p-7">
              {/* 상단 요약 바 */}
              <div className="flex items-center justify-between rounded-2xl bg-brand-dark px-5 py-4 text-white">
                <div>
                  <p className="text-xs text-white/70">내 사업장 매칭 결과</p>
                  <p className="mt-0.5 text-lg font-extrabold">
                    총 <span className="text-brand-yellow">12개</span>{" "}
                    지원사업이 매칭되었습니다
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold text-brand-dark sm:inline-block">
                  AI 분석 완료
                </span>
              </div>

              {/* 매칭 항목 리스트 */}
              <ul className="mt-4 space-y-3">
                {[
                  {
                    tag: "정책자금",
                    tagColor: "bg-brand-red/10 text-brand-red",
                    name: "중소벤처기업진흥공단 신성장기반자금",
                    desc: "운전·시설자금 최대 60억원 · 저리 융자",
                  },
                  {
                    tag: "지원금",
                    tagColor: "bg-brand-green/10 text-brand-green",
                    name: "소상공인 스마트상점 기술보급 지원사업",
                    desc: "스마트기기 도입비 최대 500만원 지원",
                  },
                  {
                    tag: "바우처",
                    tagColor: "bg-brand-orange/10 text-brand-orange",
                    name: "수출바우처 지원사업",
                    desc: "해외마케팅·인증 비용 최대 1억원 바우처",
                  },
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <div className="min-w-0">
                      <p className="break-keep text-sm font-bold text-brand-dark">
                        {item.name}
                      </p>
                      <p className="mt-0.5 break-keep text-xs text-brand-gray">
                        {item.desc}
                      </p>
                    </div>
                    <span className="ml-auto hidden shrink-0 self-center text-xs font-bold text-brand-green sm:inline">
                      신청 가능 ✓
                    </span>
                  </li>
                ))}
              </ul>

              {/* 블러 처리된 잠긴 항목 + 오버레이 */}
              <div className="relative mt-3">
                <ul className="space-y-3 blur-[5px]">
                  {[
                    "예비창업패키지 · 창업사업화 자금 최대 1억원",
                    "지자체 소상공인 경영개선 지원사업 · 최대 2,000만원",
                  ].map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5"
                    >
                      <span className="shrink-0 rounded-md bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                        지원사업
                      </span>
                      <p className="text-sm font-bold text-brand-dark">{t}</p>
                    </li>
                  ))}
                </ul>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/40">
                  <span className="text-2xl">🔒</span>
                  <p className="mt-1 text-sm font-bold text-brand-dark">
                    +9개 지원사업 더 보기
                  </p>
                </div>
              </div>

              <Editable
                id="home-sample-cta"
                as="a"
                href="/diagnosis"
                className="btn-brand mt-6 block w-full rounded-full py-4 text-center text-base font-bold sm:text-lg"
              >
                내 사업장 무료 진단하고 결과 확인하기
              </Editable>
            </div>
            <p className="mt-3 text-xs text-brand-gray/70">
              * 위 화면은 이해를 돕기 위한 예시이며, 실제 결과는 사업장 정보에
              따라 달라집니다.
            </p>
          </div>
        </section>

        {/* 가격표 */}
        <section
          id="pricing-section"
          className="scroll-mt-20 px-4 py-7 sm:scroll-mt-24 sm:py-12"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-yellow/20 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                💳 요금제
              </span>
              <Editable
                id="home-pricing-title"
                as="h2"
                className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
              >
                합리적인 가격, 3가지 플랜
              </Editable>
              <Editable
                id="home-pricing-sub"
                as="p"
                className="mx-auto mt-2 max-w-xl text-sm text-brand-gray"
              >
                모든 플랜은 1회성 결제이며 월 구독 결제가 아닙니다.
              </Editable>
              <span className="mt-3 h-1 w-12 rounded-full bg-brand-yellow" />
            </div>
            <div className="mt-10">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 px-4 py-7 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-dark/5 px-4 py-1.5 text-xs font-bold text-brand-dark sm:text-sm">
                💬 자주 묻는 질문
              </span>
              <Editable
                id="home-faq-title"
                as="h2"
                className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
              >
                궁금한 점, 미리 확인하세요
              </Editable>
              <span className="mt-3 h-1 w-12 rounded-full bg-brand-yellow" />
            </div>
            <div className="mt-8 space-y-3">
              {FAQS.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-gray-200 bg-white p-5"
                >
                  <summary className="cursor-pointer list-none">
                    <Editable
                      id={`home-faq-q-${i}`}
                      as="span"
                      className="font-bold text-brand-dark"
                    >
                      {f.q}
                    </Editable>
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
        <section className="px-4 pb-4 pt-7 sm:pb-6 sm:pt-12">
          <div className="mx-auto max-w-2xl rounded-3xl bg-brand-grad p-10 text-center">
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
              className="mt-3 break-keep text-sm text-brand-dark/70"
            >
              1분이면 내 사업장에 알맞는 정부지원사업을 찾을 수 있습니다.
            </Editable>
            <Editable
              id="home-cta-button"
              as="a"
              href="/diagnosis"
              className="mt-6 inline-block rounded-full bg-brand-dark px-10 py-4 text-lg font-bold text-white hover:opacity-90"
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
