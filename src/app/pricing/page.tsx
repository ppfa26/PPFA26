"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

const PRICING_FAQ = [
  {
    q: "Q1. 자동결제인가요?",
    a: "아닙니다. 1회성 결제입니다.\n자동으로 재결제되지 않습니다.\n만족하시면 1개월 단위로 연장하실 수 있습니다.",
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: "아닙니다. 저희는 매칭 플랫폼입니다.\n서류 발급과 신청은 이용자님이 직접 하십니다.\n저희는 신청 가능한 사업을 추천·안내해 드립니다.",
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: "아닙니다. 저희는 추천·안내 서비스입니다.\n승인 여부는 정부 기관 심사로 결정됩니다.\n승인을 보장하지 않습니다.",
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
    a: "없습니다.\n서비스 이용료 외 추가 수수료는 없습니다.",
  },
  {
    q: "Q5. 환불되나요?",
    a: "열람 전에는 7일 이내 100% 환불됩니다.\n전자상거래법을 따릅니다.\n단, 열람 후에는 관련 법령에 따라 환불이 불가합니다.",
  },
  {
    q: "Q6. 어떤 지원사업까지 안내되나요?",
    a: "정부 지원금·바우처·정책자금·감면제도를 안내합니다.\nK-Startup, 창업패키지, 지자체 사업도 포함합니다.\n국내 모든 정부지원사업 안내를 목표로 합니다.",
  },
  {
    q: "Q7. 정보는 얼마나 최신인가요?",
    a: "매일 정부 공식 사이트를 자동으로 확인합니다.\n최신 공고 및 공고를 팩트체크 후 반영합니다.",
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
              AI 진단 리포트
            </Editable>
            <Editable
              id="pricing-sub"
              as="p"
              className="mx-auto mt-3 max-w-xl text-brand-gray"
            >
              1회성 결제이며 월 구독 결제가 아닙니다.
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
                    className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-gray"
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
