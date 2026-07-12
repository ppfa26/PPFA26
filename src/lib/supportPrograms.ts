// ── 추가 정부지원제도(고용지원금·바우처 등) 카탈로그 ──────────────────
//  대표님 요청: 정책자금(대출/보증)과 별개로 병행 신청 가능한 지원제도를
//  진단 정보 기준으로 "해당되는 것만" 안내하고, 클릭하면 상세(승인 소요기간·
//  담당 부처 연락처)를 보여준다.
//
//  - 자격 판정(eligible)은 dashboard에서 진단 프로필로 계산해 주입한다.
//  - 상세(detail)는 신청부터 지원금 수령까지 실제 소요기간과 부처 연락처.

import { DiagnosisProfile } from "./matching";
import {
  Company,
  runAdvancedScreening,
  INSTITUTION_PRODUCT_LINKS,
} from "./advancedScreening";

export type SupportContact = {
  label: string; // "고용노동부 고객상담센터"
  value: string; // "1350" 또는 URL
  href?: string; // tel:/http 링크(있으면 클릭 가능)
};

export type SupportDetailSection = {
  heading: string; // "⭐ 청년일자리도약장려금"
  items: string[]; // 소요기간·절차 등 항목
};

export type SupportProgram = {
  id: string; // URL slug (예: "employment")
  icon: string;
  title: string;
  site: string; // 표시용 도메인
  url: string; // 신청/안내 사이트
  desc: string; // 카드 요약 설명
  eligibleBadge: string; // 대상일 때 배지 문구
  ineligibleBadge: string; // 비대상일 때 배지 문구
  eligibleNote: string; // 대상일 때 한 줄 안내
  ineligibleNote: string; // 비대상일 때 한 줄 안내
  // 상세 화면
  detailIntro: string; // 상세 상단 안내
  sections: SupportDetailSection[]; // 승인 소요기간·절차
  contacts: SupportContact[]; // 담당 부처 연락처
};

export type SupportStatus = "eligible" | "potential" | "none";

// 진단 프로필 → 각 제도별 3단계 상태 판정
//  - eligible : 지금 바로 신청 대상 (초록 ✅)
//  - potential: 지금은 아니지만 채용·수출 등 하면 대상 (회색 🔜)
//  - none     : 노출하지 않음
//  대표님 방침: 바우처·지원금은 해당 사업장이 많으므로 "예정 대상"까지 폭넓게 안내한다.
export function computeSupportStatus(p: DiagnosisProfile): Record<string, SupportStatus> {
  const elig = computeSupportEligibility(p);
  // 예정 대상(potential): 지금 조건은 아니지만 채용/수출/사업 확장 시 대상이 되는 제도.
  //  대부분의 사업장이 채용·수출 가능성이 있으므로, eligible이 아니면 potential로 넓게 안내.
  //  (혁신바우처만 제조업 전용이라 제조 아닌 곳은 굳이 예정 대상으로 띄우지 않음)
  const inds = p.industries || [];
  const isManufacturing = inds.some((s) => s.includes("제조"));
  const isExportInd = inds.some((s) => s.includes("수출"));
  const rev = String(p.revenue || "").replace(/\s/g, "");
  const isSmallBizPotential = !rev.includes("5억이상"); // 5억 이상만 소상공인 예정대상 제외
  const emp = String(p.employees || "").replace(/\s/g, "");
  const hasEmployees = Boolean(p.employees) && emp !== "0명";

  // 예정대상(potential) 규칙 — 억지 매칭 금지(대표님 지적).
  //  · 고용지원금/청년도약: 직원이 없을 때만 '채용 시 대상'으로 안내 (있으면 이미 eligible)
  //  · 두루누리: 10명 미만 채용 여지 → 직원 없거나 소규모일 때만
  //  · 수출바우처: '수출업' 업종을 선택했을 때만 (음식점 등에 수출바우처 노출 금지)
  //  · 혁신바우처: 제조업일 때만
  //  · 소상공인 경영안정 바우처: 매출 5억 미만일 때만
  const potentialRule: Record<string, boolean> = {
    employment: !hasEmployees, // 아직 직원 없음 → 채용 시 대상
    "youth-leap": !hasEmployees, // 청년 채용 시 대상
    duru: !hasEmployees || emp.includes("5명") || emp.includes("10명이하"),
    "export-voucher": isExportInd, // 수출업 업종일 때만 (억지 매칭 금지)
    "innovation-voucher": isManufacturing, // 제조업일 때만
    "sbiz-voucher": isSmallBizPotential, // 5억 이상 아니면 예정대상
  };

  const out: Record<string, SupportStatus> = {};
  for (const prog of SUPPORT_PROGRAMS) {
    if (elig[prog.id]) out[prog.id] = "eligible";
    else if (potentialRule[prog.id]) out[prog.id] = "potential";
    else out[prog.id] = "none";
  }
  return out;
}

// 진단 프로필 → 각 제도별 자격(eligible) 판정
export function computeSupportEligibility(p: DiagnosisProfile): Record<string, boolean> {
  const inds = p.industries || [];
  const emp = String(p.employees || "").replace(/\s/g, "");
  const rev = String(p.revenue || "").replace(/\s/g, "");
  // ⚠️ "10명이상".includes("0명")==true 버그 방지: '0명'은 정확히 '0명'일 때만 직원 없음.
  const hasEmployees = Boolean(p.employees) && emp !== "0명";
  const isManufacturing = inds.some((s) => s.includes("제조"));
  // 수출바우처는 '업종=수출업'인 경우에만 신청 대상으로 본다.
  //  (음식점 등 비수출 업종에 수출바우처가 뜨던 오매칭 수정)
  const isExport = inds.some((s) => s.includes("수출"));
  // 두루누리: 직원 10명 미만(0명 제외) — "5명 이하" 또는 "10명 이하"
  const isDuruEligible = hasEmployees && (emp.includes("5명") || emp.includes("10명이하"));
  // 소상공인 경영안정 바우처: 매출 5억 미만(매출 없음/1억 미만/5억 미만)
  const isSmallBiz = Boolean(p.revenue) && !rev.includes("5억이상") && !rev.includes("매출없음");
  return {
    employment: hasEmployees,
    "export-voucher": isExport,
    "innovation-voucher": isManufacturing,
    duru: isDuruEligible,
    "sbiz-voucher": isSmallBiz,
    "youth-leap": hasEmployees,
  };
}

export const SUPPORT_PROGRAMS: SupportProgram[] = [
  {
    id: "employment",
    icon: "💼",
    title: "고용지원금 — 고용24",
    site: "www.work24.go.kr",
    url: "https://www.work24.go.kr/cm/c/f/1100/selecPolicyList.do?concTrgtSecd=EBQ01",
    desc: "기업 로그인 → 기업 지원금 메뉴에서 신청. 청년일자리도약장려금·고용창출/안정장려금·두루누리·워라밸일자리장려금·고용촉진장려금 등",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "채용 시 대상",
    eligibleNote: "직원을 고용 중이시라 고용장려금 신청 대상입니다.",
    ineligibleNote: "직원 채용(4대보험 가입) 시점부터 신청 대상이 됩니다.",
    detailIntro:
      "고용노동부 계열 고용지원금의 실제 신청부터 지원금 수령까지 소요기간과 담당 부처 정보입니다.",
    sections: [
      {
        heading: "⭐ 청년일자리도약장려금",
        items: [
          "참여 승인: 신청 후 통상 약 2~4주 이내 승인 통보 (사업 참여신청 → 승인 → 채용)",
          "지원금 지급: 채용 후 6개월 근속 시점부터 1회차 신청 → 회차별로 신청 후 2개월 이내 지급",
          "지급 방식: 1회차(6개월분 일시지급), 2·3회차(3개월 단위 분할), 2년 근속 시 480만원 추가",
        ],
      },
      {
        heading: "🏢 고용창출·고용안정장려금",
        items: [
          "사업 참여 승인: 신청서 접수 → 약 14일 이내 승인 통보",
          "지원금 지급: 승인 통보 다음달부터 6개월 이내 이행 → 이행 후 3개월 단위 신청 → 신청 후 14일 이내 지급",
        ],
      },
      {
        heading: "⏰ 워라밸일자리장려금",
        items: ["지원금 지급: 신청 후 14일 이내 지원금 승인 여부 통보 → 계좌 입금"],
      },
      {
        heading: "🎯 고용촉진장려금",
        items: ["처리 기간: 신청 후 통상 14일 이내 승인 및 지급"],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "www.work24.go.kr", href: "https://www.work24.go.kr" },
      { label: "고용노동부 고객상담센터", value: "1350", href: "tel:1350" },
      { label: "관할 운영기관", value: "인천의 경우 관할 고용센터로 배정(사업장 소재지 기준)" },
    ],
  },
  {
    id: "duru",
    icon: "🤝",
    title: "두루누리 사회보험료 지원",
    site: "insurancesupport.or.kr",
    url: "http://insurancesupport.or.kr",
    desc: "근로자 10명 미만 사업장에서 월평균 보수 270만원 미만 직원 신규 고용 시, 고용보험·국민연금 보험료의 80%를 최대 36개월 지원",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "직원 10명 미만 대상",
    eligibleNote: "근로자 10명 미만 사업장으로 보험료 80% 지원 대상입니다.",
    ineligibleNote: "근로자 10명 미만이면서 저임금 직원을 고용하면 대상이 됩니다.",
    detailIntro:
      "두루누리 사회보험료 지원의 승인 절차와 반영 방식, 담당 부처 연락처입니다.",
    sections: [
      {
        heading: "🤝 지원 절차 & 반영",
        items: [
          "승인 절차: 자동 심사 (별도 신청 없이도 조건 충족 시 자동 지원 가능)",
          "지원 방식: 지원신청일이 속한 다음 달 고용보험료부터 차감 방식으로 지원 (즉시 반영)",
          "신청 후 반영: 매달 15일(자격 마감일) 기준 지원 결정 → 다음달 보험료에서 공제",
        ],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "insurancesupport.or.kr", href: "http://insurancesupport.or.kr" },
      { label: "두루누리 콜센터", value: "1588-0075", href: "tel:15880075" },
      { label: "국민연금공단", value: "1355", href: "tel:1355" },
    ],
  },
  {
    id: "export-voucher",
    icon: "🌍",
    title: "수출바우처",
    site: "www.exportvoucher.com",
    url: "https://www.exportvoucher.com",
    desc: "중기부·산업부·지자체 수출바우처 통합 신청 포털. 사업공고 → 참여기업 모집공고 확인 후 신청",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "수출 계획 시 대상",
    eligibleNote: "수출(예정) 기업으로 수출바우처 신청 대상입니다.",
    ineligibleNote: "수출 실적·계획이 있으면 신청 대상이 됩니다.",
    detailIntro: "수출바우처의 모집·심사·선정 소요기간과 담당 부처 연락처입니다.",
    sections: [
      {
        heading: "🌍 신청 & 선정 일정",
        items: [
          "모집 기간: 연 2~4차 정기공고 (통상 접수 기간 약 20일)",
          "심사 및 선정: 접수 마감 후 요건검토 → 발표평가 → 최종 선정까지 약 1개월",
          "협약: 선정 후 협약 체결 → 바우처 발급 (전체 프로세스 약 1.5~2개월 소요)",
          "참고: 사업기간은 협약일로부터 통상 1년",
        ],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "www.exportvoucher.com", href: "https://www.exportvoucher.com" },
      { label: "KOTRA 통합안내센터", value: "02-6004-8400 (평일 09~18시)", href: "tel:0260048400" },
      { label: "KOTRA 대표전화", value: "1600-7119", href: "tel:16007119" },
    ],
  },
  {
    id: "innovation-voucher",
    icon: "🚀",
    title: "혁신바우처",
    site: "www.mssmiv.com",
    url: "https://www.mssmiv.com",
    desc: "중소기업 혁신바우처(컨설팅·기술지원·마케팅) 신청 포털. 제조업 소기업(3년 평균 매출 140억 이하) 대상, 기업당 최대 5,000만원",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "제조업 대상",
    eligibleNote: "제조업 소기업으로 혁신바우처 신청 대상입니다.",
    ineligibleNote: "제조업을 주 업종으로 하는 소기업이 신청 대상입니다.",
    detailIntro:
      "중소기업 혁신바우처(제조업 대상)의 접수·심사·발급 소요기간과 담당 부처 연락처입니다.",
    sections: [
      {
        heading: "🚀 신청 & 발급 일정",
        items: [
          "접수 기간: 통상 15~20일",
          "심사 프로세스: 접수 마감 → 약 1개월간 요건검토 및 발표평가 → 최종 선정",
          "바우처 발급: 협약체결 → 기업분담금 입금 후 약 6시간 이내 자동 발급",
          "전체 소요: 공고~바우처 사용 가능까지 약 2개월",
        ],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "www.mssmiv.com", href: "https://www.mssmiv.com" },
      { label: "중소벤처기업부", value: "1357", href: "tel:1357" },
      { label: "중진공 콜센터", value: "1811-3655", href: "tel:18113655" },
      { label: "중진공 관련 부서", value: "055-751-9512 / 9516", href: "tel:0557519512" },
    ],
  },
  {
    id: "sbiz-voucher",
    icon: "🏪",
    title: "소상공인 경영안정 바우처",
    site: "www.sbiz24.kr",
    url: "https://www.sbiz24.kr",
    desc: "영세 소상공인의 고정비(4대 보험료·전기·가스요금 등)를 줄여주는 바우처. 연 매출 등 조건 충족 시 지급, 소상공인24에서 신청",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "영세 소상공인 대상",
    eligibleNote: "영세 소상공인으로 경영안정 바우처 신청 대상입니다.",
    ineligibleNote: "연 매출 등 조건을 충족하는 영세 소상공인이 대상입니다.",
    detailIntro: "소상공인 경영안정 바우처의 접수·승인·지급 일정과 담당 부처 연락처입니다.",
    sections: [
      {
        heading: "🏪 신청 & 지급 일정",
        items: [
          "접수 기간: 연중 예산 소진 시까지 (2026년: 2월 9일 ~ 12월 18일)",
          "승인 및 지급: 신청 완료 후 약 2~4주 이내 심사 → 바우처 카드로 지급",
          "특이사항: 접수 초기 홀짝제(사업자번호 끝자리) 운영, 예산 소진 시 조기 마감",
        ],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "www.sbiz24.kr", href: "https://www.sbiz24.kr" },
      { label: "경영안정 바우처 전용 콜센터", value: "1533-0600", href: "tel:15330600" },
      { label: "소진공 통합 콜센터", value: "1533-0100 (평일 09~18시)", href: "tel:15330100" },
    ],
  },
  {
    id: "youth-leap",
    icon: "⭐",
    title: "청년일자리도약장려금",
    site: "www.work24.go.kr",
    url: "https://www.work24.go.kr/cm/c/f/1100/selecPolicyList.do?concTrgtSecd=EBQ01",
    desc: "5인 이상 중소기업(청년 창업기업 등은 1인 이상)이 취업애로청년을 정규직 채용·고용유지 시 1인당 최대 720만원 지원",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "청년 채용 시 대상",
    eligibleNote: "취업애로청년을 정규직으로 채용하면 1인당 최대 720만원 지원 대상입니다.",
    ineligibleNote: "취업애로청년을 정규직으로 채용하면 대상이 됩니다.",
    detailIntro: "청년일자리도약장려금의 승인·지급 소요기간과 담당 부처 연락처입니다.",
    sections: [
      {
        heading: "⭐ 승인 & 지급 일정",
        items: [
          "참여 승인: 신청 후 통상 약 2~4주 이내 승인 통보 (사업 참여신청 → 승인 → 채용)",
          "지원금 지급: 채용 후 6개월 근속 시점부터 1회차 신청 → 회차별로 신청 후 2개월 이내 지급",
          "지급 방식: 1회차(6개월분 일시지급), 2·3회차(3개월 단위 분할), 2년 근속 시 480만원 추가",
        ],
      },
    ],
    contacts: [
      { label: "홈페이지", value: "www.work24.go.kr", href: "https://www.work24.go.kr" },
      { label: "고용노동부 고객상담센터", value: "1350", href: "tel:1350" },
      { label: "관할 운영기관", value: "인천의 경우 관할 고용센터로 배정(사업장 소재지 기준)" },
    ],
  },
];

export function findSupportProgram(id: string): SupportProgram | undefined {
  return SUPPORT_PROGRAMS.find((p) => p.id === id);
}

// ── 진단 프로필 → Company 스키마 변환 ────────────────────────────────
//  AdvancedScreeningPanel(autoRun)의 변환 로직과 동일하게 맞춰,
//  마이페이지 등 다른 화면에서도 대시보드와 "같은 개수"를 계산할 수 있게 한다.
export function profileToCompany(p: DiagnosisProfile): Company {
  // ⚠️ 업종은 판독부(advancedScreening의 normalizeIndustry/resolveIndustryKind)가
  //    '한글'을 기준으로 분류하므로, 여기서 영어코드로 바꾸면 안 된다.
  //    (과거 버그: "food"로 넘겨서 normalizeIndustry가 "etc"로 오분류 → 업종 로직 전부 무효)
  //    → 진단 원문 한글 업종(예: "음식점업")을 그대로 넘긴다.
  const ind0 = (p.industries || [])[0];
  const industryVal = ind0 || "";

  const revMapWon: Record<string, number> = {
    "5억 이상": 500000000, "5억미만": 300000000, "5억 미만": 300000000,
    "1억 미만": 50000000, "1억미만": 50000000, "매출 없음": 0, "매출없음": 0,
  };
  const revStr = (p.revenue as string | undefined)?.trim?.() || (p.revenue as string | undefined);
  const revenueVal = revStr ? revMapWon[revStr] : undefined;

  const yMapNum: Record<string, number> = {
    "창업 예정": 0, "창업예정": 0, "1년 미만": 0.5, "1년미만": 0.5,
    "3년 미만": 2, "3년미만": 2, "7년 미만": 5, "7년미만": 5, "7년 이상": 10, "7년이상": 10,
  };
  const yearsStr = (p.years as string | undefined)?.trim?.() || (p.years as string | undefined);
  const yearsVal = yearsStr ? yMapNum[yearsStr] : undefined;

  // ⚠️ 직원수 판정 버그 수정:
  //    옵션이 ["0명","5명 이하","10명 이하","10명 이상"]인데
  //    "10명 이상".includes("0명")도 true라서 과거엔 empCount=0으로 오판 →
  //    중진공·고용지원금 누락. 구체적인 값부터(긴 문자열) 순서대로 검사한다.
  //    ["0명","5명 이하","10명 이하","10명 이상"] → 대표 인원수로 환산.
  //    소상공인 경계(비제조 5명·제조 10명)에서 오판이 없도록 구간 중앙값을 쓴다.
  //    · "5명 이하" → 3명(비제조 소상공인 유지: 5명 미만)
  //    · "10명 이하" → 7명(비제조는 sme로, 제조는 소상공인 유지: 10명 미만)
  //    · "10명 이상" → 12명(양쪽 다 sme)
  let empCount: number | undefined;
  if (p.employees) {
    const e = p.employees;
    if (e.includes("10명 이상") || e.includes("10명이상")) empCount = 12;
    else if (e.includes("10명")) empCount = 7;       // "10명 이하"
    else if (e.includes("5명")) empCount = 3;        // "5명 이하"
    else if (e.includes("0명")) empCount = 0;        // "0명"
  }

  let bizVal: "personal" | "corp" | undefined;
  if (p.businessType?.includes("법인")) bizVal = "corp";
  else if (p.businessType?.includes("개인")) bizVal = "personal";

  let creditScore: number | undefined;
  if (p.credit) {
    if (p.credit.includes("839점 이상")) creditScore = 850;
    else if (p.credit.includes("839")) creditScore = 820;
    else if (p.credit.includes("700")) creditScore = 690;
  }

  // ── 인증·기술 신호 전달 (기보 트랙 자격의 핵심) ──
  //   과거 버그: has_mainbiz만 넘기고 특허·연구소·벤처·이노비즈를 전부 버려서
  //   기술기업인데도 기보가 안 뜨던 문제. → 인증 전부 개별 플래그로 전달한다.
  const certs = p.certifications || [];
  const hasPatent = certs.includes("특허");
  const hasRnd = certs.includes("연구소");
  const hasVenture = certs.includes("벤처인증");
  const hasInnobiz = certs.includes("이노비즈");
  const hasMainbiz = certs.includes("메인비즈");

  // ── 혁신성장 분야 해당 여부 (직원수·업종 무관하게 중진공·기보 자격이 열리는 핵심) ──
  const isInnovationArea = (p.innovation || []).length > 0;

  return {
    industry: industryVal,
    annual_revenue: revenueVal,
    biz_type: bizVal,
    employee_count: empCount,
    // 수출 여부는 '업종=수출업'일 때만 true (상담목적/관심분야로는 판정하지 않음)
    is_exporter: (p.industries || []).includes("수출업"),
    ceo_age: p.age?.includes?.("39세 이하") ? 35 : undefined,
    years_in_business: yearsVal,
    kcb_score: creditScore,
    nice_score: creditScore,
    is_pre_founder: Boolean(p.businessType?.includes("예비")),
    // 파산·회생 상태 3단계 매핑 (구 "있음/없음" 값도 하위호환 처리)
    //  · "면책·인가 완료" → 재창업자(is_re_founder), 재기 전용 프로그램만 안내
    //  · "파산·회생 진행 중" → 결제 차단 대상(여기 도달 시 안전차원 재도전 취급)
    is_re_founder: Boolean(
      p.bankruptcy &&
        (p.bankruptcy.includes("면책") ||
          p.bankruptcy.includes("인가") ||
          p.bankruptcy.includes("진행") ||
          p.bankruptcy === "있음")
    ),
    bankruptcy_status: p.bankruptcy?.includes("진행")
      ? "ongoing"
      : p.bankruptcy?.includes("면책") || p.bankruptcy?.includes("인가") || p.bankruptcy === "있음"
        ? "discharged"
        : "none",
    tax_delinquent: p.taxDelinquent === "체납 있음",
    full_capital_impairment:
      p.businessType === "법인사업자" && p.capitalImpairment === "예(자본잠식)",
    // ── 인증·기술 신호 (전부 전달) ──
    has_patent: hasPatent,
    has_rnd_center: hasRnd,
    has_venture_cert: hasVenture,
    has_innobiz: hasInnobiz,
    has_mainbiz: hasMainbiz,
    // ── 혁신성장·지역·담보·이용기관·목적 (버려지던 신호 전부 전달) ──
    is_innovation_area: isInnovationArea,
    region: p.region,
    has_collateral: Boolean(p.collateral && p.collateral.includes("있")),
    current_institutions: p.currentInstitutions || [],
    purposes: p.purposes || [],
  };
}

// ── 대표님 진단 결과로 "실제 대시보드에 안내되는 항목 수" 합산 ────────
//  대시보드가 보여주는 것 = ① 신청 가능 기관 + ② 기관별 상품(한눈에 보기)
//  + ③ 추가로 신청 가능한 지원제도. 마이페이지의 "N개 매칭"이 대시보드의
//  실제 안내량과 일치하도록 이 세 가지를 모두 합산한다.
export function countMatchedItems(p: DiagnosisProfile): {
  total: number;
  institutions: number;
  products: number;
  supports: number;
} {
  let institutions = 0;
  try {
    const report = runAdvancedScreening(profileToCompany(p));
    institutions = report.creditMatches?.length || 0;
  } catch {
    institutions = 0;
  }
  const products = INSTITUTION_PRODUCT_LINKS.length;
  // 지원제도는 '지금 대상' + '요건 충족 시 대상'을 모두 포함해 폭넓게 집계(대표님 방침)
  const status = computeSupportStatus(p);
  const supports = SUPPORT_PROGRAMS.filter(
    (prog) => status[prog.id] === "eligible" || status[prog.id] === "potential"
  ).length;
  return {
    total: institutions + products + supports,
    institutions,
    products,
    supports,
  };
}
