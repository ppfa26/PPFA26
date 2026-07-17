import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불정책 | 모두의사업친구",
  description:
    "모두의사업친구 환불정책입니다. 유료 서비스의 환불 기준, 청약철회 방법, 환불 절차 등을 안내합니다.",
  alternates: { canonical: "/refund" },
};

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
