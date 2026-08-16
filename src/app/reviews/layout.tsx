import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "성공 사례 | 모두의사업친구",
  description:
    "모두의사업친구를 통해 정부지원사업에 선정된 실제 대표님들의 성공 사례입니다. 벤처인증·정책자금·수출바우처 등 업종별 자금 확보 스토리를 확인하세요.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "성공 사례 | 모두의사업친구",
    description:
      "자금이 들어온 뒤, 기업은 어떻게 달라졌을까요? 정부지원사업 AI 통합 매칭 플랫폼 모두의사업친구의 실제 승인 사례.",
    url: "/reviews",
    type: "website",
  },
};

// ★ 성공사례 카드(넓은 카드·통계)를 데스크톱(width=820) 강제에서 제외한다. ★
//  커뮤니티/결과창과 동일하게 서버가 device-width 로 렌더링해 모바일에서 카드가 잘리지 않게 한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
