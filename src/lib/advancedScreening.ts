// ─────────────────────────────────────────────────────────────────────────
//  추가 판정 레이어 (Advanced Screening Layer)
//  ⚠️ 이 파일은 기존 matching.ts 의 결과도출 로직을 절대 수정하지 않습니다.
//     matchPrograms() 로 나온 결과 "뒤에" 후처리로만 얹는 8개 블록입니다.
//
//  [필수 준수 사항]
//   - 본 결과는 자문 정보이며 대출 승인을 보장하지 않습니다.
//   - 금지 표현: 금융알선 / 대출보장 / 승인보장  (코드·문구에서 사용 금지)
//   - 모든 데이터는 매월 재검증이 필요합니다. (출처 태그 부착)
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
  industry?: string; // 업종 (제조업/도소매업/음식점업/서비스업/수출업/기타) - 복수선택 시 첫 번째
  industries_all?: string[]; // 진단에서 고른 업종 전체(재단 우선 취급업종 판정용, 선택)
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
  has_rnd_center?: boolean; // 기업부설연구소·연구개발전담부서 보유
  has_venture_cert?: boolean; // 벤처기업 인증
  has_innobiz?: boolean; // 이노비즈 인증
  has_mainbiz?: boolean; // 메인비즈 인증
  is_innovation_area?: boolean; // 혁신성장 공동기준 9개 테마 해당(→ 직원수 무관 중진공·기보 자격 확대)
  region?: string; // 사업장 소재 지역(재단 지역 안내용)
  has_collateral?: boolean; // 부동산·기계장비 담보 보유
  current_institutions?: string[]; // 현재 이용 중인 보증·정책기관(중복배제 판단용)
  purposes?: string[]; // 상담 목적(운전/시설/수출/창업 등) - 매칭 힌트
  tax_delinquent?: boolean; // 국세/지방세 체납
  insurance_4_delinquent?: boolean; // 4대보험 체납
  full_capital_impairment?: boolean; // 완전자본잠식
  revenue_drop_yoy_pct?: number; // 전년比 매출 감소율(%)
  ceo_changed_1y?: boolean; // 최근 1년 내 대표자·실제경영자 변경
  is_pre_founder?: boolean; // 예비창업자
  is_re_founder?: boolean; // 재창업자(파산·회생 면책/인가 완료자)
  // 파산·회생 상태: "none"(해당없음) | "ongoing"(진행중·결제차단) | "discharged"(면책·인가 완료)
  //  대표님 실무 기준:
  //   · discharged → 정책자금은 면책/인가 후 3년 경과해야 가능(기관이 채권자면 사실상 평생 제한),
  //     정부지원금·인증은 즉시 가능. 실익 낮은 일반 정책자금은 빼고 재기 전용 프로그램만 안내.
  bankruptcy_status?: "none" | "ongoing" | "discharged";

  // ── 업종·규모 기반 추천 필터용 (대표님 실무 기준) ──
  biz_type?: "personal" | "corp"; // 사업자 유형 (개인/법인)
  employee_count?: number; // 4대보험 가입 상시직원 수
  is_small_business?: boolean; // 소상공인 여부(매출·업종 기준) - 미지정 시 매출로 자동 추정
  is_exporter?: boolean; // 수출 여부 (100만원이라도 수출 실적 있으면 true)
  is_tourism?: boolean; // 관광사업체 등록 여부 (관광기업 바우처 자격)
  uses_smart_tech?: boolean; // 스마트기기(키오스크·무인판매기·서빙로봇·POS 등) 사용 → 혁신성장촉진자금(일반형) 대상

  // ── 소진공/기관 상품 정밀 필터용 (3단계 조건부 질문에서 수집) ──
  //   대표님 요청: 이 신호들로 소진공 10개 상품 중 '해당되는 것만' 골라 노출.
  revenue_growth_2y?: boolean; // 최근 2년 연속 매출 각 10% 이상 성장 → 혁신형(성장)
  has_smart_factory?: boolean; // 스마트공장 구축·운영 → 혁신형(스마트공장)
  gov_selected_program?: boolean; // 강한소상공인·로컬크리에이터·TIPS 등 정부사업 선정 이력 → 혁신형(선정)/민간투자
  policy_fund_good_standing?: boolean; // 기존 정책자금 성실상환 중 또는 졸업후보 → 혁신형(졸업후보)
  wants_refinance?: boolean; // 고금리 대출을 저금리로 전환 희망 → 대환대출
  has_private_investment?: boolean; // 민간투자(VC/엔젤) 유치 → 민간투자연계형 매칭융자

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

// 출처 태그 (UI 표시용) - 각 판정 결과에 부착
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
  "본 데이터는 매월 초 정부·기관 공고 기준으로 재검증됩니다.";

export const ADVISORY_DISCLAIMER =
  "본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며, 정부지원사업 승인을 보장하지 않습니다. 실제 승인 여부·한도·금리는 각 정부 기관 심사 결과에 따릅니다.";

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
//  【BLOCK 2】이용 가능 기관 매칭 (업종·규모 기준 - 대표님 실무 기준)
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
  exclusiveNote?: string; // 중복 신청 불가 안내(신보·기보 둘다 자격일 때 등)
  alreadyUsing?: boolean; // 현재 이용 중인 기관(중복배제 판단 참고용)
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

// ─────────────────────────────────────────────────────────────────
//  【지역신용보증재단 우선 취급대상 업종】 (대표님 기준 - 신보→재단 이관 업종)
//   신용보증기금이 "가계 유지 목적 생계형 업종"은 재단으로 내려보내므로,
//   이 업종에 해당하면 매출 규모가 커도 신보가 아니라 '재단 우선'으로 안내한다.
//   출처: 지역신용보증재단 우선 취급대상 업종 안내
//    ① 소매 관련(슈퍼마켓·편의점·의류·화장품·문구·서점·반려동물용품·자동판매기 등)
//    ② 생계형 운송(택시·전세버스·개인화물차·늘찬배달)
//    ③ 음식·숙박(음식점·주점·치킨·떡집·커피전문점·고시원·민박·여관 등)
//    ④ 기타 가계 서비스(부동산중개·당구장·PC방·노래방·세탁·미용·목욕·기원 등)
//   ⚠️ 이 판정은 '신보 vs 재단' 우선순위만 바꾸는 후처리이며,
//      기술기업(기보 우선)·수출·중진공·소진공 병행 로직은 건드리지 않는다.
const JAEDAN_PRIORITY_KEYWORDS: string[] = [
  // ① 소매 관련
  "소매", "도소매", "슈퍼", "편의점", "마트", "의류", "화장품", "잡화", "문구", "서점",
  "반려", "애견", "펫", "자동판매기", "판매업", "판매점", "유통",
  // ② 생계형 운송
  "택시", "전세버스", "화물", "배달", "퀵", "대리운전", "운송", "운수",
  // ③ 음식·숙박
  "음식", "외식", "식당", "치킨", "떡집", "빵집", "제과", "카페", "커피", "주점", "호프",
  "포차", "술집", "고시원", "민박", "여관", "숙박", "펜션", "모텔", "게스트",
  // ④ 기타 가계 서비스
  "부동산중개", "공인중개", "중개", "당구", "노래방", "노래연습", "pc방", "피시방",
  "게임방", "오락", "세탁", "미용", "네일", "피부", "이용원", "목욕", "사우나", "찜질",
  "기원", "무도장", "체력단련", "헬스", "요가", "필라테스", "스터디카페", "만화방",
];

// 재단 우선 취급업종인지 판정 (업종 문자열 substring 매칭)
//  ※ '제조'·'수출'·'기술/혁신'이 포함되면 재단 우선에서 제외(그쪽 트랙이 우선).
//  ※ 복수 업종을 넘기면(문자열|배열) 하나라도 재단 우선 업종이면 true.
export function isJaedanPriorityIndustry(industry?: string | string[]): boolean {
  const list = Array.isArray(industry) ? industry : [industry];
  return list.some((raw) => {
    const s = (raw || "").replace(/\s/g, "").toLowerCase();
    if (!s) return false;
    // 제조·기술·수출 성격이 명시되면 그 업종은 재단 우선 판정에서 빠진다(오분류 방지)
    if (s.includes("제조") || s.includes("수출") || s.includes("기술") || s.includes("혁신"))
      return false;
    return JAEDAN_PRIORITY_KEYWORDS.some((kw) => s.includes(kw.toLowerCase()));
  });
}

// 큐레이션용 업종 대분류(IndustryKind) 산정 - 수출 여부를 최우선으로 반영.
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
//  - 800점 이상: 양호 (대부분 승인율 높음)
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

// ── 기술기업(기보 트랙) 판정 ─────────────────────────────────────
//  대표님 기준: 기보(기술보증기금)는 아래 신호가 있는 기업에 안내한다.
//   - 업종 자체가 제조/기술혁신(로봇·AI·바이오·반도체 등)
//   - 수출업(수출기업은 기술평가 보증 대상)
//   - 실증 기술 인증 보유: 특허·기업부설연구소·벤처인증·이노비즈
//   - 혁신성장 공동기준 9개 테마에 '실제로 해당'하는 기업(is_innovation_area)
//   - 동종업계 기술경력 보유(has_tech_career)
//
//  ★ 중요 ★ is_innovation_area 는 진단에서 '해당 없음'을 고르면 false 로 계산된다
//   (supportPrograms.ts 에서 '해당 없음'을 걸러 처리). 따라서 사용자가 혁신분야
//   '해당 없음/없음'을 선택하면 이 신호로 기보가 열리지 않는다.
//   → 음식점·서비스·도소매인데 혁신분야도 '해당 없음'이면 기보 대상 아님(재단·신보로 안내).
export function isTechCompany(company: Company): boolean {
  const cat = normalizeIndustry(company.industry);
  // 1) 업종 자체가 제조·기술혁신
  if (cat === "manufacturing" || cat === "tech_innov") return true;
  // 2) 수출업(수출기업은 기술평가 보증 대상)
  if ((company.industry || "").includes("수출") || company.is_exporter === true) return true;
  // 3) 실증 기술 인증 / 실제 혁신분야 해당 / 기술경력
  return Boolean(
    company.has_patent ||
      company.has_rnd_center ||
      company.has_venture_cert ||
      company.has_innobiz ||
      company.is_innovation_area ||
      company.has_tech_career
  );
}

// 이용 가능 기관 판정 - 업종·직원수·수출·기술·규모 기준 + 신청 권장 순서 + 중복배제
export function matchInstitutions(company: Company): CreditMatch[] {
  const matches: CreditMatch[] = [];
  const cat = normalizeIndustry(company.industry);
  const employees = company.employee_count ?? 0;
  const isExport = (company.industry || "").includes("수출") || company.is_exporter === true;
  const segment = resolveSegment(company);
  const revenue = company.annual_revenue ?? 0;
  const isBizCorp = company.biz_type === "corp";
  const isManufacturingCore = cat === "manufacturing" || cat === "tech_innov"; // 업종 자체가 제조·기술
  const isTech = isTechCompany(company);
  // 재단 우선 취급업종 판정 입력: 복수 업종 전체(있으면) 아니면 단일 업종
  const jaedanIndustryInput =
    (company.industries_all && company.industries_all.length > 0)
      ? company.industries_all
      : company.industry;
  // 신보 자격(비기술): 연매출 5억↑ (대표님: 직원 5명은 선호일 뿐 필수 아님, 1명도 승인)
  const qualifiesSinbo = revenue >= 500000000 || segment === "sme";
  // 청년(만39세 이하)
  const isYoung = typeof company.ceo_age === "number" && company.ceo_age <= 39;
  // ── 청년전용창업자금 자격(팩트체크 반영) ──
  //   공식 요건(bizinfo·중진공 공고): 대표자 만 39세 이하 "그리고" 업력 3년 미만.
  //   (특례: 창업성공패키지·기보 청년보증·VC투자 등은 업력 7년 미만까지 인정)
  //   → 나이만 보고 노출하던 기존 버그 수정. 업력 미상이면 노출하지 않음(과대추천 방지).
  const yib = company.years_in_business;
  const qualifiesYouthFund =
    isYoung && typeof yib === "number" && yib < 3;
  // 특례(업력 7년 미만)까지 열어둘 여지가 있는 경계 구간 (39세↓ + 업력 3~7년)
  const youthFundSpecialMaybe =
    isYoung && typeof yib === "number" && yib >= 3 && yib < 7;

  // ── 재도전자(파산·회생 면책·인가 완료) → 일반 정책자금(보증·직접대출) 제외 ──
  //   대표님: 면책/인가 후 3년 경과해야 정책자금 가능(기관이 채권자였으면 사실상 평생 제한).
  //   재도전특별자금 등 재기 전용·정부지원금·인증만 안내(govPrograms 별도).
  if (company.bankruptcy_status === "discharged") {
    return [
      {
        institution: "소상공인시장진흥공단",
        criteria:
          "재도전 전용 안내 - 재도전특별자금(재창업·채무조정 성실상환자)이 대상입니다. 일반 정책자금·보증은 면책·인가 후 3년이 경과해야 가능하며, 해당 기관이 채권자였던 경우에는 제한될 수 있습니다.",
        priority: "MEDIUM",
        loan_type: "직접대출",
        step: 1,
      },
    ];
  }

  // 현재 이용 중인 기관(중복배제 참고): 사용자가 진단에서 선택한 기관
  const using = (company.current_institutions || []).map((s) => s.replace(/\s/g, ""));
  const usingKodit = using.some((s) => s.includes("신용보증기금"));
  const usingKibo = using.some((s) => s.includes("기술보증기금"));
  const usingJaedan = using.some((s) => s.includes("신용보증재단") || s.includes("재단"));

  // ─────────────────────────────────────────────────────────────────
  //  【중복배제 핵심 규칙】 (대표님 기준)
  //   신보·기보·재단은 같은 신용보증이라 원칙적으로 "하나만" 신청.
  //    - 기술기업 → 기보 우선 (재단·신보 X)
  //    - 비기술 + 매출 5억↑ → 신보 우선 (기보·재단 X)
  //    - 비기술 + 매출 5억↓ → 재단 우선 (신보·기보 X)
  //   ★ 예외: 기술기업 + 매출 규모(5억↑ 또는 sme)까지 있으면
  //           신보·기보 "둘 다" 자격 → 둘 다 안내하되 '중복 신청 불가' 명시.
  //   ★ 소진공·중진공은 보증기관이 아니라 정책자금(직접대출)이라 병행 가능.
  //   ★ 무역보험공사는 수출 전용 + 한도 별도라 항상 병행 가능.
  // ─────────────────────────────────────────────────────────────────

  const DUP_NOTE =
    "⚠️ 신용보증기금·기술보증기금은 2005년 업무협약에 따라 중복 보증이 제한됩니다(한 기업이 두 곳 동시 보증은 원칙적으로 불가). 두 곳 모두 자격이 되면 유리한 1곳만 선택해 신청하시면 됩니다 (기술력 강점 → 기보 / 매출·규모 강점 → 신보).";

  // ── 제조·기술기업 중 '신보 자격(매출 5억↑ 또는 중소기업 규모)'까지 갖춘 경우 ──
  //   대표님 실무 기준: 제조·혁신성장 기업은 기보·신보 "둘 다" 자격이 열린다.
  //   → 둘 다 안내하되, 2005년 협약상 중복 보증이 제한되므로 "둘 중 1곳 택1"임을 명시.
  //   (매출·규모가 없는 소액 기술기업은 아래 isTech 분기에서 기보 단독으로 안내)
  const techWithScale = isTech && (revenue >= 500000000 || segment === "sme");

  if (techWithScale) {
    matches.push({
      institution: "기술보증기금",
      criteria: isManufacturingCore
        ? "제조업은 기술보증기금부터 접근하는 것이 유리합니다. 기술평가 기반이라 매출이 낮아도 보증이 가능합니다.\n기업 인증 등 가점사항이 없어도 우선 신청 후, 부결 시 특허·벤처·이노비즈를 보완해서 재신청하세요."
        : "기술력(특허·연구소·벤처·이노비즈·혁신성장·대표 경력) 기반 보증이라, 매출이 낮아도 보증이 가능합니다.",
      priority: "TECH_BASED",
      loan_type: "대리대출",
      step: 1,
      exclusiveNote: DUP_NOTE,
      alreadyUsing: usingKibo,
    });
    matches.push({
      institution: "신용보증기금",
      criteria: "제조·혁신성장 기업이면서 매출·규모 요건도 충족해 신용보증기금도 자격이 됩니다(한도가 큰 편).\n단, 기술보증기금과 둘 중 1곳만 선택해 신청하세요.",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 1,
      exclusiveNote: DUP_NOTE,
      alreadyUsing: usingKodit,
    });
  } else if (isTech) {
    // ── 제조업 포함 기술기업 → 기보 단독 우선 (신보·재단 X) ──
    matches.push({
      institution: "기술보증기금",
      criteria: isManufacturingCore
        ? "제조업은 기술보증기금부터 접근하는 것이 유리합니다. 기술평가 기반이라 매출이 낮아도 보증이 가능합니다.\n기업 인증 등 가점사항이 없어도 우선 신청 후, 부결 시 특허·벤처·이노비즈를 보완해서 재신청하세요."
        : "기술력(특허·상표·연구소·벤처·이노비즈·혁신성장·대표 경력) 기반 보증입니다. 매출이 낮아도 승인 가능성이 있습니다(신용보증기금·재단과 중복 불가).",
      priority: "TECH_BASED",
      loan_type: "대리대출",
      step: 1,
      alreadyUsing: usingKibo,
    });
  } else if (qualifiesSinbo && !isJaedanPriorityIndustry(jaedanIndustryInput)) {
    // ── 비기술 + 매출 5억↑ + (재단 우선 취급업종 아님) → 신보 우선 (기보·재단 X) ──
    matches.push({
      institution: "신용보증기금",
      criteria: "연매출 5억원 이상·신용점수 양호하면 신용보증기금이 우선입니다(재단과 중복 불가).\n매출 기반 보증이라 한도가 큰 편이며, 직원 수가 많을수록 유리합니다(필수는 아님).",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 1,
      alreadyUsing: usingKodit,
    });
  } else if (qualifiesSinbo && isJaedanPriorityIndustry(jaedanIndustryInput)) {
    // ── 재단 우선 취급업종 + 매출 5억↑(신보 자격 있음) → 신보 먼저 도전 → 부결 시 재단 ──
    //   대표님 실무 기준(중요): 재단을 먼저 받아버리면 중복 제한으로 신보는 심사조차 못 본다.
    //    → 한도 큰 신보를 '먼저' 두드려 승인되면 이득, 부결되면 재단으로 내려간다.
    //   ★ 생계형 업종이라 재단으로 이관될 여지는 있으나, 5억 이상 규모면
    //     신보 승인 가능성이 실재하므로 '신보 우선 + 재단 백업' 순서로 안내한다.
    matches.push({
      institution: "신용보증기금",
      criteria:
        "연매출 5억원 이상이면 생계형 업종이어도 신용보증기금 신청 자격이 됩니다.\n신용보증기금이 한도가 더 크므로 '먼저' 신청해 보는 것이 유리합니다.\n※ 재단을 먼저 받으면 중복 제한(신보·재단 동시 불가)으로 신보는 심사조차 못 볼 수 있으니, 큰 곳(신보)부터 두드리는 것이 순서입니다.",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 1,
      alreadyUsing: usingKodit,
    });
    matches.push({
      institution: "지역신용보증재단",
      criteria:
        "신용보증기금이 부결되면(생계형 업종은 재단으로 안내되는 경우가 많음) 지역신용보증재단으로 진행하세요.\n신보→재단은 '큰 곳 먼저, 안 되면 안전망' 순서입니다(신보·재단 중복 불가).\n창업 3개월·월매출 100만원 이상이면 특례보증도 가능합니다.",
      priority: "MEDIUM",
      loan_type: "대리대출",
      step: 2,
      alreadyUsing: usingJaedan,
    });
  } else if (isJaedanPriorityIndustry(jaedanIndustryInput)) {
    // ── 재단 우선 취급업종 + 매출 5억↓(신보 자격 없음) → 재단 단독 ──
    //   신보 규모 요건 미달이므로 처음부터 재단이 맞다.
    matches.push({
      institution: "지역신용보증재단",
      criteria:
        "소매·생계형운송·음식·숙박·가계서비스 등은 지역신용보증재단 우선 취급대상입니다.\n연매출 5억원 미만 소상공인은 신보 규모 요건에 못 미치므로 처음부터 재단이 맞습니다(신보·기보와 중복 불가).\n창업 3개월·월매출 100만원 이상이면 특례보증도 가능합니다.",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 1,
      alreadyUsing: usingJaedan,
    });
  } else {
    // ── 소상공인·소액 → 재단 우선 (신보·기보 X) ──
    matches.push({
      institution: "지역신용보증재단",
      criteria: "소상공인·소액(3천~5천만원)은 지역신용보증재단이 우선입니다(신보·기보와 중복 불가).\n사업장이 있으면 승인율이 높은 편이고, 창업 3개월·월매출 100만원 이상이면 특례보증도 가능합니다.",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 1,
      alreadyUsing: usingJaedan,
    });
  }

  // ── 중진공(직접대출) 병행 - 제조·혁신성장·수출·청년(39세↓)이면 직원 0명·개인도 OK ──
  //   대표님: 매출 하한 없음. 성장 방향성·자금 사용계획·대표 의지 종합 판단.
  const qualifiesJungjin =
    isManufacturingCore || company.is_innovation_area || isExport || qualifiesYouthFund || youthFundSpecialMaybe || employees >= 5;
  if (qualifiesJungjin) {
    const reasons: string[] = [];
    if (qualifiesYouthFund)
      reasons.push("만 39세 이하·업력 3년 미만(청년전용창업자금 자격)");
    else if (youthFundSpecialMaybe)
      reasons.push("만 39세 이하(창업성공패키지·기보 청년보증 등 특례 시 업력 7년 미만까지 청년전용창업자금 신청 가능)");
    if (isManufacturingCore) reasons.push("제조업");
    if (company.is_innovation_area) reasons.push("혁신성장 유형");
    if (isExport) reasons.push("수출기업");
    if (!reasons.length && employees >= 5) reasons.push("상시직원 5명 이상");
    matches.push({
      institution: "중소벤처기업진흥공단",
      criteria: `${reasons.join(" · ")} · 대리대출과 병행이 가능합니다.\n성장 계획·자금 사용처·대표 의지를 종합 심사를 진행합니다.`,
      priority: "HIGH",
      loan_type: "직접대출",
      step: 2,
    });
  }

  // ── 소진공(직접대출) 병행 - 소상공인 규모 or 제조업 추가자금 or 스마트기기 도입 ──
  //   대표님: 소상공인 대부분 + 중진공 받은 제조업 추가자금 + 스마트기기 도입(혁신성장촉진자금 일반형).
  //   상품별 승인율은 결과창 상품 아코디언에 정직하게 명시.
  if (segment === "small" || isManufacturingCore || company.uses_smart_tech) {
    matches.push({
      institution: "소상공인시장진흥공단",
      criteria:
        "중진공 직접대출을 이미 받은 기업도 병행할 수 있으며, 소진공 대리대출도 함께 진행할 수 있습니다.\n※ 지역별 편차가 크며, 실제 승인 여부는 대표자의 신용·매출·상환여력을 종합해 판단합니다.",
      priority: "MEDIUM",
      loan_type: "직접대출",
      step: 3,
    });
  }

  // ── 무역보험공사 - 수출실적증명원 발급 기업(법인 선호, BB+ 이상 승인율 높음) ──
  if (isExport) {
    matches.push({
      institution: "한국무역보험공사",
      criteria: isBizCorp
        ? "수출실적증명원을 발급받은 법인은 선적전·선적후 수출신용보증을 신청할 수 있습니다.\n기업등급 BB+ 이상이면 승인율이 높은 편이며, 그 아래 등급도 신청은 가능합니다.\n※ 신보·기보 등 다른 기관의 한도와 별개로 병행 활용할 수 있습니다."
        : "수출실적증명원을 발급받으면 신청할 수 있습니다 (법인을 선호합니다).\n※ 다른 기관의 한도와 별개로 병행 활용할 수 있습니다.",
      priority: "HIGH",
      loan_type: "대리대출",
      step: 9,
    });
  }

  // 대표님 지정 안내 순서로 항상 고정 정렬
  //  [대리대출] 지역신용보증재단 → 신용보증기금 → 기술보증기금
  //  [직접/대리] 중소벤처기업진흥공단 → 소상공인시장진흥공단
  //  [대리대출/기타] 무역보험공사 → 농신보 → 기타 공공기관
  const INSTITUTION_ORDER = [
    "재단", // 지역신용보증재단 (대리)
    "신용보증기금", // (대리)
    "기술보증기금", // (대리)
    "중소벤처기업진흥공단", // (직접/대리)
    "소상공인시장진흥공단", // (직접/대리)
    "무역보험공사", // (대리/기타)
    "농신보", // (대리/기타)
  ];
  const orderIdx = (name: string) => {
    const idx = INSTITUTION_ORDER.findIndex((k) => name.includes(k));
    return idx === -1 ? 99 : idx;
  };
  // 1차: step(신청 순서) 오름차순 → '신보 먼저 → 재단 백업'처럼 step으로 지정한 순서를 존중.
  //      (재단 우선 취급업종 + 매출 5억↑ 케이스에서 신보 step1 이 재단 step2 보다 위로 온다)
  // 2차: 같은 step 내에서는 기존 기관 고정 순서(INSTITUTION_ORDER) 유지.
  matches.sort((a, b) => {
    const sa = a.step ?? 50;
    const sb = b.step ?? 50;
    if (sa !== sb) return sa - sb;
    return orderIdx(a.institution) - orderIdx(b.institution);
  });
  return matches;
}

// ── 승인 시기(월별) 안내 (대표님 실무 기준) ──
//  1~6월: 승인율 높음 / 7~9월: 추경, 일부 / 10~12월: 어려움
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

// 하위호환용 래퍼 (신용점수만 넘어오는 기존 호출부 대비) - 내부적으로 미사용
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

// 한글 업종명("제조업"·"음식점업" 등)을 대출한도 비율 키로 변환한다.
//  ⚠️ 과거 버그: company.industry는 '한글 원문'인데 INDUSTRY_LOAN_RATIOS 키는 영문이라
//     INDUSTRY_LOAN_RATIOS["제조업"] === undefined → 항상 0.1(1/10)로 폴백됨.
//     제조업 고객의 한도가 1/4(0.25) 대신 1/10으로 잘못 계산되던 문제 → normalizeIndustry로 정규화.
function loanRatioForIndustry(industry: string): number {
  const cat = normalizeIndustry(industry); // manufacturing/tech_innov/retail_food/service/etc
  if (cat === "manufacturing") return INDUSTRY_LOAN_RATIOS.manufacturing; // 제조 = 1/4
  if (cat === "retail_food") return INDUSTRY_LOAN_RATIOS.wholesale; // 도소매·음식 = 1/6
  // tech_innov·service·etc → 서비스/기타 기준 1/10
  return INDUSTRY_LOAN_RATIOS.service;
}

export function calculateLoanLimit(industry: string, annual_revenue: number): LoanLimitResult {
  const ratio = loanRatioForIndustry(industry);
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
//  ⚠️ 매월 기업마당(bizinfo.go.kr) 공고로 재검증 필요
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

// 업종 대분류 (큐레이션 기준용) - normalizeIndustry 결과와 1:1 매칭
export type IndustryKind = "food" | "retail" | "export" | "manufacturing" | "service" | "etc";

export const GOV_SUPPORT_2026: GovProgram[] = [
  // 창업(예비·초기) - 예비창업자/재창업자·나이·업력 조건이 붙어 해당자만 노출됨
  { name: "예비창업패키지", amount_max: 100000000, condition: "is_pre_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  { name: "초기창업패키지", amount_max: 100000000, years_max: 3, self_burden: 0.3, segment: "both", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "청년창업사관학교", amount_max: 100000000, age_max: 39, years_max: 3, segment: "both", isStartupProgram: true, applyUrl: "https://start.kosmes.or.kr" },
  { name: "청년창업사관학교_경험창업자", amount_max: 100000000, age_max: 39, years_max: 7, segment: "both", isStartupProgram: true, applyUrl: "https://start.kosmes.or.kr" },
  { name: "생애최초창업", amount_max: 70000000, age_max: 29, condition: "is_pre_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  { name: "공공기술창업", amount_max: 70000000, age_max: 39, condition: "is_pre_founder", segment: "both", requiresTech: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "신사업창업사관학교", amount_max: 40000000, condition: "is_pre_founder", segment: "small", fitTags: ["food", "retail", "service"], applyUrl: "https://edu.sbiz.or.kr" },
  { name: "재도전성공패키지", amount_max: 100000000, years_max: 7, condition: "is_re_founder", segment: "both", applyUrl: "https://www.k-startup.go.kr" },
  // 중소기업(도약·글로벌·스마트공장 등) - segment: sme
  { name: "글로벌창업사관학교", amount_max: 150000000, years_max: 7, segment: "sme", requiresTech: true, isStartupProgram: true, requiresExport: true, fitTags: ["export"], applyUrl: "https://start.kosmes.or.kr" },
  { name: "창업도약패키지_일반형", amount_max: 300000000, years_min: 3, years_max: 7, segment: "sme", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "창업도약패키지_대기업협업형", amount_max: 200000000, years_min: 3, years_max: 7, segment: "sme", isStartupProgram: true, applyUrl: "https://www.k-startup.go.kr" },
  { name: "스마트공장", amount_per_task: 100000000, amount_max_total: 700000000, self_burden: 0.3, segment: "sme", industryOnly: "manufacturing", fitTags: ["manufacturing"], applyUrl: "https://www.smart-factory.kr" },
  // 수출바우처 - 수출기업만 (수출 체크 시에만 노출)
  { name: "수출바우처_중기부", amount_min: 30000000, amount_max: 100000000, self_burden_min: 0.3, self_burden_max: 0.5, segment: "sme", requiresExport: true, fitTags: ["export"], applyUrl: "https://www.exportvoucher.com/portal/sample/main" },
  // ── R&D 지원사업은 정책자금 매칭 대상에서 항상 제외 (대표님 기준) ──
  // (창업성장기술개발 디딤돌/전략형/시장확대/시장대응 등은 안내하지 않음)
  // ── 데이터바우처는 '데이터 활용 목적' 기업 한정 → 일반 매칭에서 제외 (대표님 기준) ──
  { name: "혁신형중소기업_방송광고_TV", amount_max: 45000000, self_burden: 0.5, condition: "has_mainbiz", segment: "sme", applyUrl: "https://www.kobaco.co.kr" },
  { name: "혁신형중소기업_방송광고_라디오", amount_max: 3000000, self_burden: 0.7, condition: "has_mainbiz", segment: "sme", applyUrl: "https://www.kobaco.co.kr" },
  // 소상공인(강한소상공인·판로·희망리턴·스마트제조 등) - segment: small
  { name: "희망리턴패키지_경영개선", amount_max: 40000000, segment: "small", requiresReFounder: true, applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "희망리턴패키지_재창업", amount_max: 44000000, segment: "small", requiresReFounder: true, applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_로컬브랜드", amount_max: 100000000, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_온라인셀러", amount_max: 50000000, segment: "small", requiresOperating: true, fitTags: ["retail", "food"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "강한소상공인_글로벌", amount_max: 100000000, segment: "small", requiresExport: true, requiresOperating: true, fitTags: ["export"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  { name: "스마트제조_소상공인", amount_max: 42000000, self_burden: 0.3, cash_ratio: 0.5, segment: "small", industryOnly: "manufacturing", requiresOperating: true, fitTags: ["manufacturing"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  // 스마트상점 기술보급 - 운영 중인 오프라인 소상공인 매장(음식·도소매·서비스)에 키오스크·서빙로봇·스마트기기 도입 지원
  { name: "스마트상점_기술보급", amount_max: 5000000, self_burden: 0.3, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz.or.kr/smst/index.do" },
  { name: "판로개척_소상공인", amount_max: 20000000, self_burden: 0.2, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  // IP나래 - 창업 7년 이내 + 기술(특허 등) 보유 중소기업만
  { name: "IP나래", amount_max: 17500000, support_ratio: 0.5, years_max: 7, segment: "sme", requiresTech: true, fitTags: ["manufacturing", "export"], applyUrl: "https://pms.ripc.org" },
  // 관광기업혁신바우처 - 관광사업체만
  { name: "관광기업혁신바우처", amount_min: 20000000, amount_max: 100000000, segment: "both", requiresTourism: true, applyUrl: "https://www.tourbiz.or.kr" },
  { name: "로컬크리에이터", self_burden: 0.2, segment: "small", requiresOperating: true, fitTags: ["food", "retail", "service"], applyUrl: "https://www.sbiz24.kr/#/combinePbancList" },
  // ── 업종·기술·수출 조건 없이 폭넓게 신청 가능한 범용 사업 (대표님 "최대한 많이 알맞게" 방침) ──
  //   ★ 운영 중인 기존 사업자(예비창업 제외)라면 업종 무관하게 실질 신청 가능한 검증 사업.
  //   일반 중소기업(서비스·도소매 등 비수출·비기술)이 매칭 결과가 비지 않도록 커버리지 확보.
  // 중소기업 컨설팅·경영지원(비즈니스지원단 등) - 운영 중 중소기업 공통
  { name: "중소기업_경영컨설팅지원", amount_max: 30000000, segment: "sme", requiresOperating: true, applyUrl: "https://www.mss.go.kr" },
  // 정규직 전환·일자리 창출 연계(고용부·중기부 공통) - 운영 중 사업자 공통
  { name: "일자리창출_고용지원", amount_max: 10000000, segment: "both", requiresOperating: true, applyUrl: "https://www.work24.go.kr" },
  // 스마트서비스 바우처(비대면 서비스 도입) - 운영 중 중소·소상공인 공통
  { name: "스마트서비스_바우처", amount_max: 4000000, self_burden: 0.3, segment: "both", requiresOperating: true, applyUrl: "https://www.smart-factory.kr" },
  // 중소기업 정책자금(운전·시설) 연계 안내 - 운영 중 중소기업 공통(직접대출 정책자금)
  { name: "중소기업_정책자금(운전·시설)", amount_max: 1000000000, segment: "sme", requiresOperating: true, applyUrl: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do" },
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
// ── 기관 내 개별 상품(아코디언으로 펼쳐지는 상품 카드) ─────────────
//  대표님 요청: 같은 기관 안에서 여러 상품을 신청할 수 있으면
//  신용보증재단 '상품 바로보기'처럼 클릭 시 쭈르륵 펼쳐지고 각 상품별로 신청.
// ── 상품 성격 배지 (대표님 기준) ─────────────────────────────────
//  자금이 어떻게 나오는지 한눈에 안내(직접대출 / 대리대출 / 보험).
//   · 직접대출 = 공단(소진공·중진공)과 직접 약정 후 공단이 직접 대출 실행(보증 불필요)
//   · 대리대출 = 확인서/보증서 받고 재단·신보·기보·무보 약정 → 은행 가서 대출 실행
//               (=보증부대출=보증서=확인서, 대표님 현장 용어로 '대리대출'로 통일)
//   · 보험     = 대출·보증이 아닌 '보험' 상품(예: 무보 단기수출보험 - 수입자 미결제
//               손실을 보상). 자금이 나오는 대출이 아니므로 별도 표기(대표님 확정).
//  ※ 이 판정은 결과 '표시' 단계 후처리이며 매칭 스코어링 로직과 무관하다.
export type LoanNature = "직접대출" | "대리대출" | "보험";

// 기관 기본 성격 - 상품에 nature가 지정되지 않았을 때의 폴백.
//   중진공 = 직접대출(2026 융자사업 안내 팩트: 창업기반·청년전용·개발기술·신시장·
//            신성장·제조현장스마트화·Net-Zero·재도약·일시적경영애로 모두 직접대출)
//   신보·기보·무보 = 대리대출(보증서/연대보증서 발급 → 은행 대출), 재단 = 대리대출(보증부)
export function loanNatureOf(institution: string): LoanNature {
  const s = (institution || "").replace(/\s/g, "");
  if (s.includes("중소벤처기업진흥공단")) return "직접대출";
  // 소진공은 상품마다 성격이 갈린다(SMAN018M 공식표):
  //   직접대출표 = 혁신성장촉진·민간투자연계·상생성장·일시적경영애로·신용취약·재도전
  //   대리대출표 = 소공인특화·일반경영안정·긴급경영안정·장애인기업·청년고용연계·대환
  // 기관 기본값은 '직접대출'(직접대출표가 더 많음)로 두고, 대리 상품은 상품별 nature로 개별 지정.
  if (s.includes("소상공인시장진흥공단")) return "직접대출";
  // 신용보증기금·기술보증기금·무역보험공사(연대보증)·지역신용보증재단 → 대리대출(보증부)
  return "대리대출";
}

export type InstitutionProduct = {
  name: string; // 상품명 (예: 혁신성장촉진자금)
  amount?: string; // 한도 (예: "운전 1억 · 시설 5억")
  desc?: string; // 한 줄 설명 (누가·어떤 조건)
  approval?: "high" | "mid" | "low"; // 승인율 감(정직 안내용)
  approvalNote?: string; // 승인율 관련 솔직한 안내
  applyUrl?: string; // 이 상품 신청·안내 페이지
  hookNote?: string; // 후킹/주의 안내 (예: 대상 많지만 승인율 낮음)
  // ★ 상품 성격 배지 (대표님 기준) - 같은 기관 안에서도 상품마다 다를 수 있어 상품 단위로 지정 ★
  //   직접대출 = 공단과 직접 약정 후 공단이 직접 대출 실행(보증 불필요)
  //   대리대출 = 확인서/보증서 받고 재단·신보·기보·무보 약정 → 은행 가서 대출 실행(=보증부대출)
  //   미지정 시 loanNatureOf(기관명)로 기관 기본 성격 판별.
  nature?: LoanNature | LoanNature[]; // 둘 다 가능하면 배열(예: 민간투자연계형)
  // ★ 상품별 노출 조건 (대표님 요청: 해당 안 되는 상품은 아예 숨김) ★
  //   함수가 있으면 true를 반환하는 상품만 결과창에 노출.
  //   없으면(=조건 미지정) 그 기관에 해당되는 모든 고객에게 항상 노출(기본 상품).
  eligibleWhen?: (c: Company) => boolean;
};

// 상품 목록을 고객 조건으로 필터링 (eligibleWhen 없으면 항상 포함)
//  ★ 대표님 요청: 해당되지 않는 상품은 아예 숨겨서 "내 것만" 보이게 ★
export function filterProducts(
  products: InstitutionProduct[] | undefined,
  company: Company
): InstitutionProduct[] {
  if (!products) return [];
  // 1) 자격 조건(eligibleWhen)에 맞는 상품만 남긴다.
  const eligible = products.filter((p) =>
    p.eligibleWhen ? p.eligibleWhen(company) : true
  );
  // 2) ★ 승인율 낮은(low) 상품은 결과에서 제거한다 (대표님 방침:
  //    "안 될 것 같은 공고는 지워서, 고객이 잘못된 선택을 하지 않게").
  //    ※ 매칭 스코어링 로직은 건드리지 않고, '표시 단계'에서만 걸러낸다.
  const withoutLow = eligible.filter((p) => p.approval !== "low");
  // 3) 안전장치 - low를 걷어내 남는 상품이 하나도 없으면(그 기관에
  //    high/mid가 전무한 경우) 원래 자격 상품은 유지해 '빈 기관'이 되지
  //    않게 한다. (기관 자체가 사라져 보이는 부작용 방지)
  return withoutLow.length > 0 ? withoutLow : eligible;
}

export type InstitutionLink = {
  match: string; // 기관명 부분일치 키
  siteUrl: string; // 공식 신청·안내 사이트
  siteLabel: string; // 버튼 라벨
  pdfUrl?: string; // 상품·보증 안내 자료(PDF/안내 페이지)
  pdfLabel?: string;
  manualUrl?: string; // 신청 매뉴얼(PDF) - 우리가 준비한 단계별 신청 가이드
  productName?: string; // 대표 상품명(네모칸 라벨) - 클릭 시 productUrl로 이동
  productUrl?: string; // 대표 상품 상세/안내 페이지
  products?: InstitutionProduct[]; // ★ 기관 내 여러 상품(아코디언으로 펼침) ★
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
  { label: "소상공인시장진흥공단 상품 바로보기", url: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do" },
  { label: "중소벤처기업진흥공단 상품 바로보기", url: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do" },
  { label: "신용보증기금 상품 바로보기", url: "/manuals/kodit-product-2026.pdf" },
  { label: "기술보증기금 상품 바로보기", url: "/manuals/kibo-product-2026.pdf" },
  { label: "신용보증재단 상품 바로보기", url: "https://www.koreg.or.kr/haedream/gu/gurt/selectGurtList.do?mi=1124" },
  { label: "무역보험공사 상품 바로보기", url: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do" },
];

// ── 예비창업자 전용 지원사업 (아직 사업자등록 전) ─────────────────
//  대표님 요청(Q5): '예비창업자' 체크한 고객에게만 결과 하단(사이트 바로가기 위)에
//  별도 아코디언으로 노출. 정책자금(대출)이 아니라 '사업화 자금(무상·바우처)' 중심이라
//  기관별 대출상품 아코디언과 분리해 안내한다.
//  ※ 명칭·지원금·신청URL은 2026 공식 공고(K-Startup·중진공·소진공) 기준.
export type PreFounderProgram = {
  name: string; // 정확 명칭
  amount: string; // 지원금(최대·평균)
  target: string; // 지원대상(연령·업력 조건)
  detail: string; // 지원내용 한 줄
  siteUrl: string; // ① 공식 사이트 바로가기(공고 상세)
  manualUrl?: string; // ② 신청 매뉴얼 PDF(있는 경우만)
  // ★ 자격 판정 키(대표님 요청) ★ 진단 프로필로 '해당되는 사람만 먼저 펼치고' 나머지는
  //   '더 보기'로 접기 위한 식별자. 표시 데이터(위 필드들)는 그대로, 판정 로직은
  //   isPreFounderEligible()에서 이 key로만 분기한다. (matching.ts 스코어링과 무관)
  eligKey:
    | "preliminary" // 예비창업패키지 = 예비창업자(창업 전)
    | "early" // 초기창업패키지 = 창업 3년 이내
    | "leap" // 창업도약패키지 = 창업 3년 초과~7년 이내
    | "restart" // 재도전성공패키지 = 폐업 후 재창업
    | "youth" // 청년창업사관학교 = 만39세 이하 + (예비 or 창업 3년 이내)
    | "always"; // 스타트업 원스톱센터 = 누구나
};

// 🌱 예비/초기/청년창업자 정부지원사업 (대표님 요청)
//  '예비창업' 또는 '청년(만39세 이하)'에 해당하는 창업 사업화 지원사업.
//  각 항목: ① 사이트 바로가기(K-Startup 공고 상세) + ② 신청 매뉴얼(PDF).
//  ※ 명칭·지원금·URL은 2026 공식 공고(K-Startup·중진공) 기준. 중진공 청년창업자금은
//    '정책금융상품' 아코디언에 그대로 두고 여기서는 사업화자금(무상) 사업만 안내.
export const PRE_FOUNDER_PROGRAMS: PreFounderProgram[] = [
  {
    name: "예비창업패키지",
    amount: "최대 1억원 (평균 약 4,000만원 · 100% 무상)",
    target: "사업자등록 전 예비창업자 (만 19세 이상, 연령 상한 없음)",
    detail: "사업화 자금 + 창업교육 + 멘토링. 보통 2월경 공고(상반기 집중), K-Startup 신청.",
    siteUrl: "https://www.k-startup.go.kr/web/contents/webCMRCZN.do?schM=view&id=170001",
    manualUrl: "/manuals/startup-preliminary-manual-2026.pdf",
    eligKey: "preliminary",
  },
  {
    name: "초기창업패키지",
    amount: "최대 1억원 (평균 약 7,000만원 · 사업화 자금)",
    target: "창업 3년 이내 초기 창업기업 대표자",
    detail: "사업화 자금 + 성장 프로그램(주관기관별 특화). 보통 1~2월경 공고, K-Startup 신청.",
    siteUrl: "https://www.k-startup.go.kr/web/contents/webCMRCZN.do?schM=view&id=170002",
    manualUrl: "/manuals/startup-early-manual-2026.pdf",
    eligKey: "early",
  },
  {
    name: "창업도약패키지",
    amount: "최대 3억원 (사업화 자금 · 성장 단계)",
    target: "창업 3년 초과 7년 이내 도약기 창업기업 대표자",
    detail: "사업모델 고도화 + 사업화 자금(데스밸리 극복). 연 1회 1~2월경 공고, K-Startup 신청.",
    siteUrl: "https://www.k-startup.go.kr/web/contents/webCMRCZN.do?schM=view&id=170003",
    manualUrl: "/manuals/startup-leap-manual-2026.pdf",
    eligKey: "leap",
  },
  {
    name: "재도전성공패키지",
    amount: "최대 6,000만원 (사업화 자금 · 재창업 전용)",
    target: "예비 재창업자 및 재창업 7년 이내 기업 (폐업 경험 대표자)",
    detail: "재창업 사업화 자금 + 재기 교육·멘토링. 보통 2~3월경 공고, K-Startup 신청.",
    siteUrl: "https://www.k-startup.go.kr/web/contents/webCMRCZN.do?schM=view&id=170007",
    manualUrl: "/manuals/startup-restart-manual-2026.pdf",
    eligKey: "restart",
  },
  {
    name: "청년창업사관학교 (창업성공패키지)",
    amount: "최대 1억원 (총사업비의 70% 이내 · 평균 약 7,000만원)",
    target: "만 39세 이하 예비창업자 및 창업 3년 이내 대표자 (경험창업자 7년 이내)",
    detail: "중진공 운영. 사업화자금 + 집중보육 + 정책자금 연계. 보통 1~2월경 접수(상반기 집중).",
    siteUrl: "https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do?schM=view&pbancSn=176107&pbancEndYn=Y",
    manualUrl: "/manuals/startup-youth-academy-manual-2026.pdf",
    eligKey: "youth",
  },
  {
    name: "스타트업 원스톱 지원센터",
    amount: "무료 (정부 지원사업 통합 안내·상담 창구)",
    target: "예비창업자 및 모든 창업기업 (누구나 이용 가능)",
    detail: "정부 창업지원 정보 통합 안내 센터. 온라인 상담·전문가 매칭 제공, K-Startup 로그인 후 이용.",
    siteUrl: "https://www.k-startup.go.kr/onestop",
    manualUrl: "/manuals/startup-onestop-manual-2026.pdf",
    eligKey: "always",
  },
];

// ★ 🌱 창업지원사업 자격 판정(대표님 요청·승인) ★
//   진단 프로필로 '해당되는 사람'을 가려 표시만 나눈다(자격자=먼저 펼침, 비자격=더 보기로 접기).
//   ⚠️ matching.ts 스코어링 로직과 무관한 '표시용' 판정. 값·순서·점수 불변.
//   판정은 진단 원본값 문자열 기준:
//     businessType: "예비" | "개인사업자" | "법인사업자"
//     years:        "창업 예정" | "1년 미만" | "3년 미만" | "5년 미만" | "7년 미만" | "7년 이상"
//     age:          "만 34세 이하" | "만 39세 이하" | "만 40세 이상"
//     reFounder:    "예" | "아니요"
export function isPreFounderEligible(
  eligKey: PreFounderProgram["eligKey"],
  profile?: Record<string, unknown> | null,
): boolean {
  if (eligKey === "always") return true; // 누구나(스타트업 원스톱센터)
  if (!profile) return false;

  const s = (k: string): string => {
    const v = profile[k];
    return typeof v === "string" ? v : "";
  };
  const businessType = s("businessType");
  const years = s("years");
  const age = s("age");
  const reFounder = s("reFounder");

  const isPre = businessType.includes("예비") || years === "창업 예정";
  // 창업 3년 이내 = 예비 or 1년미만 or 3년미만 (창업 예정 포함)
  const within3y = isPre || years === "1년 미만" || years === "3년 미만";
  // 창업 3년 초과 ~ 7년 이내 = 5년미만 or 7년미만
  const between3and7 = years === "5년 미만" || years === "7년 미만";
  // 청년(만 39세 이하) = 만 34세 이하 or 만 39세 이하
  const isYoung = age === "만 34세 이하" || age === "만 39세 이하";

  switch (eligKey) {
    case "preliminary": // 예비창업패키지 = 예비창업자(창업 전)
      return isPre;
    case "early": // 초기창업패키지 = 창업 3년 이내
      return within3y;
    case "leap": // 창업도약패키지 = 창업 3년 초과 ~ 7년 이내
      return between3and7;
    case "restart": // 재도전성공패키지 = 폐업 후 재창업
      return reFounder === "예";
    case "youth": // 청년창업사관학교 = 만39세 이하 + (예비 or 창업 3년 이내)
      return isYoung && within3y;
    default:
      return false;
  }
}

export const INSTITUTION_LINKS: InstitutionLink[] = [
  {
    match: "신용보증기금",
    siteUrl: "https://www.kodit.or.kr/apps/index.do",
    siteLabel: "신용보증기금 사이트",
    pdfUrl: "https://www.kodit.or.kr/kodit/na/ntt/selectNttList.do?mi=2806&bbsId=1002&ps=417",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/kodit-guide.pdf",
    productName: "일반운전자금보증",
    productUrl: "https://www.kodit.or.kr/kodit/na/ntt/selectNttList.do?mi=2806&bbsId=1002&ps=417",
    products: [
      {
        name: "일반보증 (운전자금)",
        amount: "매출·신용도 기반 산정",
        desc: "담보력이 부족한 중소기업의 운전자금 보증서\n(보증서 발급 → 은행 대출)",
        approval: "mid",
        approvalNote: "매출·신용도가 높을수록 승인에 유리합니다.",
        applyUrl: "https://www.kodit.or.kr/apps/index.do",
      },
      {
        name: "일반보증 (시설자금)",
        amount: "시설투자액 기준",
        desc: "공장·설비 등 시설투자 자금 보증서",
        approval: "mid",
        applyUrl: "https://www.kodit.or.kr/apps/index.do",
      },
      {
        name: "퍼스트펭귄 보증 (유망 창업기업)",
        amount: "최대 30억원",
        desc: "창업 후 7년 이내 유망창업기업 중\n미래 성장성이 높은 핵심 창업기업 (보증비율 우대)",
        approval: "mid",
        approvalNote: "성장성·기술성 심사를 통과하면 대규모 보증이 가능합니다.",
        applyUrl: "https://www.kodit.or.kr/apps/index.do",
        eligibleWhen: (c) =>
          typeof c.years_in_business === "number" && c.years_in_business < 7,
      },
      {
        name: "스마트보증 (창업·소기업 간편보증)",
        amount: "최대 2억원 · 보증비율 100% · 고정보증료 0.7%",
        desc: "스코어보드 평가로 간편하게 심사하는 소액 보증\n(창업기업 등 우대)",
        approval: "mid",
        applyUrl: "https://www.kodit.or.kr/apps/index.do",
      },
      {
        name: "수출기업 우대보증",
        amount: "수출실적 기준",
        desc: "수출 실적을 보유한 기업에 대한 우대 보증\n(K-SURE 무역보험과 별개)",
        approval: "mid",
        applyUrl: "https://www.kodit.or.kr/apps/index.do",
        eligibleWhen: (c) => Boolean(c.is_exporter),
      },
    ],
    tel: "1588-6565",
    telNote: "신용·매출 기반 보증은 신보로 문의하면 상담이 빠릅니다.",
    note: "신용보증기금 디지털지점(모바일)·영업점 방문으로 보증 신청이 가능합니다. 보증서 발급 후 은행에서 대출이 실행됩니다.",
  },
  {
    match: "기술보증기금",
    siteUrl: "https://www.kibo.or.kr/dbranch/index.do",
    siteLabel: "기술보증기금 사이트",
    pdfUrl: "https://www.kibo.or.kr/main/board/boardType08.do",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/kibo-guide.pdf",
    productName: "기술보증(운전·시설)",
    productUrl: "https://www.kibo.or.kr/main/board/boardType08.do",
    products: [
      {
        name: "청년창업기업보증",
        amount: "일반한도 기업당 30억원 · 보증비율 95~100%",
        desc: "경영주 만 17~39세, 창업 후 7년 이내 기술창업기업\n(보증료 0.3%p 감면 등 청년 우대)",
        approval: "mid",
        approvalNote: "청년·기술창업이면 우대 폭이 커 접근할 만합니다. 인증이 없어도 우선 신청해 볼 만합니다.",
        hookNote:
          "특허·벤처·이노비즈·연구소 인증이 없어도 우선 신청해 보세요.\n부결 시 인증을 하나씩 보완해 재신청하면 승인 가능성이 높아집니다.",
        applyUrl: "https://www.kibo.or.kr/dbranch/index.do",
        eligibleWhen: (c) =>
          typeof c.ceo_age === "number" &&
          c.ceo_age <= 39 &&
          typeof c.years_in_business === "number" &&
          c.years_in_business < 7,
      },
      {
        name: "기술창업보증 (맞춤형 창업기업 보증)",
        amount: "일반한도 기업당 30억원 · 보증비율 90~100%",
        desc: "창업 후 7년 이내 맞춤형 창업성장분야 기업\n(지식문화·이공계 챌린저·숙련형 제조창업 등)",
        approval: "mid",
        approvalNote: "제조·기술 창업기업은 신용보증기금보다 먼저 접근하는 것이 유리합니다.",
        applyUrl: "https://www.kibo.or.kr/dbranch/index.do",
        eligibleWhen: (c) =>
          typeof c.years_in_business === "number" && c.years_in_business < 7,
      },
      {
        name: "기술보증 (운전자금)",
        amount: "기술평가 기준",
        desc: "기술력 기반 운전자금 보증서\n(매출이 낮아도 기술력으로 심사)",
        approval: "mid",
        approvalNote: "제조업·기술기업은 인증이 없어도 우선 신청해 볼 만합니다.",
        hookNote:
          "특허·벤처·이노비즈·연구소 인증이 없어도 우선 신청해 보세요.\n부결 시 인증을 하나씩 보완해 재신청하면 승인 가능성이 높아집니다.",
        applyUrl: "https://www.kibo.or.kr/dbranch/index.do",
      },
      {
        name: "기술보증 (시설자금)",
        amount: "시설투자액 기준",
        desc: "R&D·생산설비 등 시설투자 보증서",
        approval: "mid",
        applyUrl: "https://www.kibo.or.kr/dbranch/index.do",
      },
    ],
    tel: "1544-1120",
    telNote: "기술평가 기반 보증은 기보로 문의하면 상담이 빠릅니다.",
    note: "기술보증기금 디지털지점(kibo.or.kr)에서 온라인 신청 후 기술평가를 받습니다. 보증서 발급 후 은행에서 대출이 실행됩니다.",
  },
  {
    match: "소상공인시장진흥공단",
    siteUrl: "https://ols.sbiz.or.kr",
    siteLabel: "소상공인정책자금 사이트",
    pdfUrl: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/sbiz-guide.pdf",
    productName: "일반경영안정자금",
    productUrl: "https://ols.semas.or.kr/ols/man/SMAN018M/page.do",
    // ★ 소진공 내 여러 상품 - 아코디언으로 펼쳐서 골라 신청 ★ (대표님 실무 기준 승인율 표시)
    products: [
      {
        // ★ 대표님 실무 지시(2026) ★ 제조업(소공인)은 '일반경영안정' 말고 이걸 먼저.
        //   "제조업이면 소공인특화자금이 가장 많이·수월하게 받는다" → 제조·기술서비스 소공인에 최우선 노출.
        //   ⚠️ 표시용 상품 추가(eligibleWhen으로 제조·기술만 노출). matching.ts 스코어링과 무관.
        name: "소공인특화자금",
        amount: "운전 1억원 · 시설 5억원 (기준금리 수준 저리)",
        desc: "상시근로자 10인 미만 제조업·기술서비스 소공인 전용\n(확인서 발급 → 은행 대출 · 제조 소상공인이 가장 많이 이용)",
        approval: "high",
        approvalNote:
          "제조업(소공인)이라면 승인율이 높은 편이며, 소진공 상품 중 가장 수월하게 받는 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        nature: "대리대출", // 소진공 공식(SMAN018M): 대리대출 세부지원요건 표에 등재
        // 제조업·기술서비스(소공인)에게만 노출 - 순수 도소매·음식 소상공인엔 숨김(과대추천 방지)
        eligibleWhen: (c) => {
          const cat = normalizeIndustry(c.industry);
          return cat === "manufacturing" || cat === "tech_innov";
        },
      },
      {
        name: "일반경영안정자금",
        amount: "최대 7,000만원 (기준금리+0.6%p)",
        desc: "업력 무관 소상공인 운전자금\n(확인서 발급 → 은행 대출, 대출기간 5년·거치 2년)",
        approval: "high",
        approvalNote: "확인서 발급 기반 상품이라 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        nature: "대리대출", // 소진공 공식(SMAN018M): 대리대출 세부지원요건 표에 등재
      },
      {
        name: "혁신성장촉진자금 (일반형) - 스마트기술 도입 소상공인",
        amount: "운전 1억원 · 시설 5억원 (기준금리+0.4%p)",
        desc: "키오스크·무인판매기·서빙로봇·스마트 POS·재고관리 S/W 등\n스마트기술을 도입한 소상공인",
        approval: "low",
        approvalNote: "대상 범위는 넓지만 승인율은 낮은 편입니다.",
        hookNote:
          "스마트기술 도입만으로 '대상'은 되지만, 실제 승인은\n'기업현황 및 사업계획서'를 통해 스마트기술 활용→매출 시현이 증명되어야 이루어집니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.uses_smart_tech),
        nature: "직접대출", // 공식(SMAN018M): 직접대출 세부지원요건 표에 등재
      },
      {
        name: "혁신성장촉진자금 (혁신형) - 2년 연속 매출 10% 성장 소상공인",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "최근 2년 연속 매출액이 각각 10% 이상 성장한 소상공인",
        approval: "mid",
        approvalNote: "성장 요건을 충족하면 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.revenue_growth_2y),
        nature: "직접대출",
      },
      {
        name: "혁신성장촉진자금 (혁신형) - 수출 소상공인",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "직수출 실적(1천 달러 이상)을 보유한 소상공인",
        approval: "mid",
        approvalNote: "수출 실적이 확인되면 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.is_exporter),
        nature: "직접대출",
      },
      {
        name: "혁신성장촉진자금 (혁신형) - 스마트공장 도입 소상공인",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "스마트공장을 구축·운영 중인 소상공인",
        approval: "mid",
        approvalNote: "스마트공장 확인 시 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.has_smart_factory),
        nature: "직접대출",
      },
      {
        name: "혁신성장촉진자금 (혁신형) - 강한소상공인·로컬크리에이터",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "중기부 '강한소상공인 성장지원' 또는\n'로컬크리에이터' 선정 기업",
        approval: "mid",
        approvalNote: "선정 이력이 있으면 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.gov_selected_program),
        nature: "직접대출",
      },
      {
        name: "혁신성장촉진자금 (혁신형) - 성실상환자",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "소진공·중진공 등 정책자금 직접대출을\n연체 없이 성실히 상환 중인 소상공인",
        approval: "mid",
        approvalNote: "요건을 충족하면 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.policy_fund_good_standing),
        nature: "직접대출",
      },
      {
        name: "재도전특별자금",
        amount: "일반형 7천만원 · 희망형 1억원 · 도약형 2억원",
        desc: "폐업 후 재창업하거나 채무조정을 성실히 상환 중인 소상공인\n(일반형/희망형/도약형, 유형별 가산금리 상이)",
        approval: "mid",
        approvalNote: "재도전자 요건을 갖추면 승인율이 높은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.is_re_founder),
        nature: "직접대출", // 공식(SMAN018M): 직접대출 세부지원요건 표에 등재
      },
      {
        // ★ 대표님 실무 지시(2026) ★ 신용점수 839점 이하는 일반경영안정 말고 이 전용 상품으로.
        //   NCB(NICE/KCB) 839점 이하 중·저신용 소상공인 전용 소진공 '직접대출'.
        //   ⚠️ 표시용 상품 추가(신용점수 판정은 진단 credit→profileToCompany의 kcb/nice_score).
        //     matching.ts 스코어링과 무관.
        name: "신용취약자금 (직접대출)",
        amount: "최대 3,000만원 · 저리 고정금리 (사전 신용관리교육 필수)",
        desc: "NCB(NICE·KCB) 개인신용평점 839점 이하 중·저신용 소상공인 전용\n(신청 전 '신용관리교육' 온라인 사전 이수가 반드시 필요)",
        approval: "mid",
        approvalNote:
          "839점 이하 전용 상품이라 일반자금보다 이 트랙이 유리합니다. 단 신용관리교육 수료증이 있어야 접수됩니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        nature: "직접대출", // 공식(SMAN018M): 직접대출 세부지원요건 표에 등재
        // 신용점수 839점 이하(=진단 '839점 이하'/'745점 이하' → score 690)에게만 노출
        eligibleWhen: (c) => {
          const score =
            typeof c.nice_score === "number"
              ? c.nice_score
              : typeof c.kcb_score === "number"
                ? c.kcb_score
                : undefined;
          return typeof score === "number" && score <= 839;
        },
      },
      {
        // ★ 대표님 실무 지시(2026) ★ 졸업후보기업(정책자금 성실상환·졸업후보)은 이 트랙으로 안내.
        //   ★ 졸업후보 판정(대표님 확정): 업종별 기준이 4.5억~42억으로 제각각이라
        //     진단 매출 구간(최대 '10억 이상')만으로 정밀 자동판정은 불가.
        //     → 소상공인 최상단 매출대('10억 이상')인 대표에게만 '조건 충족 시 가능'으로 안내하고,
        //       정확한 업종별 기준은 바로 아래 '작은 아코디언' 기준표로 직접 확인하게 한다.
        //       (매출 낮은 영세 대표에겐 노출 안 함 → 억지매칭 방지)
        //   ⚠️ 표시용 상품 추가. matching.ts 스코어링과 무관.
        name: "졸업후보기업자금 (혁신형)",
        amount: "운전 2억원 · 시설 10억원 (기준금리+0.4%p)",
        desc: "소상공인 규모를 넘어서는 '졸업후보기업'(업종별 매출·상시근로자 기준 충족 시 대상)\n(귀사 업종의 정확한 졸업후보 기준은 아래 '졸업후보 기준' 표에서 확인하세요)",
        approval: "mid",
        approvalNote: "매출·직원 규모가 소상공인 상한에 근접했습니다. 아래 기준표에서 귀사 업종 기준을 충족하면 대상이 됩니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        nature: "직접대출",
        // 매출 '10억 이상'(1,000,000,000원)인 대표에게만 노출.
        eligibleWhen: (c) => (c.annual_revenue ?? 0) >= 1000000000,
      },
      {
        name: "대환대출 (저금리 전환)",
        amount: "최대 5,000만원 · 고정금리 4.5% · 최장 10년",
        desc: "중·저신용 소상공인의 고금리(은행·비은행) 사업자 대출을\n저금리 정책자금으로 전환하는 상품",
        approval: "high",
        approvalNote: "승인율이 높은 편입니다.",
        eligibleWhen: (c) => Boolean(c.wants_refinance),
        applyUrl: "https://ols.sbiz.or.kr",
        nature: "대리대출", // 공식(SMAN018M): 대리대출 세부지원요건 표에 등재
      },
      {
        name: "민간투자연계형 매칭융자",
        amount: "최대 5억원 (시설 포함 10억원)",
        desc: "민간투자연계형 매칭융자 주관기관으로부터 투자금을 지원받고\n'소상공인 선투자 추천서'를 발급받은 소상공인 (기준금리+0.4%p)",
        approval: "low",
        approvalNote: "민간투자 유치·선투자 추천서가 전제라 승인율은 낮은 편입니다.",
        applyUrl: "https://ols.sbiz.or.kr",
        eligibleWhen: (c) => Boolean(c.has_private_investment || c.gov_selected_program),
        nature: "직접대출", // 소진공 공식(SMAN018M): 직접대출 세부지원요건 표에 등재 → 직접대출 단독
      },
    ],
    tel: "1533-0100",
    telNote: "중진공·소진공·중기부 통합상담은 1357로도 가능합니다.",
    note: "소상공인정책자금 누리집(ols.sbiz.or.kr)에서 직접대출을 온라인 신청합니다.",
  },
  {
    match: "중소벤처기업진흥공단",
    siteUrl: "https://digital.kosmes.or.kr/dh/map/main.do?",
    siteLabel: "중소벤처기업진흥공단 사이트",
    pdfUrl: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do",
    pdfLabel: "정책자금 상품안내 확인하기",
    manualUrl: "/manuals/kosmes-guide.pdf",
    productName: "혁신창업사업화자금",
    productUrl: "https://www.kosmes.or.kr/nsh/SH/SBI/SHSBI001M0.do",
    products: [
      {
        name: "창업기반지원자금 (청년전용창업자금)",
        amount: "최대 1억원 (제조업·중점지원분야 2억원) · 연 2.5% 고정",
        desc: "만 39세 이하 · 업력 3년 미만 청년 창업자\n(직원 0명·개인사업자도 신청 가능, 매출 하한 없음)",
        nature: "직접대출", // 중진공 정책자금(이차보전 포함)은 공단 직접대출로 표시(대표님 확정)
        approval: "mid",
        approvalNote:
          "① 대표자 만 39세 이하 ② 업력 3년 미만, 두 조건을 모두 충족해야 신청할 수 있습니다. (창업성공패키지·기보 청년보증·VC투자 시에는 업력 7년 미만까지 특례 인정)",
        hookNote:
          "'만 39세 이하 + 업력 3년 미만'이 기본 요건이며, 성장 방향·자금 계획·대표 의지를 종합 심사합니다.\n한도는 최대 1억원, 제조업·중점지원분야는 2억원까지 가능합니다.",
        applyUrl: "https://digital.kosmes.or.kr/dh/map/main.do?",
        // 팩트체크: 나이(39↓) + 업력(3년 미만; 특례 감안해 7년 미만까지 노출) 조건 미충족 시 숨김
        eligibleWhen: (c) =>
          typeof c.ceo_age === "number" &&
          c.ceo_age <= 39 &&
          typeof c.years_in_business === "number" &&
          c.years_in_business < 7,
      },
      {
        name: "혁신창업사업화자금",
        amount: "운전자금 · 시설자금",
        desc: "제조업·혁신성장 분야·기술창업 기업 대상",
        nature: "직접대출", // 중진공 정책자금(이차보전 포함)은 공단 직접대출로 표시(대표님 확정)
        approval: "mid",
        approvalNote: "제조·혁신성장 분야라면 직원 0명·개인사업자도 신청이 가능합니다.",
        applyUrl: "https://digital.kosmes.or.kr/dh/map/main.do?",
        // 제조·기술·혁신성장 기업에게만 노출(순수 소상공인에게는 숨김 - 과대추천 방지)
        eligibleWhen: (c) => {
          const cat = normalizeIndustry(c.industry);
          return (
            cat === "manufacturing" ||
            cat === "tech_innov" ||
            isTechCompany(c) ||
            Boolean(c.is_innovation_area)
          );
        },
      },
      {
        name: "신시장진출지원자금",
        amount: "수출 실적·계획 보유 기업",
        desc: "수출 실적 또는 수출 계획을 보유한 중소기업 대상",
        nature: "직접대출", // 중진공 정책자금(이차보전 포함)은 공단 직접대출로 표시(대표님 확정)
        approval: "mid",
        applyUrl: "https://digital.kosmes.or.kr/dh/map/main.do?",
        // 수출 실적/계획 있는 기업에게만 노출
        eligibleWhen: (c) =>
          Boolean(c.is_exporter) || (c.industry || "").includes("수출"),
      },
      {
        name: "신성장기반자금",
        amount: "시설투자액 기준",
        desc: "사업 확장·설비 투자를 계획하는 기업 대상",
        nature: "직접대출", // 중진공 정책자금(이차보전 포함)은 공단 직접대출로 표시(대표님 확정)
        approval: "mid",
        applyUrl: "https://digital.kosmes.or.kr/dh/map/main.do?",
        // 시설투자 목적이 있거나(설비/시설) 업력·규모가 있는 성장기업에게만 노출
        eligibleWhen: (c) =>
          (c.purposes || []).some((p) => /시설|설비|확장|투자/.test(p)) ||
          (typeof c.years_in_business === "number" && c.years_in_business >= 3) ||
          (c.annual_revenue ?? 0) >= 500000000,
      },
    ],
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
    productName: "수출신용보증(선적전)",
    productUrl: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do",
    products: [
      {
        name: "수출신용보증(선적전)",
        amount: "수출실적 기준",
        desc: "수출물품 제조·가공·조달 자금을 은행에서 대출받을 때\nK-SURE가 연대보증 (수출실적증명원 발급 기업)",
        approval: "mid",
        approvalNote: "기업등급 BB+ 이상이면 승인율이 높은 편이며, 그 이하도 신청 가능합니다.",
        hookNote: "법인을 선호하지만 개인사업자도 가능합니다. 심사~실행까지 약 1.5개월 소요됩니다.",
        applyUrl: "https://www.ksure.or.kr",
      },
      {
        name: "수출신용보증(선적후)",
        amount: "수출채권 기준",
        desc: "선적 후 은행이 수출채권을 매입할 때 K-SURE가 연대보증\n(단기수출보험 연계 가입 필요)",
        approval: "mid",
        applyUrl: "https://www.ksure.or.kr",
        eligibleWhen: (c) => Boolean(c.is_exporter),
      },
      {
        name: "단기수출보험(중소중견Plus+)",
        amount: "연간 보상한도 기준 · 신용조사 생략 간편",
        desc: "연간 수출 U$50백만 이하 중소·중견기업 대상\n수입자 미결제·비상위험 손실을 1년간 일괄 보상",
        nature: "보험", // 대출·보증이 아닌 '보험' 상품(대표님 확정) - 폴백(대리대출) 대신 명시
        approval: "mid",
        approvalNote: "중소·중견 수출기업이 가장 간편하게 이용하는 대표 상품입니다.",
        applyUrl: "https://www.ksure.or.kr",
        eligibleWhen: (c) => Boolean(c.is_exporter),
      },
      {
        name: "문화산업보증",
        amount: "수출계약 기준",
        desc: "영화·게임·만화·캐릭터·애니메이션 등 문화상품\n수출자금을 은행에서 대출받을 때 K-SURE가 연대보증",
        approval: "mid",
        applyUrl: "https://www.ksure.or.kr",
      },
    ],
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

// (성격 판별 함수는 파일 상단 loanNatureOf / natureOfProduct 로 이동)

// ── 지역신용보증재단 대표 사이트(검정 버튼용) ──────────────────────
//  재단 카드 밑에 신보·기보처럼 검정색 사이트 버튼으로 동일하게 노출.
//  세부 지역은 아래 지역 드롭다운(REGION_SINBO)으로 안내.
export const JAEDAN_SITE_LINKS: {
  label: string;
  url: string;
  manualUrl?: string;
  productUrl?: string; // 보증상품 안내 페이지
  productLabel?: string;
  regionKey?: string; // ★ 이 링크가 담당하는 지역(부분일치). 미지정 시 "통합"(그 외 전 지역)
}[] = [
  {
    label: "서울신용보증재단",
    url: "https://www.seoulshinbo.co.kr",
    manualUrl: "/manuals/seoul-sinbo-guide.pdf",
    productUrl: "https://www.seoulshinbo.co.kr/wbase/contents.do?mng_cd=BUSI2346",
    productLabel: "정책자금 상품안내 확인하기",
    regionKey: "서울",
  },
  {
    label: "경기신용보증재단",
    url: "https://www.gcgf.or.kr/gcgf/intro.do",
    manualUrl: "/manuals/gyeonggi-sinbo-easyone-guide.pdf",
    productUrl: "https://www.gcgf.or.kr/gcgf/cm/conts/contsView.do?mi=1052&contsId=1023",
    productLabel: "정책자금 상품안내 확인하기",
    regionKey: "경기",
  },
  {
    label: "인천신용보증재단",
    url: "https://www.icsinbo.or.kr",
    manualUrl: "/manuals/regional-sinbo-bojumdream-guide.pdf",
    productUrl: "https://www.koreg.or.kr/haedream/gu/gurt/selectGurtList.do?mi=1124",
    productLabel: "정책자금 상품안내 확인하기",
    regionKey: "인천",
  },
  {
    label: "지역신용보증재단(통합)",
    url: "https://untact.koreg.or.kr/web/index.do",
    manualUrl: "/manuals/regional-sinbo-bojumdream-guide.pdf",
    productUrl: "https://www.koreg.or.kr/haedream/gu/gurt/selectGurtList.do?mi=1124",
    productLabel: "정책자금 상품안내 확인하기",
    // regionKey 없음 = 서울·경기·인천 외 전 지역의 기본(통합) 안내
  },
];

// 사용자 지역에 맞는 재단 링크만 골라준다.
//  ★ 대표님 요청: 인천이면 인천재단만, 서울이면 서울, 경기면 경기,
//    그 외 지방이면 지역신용보증재단(통합)만 안내(3개 다 노출 X). ★
export function resolveJaedanLinks(region?: string): typeof JAEDAN_SITE_LINKS {
  const r = (region || "").trim();
  if (r) {
    const matched = JAEDAN_SITE_LINKS.filter(
      (l) => l.regionKey && r.includes(l.regionKey)
    );
    if (matched.length > 0) return matched; // 서울/경기/인천 → 해당 재단만
  }
  // 그 외 지역(충청·강원·전라·경상·세종·제주 등) 또는 미선택 → 통합만
  return JAEDAN_SITE_LINKS.filter((l) => !l.regionKey);
}

// ── 지역신용보증재단 신청 가능 상품(아코디언용) ────────────────────
//  대표님 요청: 소진공처럼 재단도 '신청 가능 상품 N개 보기'로 펼쳐서 안내.
//  지역별 명칭 차이는 있으나 실무상 아래 4개 유형으로 신청 가능.
export const JAEDAN_PRODUCTS: InstitutionProduct[] = [
  {
    name: "소상공인 일반보증",
    amount: "보증 최대 1억원(지역별 상이)",
    desc: "사업자등록 후 정상 영업 중인 소상공인이면 신청 가능한 기본 보증.\n신보·기보 이용 중이 아니면 대부분 대상.",
    approval: "high",
    approvalNote: "사업장이 있으면 승인율이 높은 편입니다.",
    applyUrl: "https://untact.koreg.or.kr/",
  },
  {
    name: "창업 초기 특례보증",
    amount: "보증 3천만~5천만원",
    desc: "창업 3개월 이상·월매출 100만원 이상이면 신청 가능한 창업자 특례 상품.",
    approval: "high",
    approvalNote: "창업 초기·소액이라 심사 문턱이 낮은 편입니다.",
    applyUrl: "https://untact.koreg.or.kr/",
    // 창업 '초기' 특례 → 업력 7년 미만(또는 업력 미상)일 때만 노출. 업력 오래된 기업엔 부적합.
    eligibleWhen: (c) =>
      c.years_in_business === undefined || c.years_in_business < 7,
  },
  {
    name: "협약(이차보전) 보증",
    amount: "지자체·은행 협약 한도",
    desc: "지자체·은행과 재단이 맺은 협약 상품.\n이자 일부를 지자체가 지원(이차보전)해 실부담 금리가 낮습니다.",
    approval: "mid",
    approvalNote: "협약 예산·자격요건이 있어 시기·지역에 따라 달라집니다.",
    applyUrl: "https://untact.koreg.or.kr/",
  },
  {
    name: "저신용·특별 지원 특례보증",
    amount: "보증 최대 2천만원(지역별 상이)",
    desc: "신용점수가 낮거나 코로나·재해 등 특별 사유가 있는 소상공인 대상 특례.",
    approval: "mid",
    approvalNote: "700점대 저신용도 특례로 승인 가능하나, 지역 예산·요건 확인이 필요합니다.",
    applyUrl: "https://untact.koreg.or.kr/",
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
  const rev = company.annual_revenue ?? 0;

  // 업종별 소상공인 매출 상한(추정): 음식·도소매·서비스는 넉넉히, 제조는 낮게.
  const revLimit =
    cat === "retail_food" ? 3000000000 : // 도소매·음식: 30억까지 소상공인으로 추정
    cat === "service" ? 1000000000 : // 서비스: 10억
    cat === "manufacturing" ? 1000000000 : // 제조: 10억
    500000000; // 기타: 5억

  // ★ 법인 + 매출 5억 이상이면 규모 있는 중소기업으로 본다 (소상공인 오판 방지).
  if (company.biz_type === "corp" && rev >= 500000000) return "sme";

  // 직원수 입력 시: 상시근로자 기준으로 판정 (소상공인기본법)
  //  ★ 단, 직원이 적어도 매출이 업종 상한을 넘으면 소상공인이 아니므로 sme로 본다.
  //    (예: 제조 5억↑ 법인이 직원 7명이어도 소상공인 아님 → 소진공 오매칭 방지)
  if (company.employee_count !== undefined) {
    const empLimit =
      cat === "manufacturing" || company.industry?.includes("건설") || company.industry?.includes("운수")
        ? 10
        : 5;
    const smallByEmp = company.employee_count < empLimit;
    const smallByRev = rev < revLimit;
    // 직원수·매출 둘 다 소상공인 기준을 만족해야 소상공인. 하나라도 초과하면 sme.
    return smallByEmp && smallByRev ? "small" : "sme";
  }

  // 직원수 미입력 시: 법인은 중기로, 개인사업자는 업종별 매출기준으로 추정
  if (company.biz_type === "corp") return "sme";
  return rev >= revLimit ? "sme" : "small";
}

export function matchGovPrograms(company: Company): GovProgram[] {
  const age = company.ceo_age;
  const years_in_business = company.years_in_business;
  const { is_pre_founder, is_re_founder, has_mainbiz, is_exporter, is_tourism } = company;
  const segment = resolveSegment(company);
  const cat = normalizeIndustry(company.industry);
  // 기술 보유 판정: 특허·연구소·벤처·이노비즈·기술경력·혁신성장 중 하나라도 있으면 true
  const hasTech = Boolean(
    company.has_patent ||
      company.has_rnd_center ||
      company.has_venture_cert ||
      company.has_innobiz ||
      company.has_tech_career ||
      company.is_innovation_area
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
    // (4) 예비/재창업자엔 '그 신분 전용' 사업이 가장 핵심이므로 최우선(+150).
    //     (fitTag +100보다 높게 둬서, 재창업자 결과에서 재도전성공패키지·재기 전용
    //      사업이 업종 태그 사업에 밀려 상한(5개)에서 잘리지 않도록 보장)
    if (p.condition === "is_pre_founder" && is_pre_founder) score += 150;
    if (p.condition === "is_re_founder" && is_re_founder) score += 150;
    if (p.requiresReFounder && is_re_founder) score += 150;
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
//   1) 기존 매칭 결과 도출 (matching.ts, 건들지 말 것 - 여기서는 호출하지 않음)
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
  company: Company; // 원본 입력(상품 필터·재단 지역매칭 등 렌더 단계에서 사용)
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
  // 5) BLOCK 2 - 이용 가능 기관은 업종·직원수 기준(대표님 실무 기준)으로 판정
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
    company,
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
