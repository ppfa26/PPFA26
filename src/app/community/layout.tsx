import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 | 모두의사업친구",
  description:
    "정책자금·정부지원사업 신청 후기와 노하우를 나누는 모두의사업친구 커뮤니티입니다.",
  alternates: { canonical: "/community" },
};

// ★ 후기/커뮤니티 화면(승인 사례 카드·통계)을 데스크톱(width=820) 강제에서 제외한다. ★
//  루트 layout 은 모바일에서도 width=820 을 강제해 카드가 화면 밖으로 잘려, 손으로 축소해야
//  전체가 보였다(대표님 요청 개선). → 결과창(matching-preview)과 100% 동일하게 서버가 처음부터
//  device-width 로 렌더링하고, page.tsx 의 JS 가 width=820(initial-scale 없음)으로 '전환'하면
//  브라우저(삼성인터넷·사파리)가 fit-to-width 를 다시 계산해 폭에 딱 맞게 자동 축소해 준다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
