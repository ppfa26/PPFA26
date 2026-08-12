import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "회원가입 | 모두의사업친구",
  description:
    "간편 가입 후 대표님 사업장에 딱 맞는 정부지원사업 진단 결과를 무료로 확인하세요.",
  alternates: { canonical: "/signup" },
};

// ★ 이 페이지(회원가입 · 약관 동의)는 데스크톱(width=820) 강제에서 제외한다. ★
//  루트 layout 은 모바일에서도 width=820 PC뷰를 강제해 통째로 축소해 보여주는데,
//  가입/약관 화면은 폼·체크박스가 많아 그 축소로 오른쪽이 잘려 사용자가 직접 축소해야
//  겨우 보이는 불편이 있었다(대표님 요청 개선). 진단 흐름(챗봇 → 가입 → 결과)이
//  모두 반응형으로 일관되도록, 표준 반응형(device-width)으로 둔다.
//  루트의 width:820 을 이 하위 viewport 가 override 한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b0b0f",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
