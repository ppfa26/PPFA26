// 상품 구성 — 올인원 패키지 단일 상품 (확정 가격: 19,900원, 부가세 포함가)
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
    name: "올인원 패키지",
    subtitle: "내 사업장 정부지원 올인원",
    price: 19900,
    priceLabel: "19,900원",
    originalPrice: 49000,
    originalPriceLabel: "49,000원",
    discountLabel: "59% 할인",
    monthlyLabel: "",
    period: "1개월",
    popular: true,
    features: [
      "내가 받을 수 있는 모든 정부지원사업 리스트",
      "신청하는 방법 및 관련 사이트 링크",
      "공식 카카오톡 채널톡 상담",
    ],
    cta: "올인원 패키지 시작하기",
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// 공통 안내 문구
export const COMMON_NOTES = [
  "✅ 1회성 결제 · 월 구독제 아님 · 부가세(VAT)가 포함된 금액입니다.",
  "✅ 서비스 제공기간 : 결제 즉시 이용 개시합니다. 개시후 1개월간 서비스 이용가능합니다.",
  "✅ 환불정책 : 사이트 이용 로그가 있으면 관련 법규에 따라 처리됩니다. 환불 정책을 참고 부탁드립니다.",
  "⚠️ 본 서비스는 사업장에 알맞게 정부지원사업을 추천 및 자문하는 서비스이며 승인을 보장하지 않습니다.",
];
