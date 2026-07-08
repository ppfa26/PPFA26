import { PROGRAMS, Program } from "./programs";

export type DiagnosisProfile = {
  // 1단계
  businessType?: string; // 예비창업자/개인사업자/법인사업자
  industry?: string;
  industries?: string[]; // 제조업/수출업/서비스업/도소매업/음식점업/기타 (중복 선택)
  revenue?: string; // 매출없음/1억미만/5억미만/5억이상
  years?: string; // 창업예정/1년미만/3년미만/7년미만/7년이상
  age?: string; // 39세이하/39세이상
  region?: string;
  // 2단계 (상담 목적)
  purposes?: string[]; // 창업자금/운전자금/시설자금/수출자금/정부지원금/인증및특허
  desiredAmount?: string;
  interests?: string[]; // 정책자금/정부지원금/창업지원/바우처/인증/교육
  // 3단계
  credit?: string;
  collateral?: string;
  bankruptcy?: string;
  insurance?: string;
  employees?: string; // 0명/5명이하/10명이하/10명이상
  // 연락처
  name?: string;
  phone?: string;
  email?: string;
};

// 프로필 → 매칭 태그 집합 생성
function profileTags(p: DiagnosisProfile): Set<string> {
  const tags = new Set<string>();
  const bt = p.businessType || "";
  if (bt.includes("예비")) tags.add("예비창업자");
  if (bt.includes("개인")) tags.add("개인사업자");
  if (bt.includes("법인")) tags.add("법인");
  if (bt.includes("프리")) tags.add("자영업자");

  // 소상공인/중소기업 판단 (매출 기준 단순화)
  if (p.revenue?.includes("5억이상") || p.businessType?.includes("법인")) {
    tags.add("중소기업");
  } else {
    tags.add("소상공인");
  }

  if (p.revenue) tags.add(p.revenue.replace(/\s/g, ""));
  if (p.age?.includes("39세 이하") || p.age?.includes("39세이하")) tags.add("청년");
  if (p.years?.includes("1년")) tags.add("1년미만");

  (p.purposes || []).forEach((x) => tags.add(x.replace(/\s/g, "")));
  (p.industries || []).forEach((x) => tags.add(x.replace(/\s/g, "")));
  if (p.industries?.includes("수출업")) tags.add("수출자금");
  if (p.collateral?.includes("없")) tags.add("담보없음");
  if (p.bankruptcy && (p.bankruptcy.includes("있") || p.bankruptcy.includes("회생") || p.bankruptcy.includes("파산")))
    tags.add("회생파산");
  return tags;
}

export type MatchResult = {
  program: Program;
  score: number;
  reasons: string[];
};

export function matchPrograms(p: DiagnosisProfile): MatchResult[] {
  const tags = profileTags(p);
  const interests = new Set(
    (p.interests || []).map((x) => x.replace(/\s/g, ""))
  );

  const results: MatchResult[] = PROGRAMS.map((program) => {
    let score = 0;
    const reasons: string[] = [];

    // 태그 매칭
    program.target.forEach((t) => {
      if (tags.has(t)) {
        score += 2;
      }
    });

    // 관심 분야 매칭 (카테고리 → 관심사)
    const catToInterest: Record<string, string> = {
      정책자금: "정책자금",
      정부지원금: "정부지원금",
      창업지원: "창업지원",
      바우처인증: "바우처",
      교육컨설팅: "교육",
      재기재도전: "정책자금",
    };
    const relatedInterest = catToInterest[program.category];
    if (interests.size === 0 || interests.has(relatedInterest) || interests.has("인증")) {
      score += 1;
    }

    // 재도전 프로필 우선
    if (tags.has("회생파산") && program.category === "재기재도전") {
      score += 5;
      reasons.push("회생·파산 이력에 맞는 재기 지원");
    }
    // 청년 우선
    if (tags.has("청년") && program.category === "창업지원") {
      score += 3;
      reasons.push("만 39세 이하 청년 대상");
    }
    // 예비창업자
    if (tags.has("예비창업자") && program.category === "창업지원") {
      score += 3;
      reasons.push("예비창업자 대상 사업");
    }

    if (score >= 2 && reasons.length === 0) {
      reasons.push(`${program.target.filter((t) => tags.has(t)).join(", ") || "프로필"} 조건 부합`);
    }

    return { program, score, reasons };
  })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);

  return results;
}
