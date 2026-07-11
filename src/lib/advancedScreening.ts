// ─────────────────────────────────────────────────────────────────────────
//  추가 판정 레이어 (Advanced Screening Layer)
//  ⚠️ 이 파일은 기존 matching.ts 의 결과도출 로직을 절대 수정하지 않습니다.
//     matchPrograms() 로 나온 결과 "뒤에" 후처리로만 얹는 8개 블록입니다.
//
//  [필수 준수 사항]
//   - 본 결과는 자문 정보이며 대출 승인을 보장하지 않습니다.
//   - 금지 표현: 금융알선 / 대출보장 / 승인보장  (코드·문구에서 사용 금지)
//   - 모든 데이터는 매년 1월 재검증이 필요합니다. (출처 태그 부착)
//
//  통합 순서(스펙 원문):
//   1) 기존 매칭 결과 도출 (건들지 말 것)
//   2) BLOCK 1: 신보 즉시부결 판정
//   3) BLOCK 6: 재무비율 검증
//   4) BLOCK 2: 신용점수 기반 기관 매칭
//   5) BLOCK 3: 업종별 대출한도 계산
//   6) BLOCK 5: 기관별 매칭 규칙
//   7) BLOCK 7: 인증·제조업 요건
//   8) BLOCK 4: 2026 지원사업 매칭
//   9) 최종 결과 UI 출력
// ─────────────────────────────────────────────────────────────────────────

// ── 공통: 정밀 추가진단 입력 스키마 (company) ──────────────────────────────
// 기존 진단(DiagnosisProfile)과 별개로, 사용자가 "정밀 추가진단(선택)"에서
// 직접 입력하는 정밀 수치 데이터. 입력하지 않으면 추가 판정은 표시하지 않는다.
export type Company = {
  industry?: string; // 업종 (제조업/도소매업/음식점업/서비스업/수출업/기타)
  years_in_business?: number; // 업력(년)
  annual_revenue?: number; // 연매출(원)
  total_debt?: number; // 총차입금(원)
  total_equity?: number; // 자기자본(원)
  ceo_age?: number; // 대표자 나이(만)
  kcb_score?: number; // KCB 개인신용점수(1~1000)
  nice_score?: number; // NICE 개인신용점수(1~1000)
  ceo_cb_grade?: string; // 대표자 CB등급(기업 CB, 예: "B+","CCC")
  has_tech_career?: boolean; // 동종업계 기술경력 보유
  has_patent?: boolean; // 특허 보유
  has_venture_cert?: boolean; // 벤처기업 인증
  has_innobiz?: boolean; // 이노비즈 인증
  has_mainbiz?: boolean; // 메인비즈 인증
  tax_delinquent?: boolean; // 국세/지방세 체납
  insurance_4_delinquent?: boolean; // 4대보험 체납
  full_capital_impairment?: boolean; // 완전자본잠식
  revenue_drop_yoy_pct?: number; // 전년比 매출 감소율(%)
  ceo_changed_1y?: boolean; // 최근 1년 내 대표자·실제경영자 변경
  is_pre_founder?: boolean; // 예비창업자
  is_re_founder?: boolean; // 재창업자

  // ── 업종·규모 기반 추천 필터용 (대표님 실무 기준) ──
  biz_type?: "personal" | "corp"; // 사업자 유형 (개인/법인)
  employee_count?: number; // 4대보험 가입 상시직원 수
  is_small_business?: boolean; // 소상공인 여부(매출·업종 기준) — 미지정 시 매출로 자동 추정
  is_exporter?: boolean; // 수출 여부 (100만원이라도 수출 실적 있으면 true)
  is_tourism?: boolean; // 관광사업체 등록 여부 (관광기업 바우처 자격)

  // ── BLOCK 1: 신보 즉시부결 판정용 필드 (신용보증기금 간이심사 사전조회) ──
  delinquent_loan?: boolean; // 연체대출금 보유
  dishonored_check_1y?: boolean; // 1년 이내 당좌부도
  credit_mgmt_info_1y?: boolean; // 1년 이내 신용관리정보
  property_right_infringement_1y?: boolean; // 1년 이내 사업장·거주주택 권리침해
  guarantee_default_1y?: boolean; // 1년 이내 부실보증
  non_financial_delinquent?: boolean; // 비금융권 연체정보 보유
  ceo_cb_grade_6_or_7?: boolean; // 대표자 CB등급 CBR-6 또는 CBR-7
  revenue_drop_30pct_yoy?: boolean; // 전기 대비 매출액 30% 이상 감소
  total_debt_exceeds_revenue?: boolean; // 총차입금(본건 포함) > 당기매출액

  // ── BLOCK 5: 재무비율 검증용 필드 ──
  interest_coverage_ratio?: number; // EBITDA 이자보상배율
  years_below_1?: number; // 이자보상배율 1 미만 연속 연수
  advance_payments?: number; // 가지급금
  deposits_received?: number; // 가수금
  total_assets?: number; // 총자산
  debt_ratio_pct?: number; // 부채비율(%)
  debt_dependency_pct?: number; // 차입금의존도(%)
  operating_margin_pct?: number; // 영업이익률(%)
  operating_profit_3y_consecutive?: boolean; // 3년 연속 영업이익

  // ── BLOCK 6: 책임경영 평가지표용 필드 ──
  business_place_owned_by_company?: boolean; // 주사업장 소유권 신청기업 명의
  owner_related_share_pct?: number; // 실제경영자+관계인 지분 합계(%)
  paid_in_capital?: number; // 납입자본금
  cb_delinquent?: boolean; // CB 연체정보 보유
  ceo_cb_grade_level?: number; // 실제경영자 CB등급 레벨(숫자, 낮을수록 우량)
  owner_lawsuit?: boolean; // 실제경영자 소송정보 보유
  abnormal_capital_increase?: boolean; // 자본금 가장납입·비정상 증자
  guarantee_split_complied?: boolean; // 보증 분할해지 의무 준수

  // ── BLOCK 7: 인증·제조업·연구소 요건용 필드 ──
  industry_code?: string; // 표준산업분류 코드
  has_factory_registration?: boolean; // 공장등록 보유
  has_direct_production_cert?: boolean; // 직접생산확인 보유
  product_revenue_ratio?: number; // 제품 매출 비중(0~1)
  has_manufacturing_cost_statement?: boolean; // 제조원가명세서 보유
  brand_development?: boolean; // 브랜드 개발 수행
  product_planning?: boolean; // 제품 기획 수행
  product_development?: boolean; // 제품 개발 수행
  product_manufacturing?: boolean; // 제품 제조 수행
  mainbiz_score?: number; // 메인비즈 평가 점수
  has_other_department?: boolean; // 연구소 외 다른 부서 존재
  other_dept_employee_count?: number; // 다른 부서 상시종업원 수
  researcher_has_4_insurance?: boolean; // 연구원 4대보험 가입
  researcher_matches_main_business?: boolean; // 주업종과 연구분야 일치
  ceo_is_researcher?: boolean; // 대표자가 연구원 겸직
};

// 출처 태그 (UI 표시용) — 각 판정 결과에 부착
export const SOURCE_TAGS = {
  KODIT: "출처: 신용보증기금 2026 업무설명자료",
  KIBO: "출처: 기술보증기금 2026 보증운용",
  SBIZ: "출처: 소상공인시장진흥공단 2026 정책자금 공고",
  KOSMES: "출처: 중소벤처기업진흥공단 2026 정책자금 융자계획",
  MICRO: "출처: 서민금융진흥원 미소금융 2026",
  BIZINFO: "출처: 기업마당(bizinfo.go.kr) 2026 통합공고",
  FINANCE: "출처: 신용보증기금·기술보증기금 재무심사 일반기준",
} as const;

export const REVALIDATION_NOTICE =
  "본 데이터는 매년 1월 정부·기관 공고 기준으로 재검증됩니다. 최신 공고를 반드시 확인하세요.";

export const ADVISORY_DISCLAIMER =
  "본 결과는 자문 정보이며 대출 승인을 보장하지 않습니다. 실제 승인 여부·한도·금리는 각 기관 심사 결과에 따릅니다.";

// 판정 등급 (신호등)
export type Verdict = "가능성높음" | "조건부" | "어려움" | "부적격";

export type ScreeningResultItem = {
  block: string; // 블록 이름
  title: string; // 판정 제목
  verdict: Verdict; // 판정 등급
  detail: string; // 상세 설명
  source: string; // 출처 태그
};

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 1】신보 즉시부결 판정
//  연체·체납·자본잠식 등 13개 항목 중 하나라도 해당하면 신보 즉시부결로 판정.
//  출처: 신용보증기금 간이심사 사전조회 체크리스트 (공식 심사양식, 13개 항목 전량)
// ═════════════════════════════════════════════════════════════════════════
export const KODIT_HARD_REJECT_RULES: { field: keyof Company; label: string }[] = [
  { field: "delinquent_loan", label: "연체대출금 보유" },
  { field: "dishonored_check_1y", label: "1년 이내 당좌부도" },
  { field: "credit_mgmt_info_1y", label: "1년 이내 신용관리정보" },
  { field: "property_right_infringement_1y", label: "1년 이내 사업장·거주주택 권리침해" },
  { field: "guarantee_default_1y", label: "1년 이내 부실보증" },
  { field: "tax_delinquent", label: "국세·지방세 체납" },
  { field: "non_financial_delinquent", label: "비금융권 연체정보 보유" },
  { field: "full_capital_impairment", label: "자기자본 전액잠식" },
  { field: "ceo_cb_grade_6_or_7", label: "대표자 CB등급 CBR-6 또는 CBR-7" },
  { field: "insurance_4_delinquent", label: "4대 보험료 체납" },
  { field: "revenue_drop_30pct_yoy", label: "전기 대비 매출액 30% 이상 감소" },
  { field: "total_debt_exceeds_revenue", label: "총차입금(본건 포함) > 당기매출액" },
  { field: "ceo_changed_1y", label: "1년 이내 대표자·실제경영자 변경" },
];

export type KoditHardRejectResult = {
  result: "PASS" | "REJECT";
  rejectReasons: string[];
};

export function screenKoditHardReject(company: Company): KoditHardRejectResult {
  const rejectReasons: string[] = [];
  KODIT_HARD_REJECT_RULES.forEach((rule) => {
    if (company[rule.field] === true) {
      rejectReasons.push(rule.label);
    }
  });
  return {
    result: rejectReasons.length === 0 ? "PASS" : "REJECT",
    rejectReasons,
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 2】이용 가능 기관 매칭 (업종·규모 기준 — 대표님 실무 기준)
//  ⚠️ 정책자금 기관 선정은 신용점수가 아니라 "업종·직원수"가 핵심.
//     - 음식점·도소매·서비스 → 지역신용보증재단·신용보증기금·소상공인시장진흥공단
//       (4대보험 상시직원 5명 이상 → 중소벤처기업진흥공단까지 가능)
//     - 제조업 → 중진공·소진공·재단·기술보증기금·신용보증기금 전부(직원수 무관)
//     - 수출기업 → 위에 더해 한국무역보험공사 병행
//     ※ 기술보증기금은 제조·기술 업종에만. 음식점·도소매엔 안내하지 않는다.
//     ※ 대출 실행은 "직접대출 1곳 + 대리대출 1곳 = 총 2곳" 병행 가능.
//  출처: 소진공·중진공·신보·기보 2026 공고 + 대표님 현장 심사 기준
// ═════════════════════════════════════════════════════════════════════════
export type CreditMatch = {
  institution: string;
  criteria: string;
  priority: "HIGH" | "MEDIUM" | "TECH_BASED";
  loan_type?: "직접대출" | "대리대출"; // 직접대출(공단) / 대리대출(보증서→은행)
  step?: number; // 신청 권장 순서 (1이 가장 먼저)
};

// 업종 정규화: 다양한 표기를 대분류 키로 변환
//  - manufacturing: 제조
//  - tech_innov: 로봇·AI·바이오·혁신성장·기술창업 등 기술기반(→ 기보 우선 트랙)
//  - retail_food: 도소매·음식점
//  - service: 일반 서비스·건설·물류 등
function normalizeIndustry(
  industry?: string
): "manufacturing" | "tech_innov" | "retail_food" | "service" | "etc" {
  const s = (industry || "").replace(/\s/g, "");
  if (s.includes("제조")) return "manufacturing";
  if (
    s.includes("로봇") || s.includes("AI") || s.includes("인공지능") || s.includes("바이오") ||
    s.includes("혁신") || s.includes("소프트") || s.includes("IT") || s.includes("기술") ||
    s.includes("딥테크") || s.includes("반도체") || s.includes("이차전지")
  )
    return "tech_innov";
  if (s.includes("도소매") || s.includes("도매") || s.includes("소매") || s.includes("음식") || s.includes("외식") || s.includes("유통"))
    return "retail_food";
  if (s.includes("서비스") || s.includes("운수") || s.includes("물류") || s.includes("건설") || s.includes("농림") || s.includes("어업"))
    return "service";
  return "etc";
}

// 큐레이션용 업종 대분류(IndustryKind) 산정 — 수출 여부를 최우선으로 반영.
//  대표님 기준: "수출업"은 별도 트랙이므로 수출 실적이 있으면 export로 본다.
//  그 외엔 업종 문자열로 food/retail/manufacturing/service/etc 분류.
function resolveIndustryKind(company: Company): IndustryKind {
  const s = (company.industry || "").replace(/\s/g, "");
  // 명시적으로 '수출'이 업종에 있거나 수출 실적이 있으면 export 우선
  if (s.includes("수출") || s.includes("무역") || company.is_exporter === true) return "export";
  if (s.includes("음식") || s.includes("외식") || s.includes("식당") || s.includes("카페") || s.includes("요식"))
    return "food";
  if (s.includes("도소매") || s.includes("도매") || s.includes("소매") || s.includes("유통") || s.includes("판매") || s.includes("커머스") || s.includes("쇼핑"))
    return "retail";
  if (s.includes("제조") || s.includes("생산") || s.includes("가공")) return "manufacturing";
  if (s.includes("서비스") || s.includes("운수") || s.includes("물류") || s.includes("건설") || s.includes("농림") || s.includes("어업") || s.includes("숙박") || s.includes("교육"))
    return "service";
  return "etc";
}

// 신용점수 판정 (대표님 실무 기준)
//  - 800점 이상: 양호 (대부분 승인 잘남)
//  - 780~799: 사업성/기술력 있으면 가능 (기보·특례 위주)
//  - 780 미만: 일반적으론 어려움 (단 기보·재단특례는 700점대도 가능)
export type CreditTier = "good" | "caution" | "hard";
export function scoreTier(company: Company): CreditTier {
  const score = Math.max(company.kcb_score ?? 0, company.nice_score ?? 0);
  if (score === 0) return "caution"; // 미입력 → 주의로 간주
  if (score >= 800) return "good";
  if (score >= 780) return "caution";
  return "hard";
}

// 이용 가능 기관 판정 — 업종·직원수·수출·신용점수 기준 + 신청 권장 순서
export function matchInstitutions(company: Company): CreditMatch[] {
  const matches: CreditMatch[] = [];
  const cat = normalizeIndustry(company.industry);
  const employees = company.employee_count ?? 0;
  const isExport = (company.industry || "").includes("수출") || company.is_exporter === true;
  const segment = resolveSegment(company);
  const isTechTrack = cat === "manufacturing" || cat === "tech_innov";

  if (isTechTrack) {
    // ⚠️ 제조·로봇·AI·혁신 → 반드시 기술보증기금부터!
    //    (재단 먼저 받으면 기보 신청이 막힘)
    matches.push({
      institution: "기술보증기금",
      criteria: "⚠️ 기술기업은 여기부터! (재단 먼저 받으면 기보 신청 불가) · 기술평가 보증",
      priority: "TECH_BASED",
      loan_type: "대리대출",
      step: 1,
    });
    matches.push({
      institution: "중소벤처기업진흥공단",
      criteria: "제조·혁신 → 직원수 무관 정책자금 (직접대출, 아이템+동종경력 시 승인 잘남)",
      priority: "HIGH",
      loan_type: "직접대출",
      step: 2,
    });
    // 소상공인 규모의 제조·혁신이면 재단·소진공도 병행 가능
    if (segment === "small") {
      matches.push({
        institution: "지역신용보증재단",
        criteria: "소상공인 규모 → 기보 신청 후 병행 가능 (특례→협약→일반 순 승인율)",
        priority: "MEDIUM",
        loan_type: "대리대출",
        step: 3,
      });
      matches.push({
        institution: "소상공인시장진흥공단",
        criteria: "혁신성장촉진(스마트)자금 등 병행 가능 (직접대출)",
        priority: "MEDIUM",
        loan_type: "직접대출",
        step: 3,
      });
    }
  } else if (cat === "retail_food" || cat === "service" || cat === "etc") {
    // 도소매·음식점·서비스·기타 (비기술 트랙)
    const revenue = company.annual_revenue ?? 0;
    const isBigRevenue = revenue >= 500000000 || segment === "sme"; // 매출 5억↑ 또는 중소기업 규모

    if (isBigRevenue) {
      // ── 매출 5억 이상 → 신용보증기금(신보)이 1순위, 재단 2순위, 소진공은 보너스 (대표님 기준) ──
      matches.push({
        institution: "신용보증기금",
        criteria: "매출 5억 이상 규모 기업 → 신보 1순위 (사업 규모·매출 기반 보증, 한도 큼)",
        priority: "HIGH",
        loan_type: "대리대출",
        step: 1,
      });
      matches.push({
        institution: "지역신용보증재단",
        criteria: "신보 다음 2순위 · 특례→협약→일반 순으로 승인율 높음",
        priority: "MEDIUM",
        loan_type: "대리대출",
        step: 2,
      });
      matches.push({
        institution: "소상공인시장진흥공단",
        criteria: "직접대출로 항상 병행 신청 가능 (보너스) · 재단·신보와 별개",
        priority: "MEDIUM",
        loan_type: "직접대출",
        step: 3,
      });
      // 직원 5명 이상이면 중진공까지 확장
      if (employees >= 5) {
        matches.push({
          institution: "중소벤처기업진흥공단",
          criteria: "4대보험 상시직원 5명 이상 → 중진공 정책자금까지 확장 가능 (직접대출)",
          priority: "MEDIUM",
          loan_type: "직접대출",
          step: 4,
        });
      }
    } else {
      // ── 매출 5억 미만 소상공인 → 재단 1순위, 소진공은 보너스, 신보 비권장 ──
      matches.push({
        institution: "지역신용보증재단",
        criteria: "소상공인 1순위 · 특례→협약→일반 순으로 승인율 높음",
        priority: "HIGH",
        loan_type: "대리대출",
        step: 1,
      });
      matches.push({
        institution: "소상공인시장진흥공단",
        criteria: "직접대출로 항상 병행 신청 가능 (보너스) · 재단과 별개",
        priority: "MEDIUM",
        loan_type: "직접대출",
        step: 2,
      });
      // 직원 5명 이상이면 중진공까지 확장
      if (employees >= 5) {
        matches.push({
          institution: "중소벤처기업진흥공단",
          criteria: "4대보험 상시직원 5명 이상 → 중진공 정책자금까지 확장 가능 (직접대출)",
          priority: "MEDIUM",
          loan_type: "직접대출",
          step: 3,
        });
      }
    }
  }

  // 수출기업 → 무역보험공사는 항상 마지막에 병행 (재단·기보·신보와 한도 미합산)
  if (isExport) {
    matches.push({
      institution: "한국무역보험공사",
      criteria: "🌏 수출은 최강! 선적전/선적후/문화산업보증 중 1개 · 다른 기관과 한도 별도",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 9,
    });
  }

  // 기관 규모(큰 기관 → 작은 기관) 순서로 항상 고정 정렬
  //  신용보증기금 → 기술보증기금 → 신용보증재단 → 중소벤처기업진흥공단 → 소상공인시장진흥공단 → 무역보험공사
  const INSTITUTION_ORDER = [
    "신용보증기금",
    "기술보증기금",
    "재단", // 지역신용보증재단
    "중소벤처기업진흥공단",
    "소상공인시장진흥공단",
    "무역보험공사",
  ];
  const orderIdx = (name: string) => {
    const idx = INSTITUTION_ORDER.findIndex((k) => name.includes(k));
    return idx === -1 ? 99 : idx;
  };
  matches.sort((a, b) => orderIdx(a.institution) - orderIdx(b.institution));
  return matches;
}

// ── 승인 시기(월별) 안내 (대표님 실무 기준) ──
//  1~6월: 승인 잘남 / 7~9월: 추경, 일부 / 10~12월: 어려움
export type TimingAdvice = { level: "good" | "mid" | "low"; message: string };
export function timingAdvice(month?: number): TimingAdvice {
  const m = month ?? new Date().getMonth() + 1;
  if (m >= 1 && m <= 6)
    return {
      level: "good",
      message: `지금은 상반기(${m}월)로 정책자금 예산이 넉넉해 승인이 가장 잘 나는 시기입니다. 지금 신청을 서두르는 것이 유리합니다.`,
    };
  if (m >= 7 && m <= 9)
    return {
      level: "mid",
      message: `지금은 추경 시기(${m}월)로 일부 자금 승인이 가능합니다. 다만 10월 이후에는 예산 소진으로 어려워지니, 신청을 서두르는 것이 좋습니다.`,
    };
  return {
    level: "low",
    message: `지금은 하반기(${m}월)로 예산이 대부분 소진돼 신규 승인이 까다로운 시기입니다. 준비를 미리 해두고 내년 초(1~2월) 신청을 노리는 전략도 유효합니다.`,
  };
}

// ── 신용점수 기반 안내 문구 (대표님 실무 기준) ──
export function creditScoreAdvice(company: Company): { tier: CreditTier; message: string } {
  const tier = scoreTier(company);
  if (tier === "good")
    return { tier, message: "신용점수 양호(800점 이상) → 대부분의 정책금융 기관에서 승인이 잘 나는 구간입니다." };
  if (tier === "caution")
    return {
      tier,
      message:
        "신용점수 780~799점 구간 → 사업성·기술력이 뒷받침되면 승인 가능합니다. 기술보증기금(기술기업 700점대도 승인)·재단 특례보증(700점도 가능) 위주로 접근하는 것이 유리합니다.",
    };
  return {
    tier,
    message:
      "신용점수 780점 미만 → 일반 보증은 다소 어려울 수 있습니다. 다만 기술력이 있으면 기술보증기금, 오프라인 소상공인이면 재단 특례보증(700점도 승인 사례)으로 길이 열립니다.",
  };
}

// 하위호환용 래퍼 (신용점수만 넘어오는 기존 호출부 대비) — 내부적으로 미사용
export function matchByCreditScore(kcb_score: number, nice_score: number): CreditMatch[] {
  return matchInstitutions({ kcb_score, nice_score });
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 3】업종별 대출한도 계산
//  업종과 연매출로 정책자금 기본 대출한도를 자동 계산.
//  출처: 기술보증기금 공식 스크립트(제조업 25%) / 한기협 2·3주차 강의
// ═════════════════════════════════════════════════════════════════════════
export type IndustryKey =
  | "manufacturing"
  | "wholesale"
  | "retail"
  | "construction"
  | "service"
  | "IT";

export const INDUSTRY_LOAN_RATIOS: Record<IndustryKey, number> = {
  manufacturing: 0.25, // 제조업 = 매출 × 1/4
  wholesale: 0.1667, // 도소매 = 매출 × 1/6
  retail: 0.1667, // 소매 = 매출 × 1/6
  construction: 0.1, // 건설 = 매출 × 1/10
  service: 0.1, // 서비스 = 매출 × 1/10
  IT: 0.1, // IT = 매출 × 1/10
};

export type LoanLimitResult = {
  industry: string;
  ratio: number;
  formula: string;
  base_limit: number;
  base_limit_display: string;
  boost_available: string[];
};

export function calculateLoanLimit(industry: string, annual_revenue: number): LoanLimitResult {
  const ratio = INDUSTRY_LOAN_RATIOS[industry as IndustryKey] || 0.1;
  const base_limit = Math.floor(annual_revenue * ratio);

  return {
    industry,
    ratio,
    formula: `${annual_revenue.toLocaleString()} × ${ratio}`,
    base_limit,
    base_limit_display: `${(base_limit / 100000000).toFixed(2)}억원`,
    boost_available: [
      "신규 매출(계약) 증빙",
      "수출 실적",
      "연구소 보유",
      "벤처인증",
      "이노비즈 인증",
      "특허 보유",
      "추가인력 고용",
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 4】2026 정부지원사업 데이터 (32종)
//  지원금액·자격조건을 저장하고, 사용자 프로필에 맞는 사업만 자동 필터링.
//  출처: K-Startup 공식공고 / 중기부 2026 정부지원사업 로드맵
//  ⚠️ 매년 1월 기업마당(bizinfo.go.kr) 공고로 재검증 필요
// ═════════════════════════════════════════════════════════════════════════
export type GovProgram = {
  name: string;
  amount_max?: number;
  amount_min?: number;
  amount_max_total?: number;
  amount_per_task?: number;
  years_max?: number;
  years_min?: number;
  age_max?: number;
  self_burden?: number;
  self_burden_min?: number;
  self_burden_max?: number;
  cash_ratio?: number;
  duration?: number;
  gov_ratio?: number;
  support_ratio?: number;
  condition?: "is_pre_founder" | "is_re_founder" | "has_mainbiz";
  // ── 세그먼트·업종 필터용 (대표님 기준: 소상공인/중소기업 각자에게 맞는 것만) ──
  segment?: "small" | "sme" | "both"; // 소상공인 전용 / 중소기업 전용 / 공통
  industryOnly?: "manufacturing"; // 특정 업종만(예: 제조업 전용)
  // ── 정밀 자격 필터 (대표님 기준: 해당 안 되는 건 절대 노출하지 않음) ──
  requiresExport?: boolean; // 수출기업만 (수출 체크 안 하면 노출 X)
  requiresTech?: boolean; // 기술 보유(특허·연구소·벤처·이노비즈) 기업만
  requiresTourism?: boolean; // 관광사업체만
  isStartupProgram?: boolean; // 창업 지향 사업(창업패키지·사관학교 등) → 예비창업자·창업초기(업력3년내)에만 노출
  requiresOperating?: boolean; // 운영 중인 기존 사업자 전용(판로·강한소상공인·스마트제조 등) → 예비창업자 제외
  requiresReFounder?: boolean; // 폐업 후 재기·재창업 지원(희망리턴 등) → 재창업자만
  applyUrl?: string; // 신청·안내 사이트(클릭 시 바로 이동)
  // ── 큐레이션용: 이 사업이 어떤 업종에서 "핵심(승인 잘 나고 실효성 큰)"인지 태그 ──
  //   업종별 우선순위 점수 산정에 사용. 미지정이면 범용 사업으로 간주.
  fitTags?: IndustryKind[]; // 이 사업이 특히 잘 맞는 업종들
};

// 업종 대분류 (큐레이션 기준용) — normalizeIndustry 결과와 1:1 매칭
export type IndustryKind = "food" | "retail" | "export" | "manufacturing" | "service" | "etc";

export const GOV_SUPPORT_2026: GovProgram[] = [
  // 창업(예비·초기) — 예비창업자/재창업자·나이·업력 조건이 붙어 해당자만 노출됨
  { name: "예비창업패키지", amount_max: 100000000, condition: "is_pre_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  { name: "초기창업패키지", amount_max: 100000000, years_max: 3, self_burden: 0.3, segment: "both", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "청년창업사관학교", amount_max: 100000000, age_max: 39, years_max: 3, segment: "both", isStartupProgram: true, applyUrl: "https://start.kosmes.or.kr" },
  { name: "청년창업사관학교_경험창업자", amount_max: 100000000, age_max: 39, years_max: 7, segment: "both", isStartupProgram: true, applyUrl: "https://start.kosmes.or.kr" },
  { name: "생애최초창업", amount_max: 70000000, age_max: 29, condition: "is_pre_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  { name: "공공기술창업", amount_max: 70000000, age_max: 39, condition: "is_pre_founder", segment: "both", requiresTech: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "신사업창업사관학교", amount_max: 40000000, condition: "is_pre_founder", segment: "small", fitTags: ["food", "retail", "service"], applyUrl: "https://edu.sbiz.or.kr" },
  { name: "재도전성공패키지", amount_max: 100000000, condition: "is_re_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  // 중소기업(도약·글로벌·스마트공장 등) — segment: sme
  { name: "글로벌창업사관학교", amount_max: 150000000, years_max: 7, segment: "sme", requiresTech: true, isStartupProgram: true, requiresExport: true, fitTags: ["export"], applyUrl: "https://start.kosmes.or.kr" },
  { name: "창업도약패키지_일반형", amount_max: 300000000, years_min: 3, years_max: 7, segment: "sme", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "창업도약패키지_대기업협업형", amount_max: 200000000, years_min: 3, years_max: 7, segment: "sme", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "스마트공장", amount_per_task: 100000000, amount_max_total: 700000000, self_burden: 0.3, segment: "sme", industryOnly: "manufacturing", fitTags: ["manufacturing"], applyUrl: "https://www.smart-factory.kr" },
  // 수출바우처 — 수출기업만 (수출 체크 시에만 노출)
  { name: "수출바우처_중기부", amount_min: 30000000, amount_max: 100000000, self_burden_min: 0.3, self_burden_max: 0.5, segment: "sme", requiresExport: true, fitTags: ["export"], applyUrl: "https://www.exportvoucher.com/portal/sample/main" },
  // ── R&D 지원사업은 정책자금 매칭 대상에서 항상 제외 (대표님 기준) ──
  // (창업성장기술개발 디딤돌/전략형/시장확대/시장대응 등은 안내하지 않음)
  // ── 데이터바우처는 '데이터 활용 목적' 기업 한정 → 일반 매칭에서 제외 (대표님 기준) ──
  { name: "혁신형중소기업_방송광고_TV", amount_max: 45000000, self_burden: 0.5, condition: "has_mainbiz", segment: "sme", applyUrl: "https://www.kobaco.co.kr" },
  { name: "혁신형중소기업_방송광고_라디오", amount_max: 3000000, self_burden: 0.7, condition: "has_mainbiz", segment: "sme", applyUrl: "https://www.kobaco.co.kr" },
  // 소상공인(강한소상공인·판로·희망리턴·스마트제조 등) — segment: small
  { name: "희망리턴패키지_경영개선", amount_max: 40000000, segment: "small", requiresReFounder: true, applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "희망리턴패키지_재창업", amount_max: 44000000, segment: "small", requiresReFounder: true, applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_로컬브랜드", amount_max: 100000000, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_온라인셀러", amount_max: 50000000, segment: "small", requiresOperating: true, fitTags: ["retail", "food"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_글로벌", amount_max: 100000000, segment: "small", requiresExport: true, requiresOperating: true, fitTags: ["export"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "스마트제조_소상공인", amount_max: 42000000, self_burden: 0.3, cash_ratio: 0.5, segment: "small", industryOnly: "manufacturing", requiresOperating: true, fitTags: ["manufacturing"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  // 스마트상점 기술보급 — 운영 중인 오프라인 소상공인 매장(음식·도소매·서비스)에 키오스크·서빙로봇·스마트기기 도입 지원
  { name: "스마트상점_기술보급", amount_max: 5000000, self_burden: 0.3, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz.or.kr/smst/index.do" },
  { name: "판로개척_소상공인", amount_max: 20000000, self_burden: 0.2, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  // IP나래 — 창업 7년 이내 + 기술(특허 등) 보유 중소기업만
  { name: "IP나래", amount_max: 17500000, support_ratio: 0.5, years_max: 7, segment: "sme", requiresTech: true, fitTags: ["manufacturing", "export"], applyUrl: "https://pms.ripc.org" },
  // 관광기업혁신바우처 — 관광사업체만
  { name: "관광기업혁신바우처", amount_min: 20000000, amount_max: 100000000, segment: "both", requiresTourism: true, applyUrl: "https://www.tourbiz.or.kr" },
  { name: "로컬크리에이터", self_burden: 0.2, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
];

// ── 17개 시·도 지역신용보증재단 상품 안내 ──────────────────────
// 재단 상품·보증한도·신청시기는 지역마다 다르므로, 대표님 지역 재단 사이트로 바로 연결한다.
// 신청 앱: 서울=서울신용보증재단 앱 / 경기=이지원 앱 / 그 외=보증드림 앱
export type RegionSinbo = {
  region: string; // 시·도명
  name: string; // 재단 정식명
  url: string; // 상품 안내 페이지
  app: "서울신용보증재단 앱" | "이지원 앱" | "보증드림 앱";
};

export const REGION_SINBO: RegionSinbo[] = [
  { region: "서울", name: "서울신용보증재단", url: "https://www.seoulshinbo.co.kr/wbase/contents.do?mng_cd=BUSI2346", app: "서울신용보증재단 앱" },
  { region: "경기", name: "경기신용보증재단", url: "https://www.gcgf.or.kr/gcgf/cm/conts/contsView.do?mi=1051&contsId=1022", app: "이지원 앱" },
  { region: "인천", name: "인천신용보증재단", url: "https://www.icsinbo.or.kr/home/board/brdList.do?menu_cd=000196", app: "보증드림 앱" },
  { region: "부산", name: "부산신용보증재단", url: "https://www.busansinbo.or.kr/portal/board/post/list.do?bcIdx=623&mid=0103010000", app: "보증드림 앱" },
  { region: "대구", name: "대구신용보증재단", url: "https://www.dgsinbo.or.kr/page/10039/10043.tc", app: "보증드림 앱" },
  { region: "대전", name: "대전신용보증재단", url: "https://www.sinbo.or.kr/sub02_04_01", app: "보증드림 앱" },
  { region: "광주", name: "광주신용보증재단", url: "https://www.gjsinbo.or.kr/?d=guarantee_product", app: "보증드림 앱" },
  { region: "울산", name: "울산신용보증재단", url: "https://www.ulsanshinbo.co.kr/02_sinbo/?mcode=0402040500", app: "보증드림 앱" },
  { region: "세종", name: "세종신용보증재단", url: "https://sjsinbo.or.kr/sub0104/view", app: "보증드림 앱" },
  { region: "강원", name: "강원신용보증재단", url: "https://www.gwsinbo.or.kr/board/board_list.php?board_name=product", app: "보증드림 앱" },
  { region: "충북", name: "충북신용보증재단", url: "https://www.cbsinbo.or.kr/sub.php?code=59", app: "보증드림 앱" },
  { region: "충남", name: "충남신용보증재단", url: "https://www.cnsinbo.co.kr/sub/info.do?m=0204&page=0204&s=cnsinbo", app: "보증드림 앱" },
  { region: "전북", name: "전북신용보증재단", url: "https://www.jbcredit.or.kr/site/menu/MENU_000000000000040/board/list?site_assets=%2Fassets%2Fsite%2FLET", app: "보증드림 앱" },
  { region: "전남", name: "전남신용보증재단", url: "https://www.jnsinbo.or.kr/jnsinbo/credit/product/list.do", app: "보증드림 앱" },
  { region: "경북", name: "경북신용보증재단", url: "https://gbsinbo.co.kr/page/10045/10003.tc", app: "보증드림 앱" },
  { region: "경남", name: "경남신용보증재단", url: "https://gcgf.gnsinbo.or.kr/bbs/board.php?bo_table=02_01", app: "보증드림 앱" },
  { region: "제주", name: "제주신용보증재단", url: "https://www.jcgf.or.kr/pages.php?p=2_2_5_1#Sub2Link", app: "보증드림 앱" },
];

// ── 정책금융 기관별 신청 채널(앱/사이트/PDF) 안내 ─────────────────
//  기관명(부분일치)으로 매칭. 재단은 지역별로 다르므로 여기서 제외(REGION_SINBO 사용).
export type InstitutionLink = {
  match: string; // 기관명 부분일치 키
  siteUrl: string; // 공식 신청·안내 사이트
  siteLabel: string; // 버튼 라벨
  pdfUrl?: string; // 상품·보증 안내 자료(PDF/안내 페이지)
  pdfLabel?: string;
  manualUrl?: string; // 신청 매뉴얼(PDF) - 우리가 준비한 단계별 신청 가이드
  productName?: string; // 대표 상품명(네모칸 라벨) — 클릭 시 productUrl로 이동
  productUrl?: string; // 대표 상품 상세/안내 페이지
  tel?: string; // 통합 콜센터 번호(표시용)
  telNote?: string; // 콜센터 부가 안내(대기시간·전용번호 등)
  note?: string; // 신청 채널 한 줄 안내
};

// ── 기관별 '상품 바로보기' 링크 (기관 안내 하단 통합 목록) ──────────
//  대표님 요청: 기관별 상품 안내 페이지/자료를 한곳에 모아 바로 볼 수 있게.
export type ProductLink = {
  label: string; // "○○ 상품 바로보기"
  url: string; // 상품 안내 페이지 또는 우리가 준비한 상품안내 PDF
  docLabel?: string; // 오른쪽 자료명(있으면 "라벨 - 자료명" 형태로 표시)
};

export const INSTITUTION_PRODUCT_LINKS: ProductLink[] = [
  { label: "신용보증기금 상품 바로보기", url: "/manuals/kodit-product-2026.pdf" },
  { label: "기술보증기금 상품 바로보기", url: "/manuals/kibo-product-2026.pdf" },
  { label: "신용보증재단 상품 바로보기", url: "https://www.koreg.or.kr/haedream/gu/gurt/selectGurtList.do?mi=1124" },
  { label: "무역보험공사 상품 바로보기", url: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do" },
  { label: "중소벤처기업 상품 바로보기", url: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do" },
  { label: "소상공인시장진흥공단 상품 바로보기", url: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do" },
];

export const INSTITUTION_LINKS: InstitutionLink[] = [
  {
    match: "신용보증기금",
    siteUrl: "https://www.kodit.or.kr/apps/index.do",
    siteLabel: "신용보증기금 사이트",
    pdfUrl: "https://www.kodit.or.kr/kodit/na/ntt/selectNttList.do?mi=2806&bbsId=1002&ps=417",
    pdfLabel: "보증상품 안내자료 확인하기",
    manualUrl: "/manuals/kodit-guide.pdf",
    productName: "일반운전자금보증",
    productUrl: "https://www.kodit.or.kr/kodit/na/ntt/selectNttList.do?mi=2806&bbsId=1002&ps=417",
    tel: "1588-6565",
    telNote: "신용·매출 기반 보증은 신보로 문의하면 상담이 빠릅니다.",
    note: "신용보증기금 디지털지점(모바일)·영업점 방문으로 보증 신청이 가능합니다.",
  },
  {
    match: "기술보증기금",
    siteUrl: "https://www.kibo.or.kr",
    siteLabel: "기술보증기금 사이트",
    pdfUrl: "https://www.kibo.or.kr/main/board/boardType08.do",
    pdfLabel: "보증상품 안내자료 확인하기",
    manualUrl: "/manuals/kibo-guide.pdf",
    productName: "기술보증(운전·시설)",
    productUrl: "https://www.kibo.or.kr/main/board/boardType08.do",
    tel: "1544-1120",
    telNote: "기술평가 기반 보증은 기보로 문의하면 상담이 빠릅니다.",
    note: "기술보증기금 디지털지점(kibo.or.kr)에서 온라인 신청 후 기술평가를 받습니다.",
  },
  {
    match: "소상공인시장진흥공단",
    siteUrl: "https://ols.sbiz.or.kr",
    siteLabel: "소상공인 정책자금 신청",
    pdfUrl: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/sbiz-guide.pdf",
    productName: "일반경영안정자금",
    productUrl: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do",
    tel: "1533-0100",
    telNote: "중진공·소진공·중기부 통합상담은 1357로도 가능합니다.",
    note: "소상공인정책자금 누리집(ols.sbiz.or.kr)에서 직접대출을 온라인 신청합니다.",
  },
  {
    match: "중소벤처기업진흥공단",
    siteUrl: "https://www.kosmes.or.kr",
    siteLabel: "중소벤처기업진흥공단 사이트",
    pdfUrl: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/kosmes-guide.pdf",
    productName: "혁신창업사업화자금",
    productUrl: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do",
    tel: "1811-3655",
    telNote: "정책자금 전용번호(1811-3655)가 일반문의(1357)보다 대기가 짧습니다.",
    note: "중진공 정책자금 누리집에서 온라인 신청 후 상담·평가를 받습니다.",
  },
  {
    match: "무역보험공사",
    siteUrl: "https://on.ksure.or.kr/ksureOn/websquare/websquare.jsp?w2xPath=/ws5/ui/ZZ/MN/ZZMN010B01.xml&custSctCd=E100#/ws5/ui/ZZ/MN/ZZMN010B02.xml",
    siteLabel: "한국무역보험공사 사이트",
    pdfUrl: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do",
    pdfLabel: "수출신용보증 상품안내 확인하기",
    manualUrl: "/manuals/ksure-guide.pdf",
    productName: "선적전 수출신용보증",
    productUrl: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do",
    tel: "1588-3884",
    telNote: "상담 가능 시간: 평일 09:00~18:00",
    note: "한국무역보험공사(K-SURE On)에서 수출신용보증을 온라인 신청합니다. 신보·기보·중진공 한도와 별개로 병행 활용이 가능합니다.",
  },
];

// 기관명으로 신청 채널 정보 찾기(부분일치). 재단은 지역별이므로 여기선 null.
export function findInstitutionLink(institution: string): InstitutionLink | null {
  if (institution.includes("재단")) return null;
  return INSTITUTION_LINKS.find((x) => institution.includes(x.match)) ?? null;
}

// ── 지역신용보증재단 대표 사이트(검정 버튼용) ──────────────────────
//  재단 카드 밑에 신보·기보처럼 검정색 사이트 버튼으로 동일하게 노출.
//  세부 지역은 아래 지역 드롭다운(REGION_SINBO)으로 안내.
export const JAEDAN_SITE_LINKS: {
  label: string;
  url: string;
  manualUrl?: string;
  productUrl?: string; // 보증상품 안내 페이지
  productLabel?: string;
}[] = [
  {
    label: "서울신용보증재단",
    url: "https://www.seoulshinbo.co.kr",
    manualUrl: "/manuals/seoul-sinbo-guide.pdf",
    productUrl: "https://www.seoulshinbo.co.kr/wbase/contents.do?mng_cd=BUSI2346",
    productLabel: "보증상품 안내자료 확인하기",
  },
  {
    label: "경기신용보증재단",
    url: "https://www.gcgf.or.kr/gcgf/intro.do",
    manualUrl: "/manuals/gyeonggi-sinbo-easyone-guide.pdf",
    productUrl: "https://www.gcgf.or.kr/gcgf/cm/conts/contsView.do?mi=1052&contsId=1023",
    productLabel: "보증상품 안내자료 확인하기",
  },
  {
    label: "지역신용보증재단(통합)",
    url: "https://untact.koreg.or.kr/web/index.do",
    manualUrl: "/manuals/regional-sinbo-bojumdream-guide.pdf",
    productUrl: "https://www.koreg.or.kr/haedream/gu/gurt/selectGurtList.do?mi=1124",
    productLabel: "보증상품 안내자료 확인하기",
  },
];

// ── 신용보증재단중앙회 통합 콜센터(재단 카드에 노출) ────────────────
//  1588-7365로 걸면 사업장 소재지 기준 관할 지역신보로 자동 연결됩니다.
export const JAEDAN_CALL_CENTER = {
  tel: "1588-7365",
  telAi: "1588-7679",
  telNote: "1588-7365로 걸면 사업장 소재지(예: 인천) 기준 관할 지역신보로 자동 연결됩니다. (AI콜센터 1588-7679 병행)",
};

// 소상공인/중소기업 세그먼트 판정 (대표님 기준: 소상공인은 소상공인용만, 중소기업은 중소기업용만)
//  - is_small_business 명시값 우선
//  - 상시근로자 기준(소상공인기본법): 제조·건설·운수 10명 미만 / 그 외 5명 미만이면 소상공인.
//    직원수를 입력했으면 이걸 최우선으로 본다(대표님 실무 기준: 정책자금은 직원수가 핵심).
//  - 직원수 미입력 시: 법인이면 중기, 개인사업자는 업종별 매출기준으로 추정.
//    (음식·도소매·서비스는 매출이 커도 소상공인인 경우가 많으므로 매출 임계값을 높게 둔다)
export function resolveSegment(company: Company): "small" | "sme" {
  if (company.is_small_business === true) return "small";
  if (company.is_small_business === false) return "sme";

  const cat = normalizeIndustry(company.industry);

  // 직원수 입력 시: 상시근로자 기준으로 판정 (가장 정확)
  if (company.employee_count !== undefined) {
    const limit = cat === "manufacturing" || company.industry?.includes("건설") || company.industry?.includes("운수") ? 10 : 5;
    return company.employee_count < limit ? "small" : "sme";
  }

  // 직원수 미입력 시: 법인은 중기로, 개인사업자는 업종별 매출기준으로 추정
  if (company.biz_type === "corp") return "sme";
  const rev = company.annual_revenue ?? 0;
  // 업종별 소상공인 매출 상한(추정): 음식·도소매·서비스는 넉넉히, 제조는 낮게.
  const revLimit =
    cat === "retail_food" ? 3000000000 : // 도소매·음식: 30억까지 소상공인으로 추정
    cat === "service" ? 1000000000 : // 서비스: 10억
    cat === "manufacturing" ? 1000000000 : // 제조: 10억
    500000000; // 기타: 5억
  return rev >= revLimit ? "sme" : "small";
}

export function matchGovPrograms(company: Company): GovProgram[] {
  const age = company.ceo_age;
  const years_in_business = company.years_in_business;
  const { is_pre_founder, is_re_founder, has_mainbiz, is_exporter, is_tourism } = company;
  const segment = resolveSegment(company);
  const cat = normalizeIndustry(company.industry);
  // 기술 보유 판정: 특허·벤처·이노비즈·기술경력 중 하나라도 있으면 true
  const hasTech = Boolean(
    company.has_patent ||
      company.has_venture_cert ||
      company.has_innobiz ||
      company.has_tech_career
  );
  const matched: GovProgram[] = [];

  GOV_SUPPORT_2026.forEach((p) => {
    let eligible = true;

    // ── 나이·업력 필터 (대표님 기준: 미입력이면 조건부 사업은 숨김) ──
    // 나이 제한이 있는 사업은 나이를 입력하고 조건을 만족해야만 노출
    if (p.age_max !== undefined && (age === undefined || age > p.age_max)) eligible = false;
    // 업력 상한이 있는 사업은 업력을 입력하고 조건을 만족해야만 노출
    if (p.years_max !== undefined && (years_in_business === undefined || years_in_business > p.years_max)) eligible = false;
    if (p.years_min !== undefined && (years_in_business === undefined || years_in_business <= p.years_min)) eligible = false;

    // ── 조건 필터 (예비/재창업/메인비즈) ──
    if (p.condition === "is_pre_founder" && !is_pre_founder) eligible = false;
    if (p.condition === "is_re_founder" && !is_re_founder) eligible = false;
    if (p.condition === "has_mainbiz" && !has_mainbiz) eligible = false;

    // ── 수출 필터: 수출기업 전용 사업은 수출 체크한 경우에만 노출 (대표님 기준) ──
    if (p.requiresExport && !is_exporter) eligible = false;
    // ── 기술 보유 필터: 기술 보유(특허·벤처·이노비즈 등) 기업만 ──
    if (p.requiresTech && !hasTech) eligible = false;
    // ── 관광 필터: 관광사업체만 ──
    if (p.requiresTourism && !is_tourism) eligible = false;

    // ── 창업 지향 필터 (대표님 기준: '신청 가능한 것만 추려라') ──
    //   창업패키지·사관학교류는 '창업'을 전제로 하는 사업이므로,
    //   예비창업자이거나 창업 초기(업력 3년 이내) 기업에만 노출한다.
    //   업력 5년 된 일반 음식점 같은 성숙기업에는 형식상 걸려도 실질 부적합 → 제외.
    if (p.isStartupProgram) {
      const isStartupStage =
        is_pre_founder === true ||
        (years_in_business !== undefined && years_in_business <= 3);
      if (!isStartupStage) eligible = false;
    }

    // ── 운영 중 사업자 전용(판로·강한소상공인 등): 예비창업자에겐 부적합 → 제외 ──
    if (p.requiresOperating && is_pre_founder === true) eligible = false;

    // ── 폐업 후 재기·재창업 지원(희망리턴 등): 재창업자에게만 노출 ──
    if (p.requiresReFounder && !is_re_founder) eligible = false;

    // ── 세그먼트 필터: 소상공인에겐 소상공인용만, 중소기업에겐 중소기업용만 ──
    if (p.segment && p.segment !== "both" && p.segment !== segment) eligible = false;
    // ── 업종 전용 필터: 제조업 전용 사업은 제조업에만 ──
    if (p.industryOnly === "manufacturing" && cat !== "manufacturing") eligible = false;

    if (eligible) matched.push(p);
  });

  // ─────────────────────────────────────────────────────────────────────
  //  【큐레이션】업종별 "진짜 신청할 것만" 추림 (대표님 기준)
  //   - 자격 통과한 사업들 중에서도, 업종에 딱 맞고 승인 실효성 높은 것을
  //     우선순위로 정렬 → 상위 N개만 노출.
  //   - "너무 많으면 겁먹는다" → 최대 5개(예비창업자는 창업사업이 많아 6개).
  //   - 비슷한 프로필이면 같은 사업이 같은 순서로 나오도록 결정론적 정렬.
  // ─────────────────────────────────────────────────────────────────────
  const kind = resolveIndustryKind(company);

  const scoreProgram = (p: GovProgram): number => {
    let score = 0;
    // (1) 업종 적합 태그: 이 업종에 딱 맞는 사업이면 최우선 (+100)
    if (p.fitTags && p.fitTags.includes(kind)) score += 100;
    // (2) 수출 트랙 가점: 수출기업엔 수출사업을 최상단으로 (+40)
    if (kind === "export" && p.requiresExport) score += 40;
    // (3) 제조 트랙 가점: 제조업엔 제조 전용사업 최상단 (+40)
    if (kind === "manufacturing" && p.industryOnly === "manufacturing") score += 40;
    // (4) 예비/재창업자엔 해당 조건 사업 가점 (창업이 본 목적이므로)
    if (p.condition === "is_pre_founder" && is_pre_founder) score += 60;
    if (p.condition === "is_re_founder" && is_re_founder) score += 60;
    if (p.requiresReFounder && is_re_founder) score += 60;
    // (5) 운영 중 기존 사업자에겐 운영형 사업 가점 (+30)
    if (p.requiresOperating && is_pre_founder !== true) score += 30;
    // (6) 지원금액이 클수록 소폭 가점 (동점 tie-break, 최대 +10)
    const amt = p.amount_max ?? p.amount_max_total ?? p.amount_min ?? 0;
    score += Math.min(10, Math.floor(amt / 100000000) * 2);
    return score;
  };

  const ranked = matched
    .map((p) => ({ p, s: scoreProgram(p) }))
    // 결정론적 정렬: 점수 내림차순, 동점이면 이름 사전순(항상 같은 순서 보장)
    .sort((a, b) => (b.s - a.s) || a.p.name.localeCompare(b.p.name, "ko"));

  // 노출 개수 상한: 예비창업자는 창업사업 위주라 6개, 그 외 5개.
  const LIMIT = is_pre_founder === true ? 6 : 5;
  return ranked.slice(0, LIMIT).map((x) => x.p);
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 5】재무비율 자동 검증
//  재무제표 입력값으로 신보 부결 여부 + 은행 신용대출 자격을 동시 판정.
//  출처: 신용보증기금 간이심사 체크리스트 / 책임경영 평가지표 / 한기협 12강
// ═════════════════════════════════════════════════════════════════════════
export type FinancialIssue = { level: "REJECT" | "WARNING"; reason: string };
export type FinancialValidationResult = {
  kodit_result: "PASS" | "REJECT";
  bank_credit_eligible: boolean;
  issues: FinancialIssue[];
};

export function validateFinancials(financials: Company): FinancialValidationResult {
  const issues: FinancialIssue[] = [];
  const total_debt = financials.total_debt ?? 0;
  const annual_revenue = financials.annual_revenue ?? 0;

  // [REJECT 조건 - 신보 즉시부결]
  if (total_debt > annual_revenue && annual_revenue > 0) {
    issues.push({ level: "REJECT", reason: "총차입금 > 매출액 (신보 부결)" });
  }
  if ((financials.revenue_drop_yoy_pct ?? 0) >= 30) {
    issues.push({ level: "REJECT", reason: "전년대비 매출 30% 이상 감소 (신보 부결)" });
  }
  if (financials.full_capital_impairment === true) {
    issues.push({ level: "REJECT", reason: "자기자본 전액잠식 (신보 부결)" });
  }
  if (
    financials.interest_coverage_ratio !== undefined &&
    financials.interest_coverage_ratio < 1 &&
    (financials.years_below_1 ?? 0) >= 2
  ) {
    issues.push({ level: "REJECT", reason: "EBITDA이자보상배율 2년 연속 1 미만 (신보 부결)" });
  }

  // [WARNING 조건 - 감점요인]
  const total_assets = financials.total_assets ?? 0;
  if (total_assets > 0) {
    const advance_deposit_ratio =
      ((financials.advance_payments ?? 0) + (financials.deposits_received ?? 0)) / total_assets;
    if (advance_deposit_ratio > 0.02) {
      issues.push({ level: "WARNING", reason: "가지급금+가수금 > 총자산 2% (책임경영 감점)" });
    }
  }

  // [은행 법인신용대출 자격 - 매출 30억 이상 대상]
  const bank_eligible =
    annual_revenue >= 3000000000 &&
    (financials.total_equity ?? 0) >= 1000000000 &&
    (financials.debt_ratio_pct ?? 999) <= 250 &&
    (financials.debt_dependency_pct ?? 999) <= 30 &&
    (financials.operating_margin_pct ?? -1) >= 5 &&
    financials.operating_profit_3y_consecutive === true;

  return {
    kodit_result: issues.some((i) => i.level === "REJECT") ? "REJECT" : "PASS",
    bank_credit_eligible: bank_eligible,
    issues,
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 6】책임경영 평가지표 (신보 10항목)
//  신보 책임경영 평가 10항목을 자동 체크해서 등급하락·부결 위험을 사전 안내.
//  출처: 신용보증기금 <책임경영 평가지표> 공식양식 (2개 이상 부 = 등급하락)
// ═════════════════════════════════════════════════════════════════════════
export type ResponsibleMgmtResult = {
  total_checks: number;
  failed_count: number;
  failed_items: string[];
  result: "PASS" | "HIGH_REJECT_RISK";
  note: string;
};

export function evaluateResponsibleManagement(company: Company): ResponsibleMgmtResult {
  const total_assets = company.total_assets ?? 0;
  const advDepRatio =
    total_assets > 0
      ? ((company.advance_payments ?? 0) + (company.deposits_received ?? 0)) / total_assets
      : 0;

  const checks = [
    { id: 1, passed: company.business_place_owned_by_company === true, label: "주사업장 소유권(임대차) 신청기업 명의" },
    { id: 2, passed: (company.owner_related_share_pct ?? 0) >= 30, label: "실제경영자+관계인 지분 합계 ≥ 30%" },
    { id: 3, passed: company.ceo_changed_1y === false, label: "최근 1년 내 대표자·실제경영자 변동 없음" },
    { id: 4, passed: (company.paid_in_capital ?? 0) >= 30000000, label: "납입자본금 3,000만원 이상" },
    { id: 5, passed: company.cb_delinquent === false, label: "CB 연체정보 미보유" },
    { id: 6, passed: (company.ceo_cb_grade_level ?? 99) <= 5, label: "실제경영자 CB등급 CBR-5 이상 (750~800점)" },
    { id: 7, passed: company.owner_lawsuit === false, label: "실제경영자 소송정보 미보유" },
    { id: 8, passed: company.abnormal_capital_increase === false, label: "자본금 가장납입·비정상 증자 없음" },
    { id: 9, passed: company.guarantee_split_complied === true, label: "보증 분할해지 의무 준수" },
    { id: 10, passed: advDepRatio <= 0.02, label: "가지급금+가수금 ≤ 총자산의 2%" },
  ];

  const failedItems = checks.filter((c) => !c.passed);

  return {
    total_checks: 10,
    failed_count: failedItems.length,
    failed_items: failedItems.map((c) => c.label),
    result: failedItems.length <= 1 ? "PASS" : "HIGH_REJECT_RISK",
    note: failedItems.length >= 2 ? "2개 이상 미충족 → 등급하락, 부결 위험" : "통과",
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  【BLOCK 7】인증·제조업·연구소 요건
//  벤처인증 자격, 제조업 분류(직접/OEM/ODM/임가공), 메인비즈 등급,
//  연구소 설립가능 여부를 자동 판정.
//  출처: 벤처기업법 시행령 별표1 / 한기협 제조업 교재 / 중기부 메인비즈 / KOITA
// ═════════════════════════════════════════════════════════════════════════

// 벤처인증 제외 업종 (법제처 별표1 원본)
export const VENTURE_EXCLUDED_CODES = [
  "56211", // 일반 유흥 주점업
  "56212", // 무도 유흥 주점업
  "56219", // 기타 주점업
  "63999-1", // 블록체인 기반 암호화자산 매매 및 중개업
  // + 기타 사행시설 관리 및 운영업, 무도장 운영업
];

export function checkVentureEligibility(industry_code: string): { eligible: boolean; reason: string } {
  const excluded = VENTURE_EXCLUDED_CODES.includes(industry_code);
  return {
    eligible: !excluded,
    reason: excluded ? "벤처인증 제외 업종 (법제처 별표1)" : "벤처인증 신청 가능",
  };
}

export type ManufacturingClass = { type: string; tech_evaluation: boolean; note?: string };

export function classifyManufacturing(company: Company): ManufacturingClass {
  // 직접생산
  if (
    company.has_factory_registration &&
    company.has_direct_production_cert &&
    (company.product_revenue_ratio ?? 0) >= 0.5 &&
    company.has_manufacturing_cost_statement
  ) {
    return { type: "직접생산", tech_evaluation: true };
  }

  // OEM
  if (
    company.brand_development === false &&
    company.product_planning === false &&
    company.product_development === false &&
    company.product_manufacturing === true
  ) {
    return { type: "OEM", tech_evaluation: true };
  }

  // ODM
  if (
    company.brand_development === false &&
    company.product_planning === true &&
    company.product_development === true &&
    company.product_manufacturing === true
  ) {
    return { type: "ODM", tech_evaluation: true };
  }

  // 임가공
  return { type: "임가공(용역서비스)", tech_evaluation: false, note: "제조업 자격 불인정" };
}

export function classifyMainbizGrade(score: number): string {
  if (score >= 900) return "창조형";
  if (score >= 800) return "성장형";
  if (score >= 700) return "기본형";
  return "기초형(예비메인비즈)";
}

export type RDDeptResult = {
  eligible: boolean;
  missing: string[];
  special_note: string | null;
};

export function checkRDDeptEligibility(company: Company): RDDeptResult {
  const requirements = [
    { met: company.has_other_department === true, label: "연구소 외 다른 부서 존재" },
    { met: (company.other_dept_employee_count ?? 0) >= 1, label: "다른 부서 상시종업원 1명 이상 (대표 제외)" },
    { met: company.researcher_has_4_insurance === true, label: "연구원 4대보험 가입" },
    { met: company.researcher_matches_main_business === true, label: "주업종과 연구분야 일치" },
  ];

  // 3년 미만 창업기업 특례
  const under_3_year_exception =
    (company.years_in_business ?? 99) < 3 && company.ceo_is_researcher === true;

  const notMet = requirements.filter((r) => !r.met);

  return {
    eligible: notMet.length === 0 || under_3_year_exception,
    missing: notMet.map((r) => r.label),
    special_note: under_3_year_exception ? "3년 미만 창업: 대표자 겸직 가능" : null,
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  통합 오케스트레이터 (후처리 순서: 스펙 원문 9단계)
//   1) 기존 매칭 결과 도출 (matching.ts, 건들지 말 것 — 여기서는 호출하지 않음)
//   2) BLOCK 1: 신보 즉시부결 판정
//   3) BLOCK 5: 재무비율 검증
//   4) BLOCK 6: 책임경영 평가지표
//   5) BLOCK 2: 신용점수 기반 기관 매칭
//   6) BLOCK 3: 업종별 대출한도 계산
//   7) BLOCK 7: 인증·제조업 요건
//   8) BLOCK 4: 2026 지원사업 매칭
//   9) 최종 결과 UI 출력 (dashboard 컴포넌트에서 렌더)
// ═════════════════════════════════════════════════════════════════════════
export type AdvancedScreeningReport = {
  koditHardReject: KoditHardRejectResult; // BLOCK 1
  financials: FinancialValidationResult; // BLOCK 5
  responsibleMgmt: ResponsibleMgmtResult; // BLOCK 6
  creditMatches: CreditMatch[]; // BLOCK 2
  loanLimit: LoanLimitResult | null; // BLOCK 3
  manufacturing: ManufacturingClass | null; // BLOCK 7
  mainbizGrade: string | null; // BLOCK 7
  ventureEligibility: { eligible: boolean; reason: string } | null; // BLOCK 7
  rdDept: RDDeptResult; // BLOCK 7
  govPrograms: GovProgram[]; // BLOCK 4
  timing: TimingAdvice; // 승인 시기(월별) 안내
  creditAdvice: { tier: CreditTier; message: string }; // 신용점수 안내
  disclaimer: string;
  revalidation: string;
};

export function runAdvancedScreening(company: Company): AdvancedScreeningReport {
  // 2) BLOCK 1
  const koditHardReject = screenKoditHardReject(company);
  // 3) BLOCK 5
  const financials = validateFinancials(company);
  // 4) BLOCK 6
  const responsibleMgmt = evaluateResponsibleManagement(company);
  // 5) BLOCK 2 — 이용 가능 기관은 업종·직원수 기준(대표님 실무 기준)으로 판정
  const creditMatches = matchInstitutions(company);
  // 6) BLOCK 3
  const loanLimit =
    company.industry && company.annual_revenue
      ? calculateLoanLimit(company.industry, company.annual_revenue)
      : null;
  // 7) BLOCK 7
  const manufacturing = classifyManufacturing(company);
  const mainbizGrade =
    company.mainbiz_score !== undefined ? classifyMainbizGrade(company.mainbiz_score) : null;
  const ventureEligibility = company.industry_code
    ? checkVentureEligibility(company.industry_code)
    : null;
  const rdDept = checkRDDeptEligibility(company);
  // 8) BLOCK 4
  const govPrograms = matchGovPrograms(company);
  // 9) 승인 시기 + 신용점수 안내
  const timing = timingAdvice();
  const creditAdvice = creditScoreAdvice(company);

  return {
    koditHardReject,
    financials,
    responsibleMgmt,
    creditMatches,
    loanLimit,
    manufacturing,
    mainbizGrade,
    ventureEligibility,
    rdDept,
    govPrograms,
    timing,
    creditAdvice,
    disclaimer: ADVISORY_DISCLAIMER,
    revalidation: REVALIDATION_NOTICE,
  };
}
