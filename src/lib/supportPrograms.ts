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
  filterProducts,
  findInstitutionLink,
  JAEDAN_PRODUCTS,
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
  applyHow?: string; // 결과창 카드용 '간단 신청방법' 한 줄 요약
  applyTel?: string; // 결과창 카드용 대표 문의 전화(모르면 전화)
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
  // 소상공인 예정대상: 매출 10억 이상만 제외(그 이상은 소상공인 매출요건 초과가 확실)
  const isSmallBizPotential = !rev.includes("10억이상");
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
    // 청년일자리도약장려금: 5인 이상이 요건 → 직원 없거나 '5명 이하'(5인 미만 가능)면
    //  '청년 채용·규모 확대 시 대상'으로 예정 안내 (eligible은 6인 이상 확실할 때만)
    "youth-leap": !hasEmployees || emp.includes("5명이하"),
    duru: !hasEmployees || emp.includes("5명이하") || emp.includes("5명이상"),
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
  // 두루누리: 직원 10명 미만(0명 제외) — 진단 구간 "5명 이하"(1~5명)가 확실히 해당.
  //   "5명 이상"(5~50)은 10명 초과일 수 있어 불확실 → 확정 대상에서는 제외.
  const isDuruEligible = hasEmployees && emp.includes("5명이하");
  // 소상공인 경영안정 바우처(팩트체크 반영):
  //   공식 요건(소상공인24 2026 공고): 직전년도 연 매출액 "1억 400만원 미만"(0원 초과).
  //   진단 매출 옵션(2026 개정): [매출 없음 / 2억 미만 / 10억 미만 / 10억 이상 / 기타]
  //    · "2억 미만"(0~2억)은 대부분 소상공인 매출 요건에 들어가므로 eligible(✅)로 안내
  //      (정확한 상한은 신청 단계에서 확인 → potentialRule에도 매출요건 문구 병행)
  //    · "매출 없음"은 0원 초과 요건 미달 → 대상 아님
  //    · "10억 미만"·"10억 이상"·"기타"는 소상공인 매출 요건 초과 가능성 커 확정 제외
  const isSmallBiz = rev.includes("2억미만");
  // ── 청년일자리도약장려금(팩트체크 반영) ──
  //   공식 요건(고용노동부 2025 지침): 피보험자수 "5인 이상" 우선지원대상기업이
  //   만 15~34세 취업애로청년을 정규직으로 채용해야 신청 가능.
  //   진단 직원수 옵션(2026 개정): 0명 / 5명 이하 / 5명 이상 / 50명 이상 / 300명 이상 / 기타
  //    → "5명 이상"·"50명 이상"·"300명 이상"은 5인 이상이 확실 → eligible.
  //    → "5명 이하"(1~5명)는 5인 이상 여부가 불확실하므로 eligible로 단정하지 않음
  //      (potentialRule에서 '채용·규모 확대 시 대상'으로 안내).
  const isYouthLeapEligible =
    hasEmployees && (emp.includes("5명이상") || emp.includes("50명이상") || emp.includes("300명이상"));
  return {
    employment: hasEmployees,
    "export-voucher": isExport,
    "innovation-voucher": isManufacturing,
    duru: isDuruEligible,
    "sbiz-voucher": isSmallBiz,
    "youth-leap": isYouthLeapEligible,
  };
}

export const SUPPORT_PROGRAMS: SupportProgram[] = [
  {
    id: "employment",
    icon: "💼",
    title: "고용지원금 - 고용24",
    site: "www.work24.go.kr",
    url: "https://www.work24.go.kr/cm/c/f/1100/selecPolicyList.do?concTrgtSecd=EBQ01",
    desc: "직원을 고용 중인 기업이 받을 수 있는 정부 고용장려금입니다. 청년 채용·고용 유지 시 인건비 일부를 지원받습니다.",
    applyHow: "고용24(work24.go.kr)에 기업 회원으로 로그인 → '기업 지원금' 메뉴에서 온라인 신청",
    applyTel: "1350",
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
    desc: "근로자 10명 미만 사업장의 사회보험료 부담을 덜어주는 제도입니다. 월평균 보수 270만원 미만 직원의 고용보험·국민연금 보험료 80%를 최대 36개월간 지원합니다.",
    applyHow: "4대사회보험 정보연계센터(insurance4.or.kr) 또는 관할 국민연금공단·근로복지공단에 지원 신청서 제출",
    applyTel: "1588-0075",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "직원 10명 미만 대상",
    eligibleNote: "근로자 10명 미만 사업장입니다. 이 중 월평균보수 270만원 미만인 '신규 가입' 직원의 고용보험·국민연금 보험료 80%를 지원받을 수 있습니다.",
    ineligibleNote: "근로자 10명 미만 사업장에서 월보수 270만원 미만 직원을 신규 채용(4대보험 신규가입)하면 대상이 됩니다.",
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
    desc: "수출을 준비하거나 진행 중인 기업이 해외 마케팅·통번역·인증 등 서비스를 바우처로 지원받는 제도입니다.",
    applyHow: "수출바우처 포털(exportvoucher.com)에서 연도별 참여기업 모집공고 확인 후 온라인 신청",
    applyTel: "1600-7119",
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
    desc: "제조업을 주 업종으로 하는 소기업(3년 평균 매출 120억원 이하)이 컨설팅·기술지원·마케팅 서비스를 바우처로 지원받는 제도입니다. 기업당 최대 5,000만원 규모입니다.",
    applyHow: "중소기업 혁신바우처 포털(mssmiv.com)에서 모집공고 확인 후 온라인 신청",
    applyTel: "1357",
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
    desc: "영세 소상공인의 고정비(4대 보험료·전기·가스·수도요금 등) 부담을 덜어주는 카드 포인트 바우처입니다(최대 25만원). 직전년도 연 매출액이 1억 400만원 미만(0원 초과)이고, 전년도 이전 개업해 현재 영업 중인 소상공인이 대상입니다.",
    applyHow: "소상공인24(sbiz24.kr)에 로그인 → 경영안정 바우처 사업공고 확인 후 온라인 신청",
    applyTel: "1533-0600",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "매출 요건 확인 대상",
    eligibleNote: "연 매출 1억 원 미만 소상공인으로 경영안정 바우처(최대 25만원) 신청 대상입니다. (직전년도 연 매출 1억 400만원 미만·현재 영업 중 조건)",
    ineligibleNote: "직전년도 연 매출액이 1억 400만원 미만(0원 초과)이고 현재 영업 중인 소상공인이 대상입니다. 매출 규모를 확인해 보세요.",
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
    desc: "피보험자수 5인 이상 우선지원대상기업이 취업애로청년(만 15~34세)을 정규직으로 채용·6개월 이상 유지하면 기업에 1년간 최대 720만원을 지원하는 제도입니다.",
    applyHow: "고용24(work24.go.kr)에 기업 회원으로 로그인 → 청년일자리도약장려금 참여 신청 후 채용",
    applyTel: "1350",
    eligibleBadge: "✅ 신청 대상",
    ineligibleBadge: "청년 채용 시 대상",
    eligibleNote: "직원 5인 이상 사업장이라 취업애로청년(만 15~34세)을 정규직 채용하면 1년간 최대 720만원 지원 대상이 됩니다. (채용 후 참여 신청)",
    ineligibleNote: "직원 5인 이상이 되도록 청년(만 15~34세)을 정규직 채용하면 신청 대상이 됩니다.",
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
    // ── 현재 진단 구간(2026 개정) ──
    "매출 없음": 0, "매출없음": 0,
    "2억 미만": 100000000, "2억미만": 100000000,
    "10억 미만": 500000000, "10억미만": 500000000,
    "10억 이상": 1000000000, "10억이상": 1000000000,
    // "기타"는 매핑하지 않음 → revenueVal=undefined 로 두어 매출 조건 판정을 보류
    // ── 과거 구간(하위호환) ──
    "5억 이상": 500000000, "5억미만": 300000000, "5억 미만": 300000000,
    "1억 미만": 50000000, "1억미만": 50000000,
  };
  const revStr = (p.revenue as string | undefined)?.trim?.() || (p.revenue as string | undefined);
  const revenueVal = revStr ? revMapWon[revStr] : undefined;

  const yMapNum: Record<string, number> = {
    "창업 예정": 0, "창업예정": 0, "1년 미만": 0.5, "1년미만": 0.5,
    "3년 미만": 2, "3년미만": 2, "7년 미만": 5, "7년미만": 5, "7년 이상": 10, "7년이상": 10,
  };
  const yearsStr = (p.years as string | undefined)?.trim?.() || (p.years as string | undefined);
  const yearsVal = yearsStr ? yMapNum[yearsStr] : undefined;

  // ⚠️ 직원수 판정 (2026 개정 라벨) — "0명" substring 오판 방지가 핵심.
  //    옵션: ["0명","5명 이하","5명 이상","50명 이상","300명 이상","기타"]
  //    "50명 이상"·"300명 이상"에도 문자열 "0명"이 들어 있으므로,
  //    반드시 큰 규모부터(긴/큰 값 우선) 순서대로 검사한다.
  //    → 대표 인원수로 환산(구간 대략값):
  //      · "300명 이상" → 300  · "50명 이상" → 50  · "5명 이상" → 7(5명 초과)
  //      · "5명 이하" → 3      · "0명" → 0          · "기타" → 미판정(undefined)
  let empCount: number | undefined;
  if (p.employees) {
    const e = p.employees.replace(/\s/g, "");
    if (e.includes("300명이상")) empCount = 300;
    else if (e.includes("50명이상")) empCount = 50;
    else if (e.includes("10명이상")) empCount = 12; // 과거 라벨 하위호환
    else if (e.includes("10명이하")) empCount = 7;  // 과거 라벨 하위호환
    else if (e.includes("5명이상")) empCount = 7;
    else if (e.includes("5명이하")) empCount = 3;
    else if (e === "0명") empCount = 0;
  }

  let bizVal: "personal" | "corp" | undefined;
  if (p.businessType?.includes("법인")) bizVal = "corp";
  else if (p.businessType?.includes("개인")) bizVal = "personal";

  let creditScore: number | undefined;
  if (p.credit) {
    if (p.credit.includes("840")) creditScore = 850;
    else if (p.credit.includes("700~839") || p.credit.includes("839")) creditScore = 820;
    else if (p.credit.includes("700점 미만") || p.credit.includes("700")) creditScore = 690;
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

  // ── 소진공 혁신형/특별 상품 정밀 매칭용 조건부 응답 (3단계 추가질문) ──
  //   각 값은 "예..."로 시작하면 true. eligibleWhen 조건이 이 플래그를 읽어
  //   해당 상품만 노출하고 나머지는 숨긴다.
  const yes = (v?: string) => Boolean(v && v.startsWith("예"));
  const revenueGrowth2y = yes(p.revenueGrowth2y);
  const hasSmartFactory = yes(p.smartFactory);
  const govSelectedProgram = yes(p.govSelected);
  const policyFundGoodStanding = yes(p.policyFundGood);
  const wantsRefinance = yes(p.wantsRefinance);
  const hasPrivateInvestment = yes(p.privateInvestment);
  // 재도전: 명시 질문(reFounder) 또는 파산·회생 면책/인가 완료
  const explicitReFounder = yes(p.reFounder);

  return {
    industry: industryVal,
    annual_revenue: revenueVal,
    biz_type: bizVal,
    employee_count: empCount,
    // 수출 여부는 '업종=수출업'일 때만 true (상담목적/관심분야로는 판정하지 않음)
    is_exporter: (p.industries || []).includes("수출업"),
    // 스마트기기 사용 여부 → 혁신성장촉진자금(일반형·스마트기술) 대상 판정
    //  1단계 질문은 제거됨 → 3단계 smartDevice 값을 우선 사용(구 smartTech도 하위호환 인정)
    uses_smart_tech: Boolean(
      (p.smartDevice && p.smartDevice.includes("예")) ||
        (p.smartTech && p.smartTech.includes("예"))
    ),
    ceo_age: p.age?.includes?.("39세 이하") ? 35 : undefined,
    years_in_business: yearsVal,
    kcb_score: creditScore,
    nice_score: creditScore,
    is_pre_founder: Boolean(p.businessType?.includes("예비")),
    // 파산·회생 상태 3단계 매핑 (구 "있음/없음" 값도 하위호환 처리)
    //  · "면책·인가 완료" → 재창업자(is_re_founder), 재기 전용 프로그램만 안내
    //  · "파산·회생 진행 중" → 결제 차단 대상(여기 도달 시 안전차원 재도전 취급)
    is_re_founder: Boolean(
      explicitReFounder ||
      (p.bankruptcy &&
        (p.bankruptcy.includes("면책") ||
          p.bankruptcy.includes("인가") ||
          p.bankruptcy.includes("진행") ||
          p.bankruptcy === "있음"))
    ),
    bankruptcy_status: p.bankruptcy?.includes("진행")
      ? "ongoing"
      : p.bankruptcy?.includes("면책") || p.bankruptcy?.includes("인가") || p.bankruptcy === "있음"
        ? "discharged"
        : "none",
    tax_delinquent:
      typeof p.taxDelinquent === "string" && p.taxDelinquent.startsWith("체납 있음"),
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
    // ── 소진공 혁신형/특별 상품 정밀 매칭 플래그 (3단계 추가질문) ──
    revenue_growth_2y: revenueGrowth2y,
    has_smart_factory: hasSmartFactory,
    gov_selected_program: govSelectedProgram,
    policy_fund_good_standing: policyFundGoodStanding,
    wants_refinance: wantsRefinance,
    has_private_investment: hasPrivateInvestment,
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
  // ★ 결과 화면(대시보드 AdvancedScreeningPanel)의 요약 배너와 숫자를 100% 일치시키기 위해
  //    동일한 계산 방식을 사용한다 (대표님 요청: 두 화면 숫자 통일). ★
  const company = profileToCompany(p);
  let institutions = 0;
  let products = 0;
  try {
    const report = runAdvancedScreening(company);
    const creditMatches = report.creditMatches || [];
    institutions = creditMatches.length;
    // 상품 수 = 기관별 '대표님 조건에 맞는 상품'만 필터해 합산 (각 기관 최소 1)
    products = creditMatches.reduce((sum, m) => {
      if (m.institution.includes("재단")) {
        return sum + Math.max(1, filterProducts(JAEDAN_PRODUCTS, company).length);
      }
      const link = findInstitutionLink(m.institution);
      return sum + Math.max(1, filterProducts(link?.products, company).length || 1);
    }, 0);
  } catch {
    institutions = 0;
    products = 0;
  }
  // 정부지원제도 = '지금 대상' + '요건 충족 시 대상'을 모두 포함해 폭넓게 집계(대표님 방침)
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

// ── 미리보기 '목차'용: 매칭된 실제 항목 제목 리스트 ──────────────────
//  대표님 요청: 미리보기에서 "제목(목차)은 선명하게 오픈"해 내용이 풍부함을 보여준다.
//  실제 결과에 등장하는 기관·정책자금 상품·정부지원제도의 '이름'만 뽑아 반환한다.
//  (구체적 신청방법·서류·전략 등 본문은 결제 후 공개 — 여기선 제목만)
export type MatchedTitle = {
  kind: "기관" | "정책자금" | "정부지원제도";
  icon: string;
  title: string;
};

export function getMatchedTitles(p: DiagnosisProfile): MatchedTitle[] {
  const titles: MatchedTitle[] = [];

  // 1) 이용 가능 기관 (BLOCK 2)
  try {
    const report = runAdvancedScreening(profileToCompany(p));
    (report.creditMatches || []).forEach((m) => {
      titles.push({ kind: "기관", icon: "🏦", title: m.institution });
    });
    // 2) 소진공 등 정부(정책) 프로그램 (BLOCK 4)
    (report.govPrograms || []).forEach((g) => {
      if (g?.name) titles.push({ kind: "정책자금", icon: "💰", title: g.name });
    });
  } catch {
    /* noop */
  }

  // 3) 정부지원제도 (지금 대상 + 요건 충족 시 대상)
  const status = computeSupportStatus(p);
  SUPPORT_PROGRAMS.forEach((prog) => {
    if (status[prog.id] === "eligible" || status[prog.id] === "potential") {
      titles.push({ kind: "정부지원제도", icon: prog.icon || "🎁", title: prog.title });
    }
  });

  // 중복 제거(같은 제목이 여러 번 나올 수 있음)
  const seen = new Set<string>();
  return titles.filter((t) => {
    const key = `${t.kind}|${t.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
