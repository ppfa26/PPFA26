"use client";

// ─────────────────────────────────────────────────────────────────────────
//  정밀 추가진단 패널 — 토스식 단계형(한 번에 하나씩) 쉬운 질문 UI
//  ⚠️ 판독 로직(runAdvancedScreening)은 절대 수정하지 않습니다.
//     여기서는 입력 UX만 쉽게 바꾸고, 기존 Company 스키마로 변환해서 넘깁니다.
//
//  [정확한 AI 판독을 위한 입력 설계 원칙]
//   - 어려운 재무용어(자기자본/총차입금)를 대표님 언어로 바꾼다.
//   - 개인사업자는 '자기자본' 개념이 없으므로 사업자 유형으로 분기해 숨긴다.
//   - 담보대출(부동산 등)은 매출 대비 부채 판정을 왜곡하므로 신용대출과 분리하고
//     판독(total_debt)에는 '신용대출/정책자금'만 넣는다. (담보대출은 참고용으로만 수집)
//   - 신용점수는 몰라도 되게 '모름'을 허용하고 확인처를 안내한다.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Company,
  runAdvancedScreening,
  AdvancedScreeningReport,
} from "@/lib/advancedScreening";

// 업종 — 기타업종 포함 (판독 로직에서 미매핑 업종은 자동으로 서비스업 비율(0.1) 적용됨)
const INDUSTRY_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "manufacturing", label: "제조업", emoji: "🏭" },
  { value: "wholesale", label: "도매업", emoji: "📦" },
  { value: "retail", label: "소매업", emoji: "🛍️" },
  { value: "construction", label: "건설업", emoji: "🏗️" },
  { value: "service", label: "서비스업", emoji: "🧰" },
  { value: "IT", label: "IT·소프트웨어", emoji: "💻" },
  { value: "food", label: "음식점업", emoji: "🍜" },
  { value: "transport", label: "운수·물류업", emoji: "🚚" },
  { value: "agriculture", label: "농림어업", emoji: "🌾" },
  { value: "etc", label: "기타업종", emoji: "✨" },
];

// 억/만원 단위 입력 → 원 단위 변환 도우미
function toWon(억: string): number | undefined {
  const n = parseFloat(억);
  if (isNaN(n)) return undefined;
  return Math.round(n * 100000000);
}

// 예/아니오/모름 3지선다 값
type Tri = "yes" | "no" | "unknown" | "";

export default function AdvancedScreeningPanel() {
  const [report, setReport] = useState<AdvancedScreeningReport | null>(null);

  // 단계(토스식) — 0부터 시작, 마지막 단계에서 판정 실행
  const [step, setStep] = useState(0);

  // ── 입력 상태 ──────────────────────────────────────────────
  const [bizType, setBizType] = useState<"personal" | "corp" | "">(""); // 사업자 유형
  const [industry, setIndustry] = useState("");
  const [revenue억, setRevenue억] = useState("");
  const [creditLoan억, setCreditLoan억] = useState(""); // 신용대출·정책자금(담보 없는 대출) → 판독 반영
  const [securedLoan억, setSecuredLoan억] = useState(""); // 부동산 담보대출 → 판독 제외(참고용)
  const [equity억, setEquity억] = useState(""); // 자기자본(법인만)
  const [ceoAge, setCeoAge] = useState("");
  const [years, setYears] = useState("");
  const [employees, setEmployees] = useState<"0" | "under5" | "5plus" | "">(""); // 4대보험 상시직원 수
  const [isExporter, setIsExporter] = useState<"yes" | "no" | "">(""); // 수출 여부 (100만원이라도 있으면 yes)

  // 신용점수 (모름 허용)
  const [creditKnown, setCreditKnown] = useState<Tri>("");
  const [kcb, setKcb] = useState("");
  const [nice, setNice] = useState("");

  // 리스크 체크 (예/아니오)
  const [taxDelinquent, setTaxDelinquent] = useState(false);
  const [insuranceDelinquent, setInsuranceDelinquent] = useState(false);
  const [capitalImpairment, setCapitalImpairment] = useState(false);
  const [revenueDrop30, setRevenueDrop30] = useState(false);
  const [ceoChanged, setCeoChanged] = useState(false);
  const [isPreFounder, setIsPreFounder] = useState(false);
  const [isReFounder, setIsReFounder] = useState(false);
  const [hasMainbiz, setHasMainbiz] = useState(false);

  // ── 판정 실행 ──────────────────────────────────────────────
  const handleRun = () => {
    const empCount = employees === "5plus" ? 5 : employees === "under5" ? 2 : employees === "0" ? 0 : undefined;
    const company: Company = {
      industry,
      annual_revenue: toWon(revenue억),
      // ── 업종·규모 기반 추천 필터 (대표님 실무 기준) ──
      biz_type: bizType || undefined,
      employee_count: empCount,
      is_exporter: isExporter === "yes",
      // ⭐ 판독에는 '신용대출/정책자금'만 반영 (담보대출 제외 → 매출 대비 부채 판정 왜곡 방지)
      total_debt: toWon(creditLoan억),
      // 자기자본은 법인만 (개인사업자는 개념이 없어 미입력 → 판독 영향 없음)
      total_equity: bizType === "corp" ? toWon(equity억) : undefined,
      ceo_age: ceoAge ? parseInt(ceoAge, 10) : undefined,
      years_in_business: years ? parseFloat(years) : undefined,
      kcb_score: creditKnown === "yes" && kcb ? parseInt(kcb, 10) : undefined,
      nice_score: creditKnown === "yes" && nice ? parseInt(nice, 10) : undefined,
      tax_delinquent: taxDelinquent,
      insurance_4_delinquent: insuranceDelinquent,
      full_capital_impairment: capitalImpairment,
      revenue_drop_30pct_yoy: revenueDrop30,
      revenue_drop_yoy_pct: revenueDrop30 ? 30 : 0,
      ceo_changed_1y: ceoChanged,
      is_pre_founder: isPreFounder,
      is_re_founder: isReFounder,
      has_mainbiz: hasMainbiz,
    };
    setReport(runAdvancedScreening(company));
    setTimeout(() => {
      document.getElementById("advanced-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // 다시 입력
  const handleReset = () => {
    setReport(null);
    setStep(0);
    setTimeout(() => {
      document.getElementById("advanced-screening")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // ── 단계 정의 (토스식: 한 화면에 질문 하나) ──────────────────
  // 개인사업자면 '자기자본' 단계는 건너뛴다.
  const STEPS: { key: string; skip?: boolean }[] = [
    { key: "bizType" },
    { key: "industry" },
    { key: "revenue" },
    { key: "employees" },
    { key: "export" },
    { key: "creditLoan" },
    { key: "securedLoan" },
    { key: "equity", skip: bizType !== "corp" }, // 법인만
    { key: "ceoAge" },
    { key: "years" },
    { key: "credit" },
    { key: "risk" },
  ];
  const activeSteps = STEPS.filter((s) => !s.skip);
  const totalSteps = activeSteps.length;
  const cur = activeSteps[step];
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const isLast = step === totalSteps - 1;

  // 현재 단계 '다음' 버튼 활성 조건 (필수 선택 단계만 제어, 나머지는 건너뛰기 허용)
  const canNext = (() => {
    if (cur?.key === "bizType") return bizType !== "";
    if (cur?.key === "industry") return industry !== "";
    if (cur?.key === "credit") return creditKnown !== "";
    return true;
  })();

  // ── 공통 스타일 ────────────────────────────────────────────
  const numInput =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange";
  const bigChoice = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-bold transition ${
      active
        ? "border-brand-orange bg-brand-yellow/20 text-brand-dark"
        : "border-gray-200 bg-white text-brand-dark hover:border-brand-orange/60"
    }`;

  // 억원 입력 + 안내 재사용 블록
  const MoneyStep = ({
    title,
    hint,
    value,
    setValue,
    placeholder,
    example,
  }: {
    title: string;
    hint?: string;
    value: string;
    setValue: (v: string) => void;
    placeholder: string;
    example?: string;
  }) => (
    <>
      <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">{title}</h3>
      {hint && <p className="mt-2 break-keep text-sm leading-relaxed text-brand-gray">{hint}</p>}
      <div className="mt-5 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={numInput}
          placeholder={placeholder}
          inputMode="decimal"
          autoFocus
        />
        <span className="shrink-0 text-base font-bold text-brand-dark">억원</span>
      </div>
      {example && <p className="mt-2 text-xs text-brand-gray">{example}</p>}
      <p className="mt-2 text-xs text-brand-orange">모르시면 비워두고 넘어가셔도 됩니다.</p>
    </>
  );

  return (
    <section id="advanced-screening" className="mb-2 scroll-mt-4">
      {/* 필수 작성 안내 배너 (판정 전에만 노출) */}
      {!report && (
        <div className="mb-3 overflow-hidden rounded-2xl border-2 border-brand-orange bg-brand-yellow/20 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-extrabold text-brand-dark sm:text-base">
            <span className="text-lg">📋</span>
            정확한 진단을 위해 아래 질문에 답해 주세요
          </p>
          <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm">
            어려운 용어 없이 <b className="text-brand-orange">쉬운 질문 몇 개</b>만 답하시면, 어떤 정부지원사업의 승인
            가능성이 높은지·예상 한도까지 정확하게 판독해 드립니다. 정확한 판독을 위해 끝까지 작성 부탁드립니다.
          </p>
        </div>
      )}

      {/* 입력 카드 (판정 전에만 노출) */}
      {!report && (
        <div className="rounded-2xl border-2 border-brand-orange bg-white p-5 shadow-card sm:p-6">
          {/* 헤더 + 진행률 */}
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-xl">🔬</span>
              <span className="text-sm font-extrabold text-brand-dark sm:text-base">정밀 추가진단</span>
              <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold text-white">필수</span>
            </span>
            <span className="text-xs font-bold text-brand-gray">
              {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-brand-grad transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* ── 단계별 질문 ─────────────────────────────── */}
          <div className="min-h-[220px]">
            {/* 1. 사업자 유형 */}
            {cur?.key === "bizType" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">사업자 유형이 어떻게 되세요?</h3>
                <p className="mt-2 text-sm text-brand-gray">사업자등록증에 적힌 유형을 골라주세요.</p>
                <div className="mt-5 space-y-3">
                  <button type="button" className={bigChoice(bizType === "personal")} onClick={() => { setBizType("personal"); }}>
                    <span className="text-xl">🧑‍💼</span>
                    <span>
                      <span className="block">개인사업자</span>
                      <span className="block text-xs font-medium text-brand-gray">대표님 개인 명의로 운영 (대부분 소상공인)</span>
                    </span>
                  </button>
                  <button type="button" className={bigChoice(bizType === "corp")} onClick={() => { setBizType("corp"); }}>
                    <span className="text-xl">🏢</span>
                    <span>
                      <span className="block">법인사업자 (주식회사 등)</span>
                      <span className="block text-xs font-medium text-brand-gray">법인 명의로 운영 (○○(주), 주식회사 ○○)</span>
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* 2. 업종 */}
            {cur?.key === "industry" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">어떤 업종을 하고 계세요?</h3>
                <p className="mt-2 text-sm text-brand-gray">가장 가까운 업종 하나를 골라주세요.</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {INDUSTRY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setIndustry(o.value)}
                      className={`flex min-h-[52px] items-center justify-center gap-1.5 break-keep rounded-xl border-2 px-2 py-2.5 text-center text-xs font-bold leading-tight transition sm:text-sm ${
                        industry === o.value
                          ? "border-brand-orange bg-brand-yellow/20 text-brand-dark"
                          : "border-gray-200 bg-white text-brand-dark hover:border-brand-orange/60"
                      }`}
                    >
                      <span>{o.emoji}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 3. 연매출 */}
            {cur?.key === "revenue" && (
              <MoneyStep
                title="작년 한 해 매출은 대략 얼마였나요?"
                hint="부가세 신고나 매출 장부 기준으로 대략적인 금액이면 됩니다."
                value={revenue억}
                setValue={setRevenue억}
                placeholder="예: 3"
                example="💡 3억이면 3, 5천만원이면 0.5, 12억이면 12 이렇게 적어주세요."
              />
            )}

            {/* 3-1. 4대보험 상시직원 수 (중진공 자격 판정에 중요) */}
            {cur?.key === "employees" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">4대보험에 가입된 직원이 몇 명인가요?</h3>
                <p className="mt-2 break-keep text-sm text-brand-gray">
                  대표님 본인은 빼고, 4대보험(국민연금·건강보험 등)에 가입된 상시 직원 수만 골라주세요. 직원 규모에 따라
                  신청 가능한 기관이 달라집니다.
                </p>
                <div className="mt-5 space-y-3">
                  <button type="button" className={bigChoice(employees === "0")} onClick={() => setEmployees("0")}>
                    <span className="text-xl">🙋</span>
                    <span>
                      <span className="block">없음 (대표 혼자)</span>
                      <span className="block text-xs font-medium text-brand-gray">4대보험 가입 직원이 없어요</span>
                    </span>
                  </button>
                  <button type="button" className={bigChoice(employees === "under5")} onClick={() => setEmployees("under5")}>
                    <span className="text-xl">👥</span>
                    <span>
                      <span className="block">1 ~ 4명</span>
                      <span className="block text-xs font-medium text-brand-gray">소수 인원으로 운영 중</span>
                    </span>
                  </button>
                  <button type="button" className={bigChoice(employees === "5plus")} onClick={() => setEmployees("5plus")}>
                    <span className="text-xl">🏢</span>
                    <span>
                      <span className="block">5명 이상</span>
                      <span className="block text-xs font-medium text-brand-gray">중소벤처기업진흥공단(중진공)까지 신청 가능</span>
                    </span>
                  </button>
                </div>
                <p className="mt-3 text-xs text-brand-orange">모르시면 비워두고 넘어가셔도 됩니다.</p>
              </>
            )}

            {/* 3-2. 수출 여부 (수출이면 무역보험공사 등 별도 한도 병행 → 승인 매우 유리) */}
            {cur?.key === "export" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">해외로 수출(직접·간접)을 하고 계신가요?</h3>
                <p className="mt-2 break-keep text-sm text-brand-gray">
                  금액이 작아도(100만원이라도) 수출 실적이 있으면 무역보험공사 등에서{" "}
                  <b className="text-brand-orange">다른 기관과 별도로 추가 자금</b>을 받을 수 있어 매우 유리합니다.
                </p>
                <div className="mt-5 space-y-3">
                  <button type="button" className={bigChoice(isExporter === "yes")} onClick={() => setIsExporter("yes")}>
                    <span className="text-xl">🌏</span>
                    <span>
                      <span className="block">네, 수출하고 있어요</span>
                      <span className="block text-xs font-medium text-brand-gray">직접수출·간접수출·온라인 해외판매 등 포함</span>
                    </span>
                  </button>
                  <button type="button" className={bigChoice(isExporter === "no")} onClick={() => setIsExporter("no")}>
                    <span className="text-xl">🏠</span>
                    <span>
                      <span className="block">아니요, 국내만 해요</span>
                      <span className="block text-xs font-medium text-brand-gray">수출 실적이 없습니다</span>
                    </span>
                  </button>
                </div>
                <p className="mt-3 text-xs text-brand-orange">모르시면 비워두고 넘어가셔도 됩니다.</p>
              </>
            )}

            {/* 4. 신용대출/정책자금 (담보 없는 대출) */}
            {cur?.key === "creditLoan" && (
              <MoneyStep
                title="지금 갚고 있는 신용대출·정책자금은 얼마인가요?"
                hint="부동산 등을 담보로 잡히지 않은 대출을 말합니다. (신용대출, 정책자금 융자, 카드론 등)"
                value={creditLoan억}
                setValue={setCreditLoan억}
                placeholder="예: 0.5"
                example="💡 담보 없이 빌린 대출만 합쳐서 적어주세요. 부동산 담보대출은 다음 단계에서 따로 여쭤봅니다."
              />
            )}

            {/* 5. 담보대출 (판독 제외, 참고용) */}
            {cur?.key === "securedLoan" && (
              <MoneyStep
                title="부동산 등 담보로 받은 대출이 있나요?"
                hint="집·상가·공장 등을 담보로 받은 대출입니다. (담보대출은 정책자금 한도 계산에서 빠지므로 따로 여쭤봅니다.)"
                value={securedLoan억}
                setValue={setSecuredLoan억}
                placeholder="예: 2"
                example="💡 담보대출이 없으면 비워두시면 됩니다. 이 금액은 판독에서 제외되어 정확도를 높입니다."
              />
            )}

            {/* 6. 자기자본 (법인만) */}
            {cur?.key === "equity" && (
              <MoneyStep
                title="법인의 자기자본은 대략 얼마인가요?"
                hint="재무제표상 자본총계입니다. 정확히 모르시면 비워두셔도 됩니다."
                value={equity억}
                setValue={setEquity억}
                placeholder="예: 1"
                example="💡 재무제표(재무상태표)의 '자본총계'를 보시면 됩니다."
              />
            )}

            {/* 7. 대표자 나이 */}
            {cur?.key === "ceoAge" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">대표님 나이(만 나이)는요?</h3>
                <p className="mt-2 text-sm text-brand-gray">청년창업 등 나이 조건이 있는 지원사업 매칭에 사용됩니다.</p>
                <div className="mt-5 flex items-center gap-2">
                  <input value={ceoAge} onChange={(e) => setCeoAge(e.target.value)} className={numInput} placeholder="예: 45" inputMode="numeric" autoFocus />
                  <span className="shrink-0 text-base font-bold text-brand-dark">세</span>
                </div>
                <p className="mt-2 text-xs text-brand-orange">모르시면 비워두고 넘어가셔도 됩니다.</p>
              </>
            )}

            {/* 8. 업력 */}
            {cur?.key === "years" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">사업을 시작한 지 얼마나 되셨어요?</h3>
                <p className="mt-2 text-sm text-brand-gray">사업자등록일 기준 업력(년)입니다.</p>
                <div className="mt-5 flex items-center gap-2">
                  <input value={years} onChange={(e) => setYears(e.target.value)} className={numInput} placeholder="예: 3" inputMode="decimal" autoFocus />
                  <span className="shrink-0 text-base font-bold text-brand-dark">년차</span>
                </div>
                <p className="mt-2 text-xs text-brand-orange">1년 미만이면 0.5처럼 적어주세요. 예비창업자는 0.</p>
              </>
            )}

            {/* 9. 신용점수 (모름 허용) */}
            {cur?.key === "credit" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">대표님 개인 신용점수를 아세요?</h3>
                <p className="mt-2 break-keep text-sm text-brand-gray">
                  신용점수는 이용 가능한 기관을 판독하는 데 쓰입니다. 모르셔도 진단은 가능합니다.
                </p>
                <div className="mt-5 space-y-3">
                  <button type="button" className={bigChoice(creditKnown === "yes")} onClick={() => setCreditKnown("yes")}>
                    <span className="text-xl">✅</span>
                    <span>알고 있어요 (직접 입력할게요)</span>
                  </button>
                  <button type="button" className={bigChoice(creditKnown === "unknown")} onClick={() => setCreditKnown("unknown")}>
                    <span className="text-xl">🤔</span>
                    <span>
                      <span className="block">잘 모르겠어요</span>
                      <span className="block text-xs font-medium text-brand-gray">토스·카카오뱅크 앱에서 무료로 바로 확인돼요</span>
                    </span>
                  </button>
                </div>

                {creditKnown === "yes" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-dark">KCB 점수 (1~1000)</label>
                      <input value={kcb} onChange={(e) => setKcb(e.target.value)} className={numInput} placeholder="예: 850" inputMode="numeric" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-dark">NICE 점수 (1~1000)</label>
                      <input value={nice} onChange={(e) => setNice(e.target.value)} className={numInput} placeholder="예: 850" inputMode="numeric" />
                    </div>
                  </div>
                )}
                {creditKnown === "unknown" && (
                  <p className="mt-4 break-keep rounded-xl bg-yellow-50 px-3 py-2 text-xs leading-relaxed text-brand-dark/70">
                    💡 토스 → 전체 → 신용점수 조회 / 카카오뱅크 → 내 신용정보 에서 KCB·NICE 점수를 무료로 확인하실 수 있어요.
                    지금은 건너뛰고 나중에 다시 진단하셔도 됩니다.
                  </p>
                )}
              </>
            )}

            {/* 10. 리스크 체크 (예/아니오, 해당되는 것만) */}
            {cur?.key === "risk" && (
              <>
                <h3 className="text-lg font-extrabold text-brand-dark sm:text-xl">해당되는 항목이 있으면 눌러주세요</h3>
                <p className="mt-2 break-keep text-sm text-brand-gray">
                  없으면 그냥 넘어가시면 됩니다. 부결 사유를 미리 걸러내는 데 사용됩니다.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { s: taxDelinquent, set: setTaxDelinquent, l: "세금(국세·지방세) 밀린 게 있어요" },
                    { s: insuranceDelinquent, set: setInsuranceDelinquent, l: "4대보험료 밀린 게 있어요" },
                    { s: capitalImpairment, set: setCapitalImpairment, l: "자본이 마이너스예요 (자본잠식)" },
                    { s: revenueDrop30, set: setRevenueDrop30, l: "작년보다 매출이 30% 넘게 줄었어요" },
                    { s: ceoChanged, set: setCeoChanged, l: "최근 1년 안에 대표가 바뀌었어요" },
                    { s: isPreFounder, set: setIsPreFounder, l: "아직 사업자등록 전인 예비창업자예요" },
                    { s: isReFounder, set: setIsReFounder, l: "폐업 후 다시 시작하는 재창업자예요" },
                    { s: hasMainbiz, set: setHasMainbiz, l: "메인비즈 인증을 갖고 있어요" },
                  ].map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => c.set(!c.s)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition ${
                        c.s ? "border-brand-orange bg-brand-yellow/20 text-brand-dark" : "border-gray-200 bg-white text-brand-dark hover:border-brand-orange/60"
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs ${c.s ? "border-brand-orange bg-brand-orange text-white" : "border-gray-300"}`}>
                        {c.s ? "✓" : ""}
                      </span>
                      <span className="break-keep">{c.l}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 하단 네비 버튼 */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button type="button" onClick={prev} className="flex-1 rounded-xl border-2 border-gray-300 bg-white py-3 text-sm font-bold text-brand-dark transition hover:bg-gray-50">
                이전
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                className="flex-1 rounded-xl bg-brand-grad py-3 text-sm font-bold text-brand-dark transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRun}
                className="flex-1 rounded-xl bg-brand-dark py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                🔬 정밀 판정 결과 보기
              </button>
            )}
          </div>
        </div>
      )}

      {/* 판정 결과 */}
      {report && (
        <>
          <AdvancedResult report={report} />
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 w-full rounded-xl border-2 border-gray-300 bg-white py-3 text-sm font-bold text-brand-dark transition hover:bg-gray-50"
          >
            ↺ 정밀진단 다시 하기
          </button>
        </>
      )}
    </section>
  );
}


// 등급 → 색상/라벨
function verdictStyle(ok: boolean): { cls: string; icon: string } {
  return ok
    ? { cls: "bg-green-50 border-brand-green text-brand-green", icon: "✅" }
    : { cls: "bg-red-50 border-brand-red text-brand-red", icon: "⚠️" };
}

function AdvancedResult({ report }: { report: AdvancedScreeningReport }) {
  const {
    koditHardReject,
    financials,
    creditMatches,
    loanLimit,
    govPrograms,
    timing,
    creditAdvice,
    disclaimer,
    revalidation,
  } = report;

  const cardCls = "rounded-2xl border border-gray-200 bg-white p-5 shadow-card";

  // 신청 가능 지원사업 억원 표기 도우미
  const won억 = (v?: number) =>
    v ? `${(v / 100000000).toFixed(v % 100000000 === 0 ? 0 : 2)}억` : "";

  return (
    <div id="advanced-result" className="mt-6 space-y-4">
      <h2 className="text-lg font-extrabold text-brand-dark">🔬 정밀 추가진단 결과</h2>

      {/* ⏰ 지금 시기 안내 (월별 승인 유불리) */}
      <div
        className={`rounded-2xl border-2 p-4 shadow-card ${
          timing.level === "good"
            ? "border-brand-green bg-green-50"
            : timing.level === "mid"
            ? "border-brand-orange bg-brand-yellow/20"
            : "border-brand-red/40 bg-red-50"
        }`}
      >
        <p className="flex items-start gap-2 break-keep text-sm font-bold leading-relaxed text-brand-dark">
          <span className="shrink-0 text-base">⏰</span>
          <span>{timing.message}</span>
        </p>
      </div>

      {/* ① 사전 자가진단 (부결 요인 사전 점검) — 최상단 */}
      <div className={cardCls}>
        <span className="mb-2 block text-sm font-bold text-brand-dark">정부지원사업 사전 자가진단</span>
        {koditHardReject.result === "PASS" ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(true).cls}`}>
            {verdictStyle(true).icon} 승인에 걸림돌이 되는 항목이 없습니다. (13개 항목 통과)
          </div>
        ) : (
          <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(false).cls}`}>
            {verdictStyle(false).icon} 아래 항목은 미리 준비·정리하시면 승인에 유리합니다:
            <ul className="mt-1 list-inside list-disc">
              {koditHardReject.rejectReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ② 재무비율 검증 */}
      <div className={cardCls}>
        <span className="mb-2 block text-sm font-bold text-brand-dark">재무비율 검증</span>
        <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(financials.kodit_result === "PASS").cls}`}>
          {verdictStyle(financials.kodit_result === "PASS").icon}{" "}
          {financials.kodit_result === "PASS" ? "재무 관점 걸림돌 없음" : "재무 관점 점검 필요"}
        </div>
        {financials.issues.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {financials.issues.map((it, i) => (
              <li key={i} className={it.level === "REJECT" ? "text-brand-red" : "text-brand-orange"}>
                {it.level === "REJECT" ? "🚫" : "⚠️"} {it.reason}
              </li>
            ))}
          </ul>
        )}
        {financials.bank_credit_eligible && (
          <p className="mt-2 break-keep text-xs font-semibold text-brand-green">
            💡 매출 30억 이상 요건 충족 → 은행 법인신용대출 검토 가능
          </p>
        )}
      </div>

      {/* ③ 신청 가능 기관 — 크고 핵심적으로 */}
      <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-5 shadow-card">
        <p className="text-base font-extrabold text-brand-dark sm:text-lg">
          🏦 대표님이 이용할 수 있는 기관
        </p>
        <p className="mt-1 break-keep text-xs text-brand-dark/60">
          업종·직원수 등 대표님 조건 기준으로 실제 신청 자격이 열리는 정책금융 기관입니다.
        </p>
        <div className="mt-4 space-y-2">
          {creditMatches.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {m.step && m.step <= 3 && (
                  <span className="shrink-0 rounded-full bg-brand-dark px-2 py-0.5 text-[10px] font-bold text-white">
                    {m.step === 1 ? "1순위" : m.step === 2 ? "2순위" : "병행"}
                  </span>
                )}
                <span className="text-sm font-extrabold text-brand-dark">{m.institution}</span>
                {m.loan_type && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      m.loan_type === "직접대출"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {m.loan_type}
                  </span>
                )}
              </div>
              <p className="mt-1 break-keep text-xs text-brand-gray">{m.criteria}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="break-keep rounded-lg bg-brand-yellow/10 px-3 py-2 text-[11px] leading-relaxed text-brand-dark">
            💡 대출은 보통 <b>직접대출 1곳(공단 직접) + 대리대출 1곳(보증서→은행), 총 2곳</b>에서 동시에 진행할 수 있습니다.
            직접대출은 보증료가 없지만 심사가 까다롭고, 대리대출은 보증비율 100%면 은행 심사가 간소화됩니다.
          </p>
          {/* 신용점수 안내 */}
          <p
            className={`break-keep rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              creditAdvice.tier === "good"
                ? "bg-green-50 text-brand-green"
                : creditAdvice.tier === "caution"
                ? "bg-brand-yellow/20 text-brand-dark"
                : "bg-red-50 text-brand-red"
            }`}
          >
            📊 {creditAdvice.message}
          </p>
        </div>
      </div>

      {/* ④ 신청 가능한 정부지원사업 (핵심 결과) */}
      {govPrograms.length > 0 && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-yellow/10 p-5 shadow-card">
          <p className="text-base font-extrabold text-brand-dark sm:text-lg">
            🎯 지금 신청 자격이 열리는 정부지원사업{" "}
            <span className="text-brand-orange">{govPrograms.length}종</span>
          </p>
          <p className="mt-1 break-keep text-xs text-brand-dark/60">
            대표님 진단 정보 기준으로 신청 자격이 확인된 2026 정부지원사업입니다.
          </p>
          <div className="mt-4 space-y-2">
            {govPrograms.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <span className="min-w-0 break-keep text-sm font-bold text-brand-dark">
                  {p.name.replace(/_/g, " ")}
                </span>
                {p.amount_max && (
                  <span className="shrink-0 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white">
                    최대 {won억(p.amount_max)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-gray">
            ※ 위 목록은 신청 자격이 확인된 사업이며, 최종 선정은 각 기관 심사 결과에 따릅니다.
            구체적인 신청 방법·서류는 화면 아래 매칭 카드에서 확인하세요.
          </p>
        </div>
      )}

      {/* ⑤ 예상 대출한도 (있을 때만) */}
      {loanLimit && (
        <div className={cardCls}>
          <span className="mb-2 block text-sm font-bold text-brand-dark">업종별 예상 기본 한도 (참고)</span>
          <p className="text-2xl font-black text-brand-orange">약 {loanLimit.base_limit_display}</p>
          <p className="mt-1 text-xs text-brand-gray">계산식: 연매출 × {loanLimit.ratio}</p>
          <p className="mt-2 break-keep text-xs text-brand-dark">
            📈 한도 상향 가능 요소: {loanLimit.boost_available.join(" · ")}
          </p>
        </div>
      )}

      {/* 면책조항 + 재검증 안내 */}
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="break-keep text-xs leading-relaxed text-brand-dark/60">⚠️ {disclaimer}</p>
        <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">🗓️ {revalidation}</p>
      </div>
    </div>
  );
}
