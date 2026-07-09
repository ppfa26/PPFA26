// 상품 구성 (확정 가격: 149,000 / 299,000 / 599,000)
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
    price: 149000,
    priceLabel: "149,000원",
    originalPrice: 199000,
    originalPriceLabel: "199,000원",
    monthlyLabel: "월 12,420원",
    period: "1개월",
    popular: false,
    features: [
      "내 사업장에 알맞는 정부지원사업 추천",
      "신청 방법 완벽 가이드 사이트 열람권",
      "신청 사이트 안내 및 채널톡 Q&A 상담",
    ],
    cta: "베이직 시작하기",
  },
  {
    id: "premier",
    icon: "🎯",
    name: "프리미어",
    subtitle: "1:1 코칭 패키지",
    price: 299000,
    priceLabel: "299,000원",
    originalPrice: 399000,
    originalPriceLabel: "399,000원",
    monthlyLabel: "월 24,920원",
    period: "1개월",
    popular: true,
    features: [
      "베이직 모든 혜택 포함",
      "사업장 정밀 진단 리포트 PDF",
      "전용 카톡방 1:1 실시간 경영 자문",
    ],
    cta: "프리미어 시작하기",
  },
  {
    id: "pro",
    icon: "🏆",
    name: "프로",
    subtitle: "전문가 멘토링",
    price: 599000,
    priceLabel: "599,000원",
    originalPrice: 799000,
    originalPriceLabel: "799,000원",
    monthlyLabel: "월 49,920원",
    period: "1개월",
    popular: false,
    features: [
      "프리미어 모든 혜택 포함",
      "승인율 극대화 커스텀 전략 설계 및 안내",
      "전화 또는 줌 미팅 1:1 경영 자문 컨설팅",
    ],
    cta: "프로 시작하기",
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// 공통 안내 문구
export const COMMON_NOTES = [
  "✅ 1회성 결제 · 월 구독제 아님",
  "✅ 환불 : 사이트 이용 로그가 있으면 관련 법규에 따라 처리됩니다. 환불 정책을 참고 부탁드립니다.",
  "⚠️ 본 서비스는 신청 가능 정부지원사업을 안내하고 자문하는 서비스이며 승인을 보장하지 않습니다.",
];
