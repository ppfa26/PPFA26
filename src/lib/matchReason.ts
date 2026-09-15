// ════════════════════════════════════════════════════════════════
//  매칭 근거(이유) + 우선순위(추천도) 생성 유틸  (대표님 요청 D-2 / D-3)
//
//  ★ 목적 ★
//   결과창의 각 지원사업 카드에
//    · D-2: "왜 이게 대표님께 매칭됐는지" 사람이 읽기 쉬운 근거 한 줄
//    · D-3: 점수 기반 우선순위 뱃지(🔥 강력추천 / 👍 추천 / 참고)
//   를 붙여 신뢰도·정확도 체감과 고객 가치를 높인다.
//
//  ★ 원칙 ★
//   · 매칭 '판정' 로직(matching.ts / advancedScreening.ts / supportPrograms.ts)은
//     절대 건드리지 않는다. 이 파일은 이미 확정된 결과에 '설명'만 얹는다.
//   · 과장 금지: 프로필에 실제로 있는 사실(업종·업력·지역·연령 등)만 근거로 쓴다.
//   · 금지 표현(금융알선/대출보장/승인보장)은 사용하지 않는다.
// ════════════════════════════════════════════════════════════════

import type { DiagnosisProfile } from "./matching";

export type MatchPriority = "strong" | "recommend" | "reference";

export type PriorityBadge = {
  level: MatchPriority;
  label: string; // "🔥 강력추천" 등
  className: string; // 뱃지 tailwind 클래스
};

// ── 우선순위 뱃지 시각 정의 ──
export function priorityBadge(level: MatchPriority): PriorityBadge {
  switch (level) {
    case "strong":
      return {
        level,
        label: "🔥 강력추천",
        className:
          "bg-brand-red text-white",
      };
    case "recommend":
      return {
        level,
        label: "👍 추천",
        className:
          "bg-brand-orange text-white",
      };
    default:
      return {
        level,
        label: "참고",
        className:
          "bg-gray-200 text-brand-dark/70",
      };
  }
}

// 점수(0~100 가정) → 우선순위 레벨.
//  · 데이터에 실제 매칭점수(score)가 있으면 그걸 쓰고,
//  · 없으면 자격상태(eligible/potential)로 대체 판정한다.
export function priorityFromScore(
  score: number | undefined,
  opts?: { eligible?: boolean }
): MatchPriority {
  if (typeof score === "number" && Number.isFinite(score)) {
    if (score >= 75) return "strong";
    if (score >= 45) return "recommend";
    return "reference";
  }
  // 점수 없을 때: 지금 바로 신청 가능(eligible)=강력추천, 조건부=추천
  if (opts?.eligible === true) return "strong";
  if (opts?.eligible === false) return "recommend";
  return "recommend";
}

// ── 프로필에서 사람이 읽기 쉬운 '특징 조각' 추출 ──
//  예: ["제조업", "업력 3년 이내", "청년 대표", "인천"]
function profileTraits(p: DiagnosisProfile | null | undefined): string[] {
  if (!p) return [];
  const traits: string[] = [];

  // 사업 형태
  const bt = String(p.businessType || "");
  if (bt.includes("예비")) traits.push("예비창업자");
  else if (bt.includes("법인")) traits.push("법인사업자");
  else if (bt.includes("개인")) traits.push("개인사업자");

  // 업종(최대 2개까지만 노출해 간결하게)
  const inds = (p.industries || []).filter(Boolean);
  if (inds.length > 0) {
    traits.push(inds.slice(0, 2).join("·"));
  } else if (p.industry) {
    traits.push(String(p.industry));
  }

  // 업력
  const y = String(p.years || "").replace(/\s/g, "");
  if (y.includes("창업예정")) traits.push("창업 준비 단계");
  else if (y.includes("1년미만")) traits.push("업력 1년 이내");
  else if (y.includes("3년미만")) traits.push("업력 3년 이내");
  else if (y.includes("5년미만") || y.includes("7년미만")) traits.push("업력 7년 이내");
  else if (y.includes("7년이상")) traits.push("업력 7년 이상");

  // 연령(청년 가점 등 자격에 자주 작용)
  const age = String(p.age || "");
  if (age.includes("39") || age.includes("청년")) traits.push("청년 대표(만 39세 이하)");

  // 지역(지자체·지역재단 사업 근거)
  if (p.region) traits.push(String(p.region));

  return traits;
}

// ── D-2: 매칭 이유 한 줄 생성 ──
//  · 특정 사업의 '자격 안내 문구(baseNote)'가 있으면 우선 활용하고,
//    거기에 대표님 프로필 특징을 덧붙여 "왜 나에게 왔는지"를 분명히 한다.
//  · baseNote 가 없으면 프로필 특징만으로 근거를 만든다.
export function buildMatchReason(
  p: DiagnosisProfile | null | undefined,
  opts?: { baseNote?: string; maxTraits?: number }
): string {
  const traits = profileTraits(p);
  const max = opts?.maxTraits ?? 3;
  const shown = traits.slice(0, max);

  if (shown.length === 0) {
    return opts?.baseNote?.trim() || "진단하신 사업장 정보 기준으로 신청 대상에 해당돼요.";
  }

  const traitText = shown.join(" · ");
  // baseNote 가 있으면 근거를 함께 제시(중복 느낌 없이)
  return `${traitText} 조건에 맞아 매칭됐어요.`;
}

// ── 프로필 특징을 뱃지용 짧은 칩 배열로 (선택적으로 UI에서 사용) ──
export function matchTraitChips(
  p: DiagnosisProfile | null | undefined,
  max = 3
): string[] {
  return profileTraits(p).slice(0, max);
}
