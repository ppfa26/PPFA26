/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
