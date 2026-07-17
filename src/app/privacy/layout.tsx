import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 모두의사업친구",
  description:
    "모두의사업친구 개인정보처리방침입니다. 수집하는 개인정보 항목, 이용 목적, 보관 기간, 이용자의 권리 등을 안내합니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
