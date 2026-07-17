import type { MetadataRoute } from "next";

// ─────────────────────────────────────────────────────────────
//  PWA 매니페스트 (홈 화면 설치 / 앱처럼 실행)
//  Next.js App Router가 자동으로 /manifest.webmanifest 로 서빙합니다.
//  1단계 PWA: 홈 화면 아이콘 + 주소창 없는 전체화면(standalone) 실행.
// ─────────────────────────────────────────────────────────────
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "모두의사업친구",
    short_name: "사업친구",
    description:
      "AI가 내 사업장에 딱 맞는 정책자금·정부지원사업을 한 번에 진단하고 매칭해주는 통합 플랫폼.",
    start_url: "/",
    scope: "/",
    display: "standalone", // 주소창 없는 전체화면 (앱처럼)
    orientation: "portrait",
    background_color: "#0b0b0f", // 앱 로딩 스플래시 배경 (다크)
    theme_color: "#f5a623", // 상단 상태바 색상 (브랜드 옐로우-오렌지)
    lang: "ko",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
