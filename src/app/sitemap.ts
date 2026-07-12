import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.모두의사업친구.kr";

// 검색엔진에 노출할 공개 페이지 목록 (로그인·결제·마이페이지 등 개인 페이지는 제외)
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "daily" },
    { path: "/diagnosis", priority: 0.9, freq: "weekly" },
    { path: "/pricing", priority: 0.9, freq: "weekly" },
    { path: "/business-info", priority: 0.8, freq: "weekly" },
    { path: "/sites", priority: 0.8, freq: "weekly" },
    { path: "/community", priority: 0.7, freq: "daily" },
    { path: "/terms", priority: 0.4, freq: "monthly" },
    { path: "/privacy", priority: 0.4, freq: "monthly" },
    { path: "/refund", priority: 0.4, freq: "monthly" },
  ];

  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
