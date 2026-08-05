import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스크롤 진단",
  robots: { index: false, follow: false },
};

// viewport 는 일부러 지정하지 않는다 → 루트 layout의 width:820(PC강제)을 그대로 상속받아
// 실제 사이트와 '동일 조건'에서 스크롤이 어디서 막히는지 진단한다.

export default function ScrollCheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
