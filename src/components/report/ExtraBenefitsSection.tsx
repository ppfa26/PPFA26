"use client";

import { useEffect, useState } from "react";
import benefitsData from "@/data/benefits-extra.json";
import { loadDiagnosisRaw } from "@/lib/diagnosisStore";
import AccordionCard from "@/components/report/AccordionCard";

// ── Props 구조 (지시사항 명세 그대로) ─────────────────────────────
//  값이 없으면 undefined 또는 0으로 전달 → 내부에서 "정보 부족" 처리
export type ExtraBenefitsUserInput = {
  businessType?: string;
  industry?: string;
  yearsInBusiness?: number;
  annualRevenue?: number;
  workerCount?: number;
  region?: string;
  representativeAge?: number;
  // 추가 신호 (조건별 차등 추천용)
  hasRnd?: boolean; // 연구소·연구전담부서·특허 등 R&D 신호
  isInnovation?: boolean; // 혁신성장 분야 선택
  hiredRecently?: boolean; // 직원이 있음(=고용세액공제 가능성)
};

type Props = {
  // userInput 을 직접 넘길 수도 있고(명세), 안 넘기면 컴포넌트가
  // sessionStorage("mpp_diagnosis")에서 스스로 읽어 매핑한다.
  userInput?: ExtraBenefitsUserInput;
  // ★ 미리보기 잠금 (대표님 요청) — 제목·목차는 보이고, 알맹이(신청방법·서류·소요기간·링크)만 흐리게 ★
  previewLock?: boolean;
};

// ── 데이터 타입 ─────────────────────────────────────────────────
type ExtraBenefit = {
  id: string;
  title: string;
  icon: string;
  description: string;
  applyUrl: string;
  applyName: string;
  requiredDocs: string[];
  processingTime: string;
  deadline: string;
  warning?: string;
  benefit?: string; // 이 혜택을 챙기면 무엇을 얻는지 (대표님 요청)
  applyHow?: string; // 신청 방법 (대표님 요청)
  duration?: string; // 승인·반영 소요기간 (대표님 요청)
  excludedIndustries?: string[];
  products?: { name: string; maxAmount: number }[];
};

// ── 진단 프로필(한글 옵션) → 숫자 Props 매핑 ────────────────────
//  ※ 기존 페이지 코드를 건드리지 않기 위해, 세션의 한글 값을
//    이 컴포넌트가 직접 숫자 Props로 변환한다. (어댑터 역할)
function mapProfileToUserInput(profile: Record<string, unknown>): ExtraBenefitsUserInput {
  const get = (k: string): string | undefined => {
    const v = profile[k];
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0] as string;
    return undefined;
  };

  // 연매출(한글) → 대략 숫자(원). ★ 현행 진단 구간(2026 개정)에 맞춤 ★
  //   현재 옵션: [매출 없음 / 2억 미만 / 10억 미만 / 10억 이상 / 기타]
  //   (과거 "1억 미만/5억 미만/5억 이상"도 하위호환 유지)
  const revenueStr = (get("revenue") || "").replace(/\s/g, "");
  let annualRevenue: number | undefined;
  if (revenueStr.includes("매출없음")) annualRevenue = 0;
  else if (revenueStr.includes("2억미만")) annualRevenue = 100_000_000;
  else if (revenueStr.includes("10억미만")) annualRevenue = 500_000_000;
  else if (revenueStr.includes("10억이상")) annualRevenue = 1_500_000_000;
  // 과거 라벨 하위호환
  else if (revenueStr.includes("1억미만")) annualRevenue = 50_000_000;
  else if (revenueStr.includes("5억미만")) annualRevenue = 300_000_000;
  else if (revenueStr.includes("5억이상")) annualRevenue = 600_000_000;
  // "기타"는 매핑하지 않음 → undefined (매출 조건 보류)

  // 업력(한글) → 대략 연차(년)
  const yearsStr = (get("years") || "").replace(/\s/g, "");
  let yearsInBusiness: number | undefined;
  if (yearsStr.includes("창업예정")) yearsInBusiness = 0;
  else if (yearsStr.includes("1년미만")) yearsInBusiness = 0;
  else if (yearsStr.includes("3년미만")) yearsInBusiness = 2;
  else if (yearsStr.includes("7년미만")) yearsInBusiness = 5;
  else if (yearsStr.includes("7년이상")) yearsInBusiness = 8;

  // 대표자 연령(한글) → 대략 나이 (신·구 옵션 모두 인정: "만 39세 이하 (청년)" / "만 40세 이상")
  const ageStr = get("age");
  let representativeAge: number | undefined;
  if (ageStr?.includes("39세 이하") || ageStr?.includes("청년")) representativeAge = 30;
  else if (ageStr?.includes("40세 이상") || ageStr?.includes("39세 이상")) representativeAge = 45;

  const industriesRaw = profile["industries"];
  const industry = Array.isArray(industriesRaw)
    ? (industriesRaw as string[]).join(", ")
    : get("industries");

  // ★ 직원수(한글) → 대략 인원 (2026 옵션: 0명/5명 이하/5명 이상/50명 이상/300명 이상/기타) ★
  const empStr = (get("employees") || "").replace(/\s/g, "");
  let workerCount: number | undefined;
  if (empStr.includes("300명이상")) workerCount = 300;
  else if (empStr.includes("50명이상")) workerCount = 50;
  else if (empStr.includes("5명이상")) workerCount = 7;
  else if (empStr.includes("5명이하")) workerCount = 3;
  else if (empStr === "0명") workerCount = 0;

  // 인증·혁신 신호 (R&D 세액공제 등 조건별 차등용)
  const certsRaw = profile["certifications"];
  const certs = Array.isArray(certsRaw) ? (certsRaw as string[]) : [];
  const hasRnd = certs.some((c) => c.includes("연구소") || c.includes("특허"));
  const innovationRaw = profile["innovation"];
  const isInnovation = Array.isArray(innovationRaw) && innovationRaw.length > 0;

  return {
    businessType: get("businessType"),
    industry,
    yearsInBusiness,
    annualRevenue,
    workerCount,
    region: get("region"),
    representativeAge,
    hasRnd,
    isInnovation,
    hiredRecently: typeof workerCount === "number" && workerCount > 0,
  };
}

// ── 금액 포맷 ───────────────────────────────────────────────────
function formatKRW(won: number): string {
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`;
  }
  if (won >= 10_000) {
    const man = Math.round(won / 10_000);
    return `${man.toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}

// ── 자격 판정 결과 타입 ─────────────────────────────────────────
//  status: "yes"       → 지금 바로 신청 대상 (초록 ✅ 신청 가능)
//          "condition" → 조건 충족 시 신청 가능 (주황 🟡)  ← 대표님 방침
//          "no"        → 대상 아님 (노출하지 않음 = 상위 6개에서 밀려남)
//  score : 가능성 점수 (높을수록 위로 정렬) — 대표님 방침 "가능성 높은 것 위로"
type Verdict = {
  status: "yes" | "condition" | "no";
  score: number; // 0~100 (정렬용)
  savingText?: string; // 예상 절감·수령액 (큰 글씨)
  note?: string; // 보조 설명 (조건·사유)
  conditionText?: string; // "조건 충족 시 신청 가능" 상세 안내
};

// 수도권 판정 (서울/경기/인천)
function isMetro(region?: string): boolean {
  if (!region) return false;
  return ["서울", "경기", "인천"].some((r) => region.includes(r));
}

// 업종 문자열 헬퍼
function hasInd(u: ExtraBenefitsUserInput, ...keys: string[]): boolean {
  const s = u.industry ?? "";
  return keys.some((k) => s.includes(k));
}
function isExcluded(b: ExtraBenefit, u: ExtraBenefitsUserInput): boolean {
  return (b.excludedIndustries ?? []).some((ex) => (u.industry ?? "").includes(ex));
}

// ★ 조건별 차등 판정 — 대표님 방침 ★
//  · 확실히 되면 status:"yes" (초록 · 높은 점수)
//  · 조건 맞으면 되면 status:"condition" (주황 · 중간 점수) → "조건 충족 시 신청 가능"
//  · 명백히 아니면 status:"no" (노출 제외 → 상위 6개에서 밀림)
function judge(b: ExtraBenefit, u: ExtraBenefitsUserInput): Verdict {
  const rev = u.annualRevenue;
  const years = u.yearsInBusiness;
  const age = u.representativeAge;
  const emp = u.workerCount;
  const metro = isMetro(u.region);

  switch (b.id) {
    // ── 카드 수수료 우대율 (거의 전 사업자 · 매출 클수록 절감 큼) ──
    case "cardFee": {
      if (isExcluded(b, u)) return { status: "no", score: 0, note: "우대 제외 업종" };
      if (rev !== undefined && rev > 3_000_000_000)
        return { status: "no", score: 0, note: "연매출 30억 초과" };
      let rate = 0.003;
      if (rev !== undefined) {
        if (rev <= 300_000_000) rate = 0.003;
        else if (rev <= 500_000_000) rate = 0.004;
        else if (rev <= 1_000_000_000) rate = 0.005;
        else rate = 0.006;
      }
      const saving = (rev ?? 0) * rate;
      return {
        status: "yes",
        score: 90, // 사실상 전 사업자 대상 → 최상위
        savingText: !rev ? "매출 발생 시 자동 절감" : `연 약 ${formatKRW(saving)} 절감`,
      };
    }

    // ── 창업중소기업 세액감면 (창업 5년 이내) ──
    case "startupTaxCut": {
      if (isExcluded(b, u)) return { status: "no", score: 0, note: "감면 제외 업종" };
      if (years !== undefined && years > 5)
        return { status: "no", score: 0, note: "창업 5년 초과 (→ 중소기업 특별세액감면 대상)" };
      // 청년(34세 이하)은 청년창업감면이 더 유리 → 이건 비청년/일반 대상으로 점수 조정
      const rate = metro ? 50 : 100;
      if (years === undefined)
        return {
          status: "condition",
          score: 55,
          savingText: `소득세·법인세 최대 ${rate}% 감면`,
          conditionText: "창업 후 5년 이내 사업자라면 신청 가능합니다.",
        };
      return {
        status: "yes",
        score: 82,
        savingText: `소득세·법인세 ${rate}% 감면 (${metro ? "수도권" : "수도권 외"})`,
        note: "창업 후 5년간 적용 · 신고 시 자동",
      };
    }

    // ── 노란우산공제 (개인사업자) ──
    case "noransanggong": {
      const bt = u.businessType;
      if (bt === "법인사업자")
        return { status: "no", score: 0, note: "개인사업자 대상 (법인 제외)" };
      if (bt === "개인사업자")
        return { status: "yes", score: 80, savingText: `연 약 ${formatKRW(1_200_000)} 절세` };
      return {
        status: "condition",
        score: 50,
        savingText: `연 약 ${formatKRW(1_200_000)} 절세`,
        conditionText: "개인사업자(대표)라면 가입 즉시 소득공제 대상입니다.",
      };
    }

    // ── 청년창업중소기업 세액감면 (만 34세 이하 · 창업 5년 이내) ──
    case "youngStartupTaxCut": {
      if (isExcluded(b, u)) return { status: "no", score: 0, note: "감면 제외 업종" };
      if (age !== undefined && age > 34)
        return { status: "no", score: 0, note: "만 34세 이하 청년 대상" };
      if (years !== undefined && years > 5)
        return { status: "no", score: 0, note: "창업 5년 초과" };
      const rate = metro ? 50 : 100;
      if (age === undefined || years === undefined)
        return {
          status: "condition",
          score: 58,
          savingText: `소득세·법인세 ${rate}% 감면 대상`,
          conditionText: "대표자가 만 34세 이하이고 창업 5년 이내면 신청 가능합니다.",
        };
      return {
        status: "yes",
        score: 88, // 청년+창업이면 감면율 최고 → 상위
        savingText: `소득세·법인세 ${rate}% 감면 (${metro ? "수도권" : "수도권 외"})`,
        note: "청년 창업 · 창업 후 5년간 적용",
      };
    }

    // ── 중소기업 특별세액감면 (창업 5년 지난 상시 감면) ──
    case "smallBizSpecialTaxCut": {
      if (isExcluded(b, u)) return { status: "no", score: 0, note: "감면 제외 업종" };
      // 감면 업종(제조·도소매·음식 등)에 해당하면 확실, 그 외는 조건부
      const coreInd = hasInd(u, "제조", "도소매", "도매", "소매", "음식", "건설", "운수", "출판", "수출");
      if (years !== undefined && years <= 5)
        return {
          status: "condition",
          score: 45,
          savingText: "소득세·법인세 5~30% 감면",
          conditionText: "창업감면(최대 100%) 기간(5년)이 끝난 뒤 이어서 받는 감면입니다.",
        };
      if (coreInd)
        return {
          status: "yes",
          score: 78,
          savingText: "소득세·법인세 5~30% 감면",
          note: "업종·지역·규모별 상시 감면 · 매년 신고 시 적용",
        };
      return {
        status: "condition",
        score: 48,
        savingText: "소득세·법인세 5~30% 감면",
        conditionText: "제조·도소매·음식 등 감면 대상 업종이면 매년 받을 수 있습니다.",
      };
    }

    // ── 통합고용세액공제 (직원 증가 시) ──
    case "integratedEmploymentTaxCredit": {
      if (emp !== undefined && emp > 0)
        return {
          status: "yes",
          score: 76,
          savingText: "1인당 최대 1,550만원 · 3년 세액공제",
          note: "직원을 고용 중이라 채용 순증분만큼 공제 대상",
        };
      return {
        status: "condition",
        score: 40,
        savingText: "1인당 최대 1,550만원 · 3년 세액공제",
        conditionText: "직원을 채용(4대보험 가입)해 인원이 늘면 신청 가능합니다.",
      };
    }

    // ── 두루누리 사회보험료 지원 (10인 미만) ──
    case "duruNuri": {
      if (emp !== undefined && emp > 0 && emp < 10)
        return {
          status: "yes",
          score: 74,
          savingText: "고용·국민연금 보험료 최대 80% 지원",
          note: "근로자 10명 미만 사업장 · 월보수 270만원 미만 직원 대상",
        };
      if (emp !== undefined && emp >= 10)
        return { status: "no", score: 0, note: "근로자 10명 이상 (대상 아님)" };
      return {
        status: "condition",
        score: 42,
        savingText: "고용·국민연금 보험료 최대 80% 지원",
        conditionText: "10인 미만 사업장에서 월보수 270만원 미만 직원을 채용하면 신청 가능합니다.",
      };
    }

    // ── 착한 임대인 세액공제 (임차 소상공인) ──
    case "greenTaxCut": {
      // 매출 규모가 작을수록(소상공인) 임차 가능성 ↑ → 조건부 위주
      return {
        status: "condition",
        score: 30,
        savingText: "임대료 인하액의 최대 70% 세액공제(임대인)",
        conditionText: "상가를 임차 중이고 임대료 인하를 협의하면 활용할 수 있습니다.",
      };
    }

    // ── R&D 세액공제 (기술·연구 기업) ──
    case "rndTaxCredit": {
      const techInd = hasInd(u, "제조", "정보", "서비스", "지식", "IT", "소프트");
      if (u.hasRnd || u.isInnovation)
        return {
          status: "yes",
          score: 72,
          savingText: "연구개발비 최대 25~40% 세액공제",
          note: "연구소·특허·혁신성장 분야 신호 확인 → 대상 가능성 높음",
        };
      if (techInd)
        return {
          status: "condition",
          score: 38,
          savingText: "연구개발비 최대 25~40% 세액공제",
          conditionText: "연구개발비 지출·연구전담부서 인정이 있으면 신청 가능합니다.",
        };
      return { status: "no", score: 0, note: "R&D 지출 기업 대상" };
    }

    // ── 간이과세 (연매출 1.04억 미만 개인) ──
    case "simplifiedVat": {
      if (isExcluded(b, u)) return { status: "no", score: 0, note: "간이과세 배제 업종" };
      if (u.businessType === "법인사업자")
        return { status: "no", score: 0, note: "개인사업자 대상 (법인 제외)" };
      if (rev !== undefined && rev >= 104_000_000)
        return { status: "no", score: 0, note: "연매출 1억400만원 이상 (일반과세)" };
      if (rev !== undefined && rev < 104_000_000)
        return {
          status: "yes",
          score: 60,
          savingText: "부가세 낮은 세율(1.5~4%) · 4,800만원 미만 납부 면제",
          note: "연매출 1억400만원 미만 개인사업자",
        };
      return {
        status: "condition",
        score: 28,
        savingText: "부가세 낮은 세율(1.5~4%) 적용",
        conditionText: "연매출 1억400만원 미만 개인사업자면 간이과세 전환 가능합니다.",
      };
    }

    default:
      return { status: "no", score: 0, note: "판정 불가" };
  }
}

export default function ExtraBenefitsSection({ userInput, previewLock = false }: Props) {
  const [input, setInput] = useState<ExtraBenefitsUserInput | null>(
    userInput ?? null
  );
  // 미리보기 잠금 클래스 — 제목은 그대로, 알맹이만 흐리게+클릭차단
  // 이 카드(🎁 추가 혜택)는 텍스트가 밀집돼 모자이크가 과해 보여 약한 블러 적용 (대표님 요청)
  const lockText = previewLock ? "preview-lock-text-soft" : "";
  const lockClick = previewLock ? "preview-lock-click-soft" : "";

  // userInput props 가 없을 때만 세션에서 읽어 매핑
  useEffect(() => {
    if (userInput) {
      setInput(userInput);
      return;
    }
    try {
      const raw = loadDiagnosisRaw();
      const profile = raw ? JSON.parse(raw) : {};
      setInput(mapProfileToUserInput(profile));
    } catch {
      setInput({});
    }
  }, [userInput]);

  const u = input ?? {};
  const benefits = benefitsData.extraBenefits as ExtraBenefit[];

  // ★ 조건별 차등 + 가능성 높은 순 정렬 + 상위 6개 (대표님 방침) ★
  //   1) 각 혜택을 판정(judge)해 점수 매김
  //   2) status "no"(명백히 대상 아님)는 제외
  //   3) 점수 내림차순 정렬 → 가능성 높은 게 위로
  //   4) 상위 6개만 노출 (너무 많으면 다 안 하니까)
  const judged = benefits
    .map((b) => ({ b, v: judge(b, u) }))
    .filter(({ v }) => v.status !== "no")
    .sort((a, z) => z.v.score - a.v.score)
    .slice(0, 6);

  return (
    <>
      {/* ========== 🎁 추가 감면 혜택 — 아코디언(접기) 카드 (대표님 요청) ========== */}
      <AccordionCard
        emoji="🎁"
        title="챙기면 좋은 추가 감면 혜택"
        subtitle={
          <>
            대표님 <b>업종·규모·매출</b>에 맞춰 <b>가능성이 높은 순서</b>로 정리했습니다.
            <b className="text-brand-green"> ✅ 신청 가능</b>은 지금 바로,
            <b className="text-brand-orange"> 🟡 조건 충족 시</b>는 요건을 갖추면 받을 수 있습니다.
          </>
        }
      >
        {/* 가능성 높은 순 상위 6개 — 기관 박스처럼 구분선(divide)으로 정리 */}
        <div className="mt-4 divide-y divide-gray-200">
          {judged.map(({ b, v }) => {
            const isYes = v.status === "yes";
            const isCondition = v.status === "condition";

            return (
              <div
                key={b.id}
                className="group origin-left py-4 transition-transform duration-150 first:pt-0 last:pb-0 hover:scale-[1.01]"
              >
                {/* 상단: 아이콘 + 제목 + 대상 뱃지 (정부지원제도 항목과 동일 구조) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base">{b.icon}</span>
                  <span className={`break-keep text-sm font-extrabold text-brand-dark ${lockText}`}>
                    {b.title}
                  </span>
                  {isYes ? (
                    <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                      ✅ 신청 가능
                    </span>
                  ) : (
                    <span className="shrink-0 break-keep rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                      🟡 조건 충족 시 신청 가능
                    </span>
                  )}
                </div>

                {/* 예상 절감·수령액 — 정부지원제도의 초록 안내 자리처럼 강조 */}
                {v.savingText && (
                  <p
                    className={`mt-1 break-keep text-sm font-extrabold ${
                      isYes ? "text-brand-orange" : "text-brand-dark/70"
                    } ${lockText}`}
                  >
                    {v.savingText}
                  </p>
                )}

                {/* 설명 (제목 아래 목차성 문구라 노출 유지) */}
                <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
                  {b.description}
                </p>

                {/* 조건 충족 시 안내 (대표님 방침: "조건 충족 시 신청 가능") */}
                {isCondition && v.conditionText && (
                  <p className="mt-1 break-keep rounded-lg bg-brand-orange/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-orange">
                    🟡 {v.conditionText}
                  </p>
                )}

                {/* 대상 확정 시 보조 사유 */}
                {isYes && v.note && (
                  <p className="mt-1 break-keep text-[11px] text-brand-dark/50">ℹ️ {v.note}</p>
                )}

                {/* 혜택 — 이걸 챙기면 무엇을 얻는지 (대표님 요청) */}
                {b.benefit && (
                  <p className="mt-2 break-keep rounded-lg border-l-2 border-brand-orange bg-brand-yellow/15 px-3 py-2 text-[11px] font-semibold leading-relaxed text-brand-dark">
                    <span className="font-extrabold text-brand-orange">혜택 </span>
                    {b.benefit}
                  </p>
                )}

                {/* 정책자금: 상품 리스트 (있을 때만) */}
                {b.products && b.products.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {b.products.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <span className={`break-keep text-xs font-bold text-brand-dark ${lockText}`}>
                          {p.name}
                        </span>
                        <span className={`shrink-0 break-keep text-xs font-extrabold text-brand-orange ${lockText}`}>
                          최대 {formatKRW(p.maxAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 신청 방법 + 필요 서류 + 처리시간 + 소요기간 — 회색 박스로 묶음 (알맹이라 잠금) */}
                <div className={`mt-2 rounded-lg bg-gray-50 px-3 py-2 ${lockText}`}>
                  {/* 신청 방법 (대표님 요청 — 간단하게라도) */}
                  {b.applyHow && (
                    <p className="break-keep text-[11px] leading-relaxed text-brand-dark/80">
                      <span className="font-bold text-brand-dark">📝 신청 방법 </span>
                      {b.applyHow}
                    </p>
                  )}
                  <div className={`flex flex-wrap items-center gap-1.5 ${b.applyHow ? "mt-1.5" : ""}`}>
                    <span className="break-keep text-[11px] font-bold text-brand-dark/70">
                      📄 필요 서류
                    </span>
                    {b.requiredDocs.map((doc) => (
                      <span
                        key={doc}
                        className="break-keep rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-dark/70 ring-1 ring-gray-200"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 break-keep text-[11px] text-brand-dark/60">
                    ⏱️ 서류 작성 · <b className="text-brand-dark/80">{b.processingTime}</b>
                  </p>
                  {/* 승인·반영 소요기간 (대표님 요청 — 대략적으로) */}
                  {b.duration && (
                    <p className="mt-1 break-keep text-[11px] text-brand-dark/60">
                      🗓️ 소요 기간 · <b className="text-brand-orange">{b.duration}</b>
                    </p>
                  )}
                </div>

                {/* 데드라인 경고 (빨강) — 목차성 경고라 노출 유지 */}
                {b.warning && (
                  <p
                    className="mt-2 break-keep rounded-lg px-3 py-2 text-[11px] font-semibold leading-relaxed"
                    style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
                  >
                    ⚠️ {b.deadline} · {b.warning}
                  </p>
                )}

                {/* 신청하러 가기 버튼 — 왼쪽 하단 소형 버튼(정책금융기관 카드와 동일 디자인) · 결제 전 클릭 차단 */}
                <a
                  href={previewLock ? undefined : b.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-block break-keep rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 ${lockClick}`}
                >
                  🔗 {b.applyName}에서 신청하러 가기 →
                </a>
              </div>
            );
          })}
        </div>

        {/* 하단 하이라이트 — 카드 안 소형 배너 */}
        <div className="mt-4 rounded-xl bg-brand-yellow/30 px-4 py-3 text-center">
          <p className="break-keep text-sm font-black leading-snug text-brand-dark">
            💡 요건에 맞게 챙기면 첫 해 <span className="whitespace-nowrap">연 최대 700만원 절감</span> 가능
          </p>
          <p className="mt-1 break-keep text-[11px] font-semibold leading-relaxed text-brand-dark/70">
            <span className="whitespace-nowrap">놓친 항목 있으면 지금이라도 신청하세요.</span>{" "}
            <span className="whitespace-nowrap">소급 가능한 항목도 있습니다.</span>
          </p>
        </div>
      </AccordionCard>
      {/* ※ 🗓️ '이 순서대로만 챙기세요' 타임라인 블록 제거(대표님 요청) — 위 4가지 혜택 카드로 충분 */}
    </>
  );
}
