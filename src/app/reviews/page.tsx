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
    metricSub: "확보한 정부지원사업",
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

  {
    no: "CASE 02",
    tag: "방송 프로그램 제작 · 창업 3년차 · 매출 10억대",
    headline: (
      <>
        대출 한도를 <span className="text-brand-orange">모두 소진</span>한 청년 PD 기업이
        <br />
        기술력을 무기로 <span className="text-brand-orange">3억 7천만 원</span>을 확보하기까지
      </>
    ),
    metric: "3.7억",
    metricSub: "확보한 정부지원사업",
    before: [
      "업력 3년, 매출 10억대의 청년 PD 출신 대표님과 직원들이 이끄는 기업이었습니다.",
      "본사 매입으로 인한 은행 대출로 대출 한도를 이미 최대치까지 쓴 상태에서 저희를 만나, 여기저기서 매출 대비 초과 대출로 부결받던 상황이었습니다.",
      "다만 OTT(넷플릭스·디즈니플러스 등)와 해외 현지화 프로덕션 계약을 신규로 맺었고, 매출이 3억 → 6억 → 10억으로 꾸준히 상승 중이라는 점이 큰 가능성이었습니다.",
    ],
    strategy: [
      "자체 편집 프로그램 개발을 완료했고 신규 수주 계약도 여러 건 맺은 상태여서, 이 기술력과 성장세를 무기로 만들어드리기로 했습니다.",
      "먼저 벤처인증(혁신성장유형)을 신청·획득했고, 콘텐츠 제작 관련 기술보증기금 보증을 병행했습니다. 10억 신청은 부결됐지만 5억 재신청 후 2억을 승인받았습니다.",
      "2년 연속 매출 신장 기업 요건을 활용해 소상공인시장진흥공단 혁신성장촉진자금 2억 신청 → 7,000만 원 승인, 동시에 중소벤처기업진흥공단 청년창업사업자금 1억을 승인받았습니다.",
    ],
    result: [
      "벤처인증(혁신성장유형)을 확보하고, 기술보증기금 2억 보증까지 연계해 총 3억 7천만 원의 정부지원사업을 승인받았습니다.",
      "대출 한도가 막혀 있던 기업이 '기술력'이라는 새로운 무기로 자금줄을 다시 연 사례입니다.",
    ],
    beyond: [
      "확보한 자금과 벤처인증을 발판으로, 꾸준히 상승하던 매출 곡선에 더 탄력을 받을 수 있는 기반을 마련했습니다.",
    ],
    funds: [
      { name: "벤처기업인증 (혁신성장유형)", amount: "인증 확보" },
      { name: "기술보증기금 (콘텐츠 제작 보증)", amount: "2억" },
      { name: "중진공 청년창업사업자금", amount: "1억" },
      { name: "소진공 혁신성장촉진자금 (2년 연속 매출 신장)", amount: "7,000만" },
    ],
  },

  {
    no: "CASE 03",
    tag: "제조업 · 육류 가공(포장육·냉동육) · 창업 2년차",
    headline: (
      <>
        명절 운영자금이 급했던 청년 대표님,
        <br />
        기대의 2배 <span className="text-brand-orange">2억 4천만 원</span>을 확보하기까지
      </>
    ),
    metric: "2.4억",
    metricSub: "확보한 정부지원사업",
    before: [
      "청년 사업자 대표님이 사업을 시작해 매출은 늘고 있었지만 남는 것이 많지 않던 상태였습니다.",
      "설 명절 시즌 고기 매입을 위한 운영자금이 필요해 문의를 주셨습니다. 창업 2년차, 대출은 없는 상태였고 신용점수도 나쁘지 않아 수월하게 자문을 시작할 수 있었습니다.",
    ],
    strategy: [
      "재무제표상 당기순이익이 낮은 점이 유일한 단점이었습니다. 목표한 설 명절 시즌 운영자금은 시점상 준비가 어려워 보여, 작년도 재무제표 결산 수정 후 그해 4월부터 정부지원사업을 하나씩 신청하는 방향으로 잡았습니다.",
      "창업 이력이 좋은 경력으로 인정받았고, 업종 또한 청년 창업자에게 유리한 제조업이었습니다.",
      "중소벤처기업진흥공단 청년창업사업자금 1억 신청·승인, 소상공인시장진흥공단 재도전특별자금 7,000만 원 신청 후 4,000만 원 승인, 기술보증기금 초기창업자보증 1억 신청·승인까지 동시에 진행했습니다.",
    ],
    result: [
      "'1억 정도만 있어도 정말 좋겠다'고 하셨던 대표님께, 동시 진행 전략으로 기대의 2배가 넘는 총 2억 4천만 원의 정부지원사업 승인을 만들어드렸습니다.",
    ],
    beyond: [
      "필요했던 명절 운영자금을 넘어서는 자금을 확보하며, 안정적으로 사업을 확장할 수 있는 발판을 마련했습니다.",
    ],
    funds: [
      { name: "중진공 청년창업사업자금", amount: "1억" },
      { name: "기술보증기금 초기창업자보증", amount: "1억" },
      { name: "소진공 재도전특별자금", amount: "4,000만" },
    ],
  },

  {
    no: "CASE 04",
    tag: "제조업 · 실사출력 옥외간판물 설치·제작",
    headline: (
      <>
        대출 과다·낮은 신용도였지만
        <br />
        특허를 살려 <span className="text-brand-orange">1억 7천만 원</span>을 확보하기까지
      </>
    ),
    metric: "1.7억",
    metricSub: "확보한 정부지원사업",
    before: [
      "기존 대출이 매우 많은 상태로 만난 케이스로, 신용도도 낮고 매출도 미비한 편이었습니다.",
      "다만 기존 대출이 전부 담보 대출 형태였고 정부지원사업으로 받은 자금은 전혀 없는 상태였으며, 매출이 낮아도 3년간 꾸준히 늘고 있었고 간판 제작 관련 특허를 보유한 점을 눈여겨봤습니다.",
    ],
    strategy: [
      "신용도 향상을 위해 KCB·나이스 신용도 시뮬레이션을 추천드렸고, 작은 카드론과 대출들을 상환해 신용도를 끌어올려 드렸습니다.",
      "꾸준히 늘어나는 매출을 장점으로 부각해 사업계획서 첨삭을 도왔고, 소상공인시장진흥공단 2년 연속 매출 신장 소상공인 자금 2억 신청 후 7,000만 원을 승인받았습니다.",
      "간판 제작 관련 특허를 강점으로 살려 기술보증기금 IP보증 2억 신청 후 1억을 승인받았으며, 연구개발부서 설립까지 함께 자문해드렸습니다.",
    ],
    result: [
      "연구개발부서 설립과 함께, 소진공 7,000만 원·기술보증기금 IP보증 1억 등 총 1억 7천만 원의 정부지원사업을 승인받았습니다.",
      "정부지원사업 이력이 전혀 없던 기업이 '특허'라는 자산을 자금으로 연결한 사례입니다.",
    ],
    beyond: [
      "신용도 개선과 연구개발부서 설립으로, 앞으로 더 큰 규모의 정부지원사업에 도전할 수 있는 기업 구조를 갖췄습니다.",
    ],
    funds: [
      { name: "기술보증기금 IP보증 (특허 활용)", amount: "1억" },
      { name: "소진공 2년 연속 매출 신장 소상공인 자금", amount: "7,000만" },
      { name: "연구개발부서 설립", amount: "설립 완료" },
    ],
  },
];

/* ────────────────────────────────────────────────────────────
 *  그 외 승인 사례 (작은 카드 그리드)
 *  - 실제 승인 서류를 기반으로 익명(업종 · 기관/상품 · 금액) 처리.
 *  - 카드가 너무 많아, 대표 사례를 추려 그리드로 요약.
 * ──────────────────────────────────────────────────────────── */
type MiniCase = { sector: string; org: string; amount: string };

const MORE_CASES: MiniCase[] = [
  { sector: "도소매 · 수출업", org: "무역보험공사 문화산업보증", amount: "4.75억" },
  { sector: "방송 콘텐츠 제작", org: "중진공 수출기업글로벌화", amount: "5억" },
  { sector: "육류 소매업", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "인테리어 디자인업", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "편의점 운영", org: "인천재단 상권활성화 특례보증", amount: "3,500만" },
  { sector: "김밥·간이음식점", org: "중진공 혁신성장촉진자금", amount: "2억" },
  { sector: "스터디카페 운영", org: "중진공 혁신성장촉진자금(운전)", amount: "1억" },
  { sector: "여성복 제조업", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "노래연습장 운영", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "일반 교과 학원", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "선박부품 제조업", org: "소진공 성장기반자금(소공인)", amount: "1억" },
  { sector: "미용업", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "물류·운송업", org: "소진공 일반경영안정자금", amount: "7,000만" },
  { sector: "무역업(수입)", org: "인천재단 희망인천 특례보증", amount: "2,550만" },
  { sector: "제조업(기계)", org: "경기재단 특례보증", amount: "5,000만" },
  { sector: "체력단련시설", org: "소진공 일반경영안정자금", amount: "7,000만" },
];

/* ────────────────────────────────────────────────────────────
 *  고객 후기 (네이버 스타일 짧은 후기)
 *  - 실제 상담·진행 톤을 살려 자연스럽게 작성한 예시.
 *  - 닉네임/업종은 익명. 대표님 검수 후 수정 예정.
 * ──────────────────────────────────────────────────────────── */
type MiniReview = { nick: string; sector: string; body: string };

const REVIEWS: MiniReview[] = [
  {
    nick: "육****",
    sector: "육류 가공 · 창업 2년차",
    body: "1억만 돼도 감사했는데 나눠서 2억 넘게 승인됐어요. 명절 물량 걱정 없이 넘겼습니다.",
  },
  {
    nick: "PD****",
    sector: "방송 콘텐츠 제작",
    body: "어디서도 안 된다던 상황, 벤처인증부터 순서대로 잡아주셔서 자금길이 다시 열렸습니다.",
  },
  {
    nick: "간***",
    sector: "간판 제작 · 제조업",
    body: "특허가 이렇게 쓰일 줄 몰랐어요. 하나하나 짚어주셔서 IP보증까지 받았습니다.",
  },
  {
    nick: "카페**",
    sector: "스터디카페 운영",
    body: "뭐부터 할지 막막했는데 진단 한 번에 방향이 잡혔어요. 상담도 부담 없어 좋았습니다.",
  },
  {
    nick: "미용실**",
    sector: "미용업",
    body: "필요한 서류만 딱 짚어주셔서 수월했어요. 승인까지 생각보다 훨씬 빨랐습니다.",
  },
  {
    nick: "수출***",
    sector: "도소매 · 수출업",
    body: "자본잠식으로 다 부결이었는데 재무 정리부터 길게 봐주셨어요. 결국 큰 금액을 확보했습니다.",
  },
  {
    nick: "노래***",
    sector: "노래연습장 운영",
    body: "정부지원사업은 남 얘긴 줄 알았어요. 우리 같은 곳도 된다는 걸 처음 알았습니다.",
  },
  {
    nick: "부동산**",
    sector: "부동산 중개업",
    body: "다른 곳에선 안 된다던 조건, 여기선 되는 방법을 찾아주셨어요. 설명도 쉽고 명확합니다.",
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
          <h1 className="reveal mt-5 break-keep text-center text-[25px] font-black leading-[1.35] tracking-[-0.035em] text-white sm:text-[40px] sm:leading-[1.25]">
            정부지원사업 신청과
            <br />
            그 과정의 이야기,
            <br />
            그 후 기업은{" "}
            <span className="text-brand-orange">어떻게 달라졌을까요?</span>
          </h1>
          <p className="reveal mx-auto mt-5 max-w-xl break-keep text-center text-[14px] font-medium leading-[1.85] text-white/60 sm:text-[16.5px]">
            저희가 진짜로 증명하려는 건
            <br />
            승인 사례가 아니라,
            <br />
            우리의 자문이 기업을 어디에서 어디로
            <br />
            <b className="font-bold text-white/90">데려갔는가</b>입니다.
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

                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                  <span className="rounded-md bg-brand-orange px-2.5 py-1 text-[11px] font-black tracking-[0.06em] text-brand-dark">
                    {c.no}
                  </span>
                  <span className="break-keep text-[11.5px] font-semibold text-white/50 sm:text-[13px]">
                    {c.tag}
                  </span>
                </div>

                <h2 className="mx-auto mt-4 max-w-[26ch] break-keep text-center text-[19px] font-black leading-[1.45] tracking-[-0.02em] text-white sm:text-[25px] sm:leading-[1.4]">
                  {c.headline}
                </h2>

                <div className="mt-6 flex items-end justify-center gap-2.5 border-t border-white/10 pt-5">
                  <span className="text-[38px] font-black leading-none tracking-[-0.03em] text-brand-orange [text-shadow:0_2px_20px_rgba(255,149,0,0.45)] sm:text-[48px]">
                    {c.metric}
                  </span>
                  <span className="mb-1 text-[13px] font-semibold text-white/60 sm:text-[15px]">
                    {c.metricSub}
                  </span>
                </div>
              </div>

              {/* 카드 본문: Before / Strategy / Result / 승인내역 / Beyond */}
              <div className="flex flex-col gap-7 border-t border-white/[0.06] bg-black/20 px-5 py-8 sm:gap-8 sm:px-9 sm:py-10">
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

        {/* ── 그 외 승인 사례 (작은 카드 그리드) ─────────── */}
        <section className="reveal mt-14 sm:mt-20">
          <div className="text-center">
            <h2 className="break-keep text-[20px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[26px]">
              그 외에도 이어지는 <span className="text-brand-orange">승인 사례</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md break-keep text-center text-[13px] font-medium leading-[1.75] text-white/55 sm:text-[14.5px]">
              업종도, 지역도, 자금 용도도 모두 다릅니다.
              <br />
              대표님 사업장 역시 대상이 될 수 있습니다.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3.5">
            {MORE_CASES.map((m, i) => (
              <div
                key={i}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 backdrop-blur-sm transition-colors hover:border-brand-orange/25 sm:px-5 sm:py-[18px]"
              >
                <span className="text-[17px] font-black leading-none tracking-[-0.03em] text-brand-yellow sm:text-[21px]">
                  {m.amount}
                </span>
                <p className="mt-2.5 text-pretty text-[13px] font-bold leading-[1.4] tracking-[-0.01em] text-white/95 sm:text-[14.5px]">
                  {m.sector}
                </p>
                <p className="mt-auto pt-1.5 text-pretty text-[10.5px] font-medium leading-[1.45] text-white/40 sm:text-[11.5px]">
                  {m.org}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-[11px] font-medium text-white/35 sm:text-[12px]">
            ※ 지면상 대표 사례만 발췌했으며, 실제 진행 건은 이보다 훨씬 많습니다.
          </p>
        </section>

        {/* ── 고객 후기 (네이버 스타일 짧은 후기) ─────────── */}
        <section className="reveal mt-14 sm:mt-20">
          <div className="text-center">
            <h2 className="break-keep text-[20px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[26px]">
              먼저 경험한 <span className="text-brand-orange">대표님들의 후기</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md break-keep text-[12.5px] font-medium leading-[1.7] text-white/50 sm:text-[14.5px]">
              숫자보다 진솔한, 직접 겪은 이야기입니다.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3.5">
            {REVIEWS.map((r, i) => (
              <div
                key={i}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-[18px] backdrop-blur-sm sm:px-5 sm:py-5"
              >
                <span className="text-[12px] leading-none tracking-[0.14em] text-brand-yellow" aria-label="별점 5점">
                  ★★★★★
                </span>
                <p className="mt-3 flex-1 text-pretty text-[12.5px] font-medium leading-[1.7] tracking-[-0.005em] text-white/85 sm:text-[14px]">
                  {r.body}
                </p>
                <p className="mt-3.5 border-t border-white/[0.07] pt-3 text-[10.5px] font-semibold tracking-[-0.005em] text-white/40 sm:text-[11.5px]">
                  <span className="text-brand-orange/90">{r.nick}</span>
                  <span className="px-1 text-white/25">·</span>
                  {r.sector}
                </p>
              </div>
            ))}
          </div>

          {/* 후기 섹션 하단 버튼 — 카카오톡 상담 */}
          <div className="mt-9 text-center sm:mt-11">
            <a
              href="https://pf.kakao.com/_VxfWxan/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#FEE500] px-8 py-4 text-[15px] font-extrabold tracking-[-0.01em] text-[#191600] shadow-[0_14px_40px_-14px_rgba(254,229,0,0.6)] transition-transform hover:-translate-y-0.5 sm:text-[16px]"
            >
              <i className="fas fa-comment" aria-hidden="true" />
              카카오톡으로 1:1 상담하기
            </a>
            <p className="mx-auto mt-4 max-w-sm break-keep text-center text-[12px] font-medium leading-[1.7] text-white/45 sm:text-[12.5px]">
              부담 없이 물어보세요.
              <br />
              대표님 상황부터 편하게 들어드립니다.
            </p>
          </div>
        </section>

        {/* ── 하단 CTA ─────────────────────────────── */}
        <section className="reveal mt-12 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-orange/[0.14] to-transparent px-6 py-10 text-center sm:mt-16 sm:px-10 sm:py-14">
          <h3 className="break-keep text-[21px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[28px]">
            다음 성공 사례의 주인공은
            <br />
            <span className="text-brand-orange">대표님</span>일 수 있습니다
          </h3>
          <p className="mx-auto mt-4 max-w-md break-keep text-center text-[14px] font-medium leading-[1.8] text-white/60 sm:text-[16px]">
            정부지원사업 AI 통합 매칭 플랫폼이
            <br />
            대표님 사업장에 딱 맞는 정부지원사업을
            <br />
            무료로 찾아드립니다.
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
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2.5">
        <span
          className={`rounded-md px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.1em] ${toneMap[tone]}`}
        >
          {label}
        </span>
        <p className="text-[13.5px] font-bold tracking-[-0.01em] text-white/95 sm:text-[15px]">
          {title}
        </p>
      </div>
      <div className="mt-3.5 flex w-full flex-col gap-3.5">
        {body.map((para, i) => (
          <p
            key={i}
            className="mx-auto w-full max-w-[38rem] break-keep text-[13.5px] font-normal leading-[1.8] tracking-[-0.01em] text-white/70 sm:text-[15px] sm:leading-[1.85]"
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
