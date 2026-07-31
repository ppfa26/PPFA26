/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── (성능) 응답 gzip 압축 명시 — 전송 바이트 축소 (화면 결과 무영향) ──
  compress: true,

  // ── (성능) 무거운 패키지의 tree-shaking 개선 ─────────────────
  //  아이콘/유틸 성격의 큰 패키지에서 '실제로 쓰는 것만' 번들에 포함시켜
  //  First Load JS 를 줄인다. 렌더 결과는 동일. (Next 14 안정 기능)
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },

  // ── 복제/도용 방어 ──────────────────────────────────────────
  // 1) 프로덕션 소스맵 비활성화: 브라우저에서 원본 소스 코드를 복원하기 어렵게 한다.
  productionBrowserSourceMaps: false,
  // 2) 기술 스택(X-Powered-By) 헤더 숨김
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  async headers() {
    // 보안 헤더는 모든 경로 공통. (캐시 정책만 자산/문서에 따라 다르게 적용)
    const securityHeaders = [
      // 3) 클릭재킹/무단 iframe 삽입 방지 — 남의 사이트에 우리 화면을 못 넣게
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // 4) MIME 스니핑 방지
      { key: "X-Content-Type-Options", value: "nosniff" },
      // 5) 리퍼러 최소 노출
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // 6) 우리 화면을 iframe으로 임베드할 수 있는 대상을 자기 자신으로 제한
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self';",
      },
      // 7) HSTS — 브라우저가 이 도메인을 앞으로 항상 HTTPS로만 접속하게 강제.
      //    중간자 공격(http 강등)·쿠키 탈취 위험을 줄인다. (Vercel은 전 구간 HTTPS)
      //    max-age 2년 + 서브도메인 포함 + preload 등록 가능 상태.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      // 8) Permissions-Policy — 우리가 안 쓰는 강력한 브라우저 기능(카메라·마이크·
      //    위치·결제 자동화 등)을 아예 차단해, 삽입된 악성 스크립트가 오남용 못 하게.
      //    (지도·결제창은 별도 도메인/팝업이라 이 정책 영향 없음)
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      // 9) 교차출처 리소스 격리(약한 수준) — 우리 문서를 남이 함부로 리소스로
      //    가져가 임베드/스크래핑하기 조금 더 어렵게. same-site 로 두어 자체 서브도메인은 허용.
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
    ];

    return [
      // ── (성능) 정적 자산은 '영구 캐시' ──────────────────────────
      //  /_next/static/* (JS·CSS·폰트 청크)는 파일명에 해시가 붙어 내용이 바뀌면
      //  파일명 자체가 바뀝니다. 따라서 한 번 받은 파일은 무기한 캐시해도 안전하며,
      //  페이지를 이동할 때마다 다시 받지 않아 화면 전환이 훨씬 빨라집니다.
      {
        source: "/_next/static/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // 이미지·폰트·아이콘 등 public 정적 파일도 하루 캐시(자주 안 바뀜)
      //  ⚠️ /_next/static/* 은 위 규칙(immutable)이 우선이어야 하므로 여기서 제외한다.
      //     (제외하지 않으면 .js 확장자 매칭으로 이 규칙이 나중에 덮어써 immutable이 무력화됨)
      {
        source:
          "/((?!_next/static/).*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|css|js|webmanifest))",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
      // ── HTML 문서(페이지)만 캐시 금지 ───────────────────────────
      //  모바일 브라우저가 옛 페이지를 계속 보여주는 문제 방지.
      //  ⚠️ Next.js는 매칭되는 모든 규칙을 병합하며, 같은 헤더 키는 '나중 규칙'이 이깁니다.
      //     그래서 이 규칙이 "/:path*"처럼 전부를 잡으면 위에서 immutable로 지정한
      //     /_next/static/* 청크까지 다시 no-cache로 덮어써져 캐시가 무력화됩니다.
      //     → negative lookahead로 정적 자산(_next/static, 파일 확장자)을 '제외'하고
      //        오직 HTML 문서 경로에만 no-cache를 적용합니다.
      {
        source:
          "/((?!_next/static/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|css|js|webmanifest)$).*)",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
