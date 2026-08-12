import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "AI 진단 결과 | 모두의사업친구",
  description:
    "입력하신 사업장 정보로 신청 가능한 정책자금·정부지원사업·감면 혜택을 AI가 매칭한 결과입니다.",
  alternates: { canonical: "/matching-preview" },
};

// ★ 이 페이지(로딩 연출 + 결과 리포트)는 데스크톱(width=820) 강제에서 제외한다. ★
//  루트 layout 은 모바일에서도 width=820 PC뷰를 강제해 통째로 축소해 보여주는데,
//  결과/로딩 화면은 카드·표·광고 등 요소가 많아 그 축소가 "화면 밖으로 넘쳐 잘리고,
//  사용자가 직접 축소해야 겨우 보이는" 불편으로 이어졌다(대표님 요청 개선).
//  → diagnosis-chat / diagnosis-form 과 동일하게 표준 반응형(device-width)으로 두어
//    기기 폭에 딱 맞게 전체가 보이도록 한다. 루트의 width:820 을 이 하위 viewport 가 override.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function MatchingPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
