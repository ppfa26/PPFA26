import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "정부지원사업 정보 | 모두의사업친구",
  description:
    "정책자금·정부지원금·창업지원·바우처·인증·교육 등 정부지원사업의 종류와 신청 방법을 한눈에 정리했습니다.",
  alternates: { canonical: "/business-info" },
};

export default function BusinessInfoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
