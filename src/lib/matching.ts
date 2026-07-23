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
  smartTech?: string; // (구) 1단계 스마트기기 질문 — 제거됨. 하위호환 위해 타입만 유지
  smartDevice?: string; // 스마트기기 사용 여부 (3단계) → 혁신성장촉진자금·스마트상점 매칭용
  // 2단계 (상담 목적)
  purposes?: string[]; // 창업자금/운전자금/시설자금/수출자금/정부지원금/인증및특허
  desiredAmount?: string; // (구) 희망 금액 질문 — 제거됨. 매칭 미사용. 하위호환 위해 타입만 유지
  interests?: string[]; // 정책자금/정부지원금/창업지원/바우처/인증/교육
  // 3단계
  credit?: string;
  certifications?: string[]; // 벤처인증/이노비즈/메인비즈/연구소/특허/기타
  innovation?: string[]; // 혁신성장 테마(9개) 중 선택 — 있으면 혁신성장분야 기업
  currentInstitutions?: string[]; // 현재 이용 중인 기관(소진공/중진공/재단/신보/기보/무역보험/기타)
  collateral?: string;
  bankruptcy?: string; // 해당 없음 / 파산·회생 진행 중 / 면책·인가 완료
  taxDelinquent?: string; // 없음 / 체납 있음
  capitalImpairment?: string; // 아니오 / 예(자본잠식) — 법인만
  insurance?: string;
  employees?: string; // 0명/5명이하/10명이하/10명이상
  // 소진공 혁신형/특별 상품 정밀 매칭용 조건부 응답 (3단계 추가질문 · "예..."면 해당)
  revenueGrowth2y?: string; // 최근 2년 매출·고용 성장 → 성장가속화자금
  smartFactory?: string; // 스마트공장 구축·도입(제조업) → 스마트공장자금
  govSelected?: string; // 정부 선정 프로그램(강한소상공인 등) → 강한소상공인자금
  policyFundGood?: string; // 정책자금 성실상환·졸업후보 → 졸업후보기업자금
  reFounder?: string; // 폐업 후 재창업(재도전) → 재도전특별자금
  wantsRefinance?: string; // 고금리→저금리 대환 희망 → 대환대출자금
  privateInvestment?: string; // 민간투자 유치 이력 → 민간투자연계매칭융자
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
  //  - 매출 규모가 있으면(≈5억 이상) 사업체 '규모'가 있어 신용보증기금(신보) 유리
  //  - 그 외 → 소상공인(지역신용보증재단/소진공 유리)
  //  ★ 2026 개정 매출 구간 [매출 없음 / 2억 미만 / 10억 미만 / 10억 이상 / 기타] 대응:
  //    "10억 이상"·"10억 미만"(2억~10억, 5억 이상 포함 가능) → 규모 있는 것으로 보고 신보 유리
  //    "2억 미만"·"매출 없음"·"기타" → 소상공인 쪽
  const revNoSpace = (p.revenue || "").replace(/\s/g, "");
  const isLargeRevenue =
    revNoSpace.includes("10억이상") ||
    revNoSpace.includes("10억미만") ||
    revNoSpace.includes("5억이상"); // 과거 구간 하위호환
  if (isLargeRevenue) {
    tags.add("중소기업");
    tags.add("매출5억이상");
  } else if (p.businessType?.includes("법인")) {
    tags.add("중소기업");
  } else {
    tags.add("소상공인");
  }

  if (p.revenue) tags.add(p.revenue.replace(/\s/g, ""));
  if (p.age?.includes("39세 이하") || p.age?.includes("39세이하") || p.age?.includes("청년")) tags.add("청년");
  if (p.years?.includes("1년")) tags.add("1년미만");

  // 업력 태그 (창업지원사업 자격 필터용) — 3년 이내 / 7년 이내 여부
  //  창업예정=예비, 1년미만·3년미만=3년이내, 7년미만=7년이내
  if (p.years) {
    const y = p.years.replace(/\s/g, "");
    if (y.includes("창업예정")) tags.add("예비창업자");
    if (y.includes("1년미만") || y.includes("3년미만")) {
      tags.add("업력3년이내");
      tags.add("업력7년이내");
    } else if (y.includes("7년미만")) {
      tags.add("업력7년이내");
    }
    // 7년이상 → 창업지원사업 대상 아님 (태그 없음)
  }

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

  // 혁신성장 분야 해당 여부 (간소화 후: "예…"만 true, "아니요/모르겠음"·"해당 없음"은 제외)
  const innovationYes = (p.innovation || []).some(
    (v) =>
      v &&
      !v.includes("해당 없음") &&
      !v.includes("해당없음") &&
      !v.startsWith("아니") &&
      v.trim() !== "없음"
  );
  if (innovationYes) tags.add("혁신성장");

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
    const empNoSpace = p.employees.replace(/\s/g, "");
    tags.add(`직원:${empNoSpace}`);
    // 소규모직원 = 0명 또는 '5명 이하'(1~5명). '5명 이상'·'50명 이상'·'300명 이상'은 제외.
    //  ★ "50명이상"에도 "0명" substring이 있으므로 정확 일치(===)로 판정.
    if (empNoSpace === "0명" || empNoSpace.includes("5명이하")) {
      tags.add("소규모직원");
    }
  }
  // 경기도 소재 → 경기 태그 (경기신용보증재단 매칭용)
  if (p.region?.includes("경기")) tags.add("경기");
  if (p.collateral?.includes("없")) tags.add("담보없음");
  if (p.bankruptcy && (p.bankruptcy.includes("있") || p.bankruptcy.includes("회생") || p.bankruptcy.includes("파산")))
    tags.add("회생파산");

  // 신용점수 판정 (공문 기준: 신용취약소상공인자금 = NCB 839점 이하)
  // "700점 미만" / "700~839점" → 신용취약 / "840점 이상" → 신용양호
  //  ※ 옛 옵션("839점 이상"/"~이하")도 하위호환 인정
  if (p.credit?.includes("840") || p.credit?.includes("839점 이상") || p.credit?.includes("839 이상")) {
    tags.add("신용양호");
  } else if (p.credit && (p.credit.includes("미만") || p.credit.includes("839") || p.credit.includes("이하") || p.credit.includes("취약"))) {
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
    // ── 재기·재도전 하드필터 (대표님 기준: 진짜 대상자만) ────────────
    //  새출발기금·재도전특별자금·희망리턴은 폐업·회생·파산·재창업 이력이 있는
    //  사업자 전용. 정상 운영 중인 일반 사업자에게는 노출하지 않는다.
    if (program.category === "재기재도전") {
      const isReStart =
        tags.has("회생파산") ||
        tags.has("재기자금") ||
        p.purposes?.some((x) => x.includes("재기") || x.includes("재창업")) ||
        p.businessType?.includes("재창업");
      if (!isReStart) score = 0;
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

    // ══ 창업지원 하드필터 (대표님 기준: 진짜 자격자만 노출) ══════════════
    //  각 창업지원사업의 실제 신청 자격을 사업별로 확인해 해당 안 되면 완전 제외.
    if (program.category === "창업지원") {
      // 예비창업패키지 / 혁신 소상공인 창업지원 → 예비창업자만
      if (program.id === "k-startup-pre" || program.id === "sbiz-startup-academy") {
        if (!tags.has("예비창업자")) score = 0;
      }
      // 청년창업사관학교 → 청년(39↓) + (예비 또는 업력 7년 이내)
      else if (program.id === "youth-startup-academy") {
        if (!tags.has("청년") || !(tags.has("예비창업자") || tags.has("업력7년이내"))) score = 0;
      }
      // 초기창업패키지 → 예비 또는 업력 3년 이내 (나이 무관)
      else if (program.id === "k-startup-early") {
        if (!(tags.has("예비창업자") || tags.has("업력3년이내"))) score = 0;
      }
      // 그 외 창업지원사업 → 예비 또는 업력 7년 이내만
      else {
        if (!(tags.has("예비창업자") || tags.has("업력7년이내"))) score = 0;
      }
    }

    // ══ 수출 하드필터 (대표님 기준: 수출 체크 안 하면 수출상품 완전 제외) ══
    //  수출바우처·무역보험 등 수출 관련 상품은 수출기업일 때만 노출.
    if (
      (program.id === "export-voucher" || program.id === "ksure-export-guarantee") &&
      !tags.has("수출기업")
    ) {
      score = 0;
    }

    // ══ 인증 하드필터: 벤처·이노비즈·메인비즈 인증은 기술기업에만 안내 ══
    //  (일반 도소매·음식점 등 비기술 업종에는 노출하지 않음)
    if (program.id === "venture-cert" && !tags.has("기술기업")) {
      score = 0;
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
        if (tags.has("직원:50명이상") || tags.has("직원:300명이상") || tags.has("직원:10명이상"))
          reasons.push("직원 규모가 커 신보 심사에 유리합니다");
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
    // ── 큐레이션 컷오프 (대표님 기준: "진짜 신청 가능한 대상자만") ──────────
    //  score 2점(관심분야 1점 + 태그 1개 스침)은 '겨우 걸친' 수준이라 제외.
    //  실무 추천 규칙에서 +3 이상 가점을 받았거나(뚜렷한 자격 부합),
    //  태그가 다수 일치(4점 이상)한 것만 노출해 "겁먹을 만큼 많은" 목록을 방지한다.
    // 적합도가 낮은 매칭은 추천에서 제외한다. (대표님 방침: 적합도 10점 이하 제외)
    //  → 11점 이상, 즉 자격이 뚜렷한 상위 사업만 노출한다.
    .filter((r) => r.score > 10)
    .sort((a, b) => b.score - a.score);

  return results;
}
