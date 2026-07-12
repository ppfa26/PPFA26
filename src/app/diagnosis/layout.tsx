import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "무료 정부지원사업 진단 | 모두의사업친구",
  description:
    "몇 가지 질문에 답하면 우리 회사가 신청할 수 있는 정책자금·정부지원금·창업지원 사업을 무료로 진단해 드립니다.",
  alternates: { canonical: "/diagnosis" },
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
