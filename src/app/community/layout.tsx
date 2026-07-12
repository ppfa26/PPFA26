import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 | 모두의사업친구",
  description:
    "정책자금·정부지원금 신청 후기와 노하우를 나누는 모두의사업친구 커뮤니티입니다.",
  alternates: { canonical: "/community" },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
