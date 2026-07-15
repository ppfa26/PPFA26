import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금 안내 | 모두의사업친구",
  description:
    "점심 식사 한 끼 값, 19,900원으로. 내 사업장이 받을 수 있는 정부지원사업을 AI로 한 번에 찾고 신청 방법까지 안내받으세요. 모두의사업친구 요금 안내.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
