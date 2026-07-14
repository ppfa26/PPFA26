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
import Link from "next/link";
import {
  Company,
  runAdvancedScreening,
  AdvancedScreeningReport,
  REGION_SINBO,
  findInstitutionLink,
  JAEDAN_CALL_CENTER,
  JAEDAN_PRODUCTS,
  INSTITUTION_PRODUCT_LINKS,
  filterProducts,
  resolveJaedanLinks,
} from "@/lib/advancedScreening";
import {
  SUPPORT_PROGRAMS,
  computeSupportStatus,
  profileToCompany,
  type SupportProgram,
  type SupportStatus,
} from "@/lib/supportPrograms";
import ExtraBenefitsSection from "@/components/report/ExtraBenefitsSection";

// 지원제도 + 상태(대상/예정대상)를 함께 담는 표시용 타입
type SupportItem = { prog: SupportProgram; status: SupportStatus };

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

export default function AdvancedScreeningPanel({
  autoRun = false,
  previewLock = false,
}: {
  autoRun?: boolean;
  previewLock?: boolean;
}) {
  const [report, setReport] = useState<AdvancedScreeningReport | null>(null);

  // 진단 프로필 기준 '신청 대상'인 추가 지원제도 (기관 박스 안에 함께 안내)
  //  autoRun 모드에서 mpp_diagnosis를 읽어 계산 · 정밀진단 반영 이벤트 시 재계산
  const [eligibleSupport, setEligibleSupport] = useState<SupportItem[]>([]);
  useEffect(() => {
    const recompute = () => {
      try {
        const raw = sessionStorage.getItem("mpp_diagnosis");
        const p = raw ? JSON.parse(raw) : {};
        const status = computeSupportStatus(p);
        // 대상(eligible)을 먼저, 예정대상(potential)을 뒤로 정렬해 노출
        const items: SupportItem[] = SUPPORT_PROGRAMS
          .map((prog) => ({ prog, status: status[prog.id] }))
          .filter((x) => x.status === "eligible" || x.status === "potential")
          .sort((a, b) => (a.status === b.status ? 0 : a.status === "eligible" ? -1 : 1));
        setEligibleSupport(items);
      } catch {
        setEligibleSupport([]);
      }
    };
    recompute();
    window.addEventListener("mpp-advanced-applied", recompute);
    return () => window.removeEventListener("mpp-advanced-applied", recompute);
  }, []);

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

  // ── 자동 판독 모드(autoRun) ──────────────────────────────────
  //  대표님 방침: 결제 전 진단(기본 질문지)에서 이미 정보를 받았으므로,
  //  결과창(대시보드)에서는 추가 질문 없이 그 값으로 바로 기관·정부지원사업을 판독한다.
  //  (고객이 두 번 진단하는 피로 제거)
  useEffect(() => {
    if (!autoRun) return;
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const p = raw ? JSON.parse(raw) : {};

      // 기본 질문지(mpp_diagnosis) → Company 스키마 변환은 공용 함수로 통일한다.
      //  (마이페이지 개수 계산과 100% 동일한 변환을 쓰도록 하여 불일치·버그 재발 방지)
      const company: Company = profileToCompany(p);
      setReport(runAdvancedScreening(company));
    } catch {
      /* 실패 시 결과 없음 — 대시보드 매칭리스트는 별도로 표시됨 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // ── 판정 실행 ──────────────────────────────────────────────
  const handleRun = () => {
    // ── 정밀진단 값을 처음 질문지(mpp_diagnosis)에 병합 (정밀진단 우선) ──
    //  대표님 기준: 처음 답한 것과 정밀진단이 다르면 '정밀진단'을 기준으로 안내.
    //  ⭐ 매칭 정확도 개선: 판독(setReport)과 대시보드 재계산이 '완전히 동일한'
    //     공용 변환기(profileToCompany)를 쓰도록 통일한다. 이렇게 하면 처음 질문지에
    //     담긴 인증(특허/연구소/벤처/이노비즈)·혁신분야·이용기관·지역 정보가
    //     정밀진단 경로에서도 그대로 반영되어(기보/중진공 판정 등) 정확해진다.
    let merged: any = {};
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const base = raw ? JSON.parse(raw) : {};

      // 정밀진단 업종키 → 처음 질문지 업종 라벨로 역변환
      const indLabel: Record<string, string> = {
        manufacturing: "제조업", export: "수출업", service: "서비스업",
        retail: "도소매업", food: "음식점업", etc: "기타",
      };
      // 정밀진단에서 값이 실제로 입력된 항목만 덮어쓴다(빈 값은 처음 질문지 유지 → 포괄적).
      merged = { ...base };
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
      // 정밀진단에서 체크한 메인비즈 인증 → 처음 질문지 인증목록에 병합
      if (hasMainbiz && !(merged.certifications || []).includes("메인비즈"))
        merged.certifications = [...(merged.certifications || []), "메인비즈"];
      if (isReFounder) merged.bankruptcy = "있음";
      merged._advancedApplied = true; // 정밀진단 반영 표시

      sessionStorage.setItem("mpp_diagnosis", JSON.stringify(merged));
      // 대시보드가 즉시 재계산하도록 커스텀 이벤트 발신
      window.dispatchEvent(new CustomEvent("mpp-advanced-applied"));
    } catch {
      /* 저장 실패해도 정밀진단 결과 표시는 정상 진행 */
    }

    // ── 판독 실행 (공용 변환기로 통일 → 매칭 정확도 최상) ──
    //  정밀진단 전용 재무 신호(담보 제외 부채·연체·자본잠식 등)는 profileToCompany가
    //  다루지 않으므로, 병합 프로필로 만든 Company에 정밀진단 재무 신호를 덧씌운다.
    const empCount = employees === "5plus" ? 5 : employees === "under5" ? 2 : employees === "0" ? 0 : undefined;
    try {
      const baseCompany = profileToCompany(merged);
      const company: Company = {
        ...baseCompany,
        // 정밀진단 재무 신호(공용 변환기에 없는 값) 덧씌우기
        biz_type: bizType || baseCompany.biz_type,
        employee_count: empCount ?? baseCompany.employee_count,
        // ⭐ 판독에는 '신용대출/정책자금'만 반영 (담보대출 제외 → 매출 대비 부채 판정 왜곡 방지)
        total_debt: creditLoan억 ? toWon(creditLoan억) : baseCompany.total_debt,
        kcb_score: creditKnown === "yes" && kcb ? parseInt(kcb, 10) : baseCompany.kcb_score,
        nice_score: creditKnown === "yes" && nice ? parseInt(nice, 10) : baseCompany.nice_score,
        tax_delinquent: taxDelinquent,
        insurance_4_delinquent: insuranceDelinquent,
        full_capital_impairment: capitalImpairment,
        revenue_drop_30pct_yoy: revenueDrop30,
        revenue_drop_yoy_pct: revenueDrop30 ? 30 : 0,
        ceo_changed_1y: ceoChanged,
        is_pre_founder: isPreFounder || baseCompany.is_pre_founder,
        is_re_founder: isReFounder,
        has_mainbiz: hasMainbiz || baseCompany.has_mainbiz,
      };
      setReport(runAdvancedScreening(company));
    } catch {
      /* 변환 실패 시 결과 없음 — 대시보드 매칭리스트는 별도로 표시됨 */
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
      {/* 필수 작성 안내 배너 (판정 전에만 노출 · 자동판독 모드에선 숨김) */}
      {!report && !autoRun && (
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

      {/* 입력 카드 (판정 전에만 노출 · 자동판독 모드에선 숨김) */}
      {!report && !autoRun && (
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
          <AdvancedResult report={report} autoRun={autoRun} eligibleSupport={eligibleSupport} previewLock={previewLock} />
          {!autoRun && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 w-full rounded-xl border-2 border-gray-300 bg-white py-3 text-sm font-bold text-brand-dark transition hover:bg-gray-50"
            >
              ↺ 정밀진단 다시 하기
            </button>
          )}
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

function AdvancedResult({
  report,
  autoRun = false,
  eligibleSupport = [],
  previewLock = false,
}: {
  report: AdvancedScreeningReport;
  autoRun?: boolean;
  eligibleSupport?: SupportItem[];
  previewLock?: boolean;
}) {
  // 미리보기 잠금용 클래스 헬퍼 (기관명·상품명 텍스트 / 클릭요소)
  const lockText = previewLock ? "preview-lock-text" : "";
  const lockClick = previewLock ? "preview-lock-click" : "";
  const {
    company,
    koditHardReject,
    financials,
    creditMatches,
    govPrograms,
    creditAdvice,
  } = report;

  // 대표님 지역 기준으로 안내할 지역신용보증재단 목록 (인천→인천만, 서울→서울만, 지방→통합)
  const jaedanLinks = resolveJaedanLinks(company?.region);

  const cardCls = "rounded-2xl border border-gray-200 bg-white p-5 shadow-card";

  // 결과창에서 대표님이 고르는 지역(지역신용보증재단 상품 링크·신청앱 안내용)
  const [sinboRegion, setSinboRegion] = useState("");
  const selectedSinbo = REGION_SINBO.find((r) => r.region === sinboRegion);

  // ★ 기관별 상품 아코디언 — 클릭 시 해당 기관의 여러 상품이 쭈르륵 펼쳐짐 ★
  const [openProducts, setOpenProducts] = useState<Record<number, boolean>>({});
  const toggleProducts = (i: number) =>
    setOpenProducts((prev) => ({ ...prev, [i]: !prev[i] }));

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
      <h2 className="text-lg font-extrabold text-brand-dark">
        {autoRun ? "🏦 대표님 맞춤으로 신청가능 기관 및 상품 안내" : "🔬 정밀 추가진단 결과"}
      </h2>

      {/* ★ 진단 요약 배너 — "이 진단 덕분에 이런 걸 알게 됐다"는 성취감 (대표님 요청: 와 대박 느낌) ★ */}
      {autoRun && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-grad p-4 shadow-card">
          <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
            🎉 진단 완료! 대표님이 지금 신청해볼 수 있는 것들이 정리됐어요
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/70 px-2 py-2 text-center">
              <p className="text-xl font-extrabold text-brand-dark">{creditMatches.length}</p>
              <p className="mt-0.5 break-keep text-[11px] font-bold text-brand-dark/70">
                신청 가능 기관
              </p>
            </div>
            <div className="rounded-xl bg-white/70 px-2 py-2 text-center">
              <p className="text-xl font-extrabold text-brand-dark">
                {creditMatches.reduce((s, m) => {
                  if (m.institution.includes("재단"))
                    return s + Math.max(1, filterProducts(JAEDAN_PRODUCTS, company).length);
                  const l = findInstitutionLink(m.institution);
                  return s + Math.max(1, filterProducts(l?.products, company).length || 1);
                }, 0)}
              </p>
              <p className="mt-0.5 break-keep text-[11px] font-bold text-brand-dark/70">
                신청 가능 상품
              </p>
            </div>
            <div className="rounded-xl bg-white/70 px-2 py-2 text-center">
              <p className="text-xl font-extrabold text-brand-dark">
                {eligibleSupport.filter((e) => e.status === "eligible").length}
              </p>
              <p className="mt-0.5 break-keep text-[11px] font-bold text-brand-dark/70">
                지금 신청 대상
              </p>
            </div>
          </div>
          <p className="mt-2 break-keep text-[11px] font-semibold leading-relaxed text-brand-dark/80">
            👇 아래 <b>✅ 표시</b>된 곳이 대표님이 <b>지금 바로 신청 가능한 곳</b>입니다. 각 항목의
            <b> "상품 보기"</b>를 누르면 신청할 상품이 펼쳐지고, <b>신청 방법</b>까지 순서대로 안내드려요.
          </p>
        </div>
      )}

      {/* ① 정부지원제도 — 최상단 배치 (대표님 요청) · 기관 박스와 동일한 틀 */}
      {/*  정책자금(대출·보증)과 별개로 병행 신청 가능 · 진단 기준 '해당되는 것만' · 클릭 시 상세(승인 소요기간·연락처)로 이동 */}
      {eligibleSupport.length > 0 && (
        <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-5 shadow-card">
          <p className="text-base font-extrabold text-brand-dark sm:text-lg">
            🎁 대표님이 신청할 수 있는 정부지원제도
          </p>
          <p className="mt-1 break-keep text-xs text-brand-dark/60">
            정책자금(대출·보증)과 <b>별개로 병행 신청</b>할 수 있는 제도입니다.
            <b className="text-brand-green"> ✅ 지금 신청 대상</b>과
            <b className="text-brand-dark/70"> 🔜 요건 충족 시 대상</b>이 되는 제도를 함께 안내합니다.
            카드를 누르면 <b>승인 소요기간·담당 부처 연락처</b>를 확인할 수 있습니다.
          </p>
          {/* ★ V표시(✅) 보고 이렇게 신청하면 된다 — 3스텝 미니 가이드 (대표님 요청) ★ */}
          <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
            <p className="mb-1.5 break-keep text-[11px] font-extrabold text-brand-green">
              ✅ 표시된 곳, 이렇게 신청하시면 됩니다
            </p>
            <ol className="space-y-1">
              <li className="flex items-start gap-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/80">
                <span className="shrink-0 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">1</span>
                <span><b>✅ 신청 대상</b>인 제도의 카드를 눌러 상세 페이지로 들어가세요.</span>
              </li>
              <li className="flex items-start gap-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/80">
                <span className="shrink-0 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">2</span>
                <span>상세 페이지의 <b>필요서류·소요기간</b>을 확인하고 서류를 준비하세요.</span>
              </li>
              <li className="flex items-start gap-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/80">
                <span className="shrink-0 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">3</span>
                <span><b>공식 신청 사이트/연락처</b>로 접수하시면 됩니다. 헷갈리시면 담당 부처에 문의하시면 쉽게 진행 가능합니다.</span>
              </li>
            </ol>
          </div>
          <div className="mt-4 divide-y divide-gray-200">
            {eligibleSupport.map(({ prog, status }) => {
              const isEligible = status === "eligible";
              return (
                <Link
                  key={prog.id}
                  href={`/support/${prog.id}`}
                  className={`group block py-3 first:pt-0 last:pb-0 transition hover:bg-gray-50 ${lockClick}`}
                >
                  {/* 기관 박스 항목과 동일한 구조: 제목+뱃지 한 줄 → 안내 → 설명 → 링크 */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-base ${isEligible ? "" : "opacity-60"}`}>{prog.icon}</span>
                    <span className={`text-sm font-extrabold text-brand-dark ${lockText}`}>{prog.title}</span>
                    {isEligible ? (
                      <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                        ✅ 신청 대상
                      </span>
                    ) : (
                      <span className="shrink-0 break-keep rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-brand-dark/60">
                        🔜 요건 충족 시 대상
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 break-keep text-[11px] font-semibold leading-relaxed ${
                      isEligible ? "text-brand-green" : "text-brand-dark/50"
                    }`}
                  >
                    {isEligible ? prog.eligibleNote : prog.ineligibleNote}
                  </p>
                  <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
                    {prog.desc}
                  </p>
                  {/* 간단 신청방법 + 모르면 전화 — 모든 카드 통일 (대표님 요청) */}
                  {(prog.applyHow || prog.applyTel) && (
                    <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                      {prog.applyHow && (
                        <p className="break-keep text-[11px] leading-relaxed text-brand-dark/80">
                          <span className="font-bold text-brand-dark">신청방법 </span>
                          <span className={lockText}>{prog.applyHow}</span>
                        </p>
                      )}
                      {prog.applyTel && (
                        <p className="mt-1 break-keep text-[11px] leading-relaxed text-brand-dark/60">
                          잘 모르시겠으면 <span className={`font-bold text-brand-orange ${lockText}`}>☎ {prog.applyTel}</span> 로 문의하시면 쉽게 진행 가능합니다.
                        </p>
                      )}
                    </div>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 break-keep text-[11px] font-bold text-brand-orange">
                    상세 · 승인 소요기간 · 연락처 보기 <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ② 신청 가능 기관 — 정부지원제도 아래 배치 (대표님 요청) */}
      <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-5 shadow-card">
        <p className="text-base font-extrabold text-brand-dark sm:text-lg">
          🏦 대표님이 이용할 수 있는 정책금융기관
        </p>
        <p className="mt-1 break-keep text-xs text-brand-dark/60">
          업종·직원수 등 대표님 조건을 기준으로 실제 신청 자격이 열리는 정책금융기관입니다.
        </p>
        <div className="mt-4 divide-y divide-gray-200">
          {creditMatches.map((m, i) => {
            const link = findInstitutionLink(m.institution);
            const isJaedan = m.institution.includes("재단");
            // 재단은 link가 없으므로 JAEDAN_PRODUCTS를 아코디언 상품으로 사용
            // ★ 대표님 조건(스마트공장·재도전·대환 등)에 해당하는 상품만 남기고 나머지는 숨김 ★
            const products = filterProducts(isJaedan ? JAEDAN_PRODUCTS : link?.products, company);
            return (
              <div
                key={i}
                className="py-3 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-sm font-extrabold text-brand-dark ${lockText}`}>{m.institution}</span>
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
                  {/* 이미 이용 중인 기관 표시 (중복배제 참고 — 대표님 요청) */}
                  {m.alreadyUsing && (
                    <span className="shrink-0 rounded-full bg-brand-dark/10 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                      현재 이용 중
                    </span>
                  )}
                </div>
                <p className={`mt-1 break-keep text-xs text-brand-gray ${lockText}`}>{m.criteria}</p>

                {/* 신보·기보 둘 다 자격일 때 → 중복 신청 불가 안내 (대표님 요청) */}
                {m.exclusiveNote && (
                  <p className="mt-2 break-keep rounded-lg border border-brand-red/30 bg-brand-red/5 px-2.5 py-1.5 text-[11px] font-bold text-brand-red">
                    {m.exclusiveNote}
                  </p>
                )}

                {/* ★ 기관 내 여러 상품 아코디언 — 클릭 시 펼쳐서 상품별로 신청 (대표님 요청) ★ */}
                {products && products.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      onClick={() => toggleProducts(i)}
                      className={`inline-flex max-w-full items-center gap-2 rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-3 py-2 text-left transition hover:bg-brand-orange/20 ${lockClick}`}
                    >
                      <span className="break-keep text-xs font-extrabold text-brand-orange">
                        💳 {previewLock ? "신청 가능 상품" : `${m.institution} 신청 가능 상품 ${products.length}개`} 보기
                      </span>
                      <span
                        className={`shrink-0 text-brand-orange transition-transform ${
                          openProducts[i] ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                    {openProducts[i] && (
                      <div className="mt-2 space-y-2">
                        {products.map((prod, pi) => (
                          <div
                            key={pi}
                            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`break-keep text-sm font-extrabold text-brand-dark ${lockText}`}>
                                {prod.name}
                              </span>
                              {prod.amount && (
                                <span className="break-keep rounded-full bg-brand-dark/10 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                                  {prod.amount}
                                </span>
                              )}
                              {prod.approval && (
                                <span
                                  className={`shrink-0 break-keep rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    prod.approval === "high"
                                      ? "bg-green-100 text-brand-green"
                                      : prod.approval === "mid"
                                      ? "bg-brand-yellow/30 text-brand-dark"
                                      : "bg-red-100 text-brand-red"
                                  }`}
                                >
                                  {prod.approval === "high"
                                    ? "승인율 높은 편"
                                    : prod.approval === "mid"
                                    ? "조건 충족 시 가능"
                                    : "승인율 낮은 편"}
                                </span>
                              )}
                            </div>
                            {prod.desc && (
                              <p className="mt-1 break-keep text-[11px] leading-relaxed text-brand-gray">
                                {prod.desc}
                              </p>
                            )}
                            {prod.approvalNote && (
                              <p className="mt-1 break-keep text-[11px] font-semibold leading-relaxed text-brand-dark/70">
                                {prod.approvalNote}
                              </p>
                            )}
                            {prod.hookNote && (
                              <p className="mt-1.5 break-keep rounded-lg bg-brand-yellow/10 px-2 py-1.5 text-[10px] leading-relaxed text-brand-dark/70">
                                💡 {prod.hookNote}
                              </p>
                            )}
                            {prod.applyUrl && (
                              <a
                                href={previewLock ? undefined : prod.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-2 inline-block rounded-lg bg-brand-dark px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 ${lockClick}`}
                              >
                                이 상품 신청하러 가기 →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 신보·기보·소진공·중진공 → 신청 매뉴얼 + 사이트 바로가기 (재단은 아래 지역 드롭다운으로 안내) */}
                {link && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.manualUrl && (
                        <a
                          href={previewLock ? undefined : link.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClick}`}
                        >
                          📄 신청 매뉴얼
                        </a>
                      )}
                      <a
                        href={previewLock ? undefined : link.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-block rounded-lg bg-brand-dark px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 ${lockClick}`}
                      >
                        {link.siteLabel}
                      </a>
                      {link.pdfUrl && (
                        <a
                          href={previewLock ? undefined : link.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg border border-brand-dark/30 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-dark hover:bg-gray-100 ${lockClick}`}
                        >
                          📑 {link.pdfLabel}
                        </a>
                      )}
                    </div>
                    {link.tel && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                          href={previewLock ? undefined : `tel:${link.tel.replace(/-/g, "")}`}
                          className={`inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 ${lockClick}`}
                        >
                          📞 {link.tel}
                        </a>
                        {link.telNote && (
                          <span className={`break-keep text-[10px] leading-relaxed text-brand-dark/45 ${lockText}`}>
                            {link.telNote}
                          </span>
                        )}
                      </div>
                    )}
                    {link.note && (
                      <p className={`break-keep text-[11px] leading-relaxed text-brand-dark/50 ${lockText}`}>
                        {link.note}
                      </p>
                    )}
                  </div>
                )}
                {isJaedan && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {jaedanLinks.map((j) => (
                      <div key={j.url} className="flex flex-wrap items-center gap-2">
                        {j.manualUrl && (
                          <a
                            href={previewLock ? undefined : j.manualUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block rounded-lg border-2 border-brand-orange bg-brand-orange/10 px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClick}`}
                          >
                            📄 신청 매뉴얼
                          </a>
                        )}
                        <a
                          href={previewLock ? undefined : j.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg bg-brand-dark px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 ${lockClick}`}
                        >
                          {j.label}
                        </a>
                        {j.productUrl && (
                          <a
                            href={previewLock ? undefined : j.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block rounded-lg border border-brand-dark/30 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-dark hover:bg-gray-100 ${lockClick}`}
                          >
                            📑 {j.productLabel}
                          </a>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <a
                        href={previewLock ? undefined : `tel:${JAEDAN_CALL_CENTER.tel.replace(/-/g, "")}`}
                        className={`inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 ${lockClick}`}
                      >
                        📞 {JAEDAN_CALL_CENTER.tel}
                      </a>
                      <span className="break-keep text-[10px] leading-relaxed text-brand-dark/45">
                        {JAEDAN_CALL_CENTER.telNote}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 space-y-2">
          <p className={`break-keep rounded-lg bg-brand-yellow/10 px-3 py-2 text-[11px] leading-relaxed text-brand-dark ${lockText}`}>
            💡 대출은 보통 <b>직접대출 1곳(공단 직접) + 대리대출 1곳(보증서→은행), 총 2곳</b>에서 동시에 진행할 수 있습니다.
          </p>
          {/* 신용점수 안내 — 알맹이라 결제 전 잠금 */}
          <p
            className={`break-keep rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              creditAdvice.tier === "good"
                ? "bg-green-50 text-brand-green"
                : creditAdvice.tier === "caution"
                ? "bg-brand-yellow/20 text-brand-dark"
                : "bg-red-50 text-brand-red"
            } ${lockText}`}
          >
            📊 {creditAdvice.message}
          </p>
        </div>

        {/* 신청 → 실행 진행 절차·소요기간 안내 — 같은 맥락이라 정책금융기관 박스 '안'으로 통합 (대표님 요청, 구분선으로 구획) */}
        {(hasDae || hasDirect) && (
          <div className="mt-5 border-t border-dashed border-brand-dark/15 pt-5">
            <p className="text-base font-extrabold text-brand-dark sm:text-lg">
              🗓️ 신청부터 정부지원사업 실행까지 (예상 소요기간)
            </p>
            {hasDae && (
              <div className="mt-3">
                <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  대리대출 (보증서 → 은행)
                </span>
                <p className={`mt-1 break-keep text-[11px] leading-relaxed text-brand-dark ${lockText}`}>
                  신청 → 심사 → <b>현장 실사</b> → 승인 → 약정 → 자금 실행 ·{" "}
                  <b className="text-brand-orange">통상 3~6주 소요</b>
                </p>
              </div>
            )}
            {hasDirect && (
              <div className="mt-2.5">
                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  직접대출 (공단 직접)
                </span>
                <p className={`mt-1 break-keep text-[11px] leading-relaxed text-brand-dark ${lockText}`}>
                  신청 → 심사 → <b>현장 실사</b> → 약정 → 자금 실행 ·{" "}
                  <b className="text-brand-orange">통상 약 8주 소요</b> · 제출 서류가 상대적으로 많은 편입니다.
                </p>
              </div>
            )}
            <p className={`mt-2.5 break-keep text-[11px] leading-relaxed text-brand-dark/60 ${lockText}`}>
              ※ 소상공인·소액 건(재단·소진공)은 비대면(모바일) 실사로 진행되는 경우가 많으며, 기술보증기금·신용보증기금 및 규모가 큰 건은 방문 실사로 진행됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 🎁 5가지 추가 혜택 — '기관별 상품 한눈에 보기' 박스 '위'로 이동 (대표님 요청) */}
      {autoRun && <ExtraBenefitsSection previewLock={previewLock} />}

      {/* 기관별 상품 한눈에 보기 — 지원제도 박스 '아래' 별도 박스로 배치 (대표님 요청) */}
      <div className="rounded-2xl border-2 border-brand-dark/10 bg-white p-5 shadow-card">
        <p className="text-base font-extrabold text-brand-dark sm:text-lg">
          🏛️ 기관별 상품 한눈에 보기
        </p>
        <p className="mt-1 break-keep text-xs text-brand-dark/60">
          각 기관의 상품 안내 자료·페이지로 바로 이동합니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {INSTITUTION_PRODUCT_LINKS.map((p) => (
            <a
              key={p.label}
              href={previewLock ? undefined : p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center rounded-xl bg-brand-dark px-3 py-3 text-center transition hover:opacity-90 ${lockClick}`}
            >
              <span className={`break-keep text-xs font-bold text-white ${lockText}`}>{p.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* 소상공인·중소기업이 알아두면 좋은 정부 사이트 모음으로 이동 */}
      <a
        href={previewLock ? undefined : "/sites"}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand-dark bg-brand-dark px-5 py-4 shadow-card transition hover:opacity-90 ${previewLock ? "pointer-events-none" : ""}`}
      >
        <span className="min-w-0">
          <span className="block break-keep text-base font-extrabold text-white">
            🔖 소상공인·중소기업들이 알아두면 좋은 정부 사이트
          </span>
          <span className="mt-0.5 block break-keep text-[11px] leading-relaxed text-white/70">
            정책자금·보증·창업·인증 업무에 자주 쓰이는 공식 사이트를 분야별로 모았습니다.
          </span>
        </span>
        <span className={`shrink-0 rounded-full bg-brand-yellow px-4 py-2 text-sm font-extrabold text-brand-dark ${lockClick}`}>
          공식 사이트 모음 보기
        </span>
      </a>
    </div>
  );
}
