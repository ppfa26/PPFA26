import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "결제하기 | 모두의사업친구",
  description: "AI 진단 리포트 결제 페이지입니다. 토스페이먼츠로 안전하게 결제됩니다.",
  alternates: { canonical: "/payment" },
};

// ★ 결제 화면을 데스크톱(width=820) 강제에서 제외한다. (대표님 요청) ★
//  루트 layout 은 모바일에서도 width=820 으로 PC뷰를 강제한다. 그러면 결제 페이지가
//  모바일에서 축소된 PC 화면으로 뜨고, 그 viewport 를 따라 토스페이먼츠 결제창도
//  'PC(데스크톱) 결제창'으로 열려 손가락으로 누르기 불편했다.
//  → 결제/결제결과 화면만 device-width(진짜 모바일 폭)로 렌더링해, 모바일에서
//    결제 페이지도 모바일 폭으로 뜨고 토스 결제창도 모바일 버전으로 열리게 한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
