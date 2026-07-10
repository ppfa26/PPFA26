"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

const PRICING_FAQ = [
  {
    q: "Q1. 자동결제인가요?",
    a: "아닙니다. 1회성 결제이며, 자동으로 재결제되지 않습니다. 만족하시면 1개월 단위로 추가 결제 후 자유롭게 연장할 수 있습니다.",
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: "아닙니다. 저희는 방법을 알려드리는 경영 자문 플랫폼입니다. 서류발급부터 신청까지 대표님이 직접 하셔야 합니다. 정부지원사업 브로커 대행 시 승인 수수료는 1억 승인 시 약 500만원이며 너무 큰 돈입니다. 신청하는 방법만 안다면 직접 신청은 그렇게 어렵지 않습니다.",
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: "아닙니다. 저희는 정부지원사업을 안내하고 방법을 자문해드리는 플랫폼입니다. 자금 승인 여부는 각 정책자금 정부 기관의 심사에 따라 결정됩니다. 저희 서비스는 대표님에게 알맞는 정부지원사업을 안내하고 신청방법을 자문해드리는 것을 목표로 합니다.",
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
    a: "없습니다. 저희는 사업장에 알맞는 정부지원사업을 AI로 찾아서 추천 및 신청방법을 자문해드리는 플랫폼이며 모두의공공조달 서비스 이용료 외 추가적인 수수료는 없습니다.",
  },
  {
    q: "Q5. 환불되나요?",
    a: "서비스 이용(열람) 전에는 7일 이내 100% 환불 가능합니다. 「전자상거래 등에서의 소비자보호에 관한 법률(전자상거래법)」을 따릅니다. 단, 서비스 이용(열람) 이후에는 관련 법령·법규에 따라 환불이 불가합니다.",
  },
  {
    q: "Q6. 어떤 지원사업까지 안내되나요?",
    a: "정책자금 대출뿐 아니라 정부 지원금, 청년창업사관학교, K-Startup, 예비창업패키지, 창업대학, 지자체 지원사업, 바우처, 각종 인증제도까지 국내 모든 정부 지원 사업을 포괄 안내합니다.",
  },
  {
    q: "Q7. 정보는 얼마나 최신인가요?",
    a: "매일 자동으로 89개 공식 사이트를 크롤링하여 최신 공고를 반영합니다. 또한 40여 개 부처의 최신 공문 자료를 기반으로 정확한 팩트체크 후 답변합니다.",
  },
];

export default function PricingPage() {
  return (
    <PageShell pageKey="pricing">
      <Header />
      <main className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Editable
              id="pricing-title"
              as="h1"
              className="text-3xl font-black text-brand-dark sm:text-4xl"
            >
              합리적인 가격, 3가지 플랜
            </Editable>
            <Editable
              id="pricing-sub"
              as="p"
              className="mx-auto mt-3 max-w-xl text-brand-gray"
            >
              모든 플랜은 1회성 결제이며 월 구독 결제가 아닙니다.
            </Editable>
            <p className="mx-auto mt-4 inline-block break-keep rounded-full bg-brand-yellow/40 px-4 py-2 text-sm font-semibold text-brand-dark">
              💡 모든 가격은 부가세가 포함된 금액입니다
            </p>
          </div>

          <div className="mt-12">
            <PricingCards prefix="pricing" />
          </div>

          {/* 가격 FAQ */}
          <div className="mx-auto mt-10 max-w-3xl sm:mt-16">
            <Editable
              id="pricing-faq-title"
              as="h2"
              className="text-center text-2xl font-extrabold text-brand-dark"
            >
              자주 묻는 질문
            </Editable>
            <div className="mt-6 space-y-3">
              {PRICING_FAQ.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-gray-200 bg-white p-5"
                >
                  <summary className="cursor-pointer list-none">
                    <Editable
                      id={`pricing-faq-q-${i}`}
                      as="span"
                      className="font-bold text-brand-dark"
                    >
                      {f.q}
                    </Editable>
                  </summary>
                  <Editable
                    id={`pricing-faq-a-${i}`}
                    as="p"
                    className="mt-3 text-sm leading-relaxed text-brand-gray"
                  >
                    {f.a}
                  </Editable>
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
