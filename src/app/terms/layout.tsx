import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 모두의사업친구",
  description:
    "모두의사업친구 서비스 이용약관입니다. 서비스 이용 조건, 회원의 권리와 의무, 책임의 한계 등을 안내합니다.",
  alternates: { canonical: "/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
