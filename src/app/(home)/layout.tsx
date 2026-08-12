import type { Viewport } from "next";

// ★ 홈(첫 화면)을 데스크톱(width=820) 강제에서 '서버 렌더링 시점부터' 제외한다. ★
//  루트 layout 은 모바일에서도 width=820 을 강제하고 Next.js 가 initial-scale=1 을 붙여,
//  홈이 진입 즉시 820px 의 왼쪽 일부만 확대돼 보이고 손가락으로 축소해야 전체가 보였다.
//  → 결과창(matching-preview)과 100% 동일하게, 이 (home) route group 은 서버가 처음부터
//    device-width 로 렌더링한다. 그러면 page.tsx 의 JS 가 width=820(initial-scale 없음)으로
//    '전환'할 때 브라우저(삼성인터넷·사파리 포함)가 fit-to-width 를 다시 계산해,
//    820px 콘텐츠가 기기 폭에 딱 맞게 자동 축소돼 처음부터 전체가 보인다.
//  ( (home) 은 route group 이라 URL 경로에는 영향이 없다 — 홈은 여전히 "/" 이다. )
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
