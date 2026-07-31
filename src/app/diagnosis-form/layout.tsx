import type { Metadata } from "next";

// 기존 폼형 진단(백업 보존용). 홈페이지 기본 진단은 채팅형(/diagnosis-chat)으로 전환됨.
// 검색엔진에는 노출하지 않는다(중복 방지).
export const metadata: Metadata = {
  title: "무료 정부지원사업 진단(폼형) | 모두의사업친구",
  description:
    "몇 가지 질문에 답하면 우리 회사가 신청할 수 있는 정책자금·정부지원사업·창업지원 사업을 무료로 진단해 드립니다.",
  alternates: { canonical: "/diagnosis-chat" },
  robots: { index: false, follow: false },
};

export default function DiagnosisFormLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
