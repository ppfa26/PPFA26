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
};

// 업종 정규화: 다양한 표기를 대분류 키로 변환
function normalizeIndustry(industry?: string): "manufacturing" | "retail_food" | "service" | "etc" {
  const s = (industry || "").replace(/\s/g, "");
  if (s.includes("제조")) return "manufacturing";
  if (s.includes("도소매") || s.includes("도매") || s.includes("소매") || s.includes("음식") || s.includes("외식") || s.includes("유통"))
    return "retail_food";
  if (s.includes("서비스") || s.includes("운수") || s.includes("물류") || s.includes("IT") || s.includes("소프트") || s.includes("건설") || s.includes("농림") || s.includes("어업"))
    return "service";
  return "etc";
}

// 이용 가능 기관 판정 — 업종·직원수·수출 여부 기준
export function matchInstitutions(company: Company): CreditMatch[] {
  const matches: CreditMatch[] = [];
  const cat = normalizeIndustry(company.industry);
  const employees = company.employee_count ?? 0;
  const isExport = (company.industry || "").includes("수출");

  if (cat === "manufacturing") {
    // 제조업 → 직원수와 무관하게 5개 기관 전부 자격
    matches.push({ institution: "소상공인시장진흥공단", criteria: "제조 소상공인 대상 (대리대출)", priority: "HIGH" });
    matches.push({ institution: "지역신용보증재단", criteria: "지역 소상공인·중소기업 보증 (이차보전·대리)", priority: "HIGH" });
    matches.push({ institution: "중소벤처기업진흥공단", criteria: "제조업 → 직원수 무관 정책자금 대상 (직접대출)", priority: "HIGH" });
    matches.push({ institution: "기술보증기금", criteria: "제조·기술기업 → 기술평가 기반 보증 (보증서·대리)", priority: "TECH_BASED" });
    matches.push({ institution: "신용보증기금", criteria: "사업 규모 기반 보증 (보증서·대리)", priority: "MEDIUM" });
  } else if (cat === "retail_food") {
    // 음식점·도소매 → 재단·신보·소진공 위주 (기보 제외)
    matches.push({ institution: "소상공인시장진흥공단", criteria: "음식점·도소매 소상공인 대상 (대리대출)", priority: "HIGH" });
    matches.push({ institution: "지역신용보증재단", criteria: "지역 소상공인 보증 (이차보전·대리)", priority: "HIGH" });
    matches.push({ institution: "신용보증기금", criteria: "사업 규모 기반 보증 (보증서·대리)", priority: "MEDIUM" });
    if (employees >= 5) {
      matches.push({
        institution: "중소벤처기업진흥공단",
        criteria: "4대보험 상시직원 5명 이상 → 중진공 정책자금까지 가능 (직접대출)",
        priority: "HIGH",
      });
    }
  } else {
    // 서비스·기타 → 도소매·음식점과 동일 구조
    matches.push({ institution: "소상공인시장진흥공단", criteria: "소상공인 대상 (대리대출)", priority: "HIGH" });
    matches.push({ institution: "지역신용보증재단", criteria: "지역 소상공인 보증 (이차보전·대리)", priority: "HIGH" });
    matches.push({ institution: "신용보증기금", criteria: "사업 규모 기반 보증 (보증서·대리)", priority: "MEDIUM" });
    if (employees >= 5) {
      matches.push({
        institution: "중소벤처기업진흥공단",
        criteria: "4대보험 상시직원 5명 이상 → 중진공 정책자금까지 가능 (직접대출)",
        priority: "HIGH",
      });
    }
  }

  // 수출기업 → 무역보험공사 병행 (한도 미합산)
  if (isExport) {
    matches.push({
      institution: "한국무역보험공사",
      criteria: "수출기업 → 신보·기보 한도와 별도 병행 가능",
      priority: "HIGH",
    });
  }

  return matches;
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
};

export const GOV_SUPPORT_2026: GovProgram[] = [
  // 창업(예비·초기) — 예비창업자/재창업자 조건이 붙어 이미 필터됨
  { name: "예비창업패키지", amount_max: 100000000, condition: "is_pre_founder", segment: "both" },
  { name: "초기창업패키지", amount_max: 100000000, years_max: 3, self_burden: 0.3, segment: "both" },
  { name: "청년창업사관학교", amount_max: 100000000, age_max: 39, years_max: 3, segment: "both" },
  { name: "청년창업사관학교_경험창업자", amount_max: 100000000, age_max: 39, years_max: 7, segment: "both" },
  { name: "생애최초창업", amount_max: 70000000, age_max: 29, condition: "is_pre_founder", segment: "both" },
  { name: "공공기술창업", amount_max: 70000000, age_max: 39, condition: "is_pre_founder", segment: "both" },
  { name: "신사업창업사관학교", amount_max: 40000000, condition: "is_pre_founder", segment: "small" },
  { name: "재도전성공패키지", amount_max: 100000000, condition: "is_re_founder", segment: "both" },
  // 중소기업(도약·글로벌·R&D·스마트공장 등) — segment: sme
  { name: "글로벌창업사관학교", amount_max: 150000000, years_max: 7, segment: "sme" },
  { name: "창업도약패키지_일반형", amount_max: 300000000, years_min: 3, years_max: 7, segment: "sme" },
  { name: "창업도약패키지_대기업협업형", amount_max: 200000000, years_min: 3, years_max: 7, segment: "sme" },
  { name: "스마트공장", amount_per_task: 100000000, amount_max_total: 700000000, self_burden: 0.3, segment: "sme", industryOnly: "manufacturing" },
  { name: "수출바우처_중기부", amount_min: 30000000, amount_max: 100000000, self_burden_min: 0.3, self_burden_max: 0.5, segment: "sme" },
  { name: "R&D_창업성장기술개발_디딤돌", amount_max: 120000000, duration: 1, gov_ratio: 0.8, years_max: 7, segment: "sme" },
  { name: "R&D_전략형", amount_max: 2000000000, duration: 4, gov_ratio: 0.65, segment: "sme" },
  { name: "R&D_시장확대", amount_max: 600000000, duration: 2, gov_ratio: 0.75, segment: "sme" },
  { name: "R&D_시장대응", amount_max: 500000000, duration: 2, gov_ratio: 0.75, segment: "sme" },
  { name: "데이터바우처_일반", amount_max: 32000000, segment: "sme" },
  { name: "데이터바우처_AI가공", amount_max: 54000000, segment: "sme" },
  { name: "혁신형중소기업_방송광고_TV", amount_max: 45000000, self_burden: 0.5, condition: "has_mainbiz", segment: "sme" },
  { name: "혁신형중소기업_방송광고_라디오", amount_max: 3000000, self_burden: 0.7, condition: "has_mainbiz", segment: "sme" },
  // 소상공인(강한소상공인·판로·희망리턴·스마트제조 등) — segment: small
  { name: "희망리턴패키지_경영개선", amount_max: 40000000, segment: "small" },
  { name: "희망리턴패키지_재창업", amount_max: 44000000, segment: "small" },
  { name: "강한소상공인_로컬브랜드", amount_max: 100000000, segment: "small" },
  { name: "강한소상공인_온라인셀러", amount_max: 50000000, segment: "small" },
  { name: "강한소상공인_글로벌", amount_max: 100000000, segment: "small" },
  { name: "스마트제조_소상공인", amount_max: 42000000, self_burden: 0.3, cash_ratio: 0.5, segment: "small", industryOnly: "manufacturing" },
  { name: "데이터바우처_구매", amount_max: 5000000, segment: "small" },
  { name: "판로개척_소상공인", amount_max: 20000000, self_burden: 0.2, segment: "small" },
  { name: "IP나래", amount_max: 17500000, support_ratio: 0.5, segment: "sme" },
  { name: "관광기업혁신바우처", amount_min: 20000000, amount_max: 100000000, segment: "both" },
  { name: "로컬크리에이터", self_burden: 0.2, segment: "small" },
];

// 소상공인/중소기업 세그먼트 판정 (대표님 기준: 소상공인은 소상공인용만, 중소기업은 중소기업용만)
//  - is_small_business 명시값 우선
//  - 없으면: 법인이거나 매출 5억 이상이면 중소기업(sme), 그 외 소상공인(small)
export function resolveSegment(company: Company): "small" | "sme" {
  if (company.is_small_business === true) return "small";
  if (company.is_small_business === false) return "sme";
  const rev = company.annual_revenue ?? 0;
  if (company.biz_type === "corp") return "sme";
  if (rev >= 500000000) return "sme";
  return "small";
}

export function matchGovPrograms(company: Company): GovProgram[] {
  const age = company.ceo_age ?? 999;
  const years_in_business = company.years_in_business ?? 999;
  const { is_pre_founder, is_re_founder, has_mainbiz } = company;
  const segment = resolveSegment(company);
  const cat = normalizeIndustry(company.industry);
  const matched: GovProgram[] = [];

  GOV_SUPPORT_2026.forEach((p) => {
    let eligible = true;
    if (p.age_max !== undefined && age > p.age_max) eligible = false;
    if (p.years_max !== undefined && years_in_business > p.years_max) eligible = false;
    if (p.years_min !== undefined && years_in_business <= p.years_min) eligible = false;
    if (p.condition === "is_pre_founder" && !is_pre_founder) eligible = false;
    if (p.condition === "is_re_founder" && !is_re_founder) eligible = false;
    if (p.condition === "has_mainbiz" && !has_mainbiz) eligible = false;

    // ── 세그먼트 필터: 소상공인에겐 소상공인용만, 중소기업에겐 중소기업용만 ──
    if (p.segment && p.segment !== "both" && p.segment !== segment) eligible = false;
    // ── 업종 전용 필터: 제조업 전용 사업은 제조업에만 ──
    if (p.industryOnly === "manufacturing" && cat !== "manufacturing") eligible = false;

    if (eligible) matched.push(p);
  });

  return matched;
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
    disclaimer: ADVISORY_DISCLAIMER,
    revalidation: REVALIDATION_NOTICE,
  };
}
