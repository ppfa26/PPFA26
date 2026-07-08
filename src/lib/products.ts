// 상품 구성 (확정 가격: 99,000 / 199,000 / 399,000)
// originalPrice = 정가(앵커링용 취소선), monthly = 12개월 환산 참고 표기
export type Tier = {
  id: "basic" | "premier" | "pro";
  icon: string;
  name: string;
  subtitle: string;
  price: number;
  priceLabel: string;
  originalPrice: number;
  originalPriceLabel: string;
  monthlyLabel: string;
  period: string;
  popular: boolean;
  features: string[];
  cta: string;
};

export const TIERS: Tier[] = [
  {
    id: "basic",
    icon: "📚",
    name: "베이직",
    subtitle: "셀프 신청 가이드",
    price: 99000,
    priceLabel: "99,000원",
    originalPrice: 149000,
    originalPriceLabel: "149,000원",
    monthlyLabel: "월 8,250원",
    period: "1개월",
    popular: false,
    features: [
      "나에게 알맞는 정부지원사업 매칭 및 안내",
      "정부지원사업 신청 방법 가이드 사이트 열람권",
      "채널톡 Q&A 상담",
    ],
    cta: "베이직 시작하기",
  },
  {
    id: "premier",
    icon: "🎯",
    name: "프리미어",
    subtitle: "1:1 코칭 패키지",
    price: 199000,
    priceLabel: "199,000원",
    originalPrice: 299000,
    originalPriceLabel: "299,000원",
    monthlyLabel: "월 16,600원",
    period: "1개월",
    popular: true,
    features: [
      "베이직 모든 혜택",
      "사업장 진단 리포트 PDF",
      "카톡방 1:1 실시간 자문 (1개월)",
    ],
    cta: "프리미어 시작하기",
  },
  {
    id: "pro",
    icon: "🏆",
    name: "프로",
    subtitle: "전문가 멘토링",
    price: 399000,
    priceLabel: "399,000원",
    originalPrice: 690000,
    originalPriceLabel: "690,000원",
    monthlyLabel: "월 33,250원",
    period: "1개월",
    popular: false,
    features: [
      "프리미어 모든 혜택",
      "전화 or 줌 미팅으로 사업장 경영 컨설팅",
      "승인율을 높이는 전략적 순서 및 방법 자문",
    ],
    cta: "프로 시작하기",
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// 공통 안내 문구
export const COMMON_NOTES = [
  "✅ 1회성 결제 · 월 구독제 아님 (월 환산 금액은 12개월 기준)",
  "✅ 환불 : 사이트 이용 로그가 있으면 관련 법규에 따라 처리됩니다. 환불 정책을 참고 부탁드립니다.",
  "⚠️ 본 서비스는 신청 가능 정부지원사업을 안내하고 자문하는 서비스이며 승인을 보장하지 않습니다.",
];
