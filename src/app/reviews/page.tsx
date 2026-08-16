"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import Link from "next/link";
import { useEffect } from "react";

/* ────────────────────────────────────────────────────────────
 *  성공 사례 데이터
 *  - 실제 승인 사례를 기반으로 작성 (대표님 제공).
 *  - 기업명은 익명(업종+이니셜) 처리.
 *  - 신규 사례는 CASES 배열에 항목만 추가하면 카드가 자동 생성됨.
 * ──────────────────────────────────────────────────────────── */
type CaseItem = {
  no: string;
  tag: string; // 업종 · 규모
  headline: React.ReactNode; // 한 줄 임팩트 카피
  metric: string; // 확보 금액(큰 숫자)
  metricSub: string; // 금액 부연
  before: string[]; // 문단 배열(가독성을 위해 문단 단위로 분리)
  strategy: string[];
  result: string[];
  beyond: string[];
  funds: { name: string; amount: string }[]; // 승인 내역 배지
};

const CASES: CaseItem[] = [
  {
    no: "CASE 01",
    tag: "도소매 · 수출업 · 창업 3년차 · 매출 100억",
    headline: (
      <>
        자본잠식으로 <span className="text-brand-red">전부 부결</span>되던 기업이
        <br />
        흑자전환 후 <span className="text-brand-red">7억 5천만 원</span>을 확보하기까지
      </>
    ),
    metric: "7.5억",
    metricSub: "총 확보 자금",
    before:
      "매출은 100억이었지만 당기순이익이 마이너스인 자본잠식 상태. 재무 요건 때문에 모든 기관에서 당연히 부결받던 상황이었습니다.",
    strategy:
      "당장 신청이 불가한 기간 동안 벤처기업인증(혁신성장유형)을 준비했습니다. 음반·굿즈 AI 결합 홈페이지를 구축해 혁신성장유형으로 신청 → 1차 부결 후 2차 보완·이의제기로 승인. 이후 재무제표 보완으로 정부지원사업 신청 자격을 확보했습니다.",
    result:
      "다음 결산에서 2억 이익을 잡아 흑자전환에 성공. 중진공 신시장진출자금 2억(수출기업), 무역보험공사 문화산업보증 5억, 소상공인시장진흥공단 혁신성장촉진자금(수출 소상공인) 5,000만 원까지 총 7억 5천만 원의 자금을 확보했습니다.",
    beyond:
      "확보한 자금으로 대형 기획사 기획전 계약을 원활하게 진행, 현재 매출 150억을 목표로 달리고 있습니다. 현금흐름·단가표·재무제표가 개선되며 제조사와 더 유리한 조건으로 계약을 재정비, 이익률 개선도 함께 진행 중입니다.",
    funds: [
      { name: "벤처기업인증 (혁신성장유형)", amount: "자격 확보" },
      { name: "중진공 신시장진출자금 (수출)", amount: "2억" },
      { name: "무역보험공사 문화산업보증", amount: "5억" },
      { name: "소진공 혁신성장촉진자금 (수출 소상공인)", amount: "5,000만" },
    ],
  },
];

export default function ReviewsPage() {
  // reveal 애니메이션 재사용
  useEffect(() => {}, []);

  return (
    <>
      <ScrollReveal />
      <Header />

      <main className="min-h-screen bg-white">
        {/* ── 히어로 ───────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#fff7f2] to-white px-5 pb-10 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="reveal inline-block rounded-full bg-brand-red/[0.07] px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-brand-red sm:text-[13px]">
              Growth Stories
            </p>
            <h1 className="reveal mt-5 break-keep text-[26px] font-black leading-[1.28] tracking-[-0.035em] text-brand-dark sm:text-[42px] sm:leading-[1.18]">
              자금이 들어온 뒤,
              <br />
              기업은 <span className="text-brand-red">어떻게 달라졌을까요?</span>
            </h1>
            <p className="reveal mx-auto mt-5 max-w-xl break-keep text-[14px] font-medium leading-relaxed text-brand-gray sm:text-[17px]">
              우리가 진짜로 증명해야 하는 건 조달 금액이 아니라,
              <br className="hidden sm:block" />
              그 자금이 기업을 <b className="text-brand-dark">어디까지 데려갔는가</b>입니다.
            </p>
          </div>
        </section>

        {/* ── 사례 카드 ─────────────────────────────── */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 sm:gap-12">
            {CASES.map((c) => (
              <article
                key={c.no}
                className="reveal overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_10px_40px_-18px_rgba(0,0,0,0.18)]"
              >
                {/* 카드 상단: 태그 + 임팩트 헤드라인 + 금액 */}
                <div className="relative bg-gradient-to-br from-brand-dark to-[#2a2a33] px-6 py-7 text-white sm:px-9 sm:py-9">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-white/90">
                      {c.no}
                    </span>
                    <span className="break-keep text-[11.5px] font-semibold text-white/60 sm:text-[12.5px]">
                      {c.tag}
                    </span>
                  </div>

                  <h2 className="mt-4 break-keep text-[19px] font-black leading-[1.4] tracking-[-0.02em] sm:text-[25px] sm:leading-[1.35]">
                    {c.headline}
                  </h2>

                  <div className="mt-5 flex items-end gap-2 border-t border-white/10 pt-4">
                    <span className="text-[34px] font-black leading-none tracking-[-0.03em] text-brand-yellow sm:text-[44px]">
                      {c.metric}
                    </span>
                    <span className="mb-1 text-[13px] font-semibold text-white/70 sm:text-[15px]">
                      {c.metricSub}
                    </span>
                  </div>
                </div>

                {/* 카드 본문: Before / Strategy / Result / Beyond */}
                <div className="flex flex-col gap-5 px-6 py-7 sm:px-9 sm:py-9">
                  <Step label="Before" tone="gray" title="신청 전 상황" body={c.before} />
                  <Step label="Strategy" tone="orange" title="어떻게 접근했나" body={c.strategy} />
                  <Step label="Result" tone="red" title="확보한 결과" body={c.result} />

                  {/* 승인 내역 배지 */}
                  <div className="rounded-2xl bg-brand-red/[0.04] p-4 sm:p-5">
                    <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-brand-red">
                      승인 내역
                    </p>
                    <ul className="flex flex-col gap-2">
                      {c.funds.map((f) => (
                        <li
                          key={f.name}
                          className="flex items-center justify-between gap-3 rounded-xl border border-brand-red/15 bg-white px-3.5 py-2.5"
                        >
                          <span className="break-keep text-[13px] font-semibold text-brand-dark sm:text-[14px]">
                            {f.name}
                          </span>
                          <span className="shrink-0 text-[14px] font-black tracking-[-0.02em] text-brand-red sm:text-[16px]">
                            {f.amount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Step label="Beyond" tone="emerald" title="그 이후" body={c.beyond} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 하단 CTA ─────────────────────────────── */}
        <section className="border-t border-gray-100 bg-gray-50 px-5 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="reveal break-keep text-[20px] font-black leading-snug tracking-[-0.02em] text-brand-dark sm:text-[28px]">
              다음 성공 사례의 주인공은
              <br />
              <span className="text-brand-red">대표님</span>일 수 있습니다
            </h3>
            <p className="reveal mx-auto mt-4 max-w-md break-keep text-[14px] font-medium leading-relaxed text-brand-gray sm:text-[16px]">
              정부지원사업 AI 통합 매칭 플랫폼이 대표님 사업장에 딱 맞는
              정부지원사업을 무료로 찾아드립니다.
            </p>
            <Link
              href="/diagnosis-chat"
              className="btn-red mt-7 inline-flex items-center gap-2 rounded-full px-9 py-4 text-[16px] font-extrabold tracking-[-0.01em] sm:text-[18px]"
            >
              3분 무료 진단 시작하기
              <span aria-hidden="true">→</span>
            </Link>
            <p className="reveal mx-auto mt-5 max-w-md break-keep text-[11px] leading-relaxed text-brand-gray/70 sm:text-xs">
              ※ 본 사례는 실제 승인 사례를 기반으로 하며, 기업 정보는 익명 처리했습니다.
              승인 여부·금액은 정부 기관 심사 및 기업별 상황에 따라 달라질 수 있으며,
              동일한 결과를 보장하지 않습니다.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* Before/Strategy/Result/Beyond 각 단계 블록 */
function Step({
  label,
  tone,
  title,
  body,
}: {
  label: string;
  tone: "gray" | "orange" | "red" | "emerald";
  title: string;
  body: string;
}) {
  const toneMap: Record<string, string> = {
    gray: "bg-gray-100 text-gray-500",
    orange: "bg-brand-orange/10 text-brand-orange",
    red: "bg-brand-red/10 text-brand-red",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="flex gap-3.5 sm:gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`rounded-md px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${toneMap[tone]}`}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-[13px] font-extrabold tracking-[-0.01em] text-brand-dark sm:text-[14.5px]">
          {title}
        </p>
        <p className="mt-1.5 break-keep text-[13.5px] font-medium leading-[1.7] text-brand-gray sm:text-[15px]">
          {body}
        </p>
      </div>
    </div>
  );
}
