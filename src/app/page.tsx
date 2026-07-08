"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

const TRUST_BADGES = [
  { icon: "🏛️", text: "89개 공식 사이트 매일 크롤링" },
  { icon: "📚", text: "40여개 부처 최신 공문 기반 자문" },
  { icon: "🔒", text: "승인 보장 없음 · 자문 전용 플랫폼" },
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
    q: "Q4. 환불되나요?",
    a: (
      <>
        서비스 이용(열람) 전에는 7일 이내 100% 환불 가능합니다. 「전자상거래
        등에서의 소비자보호에 관한 법률(전자상거래법)」을 따릅니다. 단, 서비스
        이용(열람) 이후에는 관련 법령·법규에 따라 환불이 불가합니다.
      </>
    ),
  },
  {
    q: "Q5. 어떤 지원사업까지 안내되나요?",
    a: (
      <>
        정책자금 대출뿐 아니라 정부 지원금, 청년창업사관학교, K-Startup,
        예비창업패키지, 창업대학, 지자체 지원사업, 바우처, 각종 인증제도까지 국내
        모든 정부 지원 사업을 포괄 안내합니다.
      </>
    ),
  },
  {
    q: "Q6. 정보는 얼마나 최신인가요?",
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
          className="relative overflow-hidden px-4 pb-10 pt-10 sm:pb-14 sm:pt-20"
        >
          <div className="mx-auto max-w-3xl text-center animate-fadeUp">
            <Editable
              id="hero-badge"
              as="div"
              className="mb-5 inline-block rounded-full bg-brand-yellow px-6 py-2.5 text-sm font-bold text-brand-dark sm:text-base"
            >
              정부지원사업 통합 매칭 자문 플랫폼
            </Editable>
            <Editable
              id="hero-headline"
              as="h1"
              className="break-keep text-3xl font-black leading-tight text-brand-dark sm:text-5xl"
            >
              정부지원사업 브로커 수수료 5%,<br />
              아직도 비싸게 쓰고 계신가요?
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-gray sm:text-lg"
            >
              정부지원사업 브로커 대행 수수료는 1억원 승인 시 최소 500만원입니다.
              <br />
              모두의공공조달에서{" "}
              <strong className="text-brand-dark">99,000원</strong>으로 직접
              신청하는 방법을 배워 무료로 신청하세요.
            </Editable>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

        {/* 가치 제안 4단계 */}
        <section className="px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <Editable
              id="home-value-title"
              as="h2"
              className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              99,000원으로 이 모든 걸 알려드립니다
            </Editable>
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

        {/* 비교 섹션 */}
        <section className="bg-gray-50 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Editable
              id="home-compare-title"
              as="h2"
              className="text-center text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              혁신적인 서비스 이용료
            </Editable>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-red/30 bg-white p-6">
                <div className="shrink-0 text-2xl">❌</div>
                <Editable
                  id="home-compare-broker"
                  as="p"
                  className="break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base"
                >
                  정책자금 브로커 대행 수수료 : 최소 500만원
                </Editable>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-green bg-white p-6">
                <div className="shrink-0 text-2xl">✅</div>
                <Editable
                  id="home-compare-us"
                  as="p"
                  className="break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base"
                >
                  모두의공공조달 : 99,000원부터 ~
                </Editable>
              </div>
            </div>
          </div>
        </section>

        {/* 가격표 */}
        <section id="pricing-section" className="px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <Editable
              id="home-pricing-title"
              as="h2"
              className="text-center text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              합리적인 가격, 3가지 플랜
            </Editable>
            <Editable
              id="home-pricing-sub"
              as="p"
              className="mx-auto mt-2 max-w-xl text-center text-sm text-brand-gray"
            >
              모든 플랜은 1회성 결제이며 자동결제가 아닙니다. 필요할 때만 1개월
              단위로 연장하세요.
            </Editable>
            <div className="mt-10">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Editable
              id="home-faq-title"
              as="h2"
              className="text-center text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              자주 묻는 질문
            </Editable>
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
        <section className="px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-2xl rounded-3xl bg-brand-grad p-10 text-center">
            <Editable
              id="home-cta-title"
              as="h2"
              className="text-2xl font-black text-brand-dark sm:text-3xl"
            >
              지금 무료로 진단받아 보세요
            </Editable>
            <Editable
              id="home-cta-sub"
              as="p"
              className="mt-3 text-brand-dark/70"
            >
              3분이면 나에게 맞는 정책자금·지원사업을 찾을 수 있습니다.
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
