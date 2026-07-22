import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import CopyGuard from "@/components/CopyGuard";
import UtmCapture from "@/components/UtmCapture";
import ScrollToTop from "@/components/ScrollToTop";
import FontLoader from "@/components/FontLoader";
import KarrotPixel from "@/components/KarrotPixel";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.모두의사업친구.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "모두의사업친구 | 정부지원사업 통합 매칭 플랫폼",
  description:
    "AI가 내 사업장에 딱 맞는 정책자금·정부지원사업을 한 번에 진단하고, 신청 방법까지 안내하는 통합 매칭 플랫폼, 모두의사업친구.",
  keywords: [
    "정책자금",
    "정부지원사업",
    "정부지원사업 조회",
    "사업지원",
    "소상공인 사업지원",
    "소상공인",
    "중소기업",
    "청년창업사관학교",
    "K-Startup",
    "창업지원",
    "바우처",
    "모두의사업친구",
  ],
  // 홈(대표 페이지) 표준 주소 지정 — 검색엔진 중복 색인 방지
  alternates: { canonical: "/" },
  // PWA: 홈 화면 설치용 매니페스트 연결
  manifest: "/manifest.webmanifest",
  // iOS 홈 화면 앱 이름
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "모두의사업친구",
  },
  icons: {
    icon: "/favicon.png",
    // iOS 홈 화면 설치 시 'm' 로고 아이콘 사용
    apple: "/apple-icon-180.png",
  },
  verification: {
    // 구글 서치콘솔 사이트 소유확인
    google: "WfXpXS_N-fRjTPx_hn7HUuh9smkrJf_F8GtW2rR9dl4",
    // 네이버 서치어드바이저 사이트 소유확인
    // (모두의사업친구.kr + www.모두의사업친구.kr 둘 다 확인용 2개 등록)
    other: {
      "naver-site-verification": [
        "66c4c240bdd1a1611d4ed4e2d34a96c8d0d11ba8",
        "71235ff2f43163f95db43a9c88126b768f7a4997",
      ],
    },
  },
  openGraph: {
    title: "모두의사업친구 | 정부지원사업 AI 통합 매칭 플랫폼",
    description: "AI가 내 사업장에 알맞은 정부지원사업을 전부 찾아드립니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "모두의사업친구",
    images: [
      {
        url: "/og-image-v2.png",
        width: 1200,
        height: 630,
        alt: "모두의사업친구 — 정부지원사업 AI 통합 매칭 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "모두의사업친구 | 정부지원사업 AI 통합 매칭 플랫폼",
    description: "AI가 내 사업장에 알맞은 정부지원사업을 전부 찾아드립니다.",
    images: ["/og-image-v2.png"],
  },
};

export const viewport: Viewport = {
  // ★ 정상 반응형(모바일=모바일 화면) ★
  //  instagram·threads 인앱 브라우저에서 화면이 잘리지 않도록,
  //  기기 화면 폭을 그대로 따르는 표준 반응형으로 되돌린다.
  //  → 모바일에서는 콘텐츠가 세로로 쌓여 '스크롤'로 전부 보이고(잘림 없음),
  //    PC에서는 넓은 데스크톱 레이아웃이 그대로 보인다.
  width: "device-width",
  initialScale: 1,
  // 화면 확대(핀치 줌)를 막지 않습니다.
  //  → 시력이 약하신 중장년 고객도 글자를 크게 키워 볼 수 있도록 접근성 보장.
  maximumScale: 5,
  userScalable: true,
  // PWA: 앱 실행 시 상단 상태바/브라우저 UI 색상 (다크 테마에 맞춘 어두운 색)
  themeColor: "#0b0b0f",
};

// ─────────────────────────────────────────────────────────────
//  검색엔진 구조화 데이터(JSON-LD)
//  네이버/구글이 사이트 구조를 인식해 검색결과에 '사이트링크(메뉴)'를
//  만들 수 있도록 조직·사이트·주요 메뉴 정보를 제공한다.
// ─────────────────────────────────────────────────────────────
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "모두의사업친구",
      alternateName: "정부지원사업 AI 통합 매칭 플랫폼",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      description:
        "정책자금·창업지원·바우처·인증·교육 등 전국의 정부지원사업을 한 곳에서 AI가 진단·매칭하여 안내·추천하는 통합 매칭 플랫폼입니다.",
      email: "biospartners@naver.com",
      telephone: "+82-1551-7886",
      // 동일 사업체 신호(NAP 통일) — 검색엔진이 여러 채널을 한 회사로 묶습니다.
      sameAs: [
        "https://www.daangn.com/kr/business/모두의사업친구",
        "http://pf.kakao.com/_VxfWxan",
      ] as string[],
    },
    {
      // 지역 사업체 정보 — 네이버 지역검색·지식카드에 주소·전화·평점이 깔끔하게 노출되도록 제공
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#localbusiness`,
      name: "모두의사업친구",
      image: `${SITE_URL}/og-image-v2.png`,
      url: SITE_URL,
      telephone: "+82-1551-7886",
      email: "biospartners@naver.com",
      priceRange: "₩",
      address: {
        "@type": "PostalAddress",
        streetAddress: "청라커낼로288번길 26, 285호",
        addressLocality: "서구",
        addressRegion: "인천광역시",
        addressCountry: "KR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.3",
        bestRating: "5",
        ratingCount: "75",
      },
      parentOrganization: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "모두의사업친구",
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/community?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      // 검색결과 사이트링크용 주요 메뉴
      "@type": "SiteNavigationElement",
      "@id": `${SITE_URL}/#navigation`,
      name: [
        "무료 진단",
        "요금 안내",
        "정부지원사업 정보",
        "신청 사이트 모음",
        "커뮤니티",
        "이용약관",
      ],
      url: [
        `${SITE_URL}/diagnosis`,
        `${SITE_URL}/pricing`,
        `${SITE_URL}/business-info`,
        `${SITE_URL}/sites`,
        `${SITE_URL}/community`,
        `${SITE_URL}/terms`,
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <meta name="copyright" content="© 모두의사업친구 (biospartners). All rights reserved. 무단 복제·도용 금지" />
        <meta name="author" content="모두의사업친구" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* ── (성능) 본문 폰트: Pretendard 한 종류만 로딩 ──
            Pretendard는 CDN을 미리 연결(preconnect)해 두어 첫 화면 폰트 적용을 앞당깁니다.
            ※ 예전에는 Noto Sans KR·나눔고딕·나눔명조까지 함께 받았는데,
              이 폰트들은 '관리자 편집 툴바'의 글꼴 선택 옵션에서만 쓰여
              일반 방문자에겐 초기 로딩만 무겁게 했습니다. 그래서 제거했습니다.
              (관리자가 편집 시 해당 글꼴을 고르면 방문자 브라우저의 시스템 글꼴로 대체됩니다.) */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* ── (성능) 폰트 CSS 비동기 로딩 ──
            렌더블로킹을 없애 첫 화면(FCP)을 앞당깁니다.
            · media="print" 로 받아오면 브라우저가 '인쇄용'으로 판단해 렌더를 막지 않고,
              로드가 끝나면 onLoad 에서 media="all" 로 바꿔 화면에 적용합니다.
              (React/Next 가 지원하는 '함수형' onLoad 라 문자열 핸들러 문제 없음)
            · JS 비활성 환경을 위해 <noscript> 로 동기 로딩 폴백을 둡니다.
            그동안에는 system-ui(아래 globals) 로 즉시 렌더 → 폰트 도착 후 교체.  */}
        <FontLoader />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          />
        </noscript>
      </head>
      <body className="theme-dark">
        <ScrollToTop />
        <CopyGuard />
        <UtmCapture />
        {children}
        {/* Vercel 방문자 분석 — 화면에 보이지 않으며, 방문자 수·페이지·기기 통계를 수집합니다. */}
        <Analytics />
        {/* 당근마켓 전환 추적 픽셀 — 당근 광고 성과(조회·전환) 측정용. 화면에 보이지 않음. */}
        <KarrotPixel />
      </body>
    </html>
  );
}
