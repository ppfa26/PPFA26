import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.모두의공공조달.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "모두의공공조달 | 정부지원사업 통합 매칭 자문 플랫폼",
  description:
    "정책자금 브로커 수수료 5%, 아직도 비싸게 쓰고 계신가요? 99,000원으로 직접 방법을 배워 무료로 신청하세요. 정책자금·정부지원금·창업지원·바우처·인증·교육 통합 자문 서비스.",
  keywords: [
    "정책자금",
    "정부지원사업",
    "소상공인",
    "중소기업",
    "청년창업사관학교",
    "K-Startup",
    "정부지원금",
    "창업지원",
    "경영컨설팅",
    "모두의공공조달",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "모두의공공조달 | 정부지원사업 통합 매칭 자문 플랫폼",
    description:
      "브로커 수수료 5% 대신, 99,000원으로 직접 방법을 배우세요. 정책자금·정부지원금·창업지원 통합 자문.",
    type: "website",
    locale: "ko_KR",
    siteName: "모두의공공조달",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "모두의공공조달 — 정부지원사업 통합 매칭 자문 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "모두의공공조달 | 정부지원사업 통합 매칭 자문 플랫폼",
    description:
      "브로커 수수료 5% 대신, 99,000원으로 직접 방법을 배우세요.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
