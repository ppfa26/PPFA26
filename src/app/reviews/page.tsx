"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import ScrollReveal from "@/components/ScrollReveal";
import Link from "next/link";

/* ────────────────────────────────────────────────────────────
 *  성공 사례 데이터
 *  - 실제 승인 사례를 기반으로 작성 (대표님 제공).
 *  - 기업명은 익명(업종+규모) 처리.
 *  - 각 항목은 문단 배열(string[])이라 줄바꿈이 자연스럽게 표현됨.
 *  - 신규 사례는 CASES 배열에 항목만 추가하면 카드가 자동 생성됨.
 * ──────────────────────────────────────────────────────────── */
type CaseItem = {
  no: string;
  tag: string; // 업종 · 규모
  headline: React.ReactNode; // 임팩트 카피
  metric: string; // 확보 금액(큰 숫자)
  metricSub: string; // 금액 부연
  before: string[];
  strategy: string[];
  result: string[];
  beyond: string[];
  funds: { name: string; amount: string }[]; // 승인 내역 배지
};

const CASES: CaseItem[] = [
  {
    no: "CASE 01",
    tag: "도소매 · 수출업 · 창업 3년차 · 매출 70억",
    headline: (
      <>
        자본잠식으로 <span className="text-brand-orange">전부 부결</span>되던 기업이
        <br />
        흑자전환 후 <span className="text-brand-orange">8억 5천만 원</span>을 확보하기까지
      </>
    ),
    metric: "8.5억",
    metricSub: "총 확보 자금",
    before: [
      "매출은 70억이었지만 당기순이익이 마이너스인 자본잠식 상태였습니다. 재무 요건 때문에 모든 기관에서 당연히 부결받던 상황이었습니다.",
      "기존 대출도 많은 상태였고, 대표님은 반쯤 포기한 심정으로 저희에게 문의를 주셨던 사례입니다.",
    ],
    strategy: [
      "당장 신청이 불가하다는 걸 누구보다 잘 알고 있었기에, 좋은 기업으로 하나씩 바꿔나가는 자문부터 시작했습니다.",
      "그해 말 결산 전까지 재무제표가 최대한 흑자 전환될 수 있도록 준비했고, 그 기간 동안 회사의 강력한 무기가 될 벤처기업인증(혁신성장유형)을 함께 준비했습니다.",
      "기존 음반·굿즈 홈페이지를 AI 맞춤 추천 시스템을 갖춘 형태로 재구축해 혁신성장유형으로 신청 → 1차 부결 후, 2차 보완·이의제기로 승인받았습니다.",
      "국세·지방세 미납/체납도 일부 있어 먼저 정리했고, 재무제표 보완이 끝난 다음 해에 정부지원사업 신청 자격을 확보했습니다.",
      "벤처인증을 무기로 연초 수출바우처 1억 승인 → 신시장진출자금 연계 2억 승인 → 무역보험공사 문화산업보증 10억 신청 후 5억 승인 → 마지막으로 소상공인시장진흥공단 혁신성장촉진자금(수출 소상공인) 1억까지 순차적으로 확보했습니다.",
    ],
    result: [
      "다음 결산에서 2억 이익을 잡아 흑자전환에 성공했습니다.",
      "중진공 신시장진출자금 2억(수출기업), 무역보험공사 문화산업보증 5억, 소상공인시장진흥공단 혁신성장촉진자금(수출 소상공인) 5,000만 원, 수출바우처 1억까지 — 총 8억 5천만 원의 정부지원사업을 승인받고 확보했습니다.",
    ],
    beyond: [
      "확보한 자금으로 대형 기획사 기획전 계약을 원활하게 진행, 현재 매출 150억을 목표로 달리고 있습니다.",
      "현금흐름·단가표·재무제표가 개선되며 기존 제조사와 더 유리한 조건으로 계약을 재정비했고, 이익률 개선도 함께 진행 중입니다.",
    ],
    funds: [
      { name: "벤처기업인증 (혁신성장유형)", amount: "인증 확보" },
      { name: "중기부 수출바우처", amount: "1억" },
      { name: "중진공 신시장진출자금 (수출)", amount: "2억" },
      { name: "무역보험공사 문화산업보증", amount: "5억" },
      { name: "소진공 혁신성장촉진자금 (수출 소상공인)", amount: "5,000만" },
    ],
  },
];

export default function ReviewsPage() {
  return (
    <PageShell pageKey="reviews" stickyFooter>
      <ScrollReveal />
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        {/* ── 히어로 ───────────────────────────────── */}
        <section className="text-center">
          <p className="reveal inline-block rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-orange sm:text-[12.5px]">
            Growth Stories
          </p>
          <h1 className="reveal mt-5 break-keep text-[25px] font-black leading-[1.3] tracking-[-0.035em] text-white sm:text-[40px] sm:leading-[1.2]">
            정부지원사업 신청과 그 과정의 이야기,
            <br className="hidden sm:block" />{" "}
            그 후 기업은 <span className="text-brand-orange">어떻게 달라졌을까요?</span>
          </h1>
          <p className="reveal mx-auto mt-5 max-w-xl break-keep text-[13.5px] font-medium leading-[1.75] text-white/55 sm:text-[16px]">
            저희가 진짜로 증명해야 하는 건 승인 사례가 아니라,
            <br className="hidden sm:block" />{" "}
            그 자금이 기업을{" "}
            <b className="font-bold text-white/90">어디에서 어디로 데려갔는가</b>입니다.
          </p>
        </section>

        {/* ── 사례 카드 ─────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-10 sm:mt-14 sm:gap-14">
          {CASES.map((c) => (
            <article
              key={c.no}
              className="reveal overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm"
            >
              {/* 카드 상단: 태그 + 임팩트 헤드라인 + 금액 */}
              <div className="relative overflow-hidden px-6 pb-7 pt-7 sm:px-9 sm:pb-9 sm:pt-9">
                {/* 은은한 상단 하이라이트 */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent" />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-orange/20 blur-3xl"
                  aria-hidden="true"
                />

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="rounded-md bg-brand-orange px-2.5 py-1 text-[11px] font-black tracking-[0.06em] text-brand-dark">
                    {c.no}
                  </span>
                  <span className="break-keep text-[11.5px] font-semibold text-white/50 sm:text-[13px]">
                    {c.tag}
                  </span>
                </div>

                <h2 className="mt-4 break-keep text-[19px] font-black leading-[1.45] tracking-[-0.02em] text-white sm:text-[25px] sm:leading-[1.4]">
                  {c.headline}
                </h2>

                <div className="mt-6 flex items-end gap-2.5 border-t border-white/10 pt-5">
                  <span className="bg-gradient-to-br from-brand-yellow to-brand-orange bg-clip-text text-[38px] font-black leading-none tracking-[-0.03em] text-transparent sm:text-[48px]">
                    {c.metric}
                  </span>
                  <span className="mb-1 text-[13px] font-semibold text-white/60 sm:text-[15px]">
                    {c.metricSub}
                  </span>
                </div>
              </div>

              {/* 카드 본문: Before / Strategy / Result / 승인내역 / Beyond */}
              <div className="flex flex-col gap-6 border-t border-white/[0.06] bg-black/20 px-6 py-7 sm:px-9 sm:py-9">
                <Step label="Before" tone="slate" title="신청 전 상황" body={c.before} />
                <Divider />
                <Step label="Strategy" tone="orange" title="어떻게 접근했나" body={c.strategy} />
                <Divider />
                <Step label="Result" tone="red" title="확보한 결과" body={c.result} />

                {/* 승인 내역 배지 */}
                <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/[0.06] p-4 sm:p-5">
                  <p className="mb-3 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-brand-orange">
                    <span aria-hidden="true">📌</span> 승인 내역
                  </p>
                  <ul className="flex flex-col gap-2">
                    {c.funds.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
                      >
                        <span className="break-keep text-[12.5px] font-semibold text-white/85 sm:text-[14px]">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-[14px] font-black tracking-[-0.02em] text-brand-yellow sm:text-[16px]">
                          {f.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Divider />
                <Step label="Beyond" tone="emerald" title="그 이후" body={c.beyond} />
              </div>
            </article>
          ))}
        </section>

        {/* ── 하단 CTA ─────────────────────────────── */}
        <section className="reveal mt-12 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-orange/[0.14] to-transparent px-6 py-10 text-center sm:mt-16 sm:px-10 sm:py-14">
          <h3 className="break-keep text-[21px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[28px]">
            다음 성공 사례의 주인공은
            <br />
            <span className="text-brand-orange">대표님</span>일 수 있습니다
          </h3>
          <p className="mx-auto mt-4 max-w-md break-keep text-[13.5px] font-medium leading-[1.7] text-white/60 sm:text-[16px]">
            정부지원사업 AI 통합 매칭 플랫폼이
            <br className="hidden sm:block" />{" "}
            대표님 사업장에 딱 맞는 정부지원사업을 무료로 찾아드립니다.
          </p>
          <Link
            href="/diagnosis-chat"
            className="btn-red mt-7 inline-flex items-center gap-2 rounded-full px-9 py-4 text-[15px] font-extrabold tracking-[-0.01em] sm:text-[17px]"
          >
            3분 무료 진단 시작하기
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mx-auto mt-6 max-w-md break-keep text-[10.5px] leading-[1.7] text-white/35 sm:text-[11.5px]">
            ※ 본 사례는 실제 승인 사례를 기반으로 하며, 기업 정보는 익명 처리했습니다.
            승인 여부·금액·기간은 정부 기관 심사 및 기업별 상황에 따라 달라질 수 있으며,
            동일한 결과를 보장하지 않습니다.
          </p>
        </section>
      </main>

      <Footer />
    </PageShell>
  );
}

/* 각 단계 사이의 얇은 구분선 */
function Divider() {
  return <div className="h-px w-full bg-white/[0.06]" aria-hidden="true" />;
}

/* Before/Strategy/Result/Beyond 각 단계 블록 */
function Step({
  label,
  tone,
  title,
  body,
}: {
  label: string;
  tone: "slate" | "orange" | "red" | "emerald";
  title: string;
  body: string[];
}) {
  const toneMap: Record<string, string> = {
    slate: "bg-white/10 text-white/60",
    orange: "bg-brand-orange/15 text-brand-orange",
    red: "bg-brand-red/15 text-brand-red",
    emerald: "bg-emerald-500/15 text-emerald-400",
  };
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span
          className={`rounded-md px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] ${toneMap[tone]}`}
        >
          {label}
        </span>
        <p className="text-[13px] font-extrabold tracking-[-0.01em] text-white/90 sm:text-[14.5px]">
          {title}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2.5 pl-0.5">
        {body.map((para, i) => (
          <p
            key={i}
            className="break-keep text-[13.5px] font-medium leading-[1.8] text-white/65 sm:text-[14.5px]"
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
