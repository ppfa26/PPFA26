"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

const TRUST_BADGES = [
  { icon: "🏛️", text: "89개 공식 사이트 매일 크롤링" },
  { icon: "📚", text: "40+개 부처 공문 기반 자문" },
  { icon: "🔒", text: "승인 보장 없음 · 자문 전용" },
  { icon: "🚫", text: "대행 없음 · 수수료 없음" },
];

const VALUES = [
  "어떤 자금·지원사업이 나에게 맞는지",
  "어디서 어떻게 신청하는지",
  "서류는 뭐가 필요한지",
  "승인 확률 높이는 방법까지",
];

const FAQS = [
  {
    q: "Q1. 자동결제인가요?",
    a: "아닙니다. 1회 결제이며, 자동으로 재결제되지 않습니다. 만족하시면 1개월 단위로 추가 결제 후 자유롭게 연장할 수 있습니다.",
  },
  {
    q: "Q2. 대신 신청해주시나요?",
    a: "아닙니다. 저희는 방법을 알려드리는 경영 자문 컨설팅입니다. 서류발급부터 신청까지 대표님이 직접 하셔야 합니다. 브로커 대행시 승인 수수료는 1억 승인시 약 500만원 — 너무 큰 돈입니다. 방법만 안다면 신청은 그렇게 어렵지 않습니다.",
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: "아닙니다. 저희는 신청 방법과 전략을 자문해드리는 서비스이며, 자금 승인 여부는 각 정책자금 기관의 심사에 따라 결정됩니다. 저희 서비스는 승인 확률을 높이는 데 도움을 드리는 것을 목적으로 합니다.",
  },
  {
    q: "Q4. 환불되나요?",
    a: "서비스 이용 전 100% 환불 가능합니다. 서비스 이용 시 전자책과 동일하게 관련 법령과 법규를 적용받으며 환불은 불가합니다.",
  },
  {
    q: "Q5. 어떤 지원사업까지 안내되나요?",
    a: "정책자금 대출뿐 아니라 청년창업사관학교, K-Startup, 예비창업패키지, 정부지원금, 창업대학, 지자체 지원사업, 바우처, 각종 인증제도까지 국내 모든 지원사업을 포괄합니다.",
  },
  {
    q: "Q6. 정보는 얼마나 최신인가요?",
    a: "매일 자동으로 89개 공식 사이트를 크롤링하여 최신 공고를 반영합니다. 또한 40+개 부처 공문 자료를 기반으로 정확한 팩트체크 후 답변합니다.",
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
          className="relative overflow-hidden px-4 pb-14 pt-12 sm:pt-20"
        >
          <div className="mx-auto max-w-3xl text-center animate-fadeUp">
            <div className="mb-5 inline-block rounded-full bg-brand-yellow px-4 py-1.5 text-xs font-bold text-brand-dark">
              정책자금·정부지원사업 통합 매칭 자문
            </div>
            <Editable
              id="hero-headline"
              as="h1"
              className="text-3xl font-black leading-tight text-brand-dark sm:text-5xl"
            >
              정책자금 브로커 수수료 5%,<br />
              아직도 비싸게 쓰고 계신가요?
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-6 max-w-md whitespace-pre-line text-base leading-relaxed text-brand-gray sm:text-lg"
            >
              {`브로커 대행시 수수료
5,000만원 승인시 250만원.
1억원 승인시 500만원.

39,000원으로 직접 방법을
배워서 무료로 신청하세요.

커피 몇잔 아껴서 사업운영
꿀팁을 배워서 평생써먹으세요.`}
            </Editable>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/diagnosis"
                className="btn-brand w-full rounded-full px-8 py-4 text-lg animate-pulseGlow sm:w-auto"
              >
                무료 진단 시작하기
              </Link>
              <Link
                href="/pricing"
                className="btn-outline w-full rounded-full px-8 py-4 text-lg sm:w-auto"
              >
                상품 자세히 보기
              </Link>
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
        <section className="px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <Editable
              id="home-value-title"
              as="h2"
              className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              39,000원으로 이 모든 걸 알려드립니다
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
        <section className="bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <Editable
              id="home-compare-title"
              as="h2"
              className="text-center text-2xl font-extrabold text-brand-dark sm:text-3xl"
            >
              비교해보세요
            </Editable>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-brand-red/30 bg-white p-6">
                <div className="text-2xl">❌</div>
                <Editable
                  id="home-compare-broker"
                  as="p"
                  className="mt-2 font-bold text-brand-dark"
                >
                  브로커 대행 = 5,000만원 승인시 최소 250만원 수수료
                </Editable>
              </div>
              <div className="rounded-2xl border-2 border-brand-green bg-white p-6">
                <div className="text-2xl">✅</div>
                <Editable
                  id="home-compare-us"
                  as="p"
                  className="mt-2 font-bold text-brand-dark"
                >
                  모두의공공조달 = 39,000원부터 ~
                </Editable>
              </div>
            </div>
          </div>
        </section>

        {/* 가격표 */}
        <section id="pricing-section" className="px-4 py-16">
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
              모든 플랜은 1회 결제이며 자동결제가 없습니다. 필요할 때만 연장하세요.
            </Editable>
            <div className="mt-10">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 px-4 py-16">
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
                    className="mt-3 text-sm leading-relaxed text-brand-gray"
                  >
                    {f.a}
                  </Editable>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 하단 CTA */}
        <section className="px-4 py-16">
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
            <Link
              href="/diagnosis"
              className="mt-6 inline-block rounded-full bg-brand-dark px-10 py-4 text-lg font-bold text-white hover:opacity-90"
            >
              무료 진단 시작하기
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </PageShell>
  );
}
