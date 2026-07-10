import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "정부지원사업 신청 사이트 모음 | 모두의공공조달",
  description:
    "소상공인정책자금·중진공·신용보증기금·기술보증기금·K-Startup·기업마당 등 정부지원사업 공식 신청 사이트를 한 곳에 모았습니다.",
  alternates: { canonical: "/sites" },
};

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
