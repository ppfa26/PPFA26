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
  // 연락처(이름·휴대폰은 회원가입 단계에서 수집 — 진단에서는 미수집)
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

  // 소상공인/중소기업 판단 (공문 기준: 매출 규모)
  //  - 매출 5억 이상 또는 법인 → 사업체 '규모'가 있어 신용보증기금(신보) 유리
  //  - 그 외 → 소상공인(지역신용보증재단/소진공 유리)
  if (p.revenue?.includes("5억이상") || p.revenue?.includes("5억 이상")) {
    tags.add("중소기업");
    tags.add("매출5억이상");
  } else if (p.businessType?.includes("법인")) {
    tags.add("중소기업");
  } else {
    tags.add("소상공인");
  }

  if (p.revenue) tags.add(p.revenue.replace(/\s/g, ""));
  if (p.age?.includes("39세 이하") || p.age?.includes("39세이하")) tags.add("청년");
  if (p.years?.includes("1년")) tags.add("1년미만");

  (p.purposes || []).forEach((x) => tags.add(x.replace(/\s/g, "")));
  (p.industries || []).forEach((x) => tags.add(x.replace(/\s/g, "")));
  // 수출업 → 수출자금 + 수출기업 태그 (무역보험공사 병행 매칭용)
  if (p.industries?.includes("수출업")) {
    tags.add("수출자금");
    tags.add("수출기업");
  }
  // 제조업/기술기업 → 기술보증기금(기보) 유리
  if (p.industries?.includes("제조업")) tags.add("제조업");
  if (
    p.industries?.includes("제조업") ||
    p.purposes?.some((x) => x.includes("인증") || x.includes("특허") || x.includes("R&D"))
  ) {
    tags.add("기술기업");
  }
  // 경기도 소재 → 경기 태그 (경기신용보증재단 매칭용)
  if (p.region?.includes("경기")) tags.add("경기");
  if (p.collateral?.includes("없")) tags.add("담보없음");
  if (p.bankruptcy && (p.bankruptcy.includes("있") || p.bankruptcy.includes("회생") || p.bankruptcy.includes("파산")))
    tags.add("회생파산");

  // 신용점수 판정 (공문 기준: 신용취약소상공인자금 = NCB 839점 이하)
  // "700점 이하" / "839점 이하" → 신용취약 / "839점 이상" → 신용양호
  if (p.credit?.includes("839점 이상") || p.credit?.includes("839 이상")) {
    tags.add("신용양호");
  } else if (p.credit && (p.credit.includes("이하") || p.credit.includes("취약"))) {
    tags.add("신용취약");
  }
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

    // ── 교육·컨설팅 노출 규칙 (공문 기준 반영) ──────────────────
    // "교육 이수"가 필요한 프로필: 신용취약(NCB 839점 이하) / 폐업·재기 / 예비창업.
    // 일반 경영자금을 찾는 '신용양호 소상공인'에게는 교육을 추천하지 않는다.
    if (program.category === "교육컨설팅") {
      const eduNeeded =
        tags.has("신용취약") ||
        tags.has("회생파산") ||
        tags.has("재기자금") ||
        tags.has("예비창업자") ||
        interests.has("교육");
      if (eduNeeded) {
        score += 2;
        if (tags.has("신용취약"))
          reasons.push("신용점수 839점 이하 → 정책자금 신청 전 신용관리교육 이수가 필요합니다");
      } else {
        // 교육이 필요 없는 프로필이면 목록에서 제외
        score = 0;
      }
    }

    // ── 신용취약소상공인자금 노출 규칙 ──────────────────────────
    // 이 자금은 NCB 839점 이하만 대상. 신용양호 프로필에는 노출하지 않는다.
    if (program.id === "sbiz-credit-weak-fund") {
      if (tags.has("신용취약")) {
        score += 4;
        reasons.push("신용점수 839점 이하 중·저신용 소상공인 전용 직접대출");
      } else {
        score = 0;
      }
    }

    // ── 일반경영안정자금 노출 규칙 ─────────────────────────────
    // 신용양호 소상공인의 '일반 경영자금'에 우선. (신용취약자는 위 전용자금이 우선)
    if (program.id === "sbiz-policy-fund" && tags.has("신용양호")) {
      score += 2;
      reasons.push("신용점수 양호 → 신용 제한 없는 일반경영안정자금 대상");
    }

    // ── 기관 구조 기반 정밀 매칭 (공문 기준) ──────────────────────
    // 신용보증기금: 매출 5억 이상 / 사업체 규모가 있는 기업에 유리 (대리대출·보증서)
    if (program.id === "kodit-guarantee") {
      if (tags.has("매출5억이상")) {
        score += 3;
        reasons.push("매출 5억원 이상 → 사업 규모를 보는 신용보증기금 보증이 유리합니다");
      } else if (tags.has("중소기업")) {
        score += 1;
      }
    }
    // 기술보증기금: 제조/IT/기술력/특허 기업 — 매출 낮아도 기술력으로 보증
    if (program.id === "kibo-tech-guarantee") {
      if (tags.has("기술기업") || tags.has("제조업")) {
        score += 3;
        reasons.push("제조·기술기업 → 매출이 낮아도 기술력으로 보증받는 기술보증기금이 유리합니다");
      }
    }
    // 무역보험공사: 수출기업 전용 (신보/기보 한도와 별개 → 병행 안내)
    if (program.id === "ksure-export-guarantee") {
      if (tags.has("수출기업")) {
        score += 4;
        reasons.push("수출기업 → 소진공·중진공·(신보 또는 기보)에 더해 무역보험공사까지 4곳 병행 활용이 가능합니다(한도 미합산)");
      } else {
        score = 0; // 수출기업이 아니면 노출하지 않음
      }
    }
    // 경기도 중소기업육성자금: 경기도 소재 기업만
    if (program.id === "gyeonggi-fund") {
      if (tags.has("경기")) {
        score += 3;
        reasons.push("경기도 소재 → 지역신용보증재단(경기신보) 이차보전 자금 대상");
      } else {
        score = 0; // 경기도가 아니면 노출하지 않음
      }
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
