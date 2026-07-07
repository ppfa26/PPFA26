// 상품 구성 (가격 절대 변경 금지: 39,000 / 89,000 / 198,000)
export type Tier = {
  id: "basic" | "premier" | "pro";
  icon: string;
  name: string;
  subtitle: string;
  price: number;
  priceLabel: string;
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
    price: 39000,
    priceLabel: "39,000원",
    period: "1개월",
    popular: false,
    features: [
      "나에게 맞는 정책자금·지원사업 매칭 리포트",
      "신청 방법 완벽 가이드 사이트 열람권",
      "신청 사이트 안내",
      "채널톡 Q&A 상담",
    ],
    cta: "베이직 시작하기",
  },
  {
    id: "premier",
    icon: "🎯",
    name: "프리미어",
    subtitle: "1:1 코칭 패키지",
    price: 89000,
    priceLabel: "89,000원",
    period: "1개월",
    popular: true,
    features: [
      "베이직 전체 혜택",
      "단톡방 1:1 실시간 자문 (1개월)",
    ],
    cta: "프리미어 시작하기",
  },
  {
    id: "pro",
    icon: "🏆",
    name: "프로",
    subtitle: "전문가 멘토링",
    price: 198000,
    priceLabel: "198,000원",
    period: "1개월",
    popular: false,
    features: [
      "프리미어 전체 혜택",
      "전화 심층 멘토링 30분",
      "사업장 진단 리포트 PDF",
      "승인 확률 극대화 전략 컨설팅 추가",
    ],
    cta: "프로 시작하기",
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// 공통 안내 문구
export const COMMON_NOTES = [
  "✅ 1회 결제 · 자동결제 없음",
  "✅ 만족 시 1개월 단위 연장 가능",
  "✅ 환불 : 사이트 이용 로그가 있으면 관련 법규와 법령에 따라 환불이 불가합니다. 서비스 이용 전 100% 환불 가능",
  "⚠️ 본 서비스는 신청 방법·전략 자문 서비스이며, 자금 승인을 보장하지 않습니다",
];
