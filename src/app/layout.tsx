import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import CopyGuard from "@/components/CopyGuard";
import UtmCapture from "@/components/UtmCapture";

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
    "정부지원금",
    "사업지원",
    "소상공인 사업지원",
    "소상공인",
    "중소기업",
    "청년창업사관학교",
    "K-Startup",
    "창업지원",
    "바우처",
    "경영컨설팅",
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
    description: "AI가 내 사업장에 알맞는 정부지원사업을 전부 찾아드립니다.",
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
    description: "AI가 내 사업장에 알맞는 정부지원사업을 전부 찾아드립니다.",
    images: ["/og-image-v2.png"],
  },
};

export const viewport: Viewport = {
  // ★ 데스크톱(PC) 화면 고정 표시 (대표님 요청) ★
  //  모바일·앱에서 접속해도 처음부터 PC 레이아웃(1280px 폭)으로,
  //  화면 크기에 맞게 "자동 축소"되어 전체가 한눈에 보이도록 한다.
  //  → 정보량이 많은 진단 폼·결과 화면을 넓게 한눈에 보도록 하기 위함.
  //
  //  ※ initialScale 은 일부러 지정하지 않는다.
  //    instagram/threads 인앱 브라우저는 initialScale=1 이 있으면 1280px 화면을
  //    축소하지 않고 "왼쪽 위 귀퉁이만" 크게 보여주는 버그가 있다.
  //    → 대신 <head> 의 스크립트에서 (실제 화면폭 ÷ 1280) 배율을 계산해
  //      viewport meta 를 동적으로 세팅한다. (아래 layout <head> 참고)
  width: 1280,
  // 화면 확대·축소(핀치 줌)를 막지 않습니다.
  //  → PC 화면이 작게 보이면 손가락으로 원하는 부분을 키워 볼 수 있도록 접근성 보장.
  //    (시력이 약하신 중장년 고객 배려)
  maximumScale: 5,
  minimumScale: 0.1,
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
      alternateName: "소상공인 사업지원 · 정부지원사업 통합 매칭 플랫폼",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      description:
        "정책자금·정부지원금·창업지원·바우처·인증·교육을 한 곳에서 진단·매칭하여 정부지원사업을 안내·추천하는 통합 매칭 플랫폼입니다.",
      sameAs: [] as string[],
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
        {/* ─────────────────────────────────────────────────────────
            ★ PC(1280px) 화면을 화면 크기에 맞춰 '자동 축소'하는 스크립트 ★
            instagram·threads 인앱 브라우저는 viewport 를 스스로 축소하지 못해
            1280px 화면의 "왼쪽 위 귀퉁이"만 크게 보여주는 문제가 있다.
            → 실제 화면 폭을 재서 (화면폭 ÷ 1280) 배율을 계산하고,
              viewport meta 의 initial-scale 로 직접 지정해 전체가 딱 맞게
              축소되어 보이도록 한다. 화면 회전·크기 변경 시에도 다시 맞춘다.
            ※ next/script 가 아닌 순수 인라인 스크립트로, <body> 그려지기 전에
              최대한 빨리 실행되도록 <head> 최상단에 둔다.
        ───────────────────────────────────────────────────────── */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var BASE = 1280; // PC 레이아웃 기준 폭
  function fit(){
    try {
      var m = document.querySelector('meta[name=viewport]');
      if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
      var w = window.screen && window.screen.width ? window.screen.width : window.innerWidth;
      // 세로/가로 모드 모두 대응: 실제 보이는 폭 중 작은 값 기준
      if (window.innerWidth && window.innerWidth < w) w = window.innerWidth;
      if (!w || w <= 0) w = 360;
      if (w >= BASE) {
        // 태블릿/PC 등 넓은 화면: 그대로 1배율
        m.setAttribute('content', 'width=' + BASE + ', initial-scale=1, minimum-scale=0.1, maximum-scale=5, user-scalable=yes');
        return;
      }
      var scale = w / BASE; // 예: 화면폭 400 → 0.3125 배율
      m.setAttribute('content', 'width=' + BASE + ', initial-scale=' + scale + ', minimum-scale=' + scale + ', maximum-scale=5, user-scalable=yes');
    } catch(e){}
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function(){ setTimeout(fit, 200); });
})();`,
          }}
        />
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="theme-dark">
        <CopyGuard />
        <UtmCapture />
        {children}
        {/* Vercel 방문자 분석 — 화면에 보이지 않으며, 방문자 수·페이지·기기 통계를 수집합니다. */}
        <Analytics />
      </body>
    </html>
  );
}
