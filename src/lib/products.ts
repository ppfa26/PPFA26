// 상품 구성 — AI 진단 리포트 단일 상품 (오픈가: 9,900원, 부가세 포함가)
// ※ 결과창 자체가 심화 진단 리포트이므로 상품명을 "AI 진단 리포트"로 정의.
// ※ 심리적 저항선 최소화를 위해 "커피 2잔" 무저항 구간(9,900원)으로 책정.
// ※ id는 기존 "basic"을 그대로 재사용해 결제(?tier=basic) 흐름·기존 결제내역 표기를 유지한다.
// originalPrice = 정가(앵커링용 취소선)
export type Tier = {
  id: "basic" | "premier" | "pro";
  icon: string;
  name: string;
  subtitle: string;
  price: number;
  priceLabel: string;
  originalPrice: number;
  originalPriceLabel: string;
  discountLabel: string; // 할인율 표기 (예: "39% 할인")
  monthlyLabel: string;
  period: string;
  popular: boolean;
  features: string[];
  cta: string;
};

export const TIERS: Tier[] = [
  {
    id: "basic",
    icon: "🎯",
    name: "AI 진단 리포트",
    subtitle: "AI로 내 사업장에서 받을 수 있는 정부지원사업 찾기",
    price: 9900,
    priceLabel: "9,900원",
    originalPrice: 19000,
    originalPriceLabel: "19,000원",
    discountLabel: "48% 할인",
    monthlyLabel: "",
    period: "1개월",
    popular: true,
    features: [
      "AI로 찾은 내 사업장 기준 정부지원사업 리스트",
      "정부지원사업 신청 방법 및 관련 사이트 링크",
      "공식 카카오 채널 톡 상담",
    ],
    cta: "AI 진단 리포트 받기",
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// 공통 안내 문구
export const COMMON_NOTES = [
  "✅ 1회성 결제 · 월 구독제 아님 · 부가세(VAT) 포함",
  "✅ 서비스 제공기간 : 결제 즉시 이용 개시합니다. 개시후 1개월간 서비스 이용 가능",
  "✅ 환불정책 : 사이트 이용 로그가 있으면 관련 법규에 따라 처리됩니다. 환불 정책을 참고.",
  "⚠️ 본 서비스는 정부지원사업을 안내·추천하는 매칭 서비스이며 승인을 보장하지 않습니다.",
];
