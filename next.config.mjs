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
    return [
      {
        source: "/:path*",
        headers: [
          // 모바일 브라우저가 옛 페이지를 캐시로 계속 보여주는 문제 방지
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
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
        ],
      },
    ];
  },
};

export default nextConfig;
