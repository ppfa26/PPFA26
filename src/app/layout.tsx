import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import CopyGuard from "@/components/CopyGuard";
import UtmCapture from "@/components/UtmCapture";
import ScrollToTop from "@/components/ScrollToTop";
import AccessLogger from "@/components/AccessLogger";
import FontLoader from "@/components/FontLoader";
import KarrotPixel from "@/components/KarrotPixel";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.모두의사업친구.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "모두의사업친구 | 정부지원사업 AI 통합 매칭 플랫폼",
  description:
    "내 사업장에 딱 맞는 정부지원사업을 한번에 진단하고, 신청 방법까지 안내하는 AI 통합 매칭 플랫폼입니다.",
  keywords: [
    // ── 핵심 키워드 ──
    "정책자금",
    "정부지원사업",
    "정부지원제도",
    "정부지원사업 조회",
    "바우처",
    "기업인증",
    "절세",
    "세금감면",
    // ── 자금 종류 키워드 ──
    "사업자금",
    "운영자금",
    "시설자금",
    "운전자금",
    "창업자금",
    // ── 대상/서비스 키워드 ──
    "사업지원",
    "소상공인 사업지원",
    "소상공인",
    "중소기업",
    "청년창업사관학교",
    "K-Startup",
    "창업지원",
    "무료진단",
    "정부지원사업 무료진단",
    // ── 지역(로컬 SEO) 키워드 ──
    "청라 정책자금",
    "인천 정부지원사업",
    "인천 서해구 정책자금",
    "인천 서구 정책자금",
    "검단 정책자금",
    "서울 정부지원사업",
    "경기 정부지원사업",
    // ── 브랜드 ──
    "모두의사업친구",
  ],
  // 홈(대표 페이지) 표준 주소 지정 - 검색엔진 중복 색인 방지
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
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
        url: "/og-image-v3.jpg",
        width: 1200,
        height: 630,
        alt: "모두의사업친구 - 정부지원사업 AI 통합 매칭 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "모두의사업친구 | 정부지원사업 AI 통합 매칭 플랫폼",
    description: "AI가 내 사업장에 알맞은 정부지원사업을 전부 찾아드립니다.",
    images: ["/og-image-v3.jpg"],
  },
};

export const viewport: Viewport = {
  // ★★★ [데스크톱(PC) 화면 강제 — 서버 레벨 고정 방식] ★★★
  //  기존엔 여기를 width:"device-width"(반응형)로 두고, <head> 런타임 스크립트로
  //  모바일일 때만 width=820 으로 '되돌려' PC뷰를 강제했다. 그런데 Next.js 하이드레이션이
  //  이 export 값(device-width)을 클라이언트에서 다시 심어버려, 스크립트가 아무리 820 으로
  //  바꿔도 페이지마다 타이밍 레이스로 되돌아가 모바일에서 PC뷰가 불안정하게만 걸렸다.
  //  → 근본 해결: viewport width 자체를 820 으로 '고정'한다. 서버가 처음부터 width=820 을
  //    HTML 에 심고, 하이드레이션도 같은 값을 유지하므로 되돌릴 것이 없다(레이스 소멸).
  //    · 진짜 PC(≥820)는 어차피 820 보다 넓어 축소가 일어나지 않아 원본 그대로 보인다.
  //    · 모바일은 820px 폭 PC 레이아웃을 기기폭에 맞게 브라우저가 자동 축소해 통째로 보여준다.
  //    · initialScale 은 '지정하지 않는다'. iOS 사파리·삼성인터넷은 initial-scale 을 명시하면
  //      비주얼 뷰포트 높이를 그 스케일로 고정해버려 페이지 하단이 스크롤 밖으로 밀리는
  //      "끝까지 안 내려가는" 버그가 났다. width 만 고정하고 스케일은 브라우저 자동계산에
  //      맡기면(=표준 권장) 스크롤 영역이 정확히 잡혀 하단까지 정상 스크롤된다.
  //  ※ 입력칸 자동 줌 문제가 있던 /diagnosis-chat, /diagnosis-form 은 각 하위 layout 에서
  //    viewport 를 device-width 로 override 하여 이 고정에서 제외한다.
  width: 820,
  // 화면 확대/축소(핀치 줌)를 막지 않습니다.
  //  → 글씨가 작게 느껴지는 중장년 고객이 손가락으로 크게 키워 볼 수 있도록 접근성 보장.
  maximumScale: 5,
  userScalable: true,
  // PWA: 앱 실행 시 상단 상태바/브라우저 UI 색상 (다크 테마에 맞춘 어두운 색)
  themeColor: "#0b0b0f",
};

// ─────────────────────────────────────────────────────────────
//  [A안] 모바일 배경 고정 스크립트
//  문제: 모바일 브라우저는 스크롤 시 주소창 UI가 접혔다 펴지며
//        visual viewport 높이가 계속 바뀐다. body::before(position:fixed)
//        배경이 이 변화를 따라가면서 스크롤 중 배경이 위아래로 밀려 보인다.
//  해법: 최초 로드(가장 큰 화면 높이)를 기준으로 --app-vh 를 '못 박아' 두고,
//        배경 레이어 높이를 그 고정값으로 강제 → 주소창이 접혀도 배경 안 흔들림.
//        스크롤 중 발생하는 작은 높이 변화(주소창)는 무시하고,
//        회전(orientationchange)처럼 진짜 화면이 바뀔 때만 다시 계산한다.
const BG_LOCK_SCRIPT = `
(function () {
  function setLockedVh() {
    try {
      // 가장 큰 안정 높이(주소창 접힌 상태 = 진짜 화면 높이)를 우선 사용
      var h = window.innerHeight;
      if (window.screen && window.screen.height && window.screen.height > h) {
        // screen.height 는 주소창과 무관한 물리 화면 높이 → 배경이 빈틈없이 덮이게
        h = Math.max(h, Math.round(window.screen.height));
      }
      document.documentElement.style.setProperty('--app-vh', h + 'px');
    } catch (e) {}
  }
  setLockedVh();
  // 회전할 때만 재계산(스크롤 중 주소창 변화는 무시 → 배경 고정 유지)
  window.addEventListener('orientationchange', function () { setTimeout(setLockedVh, 300); });
})();
`;

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
      // ★ 브랜드 이름 충돌 방지 ★
      //  네이버가 "모두의사업친구"를 '모두의 + 친구'(서울시복지재단 '모두의 친구' 사업)로
      //  쪼개 인식하는 문제를 막기 위해, 붙여 쓴 고유 브랜드명의 변형들을 alternateName 으로
      //  명시해 하나의 단일 고유명사임을 검색엔진에 각인시킨다.
      alternateName: [
        "모두의사업친구",
        "모두의 사업친구",
        "모두의사업친구 정부지원사업",
        "정부지원사업 AI 통합 매칭 플랫폼",
        "모두의사업친구 (biospartners)",
      ],
      // 브랜드 검색 대표 키워드 - 지원제도·정책자금 검색과 브랜드를 연결
      slogan: "내 사업장에 딱 맞는 정부지원사업, AI가 한 번에 찾아드립니다",
      knowsAbout: [
        "정부지원사업",
        "정부지원제도",
        "정책자금",
        "바우처",
        "기업인증",
        "세금감면",
        "절세",
        "사업자금",
        "운영자금",
        "시설자금",
        "운전자금",
        "창업지원",
        "소상공인 지원",
        "중소기업 지원",
        "정부지원사업 무료진단",
      ],
      // 서비스 제공 지역 - 로컬 검색 신호
      //  ※ 2026.7.1 인천 행정개편으로 '서구'가 '서해구'로 명칭 변경(청라=서해구).
      //    검색 과도기이므로 '서해구'·'서구' 둘 다 신호로 유지한다.
      areaServed: [
        { "@type": "City", name: "인천광역시 서해구 청라" },
        { "@type": "City", name: "인천광역시 서해구" },
        { "@type": "City", name: "인천광역시" },
        { "@type": "City", name: "서울특별시" },
        { "@type": "State", name: "경기도" },
        { "@type": "Country", name: "대한민국" },
      ],
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      description:
        "정책자금·창업지원·바우처·인증·교육 등 전국의 정부지원사업을 한 곳에서 AI가 진단·매칭하여 안내·추천하는 통합 매칭 플랫폼입니다.",
      email: "biospartners@naver.com",
      telephone: "+82-1551-7886",
      foundingDate: "2026",
      address: {
        "@type": "PostalAddress",
        streetAddress: "청라커낼로288번길 26, 285호",
        addressLocality: "서해구",
        addressRegion: "인천광역시",
        addressCountry: "KR",
      },
      // 동일 사업체 신호(NAP 통일) - 검색엔진이 여러 채널을 한 회사로 묶어
      //  '공식 계정 네트워크'로 인식하게 한다(브랜드 신뢰도·상단 노출에 유리).
      //  ※ 실제 운영 중인 공식 채널 URL만 등록(Footer와 동일 출처).
      sameAs: [
        "https://blog.naver.com/biospartners",
        "https://map.naver.com/p/entry/place/1118269039",
        "https://www.instagram.com/ppfa25",
        "https://www.threads.com/@ppfa25",
        "https://link.inpock.co.kr/ppfa25",
        "https://pf.kakao.com/_VxfWxan",
        "https://www.daangn.com/kr/local-profile/8j96yjujtkqy/",
      ] as string[],
    },
    {
      // 지역 사업체 정보 - 네이버 지역검색·지식카드에 주소·전화·평점이 깔끔하게 노출되도록 제공
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#localbusiness`,
      name: "모두의사업친구",
      image: `${SITE_URL}/og-image-v3.jpg`,
      url: SITE_URL,
      telephone: "+82-1551-7886",
      email: "biospartners@naver.com",
      priceRange: "₩",
      address: {
        "@type": "PostalAddress",
        streetAddress: "청라커낼로288번길 26, 285호",
        addressLocality: "서해구",
        addressRegion: "인천광역시",
        addressCountry: "KR",
      },
      // ★ aggregateRating(별점) 제거 ★
      //  실제로 검증 가능한 리뷰 데이터(사이트 내 리뷰 마크업)가 없는 상태에서
      //  별점을 넣으면 구글·네이버의 '자체 평가 리뷰 스팸' 정책 위반으로 간주돼
      //  구조화 데이터 전체가 무시되거나 사이트 신뢰도가 깎일 수 있다.
      //  → 실제 리뷰 시스템을 붙이기 전까지는 넣지 않는 것이 안전하다.
      parentOrganization: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "모두의사업친구",
      // WebSite 레벨에서도 브랜드 고유명을 재확인해 사이트링크 검색창(브랜드 박스) 유도
      alternateName: [
        "모두의사업친구",
        "모두의 사업친구",
        "정부지원사업 AI 통합 매칭 플랫폼",
      ],
      description:
        "내 사업장에 딱 맞는 정부지원사업을 한번에 진단하고, 신청 방법까지 안내하는 AI 통합 매칭 플랫폼입니다.",
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      // ★ 사이트링크 검색창(Sitelinks Searchbox) ★
      //  실제 검색이 동작하는 커뮤니티 경로로 지정 (검색어는 q 파라미터로 전달).
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
      // ★ 빵부스러기(BreadcrumbList) ★
      //  검색엔진이 사이트 계층 구조를 이해해 '사이트링크(하위 메뉴)'를 뽑기 쉽게 한다.
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "무료 진단",
          item: `${SITE_URL}/diagnosis-chat`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "정부지원사업 정보",
          item: `${SITE_URL}/business-info`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "요금 안내",
          item: `${SITE_URL}/pricing`,
        },
      ],
    },
    {
      // 검색결과 사이트링크용 주요 메뉴
      "@type": "SiteNavigationElement",
      "@id": `${SITE_URL}/#navigation`,
      // 실제 사이트 메뉴(Footer)와 일치시켜 검색엔진이 잘못된 하위 링크를 만들지 않게 한다.
      name: [
        "무료 진단",
        "요금 안내",
        "정부지원사업 정보",
        "정부 사이트",
        "후기",
        "이용약관",
      ],
      url: [
        `${SITE_URL}/diagnosis-chat`,
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
        {/* ★ 데스크톱(PC) 화면 강제는 viewport export(width:820)로 서버에서 고정 처리한다.
            (기존 런타임 스크립트 방식은 하이드레이션 레이스로 불안정해 제거함) ★ */}
        {/* ★ [A안] 모바일 배경 고정 - --app-vh 못 박기 (스크롤 시 배경 흔들림 방지) ★ */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: BG_LOCK_SCRIPT }} />
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
        {/* ── Font Awesome (푸터 SNS 브랜드 아이콘용) ──
            인스타·스레드·카카오·네이버 등 실제 로고 아이콘을 쓰기 위해 로드.
            eslint-disable-next-line @next/next/no-css-tags */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css"
        />
      </head>
      <body className="theme-dark">
        <ScrollToTop />
        {/* ★ 데스크톱(PC) 화면 강제는 viewport export(width:820)로 서버에서 고정한다.
            (기존 ViewportManager 는 경로 전환마다 initial-scale=0.439 를 런타임 삽입해,
             삼성인터넷/사파리에서 페이지 하단이 스크롤 밖으로 밀리는 "끝까지 안 내려가는"
             버그를 재유발했으므로 제거함. 서버 고정만으로 PC 강제가 충분하다.) ★ */}
        {/* 접속(IP) 로거 - 회원/비회원 모든 방문자 IP를 관리자에 기록(대표님 요청 A안) */}
        <AccessLogger />
        <CopyGuard />
        <UtmCapture />
        {children}
        {/* Vercel 방문자 분석 - 화면에 보이지 않으며, 방문자 수·페이지·기기 통계를 수집합니다. */}
        <Analytics />
        {/* 당근마켓 전환 추적 픽셀 - 당근 광고 성과(조회·전환) 측정용. 화면에 보이지 않음. */}
        <KarrotPixel />
      </body>
    </html>
  );
}
