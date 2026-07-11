"use client";

// ─────────────────────────────────────────────────────────────────────────
//  정밀 추가진단 패널 — 토스식 단계형(한 번에 하나씩) 쉬운 질문 UI
//  ⚠️ 판독 로직(runAdvancedScreening)은 절대 수정하지 않습니다.
//     여기서는 입력 UX만 쉽게 바꾸고, 기존 Company 스키마로 변환해서 넘깁니다.
//
//  [정확한 AI 판독을 위한 입력 설계 원칙]
//   - 어려운 재무용어(자기자본/자본총계/총차입금)는 질문에서 빼거나 쉬운 말로 바꾼다.
//     (재무제표를 모르는 대표님도 답할 수 있게 함)
//   - 담보대출(부동산 등)은 매출 대비 부채 판정을 왜곡하므로 신용대출과 분리하고
//     판독(total_debt)에는 '신용대출/정책자금'만 넣는다. (담보대출은 참고용으로만 수집)
//   - 신용점수는 몰라도 되게 '모름'을 허용하고 확인처를 안내한다.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  Company,
  runAdvancedScreening,
  AdvancedScreeningReport,
  REGION_SINBO,
  findInstitutionLink,
  JAEDAN_SITE_LINKS,
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

  // 처음 질문지에서 값을 가져왔는지 표시 (안내 문구용)
  const [prefilled, setPrefilled] = useState(false);

  // ── 처음 질문지(mpp_diagnosis) 값을 정밀진단 초깃값으로 불러오기 ──────
  //  대표님 기준: 처음 답한 내용을 이어받고, 정밀진단에서 고치면 그게 우선.
  //  (둘 다 포괄적으로 보되, 정밀진단 값을 최종 판독에 사용)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      if (!raw) return;
      const p = JSON.parse(raw);
      let touched = false;

      // 사업자 유형
      if (p.businessType?.includes("법인")) { setBizType("corp"); touched = true; }
      else if (p.businessType?.includes("개인")) { setBizType("personal"); touched = true; }
      if (p.businessType?.includes("예비")) { setIsPreFounder(true); touched = true; }

      // 업종 (여러 개면 첫 번째 대표 업종)
      const ind = (p.industries || [])[0];
      if (ind) {
        const map: Record<string, string> = {
          제조업: "manufacturing", 수출업: "export", 서비스업: "service",
          도소매업: "retail", 음식점업: "food", 기타: "etc",
        };
        setIndustry(map[ind] || ind);
        touched = true;
      }
      if (p.industries?.includes("수출업")) { setIsExporter("yes"); touched = true; }

      // 매출 (구간 → 대략 억 값)
      const revMap: Record<string, string> = {
        "5억 이상": "5", "5억미만": "3", "5억 미만": "3",
        "1억 미만": "0.5", "1억미만": "0.5", "매출 없음": "0", "매출없음": "0",
      };
      if (p.revenue && revMap[p.revenue.trim?.() || p.revenue]) {
        setRevenue억(revMap[p.revenue.trim?.() || p.revenue]);
        touched = true;
      }

      // 업력 (구간 → 대략 연수)
      const yMap: Record<string, string> = {
        "창업 예정": "0", "창업예정": "0", "1년 미만": "0.5", "1년미만": "0.5",
        "3년 미만": "2", "3년미만": "2", "7년 미만": "5", "7년미만": "5", "7년 이상": "10", "7년이상": "10",
      };
      const yv = yMap[(p.years || "").trim?.() || p.years];
      if (yv) { setYears(yv); touched = true; }

      // 직원수
      if (p.employees) {
        if (p.employees.includes("0명")) setEmployees("0");
        else if (p.employees.includes("5명")) setEmployees("under5");
        else if (p.employees.includes("10명")) setEmployees("5plus");
        touched = true;
      }

      // 신용점수 구간 → 대략 점수 (모름 아님으로)
      if (p.credit) {
        if (p.credit.includes("839점 이상")) { setCreditKnown("yes"); setKcb("850"); setNice("850"); touched = true; }
        else if (p.credit.includes("839")) { setCreditKnown("yes"); setKcb("820"); setNice("820"); touched = true; }
        else if (p.credit.includes("700")) { setCreditKnown("yes"); setKcb("690"); setNice("690"); touched = true; }
      }

      // 회생·파산 → 재창업자로 간주(정밀진단에서 다시 확인 가능)
      if (p.bankruptcy && (p.bankruptcy.includes("있"))) { setIsReFounder(true); touched = true; }

      // 인증(메인비즈)
      if ((p.certifications || []).includes("메인비즈")) { setHasMainbiz(true); touched = true; }

      if (touched) setPrefilled(true);
    } catch {
      /* 무시 — 처음 질문지 없거나 파싱 실패 시 빈 상태로 시작 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // ── 정밀진단 값을 처음 질문지(mpp_diagnosis)에 병합 저장 (정밀진단 우선) ──
    //  대표님 기준: 처음 답한 것과 정밀진단이 다르면 '정밀진단'을 기준으로 안내.
    //  대시보드 하단 매칭리스트도 이 병합값으로 다시 계산되도록 저장한다.
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const base = raw ? JSON.parse(raw) : {};

      // 정밀진단 업종키 → 처음 질문지 업종 라벨로 역변환
      const indLabel: Record<string, string> = {
        manufacturing: "제조업", export: "수출업", service: "서비스업",
        retail: "도소매업", food: "음식점업", etc: "기타",
      };
      // 정밀진단에서 값이 실제로 입력된 항목만 덮어쓴다(빈 값은 처음 질문지 유지 → 포괄적).
      const merged = { ...base };
      if (bizType === "corp") merged.businessType = "법인사업자";
      else if (bizType === "personal") merged.businessType = "개인사업자";
      if (isPreFounder) merged.businessType = "예비창업자";
      if (industry) merged.industries = [indLabel[industry] || industry];
      if (isExporter === "yes" && !merged.industries?.includes("수출업"))
        merged.industries = [...(merged.industries || []), "수출업"];
      if (revenue억) {
        const r = parseFloat(revenue억);
        merged.revenue = r >= 5 ? "5억 이상" : r >= 1 ? "5억 미만" : r > 0 ? "1억 미만" : "매출 없음";
      }
      if (years) {
        const y = parseFloat(years);
        merged.years = y <= 0 ? "창업 예정" : y < 1 ? "1년 미만" : y < 3 ? "3년 미만" : y < 7 ? "7년 미만" : "7년 이상";
      }
      if (ceoAge) merged.age = parseInt(ceoAge, 10) <= 39 ? "39세 이하" : "39세 이상";
      if (employees) merged.employees = employees === "0" ? "0명" : employees === "under5" ? "5명 이하" : "10명 이상";
      if (creditKnown === "yes" && (kcb || nice)) {
        const sc = Math.max(parseInt(kcb || "0", 10), parseInt(nice || "0", 10));
        merged.credit = sc >= 839 ? "839점 이상" : sc >= 700 ? "839점 이하" : "700점 이하";
      }
      if (isReFounder) merged.bankruptcy = "있음";
      merged._advancedApplied = true; // 정밀진단 반영 표시

      sessionStorage.setItem("mpp_diagnosis", JSON.stringify(merged));
      // 대시보드가 즉시 재계산하도록 커스텀 이벤트 발신
      window.dispatchEvent(new CustomEvent("mpp-advanced-applied"));
    } catch {
      /* 저장 실패해도 정밀진단 결과 표시는 정상 진행 */
    }

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
  const STEPS: { key: string; skip?: boolean }[] = [
    { key: "bizType" },
    { key: "industry" },
    { key: "revenue" },
    { key: "employees" },
    { key: "export" },
    { key: "creditLoan" },
    { key: "securedLoan" },
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
            어려운 용어 없이 <b className="text-brand-orange">쉬운 질문 몇 개</b>만 답하시면, 승인 가능성이 높은 정부지원사업과 예상 한도를 정확하게 판독해 드립니다.
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

            {/* 5. 담보대출 (참고용) */}
            {cur?.key === "securedLoan" && (
              <MoneyStep
                title="부동산 등 담보로 받은 대출이 있나요?"
                hint="집·상가·공장을 담보로 받은 대출입니다. 없으면 비워두고 넘어가세요."
                value={securedLoan억}
                setValue={setSecuredLoan억}
                placeholder="예: 2"
                example="💡 담보대출이 없으면 비워두시면 됩니다."
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
    govPrograms,
    timing,
    creditAdvice,
    disclaimer,
    revalidation,
  } = report;

  const cardCls = "rounded-2xl border border-gray-200 bg-white p-5 shadow-card";

  // 결과창에서 대표님이 고르는 지역(지역신용보증재단 상품 링크·신청앱 안내용)
  const [sinboRegion, setSinboRegion] = useState("");
  const selectedSinbo = REGION_SINBO.find((r) => r.region === sinboRegion);

  // 추천 기관 중 지역신용보증재단 포함 여부 → 지역 재단 안내 노출 조건
  const hasJaedan = creditMatches.some((m) => m.institution.includes("재단"));
  // 대리대출/직접대출 추천 여부 → 진행절차 안내 노출 조건
  const hasDae = creditMatches.some((m) => m.loan_type === "대리대출");
  const hasDirect = creditMatches.some((m) => m.loan_type === "직접대출");

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
          {creditMatches.map((m, i) => {
            const link = findInstitutionLink(m.institution);
            const isJaedan = m.institution.includes("재단");
            return (
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

                {/* 신보·기보·소진공·중진공 → 신청 매뉴얼 + 사이트 바로가기 (재단은 아래 지역 드롭다운으로 안내) */}
                {link && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.manualUrl && (
                        <a
                          href={link.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20"
                        >
                          📄 신청 매뉴얼
                        </a>
                      )}
                      {link.manualUrl && (
                        <span className="text-[11px] font-bold text-brand-dark/40">-</span>
                      )}
                      <a
                        href={link.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-brand-dark px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
                      >
                        {link.siteLabel}
                      </a>
                      {link.pdfUrl && (
                        <a
                          href={link.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-lg border border-brand-dark/30 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-dark hover:bg-gray-100"
                        >
                          📑 {link.pdfLabel}
                        </a>
                      )}
                    </div>
                    {link.note && (
                      <p className="break-keep text-[11px] leading-relaxed text-brand-dark/50">
                        {link.note}
                      </p>
                    )}
                  </div>
                )}
                {isJaedan && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {JAEDAN_SITE_LINKS.map((j) => (
                      <div key={j.url} className="flex flex-wrap items-center gap-2">
                        {j.manualUrl && (
                          <a
                            href={j.manualUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20"
                          >
                            📄 신청 매뉴얼
                          </a>
                        )}
                        {j.manualUrl && (
                          <span className="text-[11px] font-bold text-brand-dark/40">-</span>
                        )}
                        <a
                          href={j.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-lg bg-brand-dark px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
                        >
                          {j.label}
                        </a>
                      </div>
                    ))}
                    <p className="break-keep text-[11px] font-semibold text-brand-orange">
                      👇 아래에서 사업장 지역을 고르면 해당 재단 상품 페이지·신청 앱으로 이동합니다.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 space-y-2">
          <p className="break-keep rounded-lg bg-brand-yellow/10 px-3 py-2 text-[11px] leading-relaxed text-brand-dark">
            💡 대출은 보통 <b>직접대출 1곳(공단 직접) + 대리대출 1곳(보증서→은행), 총 2곳</b>에서 동시에 진행할 수 있습니다.
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

        {/* 지역신용보증재단 상품 안내 — 재단이 추천기관에 포함될 때만 */}
        {hasJaedan && (
          <div className="mt-4 rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4">
            <p className="break-keep text-sm font-bold text-brand-dark">
              📍 내 지역 신용보증재단 상품 바로 보기
            </p>
            <p className="mt-1 break-keep text-[11px] leading-relaxed text-brand-dark/60">
              재단 상품·보증한도·신청시기는 지역마다 다릅니다. 대표님 사업장 지역을 고르면 해당 재단 상품 페이지로 바로 이동합니다.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                value={sinboRegion}
                onChange={(e) => setSinboRegion(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-brand-dark focus:border-brand-orange focus:outline-none sm:flex-1"
              >
                <option value="">지역 선택 (시·도)</option>
                {REGION_SINBO.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region} · {r.name}
                  </option>
                ))}
              </select>
              {selectedSinbo ? (
                <a
                  href={selectedSinbo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-brand-orange px-5 py-2.5 text-center text-sm font-bold text-white hover:opacity-90"
                >
                  {selectedSinbo.name} 상품 보기 →
                </a>
              ) : (
                <span className="shrink-0 cursor-not-allowed rounded-lg bg-gray-200 px-5 py-2.5 text-center text-sm font-bold text-gray-400">
                  상품 보기 →
                </span>
              )}
            </div>
            {selectedSinbo && (
              <p className="mt-2.5 break-keep rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed text-brand-dark">
                📱 <b>신청 방법:</b>{" "}
                {selectedSinbo.region === "서울"
                  ? "「서울신용보증재단」 앱"
                  : selectedSinbo.region === "경기"
                  ? "「이지원」 앱"
                  : "「보증드림」 앱"}
                에서 비대면 신청하거나 대면 예약이 가능합니다. 신청이 어려우면{" "}
                <b>재단·소진공·중진공 방문상담(전화예약)</b>도 이용할 수 있습니다.
              </p>
            )}
          </div>
        )}

        {/* 신청 → 실행 진행 절차·소요기간 안내 */}
        {(hasDae || hasDirect) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="break-keep text-sm font-bold text-brand-dark">
              🗓️ 신청부터 대출 실행까지 (예상 소요기간)
            </p>
            {hasDae && (
              <div className="mt-2.5">
                <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  대리대출 (보증서→은행)
                </span>
                <p className="mt-1 break-keep text-[11px] leading-relaxed text-brand-dark">
                  신청 → 심사 → <b>모바일 실사</b> → 승인 → 약정 → 대출 실행 ·{" "}
                  <b className="text-brand-orange">빠르면 3주, 늦으면 6주</b>
                </p>
              </div>
            )}
            {hasDirect && (
              <div className="mt-2.5">
                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  직접대출 (공단 직접)
                </span>
                <p className="mt-1 break-keep text-[11px] leading-relaxed text-brand-dark">
                  신청 → 심사 → <b>방문 실사</b> → 약정 → 대출 실행 ·{" "}
                  <b className="text-brand-orange">약 8주</b> · 필요 서류가 더 많은 편입니다.
                </p>
              </div>
            )}
            <p className="mt-2.5 break-keep text-[11px] leading-relaxed text-brand-dark/60">
              ※ 모바일 실사는 재단·소진공의 소상공인 건에서 주로 진행되며, 기술보증기금·신용보증기금 및 금액이 큰 건은 방문 실사로 진행됩니다.
            </p>
          </div>
        )}
      </div>

      {/* ④ 신청 가능한 정부지원사업 (핵심 결과) */}
      {govPrograms.length > 0 && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-yellow/10 p-5 shadow-card">
          <p className="text-base font-extrabold text-brand-dark sm:text-lg">
            🎯 지금 바로 노려볼 정부지원사업{" "}
            <span className="text-brand-orange">{govPrograms.length}종</span>
          </p>
          <p className="mt-1 break-keep text-xs text-brand-dark/60">
            수많은 사업 중, 대표님 업종·상황에 <b className="text-brand-dark">실제로 신청 가능하고 승인 가능성이 높은 것만</b> 추려 드렸습니다.
          </p>
          <div className="mt-4 space-y-2">
            {govPrograms.map((p, i) => {
              const inner = (
                <>
                  <span className="min-w-0 break-keep text-sm font-bold text-brand-dark">
                    {p.name.replace(/_/g, " ")}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {p.amount_max && (
                      <span className="rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white">
                        최대 {won억(p.amount_max)}
                      </span>
                    )}
                    {p.applyUrl && (
                      <span className="whitespace-nowrap text-[11px] font-bold text-brand-orange">
                        신청 →
                      </span>
                    )}
                  </span>
                </>
              );
              return p.applyUrl ? (
                <a
                  key={i}
                  href={p.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-brand-orange hover:bg-brand-orange/5"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
                >
                  {inner}
                </div>
              );
            })}
          </div>
          <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-gray">
            ※ 위 목록은 신청 자격이 확인된 사업이며, 최종 선정은 각 기관 심사 결과에 따릅니다.
            사업명을 누르면 해당 신청·안내 사이트로 이동합니다.
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
