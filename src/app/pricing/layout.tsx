import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금 안내 | 모두의사업친구",
  description:
    "정책자금 브로커 수수료 5% 대신, 297,000원부터 직접 신청 방법을 배우세요. 모두의사업친구 요금 안내.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
