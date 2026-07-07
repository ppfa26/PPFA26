// ============================================================
// 모두의공공조달 - 89개 공식 사이트 크롤러
// 실행: node scripts/crawler.mjs
// 스케줄: 매일 새벽 03:00 (scripts/scheduler.mjs 참고)
// ============================================================
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// 환경변수 로드 (.env.local)
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const raw = fs.readFileSync(envPath, "utf-8");
    raw.split("\n").forEach((line) => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2];
    });
  } catch {}
}
loadEnv();

// 크롤링 대상 사이트 (핵심 공고 게시판 위주 — 전체 89개는 src/lib/crawlSites.ts)
// 실제 공고 목록을 안정적으로 파싱할 수 있는 대표 사이트를 우선 크롤링합니다.
const TARGETS = [
  { name: "기업마당", url: "https://www.bizinfo.go.kr/", listSel: "a", titleAttr: "text" },
  { name: "K-Startup 창업지원포털", url: "https://www.k-startup.go.kr/", listSel: "a", titleAttr: "text" },
  { name: "중소벤처기업진흥공단", url: "https://www.kosmes.or.kr/", listSel: "a", titleAttr: "text" },
  { name: "소상공인시장진흥공단", url: "https://www.semas.or.kr/", listSel: "a", titleAttr: "text" },
  { name: "신용보증기금", url: "https://www.kodit.or.kr/", listSel: "a", titleAttr: "text" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// 공고성 키워드가 포함된 링크만 추출
const KEYWORDS = ["공고", "모집", "지원사업", "신청", "융자", "바우처", "선정", "안내", "사업"];

function extractAnnouncements(html, site) {
  const $ = cheerio.load(html);
  const items = [];
  $("a").each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    const href = $(el).attr("href") || "";
    if (text.length < 8 || text.length > 120) return;
    if (!KEYWORDS.some((k) => text.includes(k))) return;
    let detailUrl = href;
    if (href && !href.startsWith("http")) {
      try {
        detailUrl = new URL(href, site.url).href;
      } catch {
        detailUrl = site.url;
      }
    }
    items.push({ title: text, detail_url: detailUrl });
  });
  // 중복 제거
  const seen = new Set();
  return items.filter((i) => {
    if (seen.has(i.title)) return false;
    seen.add(i.title);
    return true;
  }).slice(0, 20);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = url && key ? createClient(url, key) : null;

  let totalSaved = 0;
  const report = [];

  for (const site of TARGETS) {
    const html = await fetchHtml(site.url);
    if (!html) {
      report.push(`❌ ${site.name}: 접근 불가(봇차단/타임아웃)`);
      continue;
    }
    const items = extractAnnouncements(html, site);
    report.push(`✅ ${site.name}: ${items.length}건 추출`);

    if (supabase && items.length) {
      const rows = items.map((i) => ({
        site_name: site.name,
        site_url: site.url,
        title: i.title,
        detail_url: i.detail_url,
        crawled_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("crawled_announcements").insert(rows);
      if (!error) totalSaved += rows.length;
      else report.push(`   ⚠️ 저장 실패: ${error.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000)); // 예의상 딜레이
  }

  console.log("=== 크롤링 리포트 " + new Date().toLocaleString("ko-KR") + " ===");
  report.forEach((r) => console.log(r));
  console.log(`총 저장: ${totalSaved}건`);
}

main().catch((e) => {
  console.error("크롤러 오류:", e.message);
  process.exit(1);
});
