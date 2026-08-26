"use client";

/* ────────────────────────────────────────────────────────────
 *  실제 자문 승인 사례 (공유 컴포넌트)
 *  - reviews 페이지와 홈(첫 페이지) 하단에서 함께 사용.
 *  - 다크 테마 카드(자체 배경 포함)라 라이트 테마 홈 안에서도
 *    독립된 어두운 블록으로 자연스럽게 구분됨.
 *  - showHero: 상단 히어로(Growth Stories) 노출 여부 (reviews=true, 홈=false)
 * ──────────────────────────────────────────────────────────── */

import Link from "next/link";

/* ── 데이터 타입 ── */
type CaseItem = {
  no: string;
  icon: string;
  tag: string;
  headline: React.ReactNode;
  metric: string;
  metricSub: string;
  before: string[];
  strategy: string[];
  result: string[];
  funds: { name: string; amount: string }[];
};
type MiniCase = { sector: string; org: string; amount: string };
type MiniReview = { nick: string; sector: string; body: string; stars?: number };

/* ────────────────────────────────────────────────────────────
 *  성공 사례 데이터 (실제 승인 사례 기반 · 기업명 익명 처리)
 * ──────────────────────────────────────────────────────────── */
const CASES: CaseItem[] = [
  {
    no: "CASE 01",
    icon: "🌐",
    tag: "도소매 · 수출업 · 창업 3년차 · 매출 70억",
    headline: (
      <>
        <span className="text-brand-orange">전부 부결</span>되던 자본잠식 기업이,
        <br />
        <span className="text-brand-orange">8억 5천만 원</span>을 확보하기까지
      </>
    ),
    metric: "8.5억",
    metricSub: "확보한 정부지원사업",
    before: [
      "매출은 70억이었지만 재무제표상 2년 자본잠식 상태였습니다. 자본잠식 때문에 당연히 모든 기관에서 부결받던 상황이었습니다. 기존 대출도 조금 있는 상태였고, 대표님은 반쯤 포기한 심정으로 저희에게 문의를 주셨던 사례입니다.",
    ],
    strategy: [
      "당장 신청이 불가하다는 걸 누구보다 잘 알고 있었기에, 좋은 기업으로 하나씩 바꿔나가는 자문부터\n시작했습니다. 당장 받을 수 있는 정부지원사업은 전무하기 때문에 일단 재무제표상 문제점을\n해결해 나갔고 벤처기업인증(혁신성장유형) 준비와 재무제표 흑자전환을 목표로 준비해 나갔습니다.",
      "기존 음반·굿즈 홈페이지를 AI 맞춤 추천 및 관리 시스템을 갖춘 형태로 재구축해\n벤처인증 혁신성장유형으로 신청 → 1차 부결 후, 2차 보완·이의제기로 승인받았습니다.",
      "국세·지방세 미납/체납도 일부 있어 먼저 정리했고, 재무제표 보완이 끝난\n다음 해에 정부지원사업 신청 자격을 확보했습니다.",
      "벤처인증을 무기로 연초 수출바우처 1억 승인을 시작으로 → 중소벤처진흥공단 신시장진출자금\n연계 2억 승인 → 무역보험공사 문화산업보증 10억 신청 후 5억 승인 → 소진공 혁신성장촉진자금\n수출 소상공인 5000만원까지 순차적으로 정부지원사업을 확보할 수 있도록 자문을 해드렸습니다.",
    ],
    result: [
      "불필요한 판관비를 줄이고 놓친 매입을 잡고 추가적인 제휴 세무사님의 노력으로\n다음 결산에서 흑자전환에 성공했습니다. 그 후 정부지원사업은 아래와 같은\n순서로 진행했으며 중기부 수출바우처 1억 중소벤처기업진흥공단 신시장진출자금 2억\n무역보험공사 문화산업보증 5억 소상공인시장진흥공단 혁신성장촉진자금 수출\n소상공인 5,000만원 총 8억 5천만 원의 정부지원사업을 승인받고 확보하는데 도움을 드렸습니다.",
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
    icon: "🎬",
    tag: "방송 프로그램 제작 · 창업 3년차 · 매출 10억대",
    headline: (
      <>
        대출 한도를 <span className="text-brand-orange">모두 소진</span>한 기업이,
        <br />
        <span className="text-brand-orange">3억 7천만 원</span>을 확보하기까지
      </>
    ),
    metric: "3.7억",
    metricSub: "확보한 정부지원사업",
    before: [
      "업력 3년, 매출 10억대의 청년 PD 출신 대표님과 직원들이 이끄는 기업이었습니다.\n본사 매입으로 인한 은행 대출로 대출 한도를 이미 최대치까지 쓴 상태에서 저희를\n만나, 여기저기서 매출 대비 초과 대출로 부결받던 상황이었습니다.",
      "다만 OTT(넷플릭스·디즈니플러스 등)와 해외 현지화 프로덕션 계약을 신규로 맺었고,\n매출이 3억 → 6억 → 10억으로 꾸준히 상승 중이라는 점이 큰 가능성이었습니다.",
    ],
    strategy: [
      "자체 편집 프로그램 개발을 완료했고 신규 수주 계약도 여러 건 맺은 상태여서,\n이 기술력과 성장세를 무기로 만들어드리기로 했습니다.",
      "먼저 벤처인증(혁신성장유형)을 신청·획득했고, 콘텐츠 제작 관련 기술보증기금\n보증을 병행했습니다. 10억 신청은 부결됐지만 5억 재신청 후 2억을 승인받았습니다.",
      "2년 연속 매출 신장 기업 요건을 활용해 소상공인시장진흥공단 혁신성장촉진자금 2억 신청\n→ 7,000만 원 승인, 동시에 중소벤처기업진흥공단 청년창업사업자금 1억을 승인받았습니다.",
    ],
    result: [
      "벤처인증(혁신성장유형)을 확보하고, 기술보증기금 2억 보증까지 연계해 총 3억 7천만원의\n정부지원사업을 승인받았습니다. 대출 한도가 막혀 있던 기업을 기술력과 수주 계약서 라는\n새로운 무기로 기업의 묶였던 자금줄을 다시 연 사례입니다.",
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
    icon: "🥩",
    tag: "제조업 · 육류 가공(포장육·냉동육) · 창업 2년차",
    headline: (
      <>
        운영자금이 급했던 청년 대표님,
        <br />
        기대의 2배 <span className="text-brand-orange">2억 4천만 원</span> 확보까지
      </>
    ),
    metric: "2.4억",
    metricSub: "확보한 정부지원사업",
    before: [
      "청년 사업자 대표님이 사업을 시작해 매출은 늘고 있었지만 남는 것이 많지 않던 상태였습니다. 설 명절 시즌 고기 매입을 위한 운영자금이 필요해 문의를 주셨습니다. 창업 2년차, 대출은 없는 상태였고 신용점수도 나쁘지 않아 수월하게 자문을 시작할 수 있었습니다.",
    ],
    strategy: [
      "재무제표상 당기순이익이 낮은 점이 유일한 단점이었습니다. 목표한 설 명절 시즌 운영자금은\n시점상 준비가 어려워 보여, 작년도 재무제표 결산 수정 후 그해 4월부터 정부지원사업을\n하나씩 신청하는 방향으로 잡았습니다.",
      "어린 나이셨지만 1번의 사업 운영 경력이 있으셨고 그 경력을 활용하여서 관련 자금을 신청\n하였고 재창업한 업종 또한 청년 창업자에게 유리한 제조업이었습니다.",
      "중소벤처기업진흥공단 청년창업사업자금 1억 신청·승인, 소진공 재도전특별자금 7,000만 원\n신청 후 4,000만 원 승인, 기술보증기금 초기창업자보증 1억 신청·승인까지 동시에 진행했습니다.",
    ],
    result: [
      "운영자금 1억 정도만 있어도 정말 좋겠다고 하셨던 대표님께, 시간이 걸리긴했지만\n동시 진행 전략으로 기대의 2배가 넘는 총 2억 4천만 원의\n정부지원사업 승인 받는데 좋은 자문을 해드렸습니다.",
    ],
    funds: [
      { name: "중진공 청년창업사업자금", amount: "1억" },
      { name: "기술보증기금 초기창업자보증", amount: "1억" },
      { name: "소진공 재도전특별자금", amount: "4,000만" },
    ],
  },

  {
    no: "CASE 04",
    icon: "🪟",
    tag: "제조업 · 실사출력 옥외간판물 설치·제작",
    headline: (
      <>
        대출 과다·낮은 신용도였지만,
        <br />
        특허를 살려 <span className="text-brand-orange">1억 7천만 원</span> 확보까지
      </>
    ),
    metric: "1.7억",
    metricSub: "확보한 정부지원사업",
    before: [
      "기존 대출이 매우 많은 상태로 만난 케이스로, 신용도도 낮고 매출도 미비한 편이었습니다.\n다만 기존 대출이 전부 담보 대출 형태였고 정부지원사업으로 받은 자금은 전혀 없는 상태였고\n매출이 낮아도 3년간 꾸준히 늘고 있었고 간판 제작 관련 특허 IP를 보유한 점을 눈여겨봤습니다.",
    ],
    strategy: [
      "신용도 향상을 위해 KCB·나이스 신용도 시뮬레이션을 추천드렸고, 작은 카드론과\n대출들을 상환해 신용도를 끌어올려 드렸습니다. 꾸준히 늘어나는 매출을 장점으로\n부각해 사업계획서 첨삭을 도왔고, 소상공인시장진흥공단 2년 연속 매출 신장\n소상공인 자금 2억 신청 후 7,000만 원을 승인받았습니다.",
      "간판 제작 관련 특허를 강점으로 살려 기술보증기금 IP보증 2억 신청 후\n최종 1억을 승인받았으며, 연구개발부서 설립까지 함께 자문해드렸습니다.",
    ],
    result: [
      "연구개발부서 설립과 함께, 소진공 7,000만 원·기술보증기금 IP보증 1억 등\n총 1억 7천만 원의 정부지원사업을 승인받았습니다. 정부지원사업 이력이 전혀\n없던 기업이 '특허'라는 자산을 정부지원사업으로 연결한 사례입니다.",
    ],
    funds: [
      { name: "기술보증기금 IP보증 (특허 활용)", amount: "1억" },
      { name: "소진공 2년 연속 매출 신장 소상공인 자금", amount: "7,000만" },
      { name: "연구개발부서 설립", amount: "설립 완료" },
    ],
  },
];

const MORE_CASES: MiniCase[] = [
  { sector: "도소매 · 수출업", org: "무역보험공사 문화산업보증 + 신보 협약 보증", amount: "4.5억" },
  { sector: "방송 콘텐츠 제작", org: "중진공 수출기업글로벌화 + 소진공 수출소상공인 + 기보 컨텐츠 보증", amount: "5억" },
  { sector: "육류 소매업", org: "소진공 일반경영안정자금 + 재단 특례 보증", amount: "7,000만" },
  { sector: "인테리어 디자인업", org: "소진공 일반경영안정자금 + 재단 특례 보증", amount: "7,000만" },
  { sector: "편의점 운영", org: "소진공 혁신성장촉진자금 + 재단 특례 보증", amount: "5,000만" },
  { sector: "김밥·간이음식점", org: "소진공 혁신성장촉진자금 + 재단 협약 보증", amount: "2억" },
  { sector: "스터디카페 운영", org: "소진공 혁신성장촉진자금(운전) + 재단 특례 보증", amount: "1억" },
  { sector: "여성복 제조업", org: "소진공 일반경영안정자금 + 재단 특례 보증", amount: "7,000만" },
  { sector: "노래연습장 운영", org: "소진공 일반경영안정자금 + 재단 협약 보증", amount: "7,000만" },
  { sector: "일반 교과 학원", org: "소진공 일반경영안정자금 + 재단 협약 보증", amount: "5,000만" },
  { sector: "선박부품 제조업", org: "중진공 성장기반자금(소공인) + 신보 협약 보증", amount: "2억" },
  { sector: "미용업", org: "소진공 일반경영안정자금 + 재단 특례 보증", amount: "7,000만" },
  { sector: "물류·운송업", org: "소진공 일반경영안정자금 + 재단 특례 보증", amount: "7,000만" },
  { sector: "무역업", org: "재단 특례 보증", amount: "3,000만" },
  { sector: "제조업", org: "기보 특례 보증", amount: "1억" },
];

const REVIEWS: MiniReview[] = [
  { nick: "육****", sector: "육류 가공 · 창업 2년차", body: "1억만 돼도 감사했는데 나눠서 2억 넘게 승인됐어요. 운영자금 걱정 없이 위기를 잘 넘겼습니다." },
  { nick: "PD****", sector: "방송 콘텐츠 제작", body: "어디서도 안 된다던 상황, 벤처인증부터 순서대로 잡아주셔서 자금길이 다시 열렸습니다." },
  { nick: "간***", sector: "간판 제작 · 제조업", body: "특허가 이렇게 쓰일 줄 몰랐어요. 하나하나 짚어주셔서 IP보증까지 받았습니다." },
  { nick: "카페**", sector: "스터디카페 운영", body: "뭐부터 할지 막막했는데 진단 한 번에 방향이 잡혔어요. 상담도 부담 없어 좋았습니다.", stars: 4 },
  { nick: "미용실**", sector: "미용업", body: "필요한 서류만 딱 짚어주셔서 수월했어요. 승인까지 생각보다 훨씬 빨랐습니다." },
  { nick: "수출***", sector: "도소매 · 수출업", body: "자본잠식으로 다 부결이었는데 재무 정리부터 길게 봐주셨어요. 결국 큰 금액을 확보했습니다." },
  { nick: "노래***", sector: "노래연습장 운영", body: "정부지원사업은 남 얘긴 줄 알았어요. 우리 같은 곳도 된다는 걸 처음 알았습니다.", stars: 4 },
  { nick: "부동산**", sector: "부동산 중개업", body: "다른 곳에선 안 된다던 조건, 여기선 되는 방법을 찾아주셨어요. 설명도 쉽고 명확합니다." },
];

/* ────────────────────────────────────────────────────────────
 *  본문 컴포넌트
 *  - variant="page"    : reviews 전용 페이지 (히어로 노출)
 *  - variant="section" : 홈 하단 삽입용 (히어로 대신 간결한 섹션 타이틀)
 * ──────────────────────────────────────────────────────────── */
export default function SuccessCases({
  variant = "page",
}: {
  variant?: "page" | "section";
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* ── 히어로 / 섹션 타이틀 ── */}
      {variant === "page" ? (
        <section className="text-center">
          <p className="reveal inline-block rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-orange sm:text-[12.5px]">
            Growth Stories
          </p>
          <h1 className="reveal mt-5 break-keep text-center text-[25px] font-black leading-[1.4] tracking-[-0.035em] text-white sm:text-[40px] sm:leading-[1.3]">
            정부지원사업 신청과 그 과정 이야기
            <br />이 기업들은 자문 후{" "}
            <span className="text-brand-orange">어떻게 달라졌을까요?</span>
          </h1>
          <p className="reveal mx-auto mt-5 max-w-2xl break-keep text-center text-[14px] font-medium leading-[1.9] text-white/60 sm:text-[16.5px]">
            저희가 진짜로 증명하려는 건 승인 사례가 아니라,
            <br />
            우리의 자문이 기업을{" "}
            <b className="font-bold text-white/90">어디에서 어디로 데려갔는가</b>입니다.
          </p>
        </section>
      ) : (
        <section className="reveal mx-auto flex w-full flex-col items-center rounded-[1.25rem] border border-white/[0.12] bg-[#121724]/50 px-6 py-7 text-center shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-[14px] sm:px-9 sm:py-8">
          <p className="inline-block rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-orange sm:text-[12.5px]">
            Growth Stories
          </p>
          <h2 className="mt-5 break-keep text-center text-[21px] font-black leading-[1.4] tracking-[-0.03em] text-white sm:text-[25px] sm:leading-[1.35]">
            실제 이용자 자문 승인 사례
          </h2>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-center text-[13.5px] font-medium leading-[1.8] text-white/60 sm:text-[15px]">
            저희가 진짜로 증명하려는 건 승인 사례가 아니라,
            <br />
            우리의 자문이 기업을{" "}
            <b className="font-bold text-white/90">어디에서 어디로 데려갔는가</b>입니다.
          </p>
        </section>
      )}

      {/* ── 사례 카드 ── */}
      <section className="mt-7 flex flex-col gap-8 sm:mt-8 sm:gap-10">
        {CASES.map((c) => (
          <article
            key={c.no}
            className="reveal overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#121724]/50 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-[14px]"
          >
            <div className="relative overflow-hidden px-6 pb-6 pt-7 sm:px-9 sm:pb-6 sm:pt-9">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent" />
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-orange/20 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-5 py-5 backdrop-blur-[6px] sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                  <span className="rounded-md bg-brand-orange px-2.5 py-1 text-[11px] font-black tracking-[0.06em] text-brand-dark">
                    {c.no}
                  </span>
                  <span className="break-keep text-[11.5px] font-semibold text-white/50 sm:text-[13px]">
                    <span className="mr-1 text-[14px] sm:text-[15px]" aria-hidden="true">
                      {c.icon}
                    </span>
                    {c.tag}
                  </span>
                </div>
                <h3 className="mx-auto mt-4 max-w-[26ch] break-keep text-center text-[19px] font-black leading-[1.45] tracking-[-0.02em] text-white sm:text-[25px] sm:leading-[1.4]">
                  {c.headline}
                </h3>
                <div className="mt-6 flex items-end justify-center gap-2.5 border-t border-white/[0.12] pt-6">
                  <span className="text-[38px] font-black leading-none tracking-[-0.03em] text-brand-orange [text-shadow:0_2px_20px_rgba(255,149,0,0.45)] sm:text-[48px]">
                    {c.metric}
                  </span>
                  <span className="mb-1 text-[13px] font-semibold text-white/60 sm:text-[15px]">
                    {c.metricSub}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-white/[0.12] bg-[#0d1119]/40 px-5 py-7 sm:gap-7 sm:px-9 sm:py-8">
              <Step label="Before" tone="slate" title="신청 전 상황" body={c.before} />
              <Step label="Strategy" tone="orange" title="어떻게 접근했나" body={c.strategy} />
              <Step label="Result" tone="emerald" title="확보한 결과" body={c.result} />

              <div className="rounded-2xl border border-brand-orange/25 bg-[#121724]/50 p-4 backdrop-blur-[14px] sm:p-5">
                <p className="mb-3 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-brand-orange">
                  <span aria-hidden="true">📌</span> 승인 내역
                </p>
                <ul className="flex flex-col gap-2">
                  {c.funds.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.12] bg-[#0d1119]/45 px-3.5 py-2.5"
                    >
                      <span className="break-keep text-[12.5px] font-semibold text-white/85 sm:text-[14px]">
                        {f.name}
                      </span>
                      <span className="shrink-0 text-[14px] font-black tracking-[-0.02em] text-brand-orange sm:text-[16px]">
                        {f.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ── 그 외 승인 사례 (작은 카드 그리드) ──
          제목 박스의 위(섹션 상단)·아래(본문까지) 공백을 동일하게 맞춤(대표님 요청). */}
      <section className="reveal mt-8 sm:mt-10">
        <div className="mx-auto max-w-md rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-5 py-5 text-center backdrop-blur-[6px] sm:px-6 sm:py-6">
          <h3 className="break-keep text-[20px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[23px]">
            그 외에도 이어지는 <span className="text-brand-orange">승인 사례</span>
          </h3>
          <p className="mx-auto mt-3 max-w-md break-keep text-center text-[13px] font-medium leading-[1.75] text-white/55 sm:text-[14.5px]">
            업종도, 지역도, 자금 용도도 모두 다릅니다.
            <br />
            대표님 사업장 역시 대상이 될 수 있습니다.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-3 sm:gap-3">
          {MORE_CASES.map((m, i) => (
            <div
              key={i}
              className="flex min-h-[124px] flex-col rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-3 py-3.5 backdrop-blur-[14px] transition-colors hover:border-brand-orange/30 sm:min-h-[140px] sm:px-4 sm:py-4"
            >
              <span className="text-[15px] font-black leading-none tracking-[-0.03em] text-brand-orange sm:text-[19px]">
                {m.amount}
              </span>
              <p className="mt-2 break-keep text-[11.5px] font-bold leading-[1.35] tracking-[-0.01em] text-white/95 sm:text-[13.5px]">
                {m.sector}
              </p>
              <p className="mt-auto break-keep pt-1.5 text-[11px] font-medium leading-[1.4] text-white/40">
                {m.org}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* ── 고객 후기 ──
          제목 박스의 위(섹션 상단)·아래(본문까지) 공백을 동일하게 맞춤(대표님 요청). */}
      <section className="reveal mt-8 sm:mt-10">
        <div className="mx-auto max-w-md rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-5 py-5 text-center backdrop-blur-[6px] sm:px-6 sm:py-6">
          <h3 className="break-keep text-[20px] font-black leading-[1.35] tracking-[-0.02em] text-white sm:text-[23px]">
            먼저 경험한 <span className="text-brand-orange">대표님들의 후기</span>
          </h3>
          <p className="mx-auto mt-3 max-w-md break-keep text-center text-[13px] font-medium leading-[1.75] text-white/55 sm:text-[14.5px]">
            숫자보다 진솔한, 직접 겪은 이야기입니다.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:mt-10 sm:gap-3.5">
          {REVIEWS.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-5 py-[18px] backdrop-blur-[14px] transition-colors hover:border-brand-orange/30 sm:px-6 sm:py-5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="text-[12.5px] leading-none tracking-[0.14em]"
                  aria-label={`별점 ${r.stars ?? 5}점`}
                >
                  <span className="text-brand-orange">{"★".repeat(r.stars ?? 5)}</span>
                  <span className="text-white/20">{"★".repeat(5 - (r.stars ?? 5))}</span>
                </span>
                <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-white/40 sm:text-[12.5px]">
                  <span className="text-brand-orange/90">{r.nick}</span>
                  <span className="px-1 text-white/25">·</span>
                  {r.sector}
                </span>
              </div>
              <p className="mt-3 break-keep text-[13.5px] font-medium leading-[1.7] tracking-[-0.005em] text-white/85 sm:text-[15px]">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 하단 CTA (reviews 전용 페이지에서만 노출) ──
          홈(section) 삽입 시에는 첫 페이지 하단의 통일 CTA 박스를 재사용하므로 생략 */}
      {variant === "page" && (
        <section className="reveal mt-12 rounded-3xl bg-brand-dark px-6 py-9 text-center ring-1 ring-white/10 sm:mt-16 sm:px-10 sm:py-11">
          <h3 className="break-keep text-xl font-extrabold leading-[1.35] text-white sm:text-2xl">
            다음 성공 사례의 주인공은
            <br />
            <span className="text-brand-orange">대표님</span>일 수 있습니다
          </h3>
          <p className="mx-auto mt-3 max-w-xl break-keep text-sm leading-relaxed text-gray-300 sm:text-base">
            정부지원사업 AI 통합 매칭 플랫폼 모두의사업친구가
            <br />
            대표님 사업장에 딱 맞는 정부지원사업을 무료로 찾아드립니다.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/diagnosis-chat"
              className="btn-red w-full rounded-full px-8 py-3 text-sm font-bold sm:w-auto"
            >
              지금 내 지원사업 확인하기 →
            </Link>
            <a
              href="https://pf.kakao.com/_VxfWxan/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-full border-2 border-white bg-transparent px-8 py-3 text-sm font-bold text-white hover:bg-white/10 sm:w-auto"
            >
              💬 1:1 채널톡 상담하기
            </a>
          </div>
          <p className="mx-auto mt-7 max-w-md break-keep text-[11px] leading-[1.7] text-gray-400/70 sm:text-[11.5px]">
            ※ 본 사례는 실제 승인 사례를 기반으로 하며, 기업 정보는 익명 처리했습니다.
            <br />
            승인 여부·금액·기간은 기업별 상황에 따라 달라질 수 있으며 동일한 결과를 보장하지 않습니다.
            <br />
            출처: 모두의사업친구(모두의사업친구.kr) · 무단 복제·도용 금지
          </p>
        </section>
      )}

    </div>
  );
}

/* ── 헬퍼 ── */
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
    <div className="mx-auto flex w-full max-w-[38rem] flex-col items-start text-left">
      <div className="flex items-center gap-2.5">
        <span
          className={`rounded-md px-2.5 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.1em] ${toneMap[tone]}`}
        >
          {label}
        </span>
        <p className="text-[13.5px] font-bold tracking-[-0.01em] text-white/95 sm:text-[15px]">
          {title}
        </p>
      </div>
      <div className="mt-3 flex w-full flex-col gap-3 rounded-2xl border border-white/[0.10] bg-[#161d2e]/60 px-4 py-4 backdrop-blur-[6px] sm:px-5 sm:py-5">
        {body.map((para, i) => (
          <p
            key={i}
            className="w-full whitespace-pre-line break-keep text-left text-[13.5px] font-normal leading-[1.8] tracking-[-0.01em] text-white/80 sm:text-[15px] sm:leading-[1.85]"
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
