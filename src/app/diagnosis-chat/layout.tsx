import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "무료 정부지원사업 진단 | 모두의사업친구",
  description:
    "몇 가지 질문에 답하면 우리 회사가 신청할 수 있는 정책자금·정부지원사업·창업지원 사업을 무료로 진단해 드립니다.",
  alternates: { canonical: "/diagnosis-chat" },
};

// ★ 이 페이지는 데스크톱(width=820) 강제에서 제외한다. ★
//  입력칸(텍스트 인풋)에 포커스할 때 iOS/삼성인터넷이 제멋대로 확대·잘림을 일으키던
//  곳이라, 표준 반응형(device-width)으로 두어 입력 UX 문제를 근본 회피한다.
//  루트 layout 의 width:820 을 이 하위 viewport 가 override 한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function DiagnosisChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
