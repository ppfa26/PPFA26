"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import AdFitBanner from "@/components/AdFitBanner";
import { ADFIT_UNIT_PC_728x90 } from "@/lib/adfitConfig";

const PRICING_FAQ = [
  {
    q: "Q1. 자동결제인가요?",
    a: "아닙니다. 1회성 결제입니다.",
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: "아닙니다. 저희는 안내·추천·매칭 플랫폼입니다.\n서류 발급과 신청은 이용자님이 직접 하십니다.",
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: "아닙니다. 본 서비스는 안내·추천·매칭 플랫폼입니다.\n승인 여부는 정부 기관 심사로 결정되며,\n정부지원사업 승인을 보장하지 않습니다.",
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
    a: "없습니다.\n서비스 이용료 외 추가 수수료는 없습니다.",
  },
  {
    q: "Q5. 환불되나요?",
    a: "열람 후에는 관련 법령에 따라 환불이 불가합니다.\n단, 열람 전에는 7일 이내는 100% 환불됩니다.\n본 사이트는 전자상거래법을 따릅니다.",
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
      <main>
        {/* 요금 안내 - 홈 첫 화면 요금 섹션과 동일한 디자인 (대표님 요청) */}
        <section className="px-4 py-6 sm:py-10">
          <div className="mx-auto max-w-3xl">
            {/* 상단 헤더 박스 - 홈과 동일(section-title-glass + 뱃지) */}
            <div className="section-title-glass is-wide-pricing mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm">
                💳 서비스 이용 플랜
              </span>
              <Editable
                id="pricing-title"
                as="h1"
                className="break-keep text-[22px] font-black tracking-[-0.03em] text-brand-dark sm:text-[26px]"
              >
                AI 진단 리포트
              </Editable>
              <Editable
                id="pricing-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium text-brand-gray"
              >
                1회성 결제이며, 월 구독이 아닙니다.
              </Editable>
              <p className="mt-4 inline-block break-keep rounded-full bg-brand-yellow/40 px-4 py-2 text-sm font-semibold text-brand-dark">
                💡 모든 가격은 부가세가 포함된 금액입니다
              </p>
            </div>
            <div className="mt-6">
              <PricingCards prefix="pricing" />
            </div>
          </div>
        </section>

        {/* 구간 구분 - 얇은 회색 가로줄 (홈과 동일) */}
        <div className="section-divider" aria-hidden="true" />

        {/* FAQ - 홈 첫 화면 FAQ 섹션과 동일한 디자인 (대표님 요청) */}
        <section className="bg-gray-50 px-4 py-6 sm:py-10">
          <div className="mx-auto max-w-3xl">
            <div className="section-title-glass is-wide mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-brand-orange sm:text-sm">
                💬 자주 묻는 질문
              </span>
              <Editable
                id="pricing-faq-title"
                as="h2"
                className="break-keep text-[22px] font-black tracking-[-0.03em] text-brand-dark sm:text-[26px]"
              >
                궁금한 점, 미리 확인하세요
              </Editable>
              <Editable
                id="pricing-faq-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium text-brand-gray"
              >
                결제 전 가장 많이 묻는 질문들을 모았습니다.
              </Editable>
            </div>
            {/* 아코디언 목록 - 홈과 동일(faq-accordion + 화살표 회전).
                광고(728px) 가로폭과 어울리도록 본문과 같은 max-w-3xl 로 정렬. */}
            <div className="mx-auto mt-6 max-w-3xl space-y-3">
              {PRICING_FAQ.map((f, i) => (
                <details
                  key={i}
                  className="faq-accordion group rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition open:border-brand-orange/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <Editable
                      id={`pricing-faq-q-${i}`}
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
                    id={`pricing-faq-a-${i}`}
                    as="p"
                    className="mt-3 whitespace-pre-line break-keep text-sm leading-relaxed text-brand-gray"
                  >
                    {f.a}
                  </Editable>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── 카카오 애드핏 광고 (요금 안내 하단 · 푸터 위) ──
          광고(728px)를 본문과 동일한 max-w-3xl 폭 안에서 중앙 정렬 →
          요금·FAQ 콘텐츠와 세로 라인이 맞아 깔끔하게 이어진다. */}
      <div className="border-t border-brand-dark/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <AdFitBanner adUnitPc={ADFIT_UNIT_PC_728x90} />
        </div>
      </div>

      <Footer />
    </PageShell>
  );
}
