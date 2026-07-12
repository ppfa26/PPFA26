import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.모두의사업친구.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 개인·결제·API 경로는 검색 색인에서 제외
        disallow: [
          "/api/",
          "/mypage",
          "/payment",
          "/dashboard",
          "/matching-preview",
          "/signup",
        ],
      },
      // 네이버 검색로봇(Yeti) 명시적 허용
      { userAgent: "Yeti", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
