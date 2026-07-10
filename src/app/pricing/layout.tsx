import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금 안내 | 모두의공공조달",
  description:
    "정책자금 브로커 수수료 5% 대신, 149,000원 한 번으로 직접 신청 방법을 배우세요. 모두의공공조달 요금 안내.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
