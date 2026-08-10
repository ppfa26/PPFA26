"use client";

// ─────────────────────────────────────────────────────────────────────────
//  정밀 추가진단 패널 - 토스식 단계형(한 번에 하나씩) 쉬운 질문 UI
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
  findInstitutionLink,
  JAEDAN_CALL_CENTER,
  JAEDAN_PRODUCTS,
  INSTITUTION_PRODUCT_LINKS,
  filterProducts,
  resolveJaedanLinks,
  loanNatureOf,
  PRE_FOUNDER_PROGRAMS,
  isPreFounderEligible,
  type InstitutionProduct,
} from "@/lib/advancedScreening";
import {
  SUPPORT_PROGRAMS,
  computeSupportStatus,
  profileToCompany,
  type SupportProgram,
  type SupportStatus,
} from "@/lib/supportPrograms";
import ExtraBenefitsSection from "@/components/report/ExtraBenefitsSection";
import AccordionCard from "@/components/report/AccordionCard";
import CollapsibleItem from "@/components/report/CollapsibleItem";
import RelatedAnnouncements from "@/components/RelatedAnnouncements";
import { loadDiagnosisRaw, saveDiagnosis, getDiagnosisOwner } from "@/lib/diagnosisStore";
import { GRADUATION_CRITERIA, GRADUATION_EXCLUDED_NOTE } from "@/lib/graduationCriteria";

// 지원제도 + 상태(대상/예정대상)를 함께 담는 표시용 타입
type SupportItem = { prog: SupportProgram; status: SupportStatus };

// ★ 상품 성격 배지 색상 (대표님 요청: 대리대출·직접대출 = 보라색으로 통일 / 보험=오렌지) ★
//   위험 액션이 아니므로 레드 미사용. '보험'은 대출·보증과 구분되게 오렌지 톤.
function natureBadgeCls(nature: string): string {
  if (nature === "보험") return "bg-orange-100 text-orange-700";
  return "bg-purple-100 text-purple-700"; // 대리대출·직접대출 (보라색 통일)
}

// 업종 - 기타업종 포함 (판독 로직에서 미매핑 업종은 자동으로 서비스업 비율(0.1) 적용됨)
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
  relatedProfile = null,
  onCounts,
}: {
  autoRun?: boolean;
  previewLock?: boolean;
  // '지금 열려있는 관련 정부지원사업'(기업마당 실공고) 매칭용 진단 프로필
  relatedProfile?: Record<string, unknown> | null;
  // ★ 실제 화면에 그린 4개 카테고리의 '실측 갯수'를 부모(요약 배너)로 올려 배너와 화면 숫자 100% 일치 (대표님 요청)
  //   supports=정부지원제도, products=정책금융상품, benefits=추가 감면, announcements=그 외 정부지원사업
  onCounts?: (c: { supports: number; products: number; benefits: number; announcements: number }) => void;
}) {
  const [report, setReport] = useState<AdvancedScreeningReport | null>(null);

  // 진단 프로필 기준 '신청 대상'인 추가 지원제도 (기관 박스 안에 함께 안내)
  //  autoRun 모드에서 mpp_diagnosis를 읽어 계산 · 정밀진단 반영 이벤트 시 재계산
  const [eligibleSupport, setEligibleSupport] = useState<SupportItem[]>([]);
  useEffect(() => {
    const recompute = () => {
      try {
        const raw = loadDiagnosisRaw();
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

  // 단계(토스식) - 0부터 시작, 마지막 단계에서 판정 실행
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


  // ── 처음 질문지(mpp_diagnosis) 값을 정밀진단 초깃값으로 불러오기 ──────
  //  대표님 기준: 처음 답한 내용을 이어받고, 정밀진단에서 고치면 그게 우선.
  //  (둘 다 포괄적으로 보되, 정밀진단 값을 최종 판독에 사용)
  useEffect(() => {
    try {
      const raw = loadDiagnosisRaw();
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
        // 현재 진단 구간(2026 개정)
        "매출 없음": "0", "매출없음": "0",
        "2억 미만": "1", "2억미만": "1",
        "10억 미만": "5", "10억미만": "5",
        "10억 이상": "10", "10억이상": "10",
        // 과거 구간(하위호환)
        "5억 이상": "5", "5억미만": "3", "5억 미만": "3",
        "1억 미만": "0.5", "1억미만": "0.5",
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

      // 직원수 (2026 개정 라벨: 0명 / 5명 이하 / 5명 이상 / 50명 이상 / 300명 이상 / 기타)
      //  ★ 주의: "50명이상"·"300명이상"에도 문자열 "0명"이 들어 있으므로
      //    반드시 큰 규모(5명이상/50명이상/300명이상/10명)를 먼저 판정해야 오분류가 없다.
      if (p.employees) {
        const empStr = p.employees.replace(/\s/g, "");
        if (
          empStr.includes("5명이상") ||
          empStr.includes("50명이상") ||
          empStr.includes("300명이상") ||
          empStr.includes("10명이상") || // 과거 라벨 하위호환
          empStr.includes("10명이하")
        )
          setEmployees("5plus");
        else if (empStr.includes("5명미만") || empStr.includes("5명이하")) setEmployees("under5");
        else if (empStr === "0명") setEmployees("0");
        touched = true;
      }

      // 신용점수 구간 → 대략 점수 (모름 아님으로)
      if (p.credit) {
        // 신 옵션: "839점 이하"/"839점 이상"  · 구 옵션: "840"/"700~839"/"700점 미만"
        //  ※ "이하"·"미만"·"취약"을 먼저 판정(‘839점 이하’가 양호로 오판되지 않도록).
        if (p.credit.includes("이하") || p.credit.includes("미만") || p.credit.includes("취약")) { setCreditKnown("yes"); setKcb("690"); setNice("690"); touched = true; }
        else if (p.credit.includes("840") || p.credit.includes("839점 이상") || p.credit.includes("839 이상")) { setCreditKnown("yes"); setKcb("850"); setNice("850"); touched = true; }
        else if (p.credit.includes("700~839") || p.credit.includes("839")) { setCreditKnown("yes"); setKcb("820"); setNice("820"); touched = true; }
      }

      // 회생·파산 → 재창업자로 간주(정밀진단에서 다시 확인 가능)
      if (p.bankruptcy && (p.bankruptcy.includes("있"))) { setIsReFounder(true); touched = true; }

      // 인증(메인비즈)
      if ((p.certifications || []).includes("메인비즈")) { setHasMainbiz(true); touched = true; }

      void touched;
    } catch {
      /* 무시 - 처음 질문지 없거나 파싱 실패 시 빈 상태로 시작 */
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
      const raw = loadDiagnosisRaw();
      const p = raw ? JSON.parse(raw) : {};

      // 기본 질문지(mpp_diagnosis) → Company 스키마 변환은 공용 함수로 통일한다.
      //  (마이페이지 개수 계산과 100% 동일한 변환을 쓰도록 하여 불일치·버그 재발 방지)
      const company: Company = profileToCompany(p);
      setReport(runAdvancedScreening(company));
    } catch {
      /* 실패 시 결과 없음 - 대시보드 매칭리스트는 별도로 표시됨 */
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
      const raw = loadDiagnosisRaw();
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
        merged.revenue = r >= 10 ? "10억 이상" : r >= 2 ? "10억 미만" : r > 0 ? "2억 미만" : "매출 없음";
      }
      if (years) {
        const y = parseFloat(years);
        merged.years = y <= 0 ? "창업 예정" : y < 1 ? "1년 미만" : y < 3 ? "3년 미만" : y < 7 ? "7년 미만" : "7년 이상";
      }
      if (ceoAge) merged.age = parseInt(ceoAge, 10) <= 39 ? "만 39세 이하 (청년)" : "만 40세 이상";
      if (employees) merged.employees = employees === "0" ? "0명" : employees === "under5" ? "5명 미만" : "5명 이상";
      if (creditKnown === "yes" && (kcb || nice)) {
        const sc = Math.max(parseInt(kcb || "0", 10), parseInt(nice || "0", 10));
        merged.credit = sc >= 840 ? "839점 이상" : "839점 이하";
      }
      // 정밀진단에서 체크한 메인비즈 인증 → 처음 질문지 인증목록에 병합
      if (hasMainbiz && !(merged.certifications || []).includes("메인비즈"))
        merged.certifications = [...(merged.certifications || []), "메인비즈"];
      if (isReFounder) merged.bankruptcy = "있음";
      merged._advancedApplied = true; // 정밀진단 반영 표시

      // 기존 진단의 소유자(로그인 계정)를 유지한 채 업데이트 저장
      //  ★ 단, 관리자 결과보기(?admin=1) 모드에서는 '남의(고객) 데이터'이므로
      //    대표님 본인의 localStorage 진단을 덮어쓰면 안 된다 → 저장 건너뜀.
      const isAdminView =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("admin") === "1";
      if (!isAdminView) {
        saveDiagnosis(merged, getDiagnosisOwner());
      }
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
      /* 변환 실패 시 결과 없음 - 대시보드 매칭리스트는 별도로 표시됨 */
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
          <AdvancedResult report={report} autoRun={autoRun} eligibleSupport={eligibleSupport} previewLock={previewLock} relatedProfile={relatedProfile} onCounts={onCounts} />
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


function AdvancedResult({
  report,
  autoRun = false,
  eligibleSupport = [],
  previewLock = false,
  relatedProfile = null,
  onCounts,
}: {
  report: AdvancedScreeningReport;
  autoRun?: boolean;
  eligibleSupport?: SupportItem[];
  previewLock?: boolean;
  relatedProfile?: Record<string, unknown> | null;
  // ★ 실제 화면에 그린 4개 카테고리 실측 갯수를 부모(요약 배너)로 올려 숫자 100% 일치 (대표님 요청)
  onCounts?: (c: { supports: number; products: number; benefits: number; announcements: number }) => void;
}) {
  // ★ 요약 배너 숫자 100% 일치용 - 비동기로 그려지는 두 카드(감면·그외공고)의 실측 갯수를 자식에서 받아 보관 ★
  const [benefitsCount, setBenefitsCount] = useState<number | null>(null);
  const [announcementsCount, setAnnouncementsCount] = useState<number | null>(null);
  // 미리보기(previewLock)에서는 '그 외 정부지원사업'(RelatedAnnouncements)이 렌더되지 않으므로 0으로 확정
  useEffect(() => {
    if (previewLock) setAnnouncementsCount(0);
  }, [previewLock]);

  // 미리보기 잠금용 클래스 헬퍼 (기관명·상품명 텍스트 / 클릭요소)
  const lockText = previewLock ? "preview-lock-text" : "";
  const lockClick = previewLock ? "preview-lock-click" : "";
  // 텍스트가 밀집돼 모자이크가 과해 보이는 카테고리 전용(약한 블러):
  //  🎁 정부지원제도 · 🏦 정책금융기관 (대표님 요청 - 그 카테고리만 완화)
  const lockTextSoft = previewLock ? "preview-lock-text-soft" : "";
  const lockClickSoft = previewLock ? "preview-lock-click-soft" : "";
  // 흐림 없이 클릭만 막기 (제목·설명은 그대로 보여주되 결제 전 페이지 이동만 차단)
  const lockNoClick = previewLock ? "preview-lock-noclick" : "";
  // 결과창에서 실제로 사용하는 값만 구조분해 (나머지 필드는 판독용 내부 데이터라 표시하지 않음)
  const { company, creditMatches, creditAdvice } = report;

  // 대표님 지역 기준으로 안내할 지역신용보증재단 목록 (인천→인천만, 서울→서울만, 지방→통합)
  const jaedanLinks = resolveJaedanLinks(company?.region);

  // ★ 기관별 상품 아코디언 - 클릭 시 해당 기관의 여러 상품이 쭈르륵 펼쳐짐 ★
  //  (대표님 요청) 모든 기관 카테고리를 처음부터 '펼쳐진' 상태로 통일 → 위아래 오픈 정도 차이 없음.
  const [openProducts, setOpenProducts] = useState<Record<number, boolean>>({});
  const toggleProducts = (i: number) =>
    setOpenProducts((prev) => ({ ...prev, [i]: !prev[i] }));
  // ★ 승인 잘 되는 상품 위주로(대표님 요청): 기관마다 상위 2개만 먼저 펼치고 나머지는 '더 보기'로 접는다. ★
  //   ⚠️ 표시만 분리. filterProducts 결과·개수·정렬·요약배너 카운트 100% 보존(접힌 상품도 카운트에 포함).
  const PRODUCTS_INITIAL_COUNT = 2;
  const [showAllProducts, setShowAllProducts] = useState<Record<number, boolean>>({});
  const toggleAllProducts = (i: number) =>
    setShowAllProducts((prev) => ({ ...prev, [i]: !prev[i] }));
  // ★ 졸업후보 기준표 '작은 아코디언'(대표님 요청): 졸업후보기업자금 상품 카드 아래에만 인라인 접이식으로.
  //   기관·상품 인덱스 조합 키(`${i}-${pi}`)로 개별 토글. ⚠️ 순수 표시용, 판정/정렬/카운트 무관.
  const [openGradCriteria, setOpenGradCriteria] = useState<Record<string, boolean>>({});
  const toggleGradCriteria = (key: string) =>
    setOpenGradCriteria((prev) => ({ ...prev, [key]: !prev[key] }));

  // ★ 결정 마비 완화(대표님 요청): '지금 신청 가능'만 먼저 펼치고, '조건 충족 시 가능'은 접어둔다. ★
  //   ⚠️ 판정/정렬/점수 로직은 그대로. 이미 계산된 결과를 '펼침 vs 접힘'으로 나눠 표시만 하는 것.
  const [showSupportPotential, setShowSupportPotential] = useState(false);
  // ★ 🌱 창업지원사업(방식 A, 대표님 승인): 자격 있는 사업만 표시하고,
  //   자격 없는 신분·연령 사업(예비·재도전·청년·도약)은 '더 보기'로도 안 보이게 완전 제외.
  //   판정은 isPreFounderEligible(진단 프로필)로만. ⚠️ matching.ts 스코어링과 무관한 표시 필터.

  // report(=creditMatches)가 준비/갱신되면 모든 기관 아코디언을 기본 오픈으로 초기화
  useEffect(() => {
    const all: Record<number, boolean> = {};
    creditMatches.forEach((_, i) => {
      all[i] = true;
    });
    setOpenProducts(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditMatches.length]);

  // 대리대출/직접대출 추천 여부 → 진행절차 안내 노출 조건
  const hasDae = creditMatches.some((m) => m.loan_type === "대리대출");
  const hasDirect = creditMatches.some((m) => m.loan_type === "직접대출");

  // ★ 정책금융상품 '실측 갯수' - 아래 아코디언 렌더(959행~)와 100% 동일한 filterProducts 결과를 그대로 합산 ★
  //   (Math.max(1,...) 같은 보정 없이, 화면에 실제로 그려지는 상품 카드 수와 정확히 일치시킨다 - 대표님 요청)
  const productsShownCount = creditMatches.reduce((sum, m) => {
    const link = findInstitutionLink(m.institution);
    const isJaedan = m.institution.includes("재단");
    const filtered = filterProducts(isJaedan ? JAEDAN_PRODUCTS : link?.products, company);
    return sum + (filtered?.length || 0);
  }, 0);

  // ★ 4개 카테고리 실측 갯수가 모두 준비되면 부모(요약 배너)로 올려 숫자 100% 일치 ★
  //   감면·그외공고는 비동기(자식 콜백)라 아직 null일 수 있음 → 둘 다 확정된 뒤에만 전달.
  useEffect(() => {
    if (!onCounts) return;
    if (benefitsCount === null || announcementsCount === null) return;
    onCounts({
      supports: eligibleSupport.length,
      products: productsShownCount,
      benefits: benefitsCount,
      announcements: announcementsCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleSupport.length, productsShownCount, benefitsCount, announcementsCount]);

  return (
    <div id="advanced-result" className="mt-2 space-y-3">
      {/* autoRun(결제 후 대시보드)에서는 상단 dashboard-hero 제목과 중복되므로 h2를 숨긴다.
          정밀 추가진단(수동 실행) 화면에서만 제목을 표기. */}
      {!autoRun && (
        <h2 className="break-keep text-base font-extrabold leading-snug text-brand-dark">
          🔬 정밀 추가진단 결과
        </h2>
      )}

      {/* ★ 사용 안내 배너 - 숫자 요약은 상단 히어로(matching-preview)와 중복이라 제거하고
          '어떻게 보는지' 안내 문구만 남김 (대표님 요청: 결과창 중복 정리) */}
      {autoRun && (
        <div className="rounded-2xl border border-brand-orange/70 bg-brand-grad px-4 py-3.5 shadow-card">
          <p className="break-keep text-[14px] font-semibold leading-relaxed text-brand-dark/80">
            👇 <b>✅ 표시</b>된 곳이 <b>지금 바로 신청 가능한 곳</b>이에요.{" "}
            <b>&ldquo;상품 보기&rdquo;</b>를 누르면 신청 방법을 순서대로 알려드려요.
          </p>
          {/* ★ 초보자용 '보는 순서' 안내 (대표님 요청) ★ 목차 아코디언을 따로 두면 아래 실제
              카드와 제목이 그대로 중복됨 → 별도 목차를 없애고, 이 배너 안에 순서 한 줄로 녹인다.
              실제 4개 카드가 곧 목차 역할을 하므로 중복 없이 깔끔해진다. */}
          <p className="mt-2 break-keep border-t border-brand-dark/10 pt-2 text-[14px] font-semibold leading-relaxed text-brand-dark/70">
            🔎 잘 모르시겠으면 위에서부터 아래 순서대로 확인하시면 됩니다.
          </p>
        </div>
      )}

      {/* ⓪ 예비·초기·청년창업자 정부지원사업 (대표님 요청) - 모든 고객에게 노출.
             결과창 '맨 위'(정부지원제도 위). 대출이 아닌 사업화 자금(무상) 중심.
             중진공 청년창업자금(대출)은 정책금융상품 아코디언에 그대로 유지. */}
      {(
        <AccordionCard
          emoji="🌱"
          title="예비·초기·청년 사업자 지원금"
          subtitle="안 갚아도 되는 예비·초기·청년 지원금이에요"
        >
          <div className="rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3">
            <p className="break-keep text-xs leading-relaxed text-brand-dark/80">
              <b>안 갚아도 되는 사업화 자금(무상)</b>이에요. 창업 초기에만 받을 수 있으니 지금 꼭 챙기세요.
            </p>
          </div>
          {(() => {
            // ★ 방식 A(대표님 승인): 진단 프로필상 '자격 있는' 창업사업만 표시한다.
            //   자격 없는 신분·연령 사업(예비·재도전·청년·도약)은 목록에서 완전 제외(더 보기에도 X).
            //   'always'(스타트업 원스톱센터)는 누구나 대상 → 항상 포함된다.
            //   ⚠️ matching.ts 스코어링과 무관한 표시용 필터. 판정은 isPreFounderEligible로만.
            const eligibles = PRE_FOUNDER_PROGRAMS.filter((p) =>
              isPreFounderEligible(p.eligKey, relatedProfile),
            );
            // ★ 2단 접이식(대표님 요청): 카드 상단(배지+이름+금액)만 항상 보이고,
            //    대상·설명·버튼은 접었다 편다. 추천 1순위(idx 0)만 펼쳐 둔다.
            const renderPreFounderCard = (
              p: (typeof PRE_FOUNDER_PROGRAMS)[number],
              idx: number,
            ) => (
              <CollapsibleItem
                key={p.name}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                header={
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    {/* ★ 다이어트(대표님 요청) ★ 카드 제목에 이미 '무상 사업화 자금'이라 적혀 있어
                        항목마다 반복되던 '사업화 자금' 배지는 삭제. 대신 금액을 크고 선명하게. */}
                    <span className="flex items-center gap-2 break-keep text-sm font-extrabold text-brand-dark">
                      {p.name}
                    </span>
                    <span className="shrink-0 break-keep text-sm font-black text-brand-green">{p.amount}</span>
                  </span>
                }
              >
                <p className="break-keep text-xs leading-relaxed text-brand-dark/70">
                  <b className="text-brand-dark/80">대상</b> · {p.target}
                </p>
                <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">
                  {p.detail}
                </p>
                {/* ★ 버튼 4종 (대표님 요청) ★ ① 신청하러 가기(사이트) ② 신청 방법·서류(매뉴얼) ③ 소요기간 ④ 연락처
                     첫페이지 미리보기와 동일한 구성. 사이트/매뉴얼은 실제 링크, 소요기간·연락처는 안내(K-Startup 공통). */}
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={previewLock ? undefined : p.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3.5 py-2 text-xs font-extrabold text-white transition hover:brightness-95 ${lockClick}`}
                    >
                      <span aria-hidden>📝</span> 신청하러 가기 <span aria-hidden>→</span>
                    </a>
                    {p.manualUrl && (
                      <a
                        href={previewLock ? undefined : p.manualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-brand-orange bg-white px-3.5 py-2 text-xs font-extrabold text-brand-orange transition hover:bg-brand-orange/5 ${lockClick}`}
                      >
                        <span aria-hidden>📋</span> 신청 방법·서류
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-2 text-xs font-bold text-brand-orange">
                      <span aria-hidden>⏱️</span> 소요기간 통상 6~10주
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <a
                      href={previewLock ? undefined : "tel:1357"}
                      className={`inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 ${lockClick}`}
                    >
                      📞 1357
                    </a>
                    <span className={`break-keep text-[11px] leading-relaxed text-brand-dark/45 ${lockText}`}>
                      창업·정부지원 통합콜센터(1357)로 문의하면 K-Startup 신청 안내가 빠릅니다.
                    </span>
                  </div>
                </div>
              </CollapsibleItem>
            );
            return (
              <div className="mt-3 space-y-2.5">
                {eligibles.length > 0 ? (
                  eligibles.map((p, idx) => renderPreFounderCard(p, idx))
                ) : (
                  // 자격 사업이 하나도 없을 때(이론상 always가 있어 드묾) 안내
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="break-keep text-xs leading-relaxed text-brand-dark/60">
                      지금 진단 기준으로 <b>바로 해당되는 창업단계 사업</b>은 없어요.
                      정책자금·정부지원제도 쪽을 함께 확인해 보세요.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-dark/45">
            ※ 지원금·자격은 매년 바뀌어요. 신청 전 공식 공고를 꼭 확인하세요.
          </p>
          {/* ★ 성격별 분류(대표님 요청): 크롤링 실공고 중 '창업' 성격 공고를 이 아코디언 안에 인라인으로.
              (기업마당 '창업'/K-Startup 창업·사업화 등) 결과 대시보드(autoRun)에서만, previewLock 제외. */}
          {autoRun && !previewLock && (
            <RelatedAnnouncements profile={relatedProfile} bucket="startup" variant="inline" />
          )}
        </AccordionCard>
      )}

      {/* ① 정부지원제도 + 감면혜택 - 최상단 배치 (대표님 요청: 두 아코디언 완전 통합)
             성격이 유사(신청해서 챙기는 혜택)하여 하나의 아코디언으로 묶고,
             안에서 [신청 가능한 제도] → [챙기면 좋은 감면 혜택] 소제목으로 구분.
             제도가 0개여도 감면혜택이 있으면 아코디언은 열린다. */}
      {autoRun && (
        <AccordionCard
          emoji="🏅"
          title="내 혜택·감면 모두 챙기기"
          subtitle="신청 가능한 혜택과 세금 감면을 모았어요"
        >
          {/* ── 신청 가능한 정부지원제도 (제도가 있을 때만) ── */}
          {eligibleSupport.length > 0 && (
          <>
          <div className="mb-3 rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3">
            <p className="break-keep text-xs leading-relaxed text-brand-dark/80">
              대표님이 <b>지금 바로 신청할 수 있는 제도</b>만 골랐어요. 대출과 따로 챙길 수 있으니 놓치지 마세요.
            </p>
          </div>
          {(() => {
            // ★ 표시만 분리 (대표님 요청): 최소 3개는 먼저 펼쳐 보여주고, 나머지는 '더 보기'로 접는다.
            //   제조업만 찍으면 '지금 신청 가능'이 혁신바우처 1개뿐이라 화면이 허전 →
            //   고용지원금·두루누리 등 '조건 충족 시 가능'까지 끌어와 앞 3개를 채운다.
            //   ⚠️ 판정·순서·개수·문구는 recompute() 결과 그대로(eligible이 앞). 여기선 펼침/접힘만 나눔.
            //      배지는 정직하게: eligible=신청 가능(초록), potential=조건 충족 시 가능(주황).
            const SUPPORT_INITIAL_COUNT = 3;
            const visibleSupports = eligibleSupport.slice(0, SUPPORT_INITIAL_COUNT);
            const restSupports = eligibleSupport.slice(SUPPORT_INITIAL_COUNT);
            // ★ 2단 접이식(대표님 요청): 카드 전체가 Link였던 것을 → 헤더(제목+요약+배지)만
            //    항상 보이고, 신청방법·버튼 등 상세는 접었다 편다. 추천 1순위만 펼쳐 둔다.
            //    상세 페이지로 가는 이동은 하단 '상세·소요기간·연락처' 버튼(Link)으로 분리.
            const renderSupportCard = ({ prog, status }: SupportItem, idx: number) => {
              const isEligible = status === "eligible";
              return (
                <CollapsibleItem
                  key={prog.id}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                  header={
                    <>
                      {/* 기관 박스 항목과 동일한 구조: 제목+뱃지 한 줄 → 요약 안내 */}
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className={`text-base ${isEligible ? "" : "opacity-60"}`}>{prog.icon}</span>
                        <span className={`text-[14px] font-extrabold text-brand-dark ${lockTextSoft}`}>{prog.title}</span>
                        {isEligible ? (
                          <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                            신청 가능
                          </span>
                        ) : (
                          <span className="shrink-0 break-keep rounded-full bg-brand-orange/90 px-2 py-0.5 text-[10px] font-bold text-white">
                            조건 충족 시 가능
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-1.5 block break-keep text-[12px] font-semibold leading-relaxed ${
                          isEligible ? "text-brand-green" : "text-brand-dark/50"
                        }`}
                      >
                        {isEligible ? prog.eligibleNote : prog.ineligibleNote}
                      </span>
                    </>
                  }
                >
                  <p className="break-keep text-[12px] leading-relaxed text-brand-gray">
                    {prog.desc}
                  </p>
                  {/* 신청방법 + 문의 전화 - 회색 박스 (모든 카드 통일 위치) */}
                  {(prog.applyHow || prog.applyTel) && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
                      {prog.applyHow && (
                        <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                          <span className="font-bold text-brand-dark">📝 신청방법 </span>
                          <span className={lockTextSoft}>{prog.applyHow}</span>
                        </p>
                      )}
                      {prog.applyTel && (
                        <p className="mt-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/60">
                          ☎ 문의 <span className={`font-bold text-brand-orange ${lockTextSoft}`}>{prog.applyTel}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {/* 결과창에서 바로 신청 사이트로 가는 버튼 + 상세보기 버튼 (대표님 요청)
                      · 검정 버튼: 신청 사이트 새 탭으로 즉시 이동
                      · 주황 버튼: 상세(승인 소요기간·연락처) 페이지로 이동(Link) */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {prog.url && (
                      <a
                        href={previewLock ? undefined : prog.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex w-fit items-center gap-1.5 break-keep rounded-lg bg-brand-dark px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-90 ${lockClickSoft}`}
                      >
                        이 상품 신청하러 가기
                        <span>→</span>
                      </a>
                    )}
                    <Link
                      href={`/support/${prog.id}`}
                      className={`group inline-flex w-fit items-center gap-1.5 break-keep rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[11px] font-bold text-brand-orange transition hover:border-brand-orange/60 hover:bg-brand-orange/15 ${lockNoClick}`}
                    >
                      상세 · 소요기간 · 연락처
                      <span className="transition group-hover:translate-x-0.5">→</span>
                    </Link>
                  </div>
                </CollapsibleItem>
              );
            };
            return (
              <div className="mt-4 space-y-3">
                {/* 앞 3개 - 헤더는 항상 보이고 상세는 접힘(추천 1순위만 펼침) */}
                {visibleSupports.map((item, idx) => renderSupportCard(item, idx))}

                {/* 나머지 - 접어두고 '더 보기'로 여지만 남김 */}
                {restSupports.length > 0 && (
                  <>
                    {!showSupportPotential ? (
                      <button
                        type="button"
                        onClick={() => setShowSupportPotential(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange/[0.06] px-3 py-2.5 text-[12px] font-extrabold text-brand-orange transition hover:bg-brand-orange/15"
                      >
                        다른 제도 {restSupports.length}개 더 보기
                        <span>▼</span>
                      </button>
                    ) : (
                      <>
                        {restSupports.map((item, idx) => renderSupportCard(item, idx + 1))}
                        <button
                          type="button"
                          onClick={() => setShowSupportPotential(false)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-bold text-brand-dark/60 transition hover:bg-gray-100"
                        >
                          접기
                          <span>▲</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          </>
          )}

          {/* ── 챙기면 좋은 감면 혜택 (💎) - 통합(대표님 요청): 같은 아코디언 안에 인라인 ── */}
          <ExtraBenefitsSection previewLock={previewLock} onCount={setBenefitsCount} embedded />
        </AccordionCard>
      )}

      {/* ② 이용 가능한 정책금융상품 - 정부지원제도 바로 아래 (읽기 순서: 🏅→💳→📢)
             (대표님 요청: '정책금융기관'보다 '정책금융상품'이 더 정확한 표현) */}
      <AccordionCard
        emoji="💳"
        title="사업자 정책자금 대출"
        subtitle="낮은 금리로 받는 정부 자금이에요"
      >
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="break-keep text-xs leading-relaxed text-brand-dark/80">
            <b>갚아야 하는 자금</b>이지만 시중 대출보다 금리·조건이 유리해요. 자금이 필요할 때 활용하세요.
          </p>
        </div>
        <div className="mt-4 divide-y divide-gray-200">
          {creditMatches.map((m, i) => {
            const link = findInstitutionLink(m.institution);
            const isJaedan = m.institution.includes("재단");
            // 재단은 link가 없으므로 JAEDAN_PRODUCTS를 아코디언 상품으로 사용
            // ★ 대표님 조건(스마트공장·재도전·대환 등)에 해당하는 상품만 남기고 나머지는 숨김 ★
            const filteredProducts = filterProducts(isJaedan ? JAEDAN_PRODUCTS : link?.products, company);
            // ★ 승인 가능성 순으로 정렬해 안내 (대표님 요청)
            //   승인 가능성 높음(high) → 조건 충족 시 가능(mid) → 승인 가능성 낮음(low) 순.
            //   같은 등급 안에서는 원래 순서를 유지(안정 정렬).
            const approvalRank = (a?: "high" | "mid" | "low") =>
              a === "high" ? 0 : a === "mid" ? 1 : a === "low" ? 2 : 3;
            // ★ 중진공 한정: '직접대출' 상품을 맨 앞으로 (대표님 요청 "중진공은 직접대출 위주로")
            //   상품 nature가 배열이면 하나라도 '직접대출'이면 직접대출로 간주. 그 다음 승인율 순.
            //   ⚠️ 소진공은 상품마다 직접/대리가 갈려 직접대출 우선 정렬이 오히려 어색해져(대표님 지적)
            //      승인율순만 적용한다. 신보·기보·재단도 대리대출 성격이라 승인율만 유지.
            const isDirectFirstInst =
              m.institution.includes("중소벤처기업진흥공단");
            const directFirstRank = (p: InstitutionProduct) => {
              const natures = p.nature
                ? (Array.isArray(p.nature) ? p.nature : [p.nature])
                : [loanNatureOf(m.institution)];
              return natures.includes("직접대출") ? 0 : 1;
            };
            const products = filteredProducts
              ? [...filteredProducts].sort((x, y) => {
                  if (isDirectFirstInst) {
                    const d = directFirstRank(x) - directFirstRank(y);
                    if (d !== 0) return d; // 1차: 직접대출 먼저
                  }
                  return approvalRank(x.approval) - approvalRank(y.approval); // 2차(또는 기본): 승인율
                })
              : filteredProducts;
            // '승인 가능성 높음 · 먼저 신청 추천' 강조 배지는 표시 순서와 무관하게
            //  승인율(approval)이 가장 높은 상품에 붙인다. (소진공은 직접대출을 위로 올려
            //  표시하지만, 강조는 여전히 승인율 최상위 상품 기준 - 문구 정확도 유지)
            const topProductIdx =
              products && products.length > 0
                ? products.reduce(
                    (best, p, idx) =>
                      approvalRank(p.approval) < approvalRank(products[best].approval) ? idx : best,
                    0
                  )
                : -1;
            return (
              <div
                key={i}
                className="border-t border-brand-dark/10 py-3 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className={`text-[14px] font-extrabold text-brand-dark ${lockTextSoft}`}>{m.institution}</span>
                  {m.loan_type && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${natureBadgeCls(m.loan_type)}`}
                    >
                      {m.loan_type}
                    </span>
                  )}
                  {/* 이미 이용 중인 기관 표시 (중복배제 참고 - 대표님 요청) */}
                  {m.alreadyUsing && (
                    <span className="shrink-0 rounded-full bg-brand-dark/10 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                      현재 이용 중
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-line break-keep text-[12px] leading-relaxed text-brand-gray">{m.criteria}</p>

                {/* ★ 신보·기보·재단 = 대리대출(보증) 안내 (대표님 요청) ★
                     "여긴 공단이 직접 주는 게 아니라 보증서 받아 은행에서 대출받는 곳"임을 초보 고객도 바로 알게. */}
                {(m.institution.includes("신용보증기금") ||
                  m.institution.includes("기술보증기금") ||
                  m.institution.includes("재단")) && (
                  <p className="mt-1.5 break-keep rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-brand-dark/80">
                    <b>ℹ️ 대리대출</b> · 이 상품은 <b>보증서를 발급</b>해 드리면 그 보증서로 <b>은행에서 대출</b>이 실행돼요.
                  </p>
                )}

                {/* ★ 직접대출 기관(중진공·소진공) 안내 (대표님 요청) ★
                     "여긴 은행 안 거치고 공단이 바로 대출해 주는 곳"임을 초보 고객도 바로 알게. */}
                {(m.institution.includes("중소벤처기업진흥공단") ||
                  m.institution.includes("소상공인시장진흥공단") ||
                  m.institution.includes("중진공") ||
                  m.institution.includes("소진공")) && (
                  <p className="mt-1.5 break-keep rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-brand-dark/80">
                    <b>ℹ️ 직접대출</b> · 이 상품은 <b>은행을 거치지 않고</b> 기관에서 <b>대출이 바로 실행</b>돼요.
                  </p>
                )}

                {/* 신보·기보 둘 다 자격일 때 → 중복 신청 불가 안내 (대표님 요청) */}
                {m.exclusiveNote && (
                  <p className="mt-2 break-keep rounded-lg border border-brand-red/30 bg-brand-red/5 px-2.5 py-1.5 text-[11px] font-bold text-brand-red">
                    {m.exclusiveNote}
                  </p>
                )}

                {/* ★ 기관 내 여러 상품 아코디언 - 클릭 시 펼쳐서 상품별로 신청 (대표님 요청) ★ */}
                {products && products.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleProducts(i)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-2 text-left transition hover:bg-brand-orange/20 ${lockNoClick}`}
                    >
                      <span className="break-keep text-[12px] font-extrabold text-brand-orange">
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
                    {openProducts[i] && (() => {
                      // ★ 승인 잘 되는 상품 위주(대표님 요청): 상위 2개만 먼저 보이고 나머지는 '더 보기'로 접는다. ★
                      //   ⚠️ products는 이미 (직접대출 우선 →) 승인율순으로 정렬됨. 개수·순서·카운트 불변.
                      const showAll = Boolean(showAllProducts[i]);
                      const visibleProducts = showAll
                        ? products
                        : products.slice(0, PRODUCTS_INITIAL_COUNT);
                      const hiddenCount = products.length - visibleProducts.length;
                      return (
                      <div className="mt-2 space-y-2">
                        {visibleProducts.map((prod, pi) => {
                          // topProductIdx는 전체 products 기준 인덱스 → 잘린 배열에서도 상품 참조로 정확 비교
                          const isTop = products[topProductIdx] === prod;
                          return (
                          <CollapsibleItem
                            key={pi}
                            className={`rounded-xl p-2.5 sm:p-3 ${
                              isTop
                                ? "border border-brand-green/70 bg-brand-green/5"
                                : "border border-gray-200 bg-gray-50"
                            }`}
                            header={
                              <>
                                {/* ★ 이 기관에서 가장 먼저 신청하면 좋은 상품 - 체크 포인트 (대표님 요청) */}
                                {isTop && (
                                  <span className={`mb-1.5 inline-flex items-center gap-1 break-keep rounded-full bg-brand-green px-2.5 py-0.5 text-[10px] font-extrabold text-white ${lockTextSoft}`}>
                                    승인 가능성 높음 · 먼저 신청 추천
                                  </span>
                                )}
                                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                  <span className={`break-keep text-[14px] font-extrabold text-brand-dark ${lockTextSoft}`}>
                                    {prod.name}
                                  </span>
                                  {/* ★ 상품 성격 배지 (대표님 기준: 직접대출/대리대출) - 자금이 어떻게 나오는지 한눈에.
                                       상품에 nature가 지정돼 있으면 상품 단위로(소진공은 상품마다 갈림),
                                       없으면 기관 기본값(loanNatureOf)으로 판별. 둘 다 가능하면 배지 2개. */}
                                  {(() => {
                                    const natures = prod.nature
                                      ? (Array.isArray(prod.nature) ? prod.nature : [prod.nature])
                                      : [loanNatureOf(m.institution)];
                                    return natures.map((nature) => (
                                      <span
                                        key={nature}
                                        className={`shrink-0 break-keep rounded-full px-2 py-0.5 text-[10px] font-bold ${natureBadgeCls(nature)}`}
                                      >
                                        {nature}
                                      </span>
                                    ));
                                  })()}
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
                                </span>
                              </>
                            }
                          >
                            {prod.desc && (
                              <p className="mt-1 whitespace-pre-line break-keep text-[12px] leading-relaxed text-brand-gray">
                                {prod.desc}
                              </p>
                            )}
                            {prod.approvalNote && (
                              <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-semibold leading-relaxed text-brand-dark/70">
                                {prod.approvalNote}
                              </p>
                            )}
                            {prod.hookNote && (
                              <p className="mt-1.5 whitespace-pre-line break-keep rounded-lg bg-brand-yellow/10 px-2.5 py-2 text-[11px] leading-relaxed text-brand-dark/70">
                                <span className="font-extrabold text-brand-dark/80">💡 </span>{prod.hookNote}
                              </p>
                            )}
                            {prod.applyUrl && (
                              <a
                                href={previewLock ? undefined : prod.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-2.5 inline-block rounded-lg bg-brand-dark px-3 py-2 text-[11px] font-bold text-white hover:opacity-90 ${lockClickSoft}`}
                              >
                                이 상품 신청하러 가기 →
                              </a>
                            )}
                            {/* ★ 졸업후보 기준 '작은 아코디언'(대표님 요청): 졸업후보기업자금 상품 카드 아래에만.
                                 팝업이 아닌 인라인 접이식 표. 순수 참고용(matching.ts 판정과 무관). */}
                            {prod.name.includes("졸업후보기업자금") && (() => {
                              const gradKey = `${i}-${pi}`;
                              const gradOpen = Boolean(openGradCriteria[gradKey]);
                              return (
                                <div className="mt-2.5 rounded-lg border border-gray-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => toggleGradCriteria(gradKey)}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                                    aria-expanded={gradOpen}
                                  >
                                    <span className="break-keep text-[12px] font-bold text-brand-dark">
                                      📋 업종별 졸업후보기업 기준 (매출·상시근로자)
                                    </span>
                                    <svg
                                      className={`h-4 w-4 shrink-0 text-brand-gray transition-transform ${gradOpen ? "rotate-180" : ""}`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {gradOpen && (
                                    <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                                      <p className="mb-2 break-keep text-[11px] leading-relaxed text-brand-gray">
                                        아래 업종별 <b>평균매출액</b>과 <b>상시근로자 수</b> 기준을 넘어서는
                                        성장 소상공인이 '졸업후보기업' 대상입니다.
                                      </p>
                                      <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-md border border-gray-100">
                                        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
                                          <thead className="sticky top-0 bg-gray-50 text-brand-dark/70">
                                            <tr>
                                              <th className="whitespace-nowrap px-2 py-1.5 font-bold">코드</th>
                                              <th className="whitespace-nowrap px-2 py-1.5 font-bold">중분류(업종)</th>
                                              <th className="whitespace-nowrap px-2 py-1.5 font-bold">평균매출액</th>
                                              <th className="whitespace-nowrap px-2 py-1.5 font-bold">상시근로자</th>
                                            </tr>
                                          </thead>
                                          <tbody className="text-brand-dark/80">
                                            {GRADUATION_CRITERIA.map((row) => (
                                              <tr key={row.code} className="border-t border-gray-100 align-top">
                                                <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-brand-gray">{row.code}</td>
                                                <td className="break-keep px-2 py-1.5">{row.industry}</td>
                                                <td className="whitespace-nowrap px-2 py-1.5">{row.revenue}</td>
                                                <td className="whitespace-nowrap px-2 py-1.5">{row.employees}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      <p className="mt-2 break-keep text-[10px] leading-relaxed text-brand-gray">
                                        ※ {GRADUATION_EXCLUDED_NOTE}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </CollapsibleItem>
                          );
                        })}
                        {/* ★ 상위 2개 외 나머지 상품은 '더 보기'로 접기 (대표님 요청) - 접혀도 카운트엔 전부 포함 ★ */}
                        {products.length > PRODUCTS_INITIAL_COUNT &&
                          (!showAll ? (
                            <button
                              type="button"
                              onClick={() => toggleAllProducts(i)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange/[0.06] px-3 py-2.5 text-[12px] font-extrabold text-brand-orange transition hover:bg-brand-orange/15"
                            >
                              다른 상품 {hiddenCount}개 더 보기 <span aria-hidden>▼</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleAllProducts(i)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-brand-dark/60 transition hover:bg-gray-100"
                            >
                              상품 접기 <span aria-hidden>▲</span>
                            </button>
                          ))}
                      </div>
                      );
                    })()}
                  </div>
                )}

                {/* 신보·기보·소진공·중진공 → 신청 매뉴얼 + 사이트 바로가기 (재단은 아래 지역 드롭다운으로 안내) */}
                {link && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.manualUrl && (
                        <a
                          href={previewLock ? undefined : link.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClickSoft}`}
                        >
                          📄 신청 매뉴얼
                        </a>
                      )}
                      <a
                        href={previewLock ? undefined : link.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-block rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,140,0,0.4)] hover:opacity-90 ${lockClickSoft}`}
                      >
                        🔗 {link.siteLabel}
                      </a>
                      {link.pdfUrl && (
                        <a
                          href={previewLock ? undefined : link.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClickSoft}`}
                        >
                          📑 {link.pdfLabel}
                        </a>
                      )}
                    </div>
                    {link.tel && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                          href={previewLock ? undefined : `tel:${link.tel.replace(/-/g, "")}`}
                          className={`inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 ${lockClickSoft}`}
                        >
                          📞 {link.tel}
                        </a>
                        {link.telNote && (
                          <span className={`break-keep text-[11px] leading-relaxed text-brand-dark/45 ${lockTextSoft}`}>
                            {link.telNote}
                          </span>
                        )}
                      </div>
                    )}
                    {link.note && (
                      <p className={`break-keep text-xs leading-relaxed text-brand-dark/50 ${lockTextSoft}`}>
                        {link.note}
                      </p>
                    )}
                  </div>
                )}
                {isJaedan && (
                  <div className="mt-2 flex flex-col gap-2">
                    {jaedanLinks.map((j) => (
                      <div key={j.url} className="flex flex-wrap items-center gap-2">
                        {j.manualUrl && (
                          <a
                            href={previewLock ? undefined : j.manualUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClickSoft}`}
                          >
                            📄 신청 매뉴얼
                          </a>
                        )}
                        <a
                          href={previewLock ? undefined : j.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-block rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,140,0,0.4)] hover:opacity-90 ${lockClickSoft}`}
                        >
                          🔗 {j.label}
                        </a>
                        {j.productUrl && (
                          <a
                            href={previewLock ? undefined : j.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block rounded-lg border border-brand-orange/70 bg-brand-orange/[0.07] px-3 py-1.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 ${lockClickSoft}`}
                          >
                            📑 {j.productLabel}
                          </a>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <a
                        href={previewLock ? undefined : `tel:${JAEDAN_CALL_CENTER.tel.replace(/-/g, "")}`}
                        className={`inline-flex items-center gap-1 rounded-lg border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 ${lockClickSoft}`}
                      >
                        📞 {JAEDAN_CALL_CENTER.tel}
                      </a>
                      <span className="break-keep text-[11px] leading-relaxed text-brand-dark/45">
                        {JAEDAN_CALL_CENTER.telNote}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 💡/📊 안내 박스: 앞 상품목록과의 상단 여백을 한 칸 더 축소(mt-2→mt-1, 대표님 요청) */}
        <div className="mt-1 space-y-2">
          <p className="break-keep rounded-lg bg-brand-yellow/10 px-3 py-2 text-xs leading-relaxed text-brand-dark">
            💡 대출은 보통 <b>직접대출 1곳(공단이 직접 실행) + 대리대출 1곳(보증서를 받아 은행에서 실행)</b>, 즉 <b>총 2곳</b>에서 동시에 진행할 수 있습니다.
          </p>
          {/* 신용점수 안내 - 알맹이라 결제 전 잠금 */}
          <p
            className={`break-keep rounded-lg px-3 py-2 text-xs leading-relaxed ${
              creditAdvice.tier === "good"
                ? "bg-green-50 text-brand-green"
                : creditAdvice.tier === "caution"
                ? "bg-brand-yellow/20 text-brand-dark"
                : "bg-red-50 text-brand-red"
            } ${lockTextSoft}`}
          >
            📊 {creditAdvice.message}
          </p>
        </div>

        {/* 신청 → 실행 진행 절차·소요기간 안내 - 같은 맥락이라 정책금융기관 박스 '안'으로 통합 (대표님 요청, 반투명 박스로 구획) */}
        {(hasDae || hasDirect) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-base font-extrabold text-brand-dark">
              🗓️ 신청부터 정부지원사업 실행까지 예상 소요기간
            </p>
            {hasDae && (
              <div className="mt-3">
                <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  대리대출 (보증서 → 재단/신보/기보/무보)
                </span>
                <p className={`mt-1.5 break-keep text-xs leading-relaxed text-brand-dark ${lockText}`}>
                  신청 → 심사 → <b>현장 실사</b> → 승인 → 약정 → 은행 자금 실행
                </p>
                <p className={`mt-0.5 break-keep text-xs leading-relaxed ${lockText}`}>
                  <b className="text-brand-orange">통상 3~6주 소요</b>
                </p>
              </div>
            )}
            {hasDirect && (
              <div className="mt-3">
                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  직접대출 (공단이 직접 실행 → 소진공/중진공)
                </span>
                <p className={`mt-1.5 break-keep text-xs leading-relaxed text-brand-dark ${lockText}`}>
                  신청 → 심사 → <b>현장 실사</b> → 승인 → 약정 → 기관 자금 실행
                </p>
                <p className={`mt-0.5 break-keep text-xs leading-relaxed ${lockText}`}>
                  <b className="text-brand-orange">통상 약 6~8주 소요</b>
                </p>
              </div>
            )}
            <p className={`mt-3 break-keep text-[11px] leading-relaxed text-brand-dark/55 ${lockText}`}>
              ※ 소액건은 비대면(모바일) 실사로 진행되는 경우가 많고,
              직접대출 기관과 신용보증기금, 기술보증기금처럼 규모가 큰 건은 방문 실사로 진행됩니다.
            </p>
          </div>
        )}

        {/* 기관별 상품 한눈에 보기 - 같은 맥락(정책금융기관 상품)이라 이 박스 '안' 하단으로 통합 (대표님 요청, 반투명 박스로 구획) */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-base font-extrabold text-brand-dark">
            📊 기관별 상품 한눈에 보기
          </p>
          <p className="mt-0.5 break-keep text-xs leading-relaxed text-brand-dark/60">
            기관별 상품을 한눈에 볼 수 있어요
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
        {/* ★ 성격별 분류(대표님 요청): 크롤링 실공고 중 '융자' 성격 공고(금융/정책자금/대출·보증 등)를
            이 정책금융 아코디언 안에 인라인으로. 결과 대시보드(autoRun)에서만, previewLock 제외. */}
        {autoRun && !previewLock && (
          <RelatedAnnouncements profile={relatedProfile} bucket="loan" variant="inline" />
        )}
      </AccordionCard>

      {/* ③ (통합됨) 감면 혜택은 🏅 '신청·감면 혜택 한번에 챙기기' 아코디언 안으로 이동 (대표님 요청) */}

      {/* ④ 그 외 놓치기 쉬운 지원사업(실공고 '그 외' 성격) - 감면 혜택 바로 아래
             창업(🌱)·융자(💳)로 분류되지 않은 실공고(수출·기술·경영·내수·인력·행사·판로 등).
             AI 해설 없이 공고명·신청기간·기관만 보여주고 원문으로 링크.
             ★ 요약 배너의 '그 외 정부지원사업' 숫자는 이 etc 버킷 갯수(onCount)만 반영. */}
      {autoRun && !previewLock && (
        <RelatedAnnouncements profile={relatedProfile} bucket="etc" onCount={setAnnouncementsCount} />
      )}

      {/* (기관별 상품 한눈에 보기는 '이용 가능한 정책금융기관' 아코디언 안 하단으로 통합됨 - 대표님 요청) */}

      {/* ⑤ 전문가 도움(유료 자문) 아코디언 - 아코디언 목록 맨 아래에 동일 디자인으로(대표님 요청).
             지원사업 아코디언들을 쭉 보다가 마지막에 자연스럽게 열어보게 유도.
             내용은 마이페이지 '전문가 도움' 표와 동일한 6개 서비스. */}
      {/* 🤝 전문가 자문 아코디언은 삭제하고, 하단 '더 궁금한 점이 있으신가요?' CTA
             안내 문구에 IR·사업계획서 등 전문가 도움 문의를 자연스럽게 녹임 (대표님 요청). */}

      {/* (예비창업자 전용 지원사업 아코디언은 최상단으로 이동 - 대표님 요청.
             예비창업 체크한 사람만 보이므로 맨 위(정부지원제도 위)에 노출.) */}

      {/* 대표님들이 알아두면 좋은 정부 사이트 모음으로 이동 - 아코디언과 톤 통일(둥근 모서리·부드러운 그림자) */}
      <a
        href={previewLock ? undefined : "/sites"}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark bg-brand-dark px-5 py-2.5 shadow-card transition hover:opacity-90 ${previewLock ? "pointer-events-none" : ""}`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 break-keep text-[16px] font-extrabold leading-snug text-white">
            🔖 알아두면 좋은 정부 사이트
          </span>
          <span className="mt-0.5 block break-keep text-[12px] leading-relaxed text-white/60">
            정부 기관 공식 사이트예요
          </span>
        </span>
        <span className={`shrink-0 rounded-full bg-brand-yellow px-4 py-2 text-sm font-extrabold text-brand-dark ${lockClick}`}>
          사이트 바로가기
        </span>
      </a>
    </div>
  );
}
