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
  certifications?: string[]; // 벤처인증/이노비즈/메인비즈/연구소/특허/기타
  innovation?: string[]; // 혁신성장 테마(9개) 중 선택 — 있으면 혁신성장분야 기업
  currentInstitutions?: string[]; // 현재 이용 중인 기관(소진공/중진공/재단/신보/기보/무역보험/기타)
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
  // 도소매·음식점 → 신보/기보 대상 아님(매출 5억 이하 시). 소진공+재단 위주.
  if (p.industries?.includes("도소매업")) tags.add("도소매업");
  if (p.industries?.includes("음식점업")) tags.add("음식점업");
  if (p.industries?.includes("서비스업")) tags.add("서비스업");

  // 인증 보유 태그 (기보 자격·인증혜택 매칭용)
  const certs = p.certifications || [];
  if (certs.length > 0) tags.add("인증보유");
  certs.forEach((c) => tags.add(`인증:${c}`));
  // 기보는 특허/연구소/벤처인증 등 '기술성 인증'이 있으면 자격이 열림
  const techCert =
    certs.includes("특허") ||
    certs.includes("연구소") ||
    certs.includes("벤처인증") ||
    certs.includes("이노비즈");
  if (techCert) tags.add("기술인증보유");

  // 혁신성장 분야 해당 여부 (혁신성장 공동기준 9개 테마 중 하나라도 선택)
  if ((p.innovation || []).length > 0) tags.add("혁신성장");

  // 현재 이용 중인 기관 (중복배제 규칙용)
  (p.currentInstitutions || []).forEach((inst) => tags.add(`이용:${inst}`));

  // 기술기업 판정: 제조업 or 기술성 인증 or 혁신성장 or 인증/특허 목적
  if (
    p.industries?.includes("제조업") ||
    techCert ||
    tags.has("혁신성장") ||
    p.purposes?.some((x) => x.includes("인증") || x.includes("특허") || x.includes("R&D"))
  ) {
    tags.add("기술기업");
  }
  // 직원수 판정 (중진공 비제조업 5명↓ 제한 규칙용)
  if (p.employees) {
    tags.add(`직원:${p.employees.replace(/\s/g, "")}`);
    if (p.employees.includes("0명") || p.employees.includes("5명")) tags.add("소규모직원");
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

    // ── 실무 추천 규칙 (대표님 기준 + 공문 근거) ──────────────────
    // 공통 전제 판단
    const isRetailFood = tags.has("도소매업") || tags.has("음식점업");
    const isManufacturing = tags.has("제조업");
    const isInnovation = tags.has("혁신성장");
    const rev5plus = tags.has("매출5억이상");

    // 중진공(kosmes-fund):
    //  - 제조업이면 OK
    //  - 비제조업이면 직원 5명 이하 불가 (단, 혁신성장분야면 직원수 무관 가능)
    if (program.id === "kosmes-fund") {
      if (isManufacturing) {
        score += 3;
        reasons.push("제조업 → 중소벤처기업진흥공단(중진공) 정책자금 대상입니다");
      } else if (isInnovation) {
        score += 3;
        reasons.push("혁신성장 분야 해당 → 직원수와 무관하게 중진공 정책자금 신청이 가능합니다");
      } else if (tags.has("소규모직원") && !isManufacturing) {
        score = 0; // 비제조·비혁신·소규모 직원 → 중진공 대상 아님
      }
    }

    // 신용보증기금(kodit): 매출 5억 이하면 추천 금지.
    //  매출 높고 규모 있는 기업에 유리.
    if (program.id === "kodit-guarantee") {
      if (!rev5plus) {
        score = 0; // 매출 5억 이하 → 신보 추천 안 함 (대표님 기준)
      } else {
        score += 3;
        reasons.push("매출 5억원 이상 → 사업 규모를 보는 신용보증기금(신보) 보증이 유리합니다");
        if (tags.has("직원:10명이상")) reasons.push("직원 규모가 커 신보 심사에 유리합니다");
      }
    }

    // 기술보증기금(kibo): 특허·연구소·벤처인증 등 기술성 인증 또는 혁신성장·제조 기술기업.
    if (program.id === "kibo-tech-guarantee") {
      if (tags.has("기술인증보유")) {
        score += 4;
        const held = (p.certifications || []).filter((c) =>
          ["특허", "연구소", "벤처인증", "이노비즈"].includes(c)
        );
        reasons.push(
          `${held.join("·")} 보유 → 기술력으로 보증하는 기술보증기금(기보) 자격이 열리며 승인 가능성이 높아집니다`
        );
      } else if (isInnovation) {
        score += 3;
        reasons.push("혁신성장 분야 해당 → 기술평가 기반 기술보증기금(기보) 보증이 유리합니다");
      } else if (isManufacturing) {
        score += 3;
        reasons.push("제조·기술기업 → 매출이 낮아도 기술력으로 보증받는 기술보증기금(기보)이 유리합니다");
      } else {
        // 인증·혁신·제조 어디에도 해당 없으면 기보 대상 아님
        score = 0;
      }
    }

    // 도소매·음식점 + 매출 5억 이하 → 신보/기보 강제 제외, 소진공·재단 강조
    if (isRetailFood && !rev5plus) {
      if (program.id === "kodit-guarantee" || program.id === "kibo-tech-guarantee") {
        score = 0; // 도소매·음식점 소규모는 신보/기보 대상 아님
      }
      if (program.id === "sbiz-policy-fund" || program.id === "gyeonggi-fund") {
        score += 3;
        reasons.push("도소매·음식점(연매출 5억 이하) → 소상공인시장진흥공단·지역신용보증재단 상품이 적합합니다");
      }
    }

    // 무역보험공사: 수출기업 전용 (신보/기보/중진공 한도와 별개 → 병행 안내)
    if (program.id === "ksure-export-guarantee") {
      if (tags.has("수출기업")) {
        score += 4;
        reasons.push("수출기업 → 소진공·중진공·(신보 또는 기보)에 더해 무역보험공사까지 병행 활용이 가능합니다(한도 미합산)");
      } else {
        score = 0; // 수출기업이 아니면 노출하지 않음
      }
    }
    // 경기도 중소기업육성자금(경기신보 재단): 경기도 소재 기업만
    if (program.id === "gyeonggi-fund") {
      if (tags.has("경기")) {
        score += 3;
        reasons.push("경기도 소재 → 지역신용보증재단(경기신보) 이차보전 자금 대상");
      } else {
        score = 0; // 경기도가 아니면 노출하지 않음
      }
    }

    // ── 중복배제 규칙 (현재 이용 중인 기관 기준) ──────────────────
    //  1) 재단 이용 중 → 기보·신보 신청 불가
    //  2) 기보 이용 중 → 신보 신규 불가
    //  3) 기보·신보 이용 중 → 소액 재단 추가신청은 성공률 낮으므로 추천 안 함
    const usingJaedan = tags.has("이용:신용보증재단");
    const usingKibo = tags.has("이용:기술보증기금");
    const usingKodit = tags.has("이용:신용보증기금");
    if (usingJaedan && (program.id === "kodit-guarantee" || program.id === "kibo-tech-guarantee")) {
      score = 0; // 재단 이용 중이면 기보·신보 안내 제외
    }
    if (usingKibo && program.id === "kodit-guarantee") {
      score = 0; // 기보 이용 중이면 신보 신규 제외
    }
    if ((usingKibo || usingKodit) && program.id === "gyeonggi-fund") {
      score = 0; // 기보·신보 이용 중이면 소액 재단 추가신청은 추천 안 함
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
