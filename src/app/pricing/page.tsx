"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";

const PRICING_FAQ = [
  {
    q: "자동결제인가요?",
    a: "아닙니다. 1회 결제이며 자동으로 재결제되지 않습니다. 만족하시면 1개월 단위로 추가 결제 후 연장할 수 있습니다.",
  },
  {
    q: "환불되나요?",
    a: "서비스 이용 전 100% 환불 가능합니다. 서비스 이용 시 전자책과 동일하게 관련 법령과 법규를 적용받으며 환불은 불가합니다.",
  },
  {
    q: "대신 신청해주시나요?",
    a: "아닙니다. 저희는 방법을 알려드리는 경영 자문 컨설팅입니다. 서류발급부터 신청까지 대표님이 직접 하셔야 합니다.",
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
              모든 플랜은 1회성 결제이며 자동결제가 아닙니다. 필요할 때만 1개월 단위로 연장하세요.
            </Editable>
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
              결제 관련 자주 묻는 질문
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
                      Q. {f.q}
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
