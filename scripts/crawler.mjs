// ============================================================
// 모두의사업친구 - 핵심 7개 정책금융기관 공고 크롤러
// 실행: node scripts/crawler.mjs
// 스케줄: 매일 새벽 03:00 (scripts/scheduler.mjs 참고)
//
// [대표님 요청] 크롤링 대상을 정책자금 매칭에 실제 쓰는
//   7개 기관으로 축소:
//     ① 기업마당(bizinfo)  ② 기술보증기금(기보)  ③ 신용보증기금(신보)
//     ④ 지역신용보증재단(재단·중앙회)  ⑤ 한국무역보험공사(무보)
//     ⑥ 소상공인시장진흥공단(소진공)  ⑦ 중소벤처기업진흥공단(중진공)
//   → 결과창에 안내하는 기관과 크롤링 소스를 100% 일치시켜 관리 단순화.
// ============================================================
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

// ── Supabase REST insert 헬퍼 ─────────────────────────────────────────
//  supabase-js는 Node 20에서 realtime(WebSocket) 때문에 로드 오류가 나므로,
//  크롤러는 REST 엔드포인트(PostgREST)에 fetch로 직접 insert 한다.
//  → 추가 의존성 없이 대표님 PC의 Node 버전과 무관하게 항상 동작.
async function supabaseInsert(baseUrl, anonKey, table, rows) {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/rest/v1/${table}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`${res.status} ${msg.slice(0, 120)}`);
  }
}

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

// ── 크롤링 대상: 핵심 7개 기관 (결과창 안내 기관과 동일) ──────────────
//  url        : 크롤링 시작 페이지(공고 게시판 우선, 없으면 대표 홈)
//  fallbackUrl: 첫 페이지 봇차단/타임아웃 시 재시도할 대체 페이지(홈 등)
//  각 사이트가 봇차단을 하면 홈페이지라도 훑어 공고성 링크를 추출합니다.
const TARGETS = [
  {
    name: "기업마당",
    url: "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do",
    fallbackUrl: "https://www.bizinfo.go.kr/",
  },
  {
    name: "기술보증기금",
    url: "https://www.kibo.or.kr/main/board/boardType08.do",
    fallbackUrl: "https://www.kibo.or.kr/portal",
  },
  {
    name: "신용보증기금",
    url: "https://www.kodit.or.kr/kodit/na/ntt/selectNttList.do?mi=2806&bbsId=1002",
    fallbackUrl: "https://www.kodit.or.kr/",
  },
  {
    name: "지역신용보증재단",
    // 공식 사이트가 JS 렌더링(SPA)이라 정적 크롤링 불가 → 기업마당 기관 검색으로 대체
    url: "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?rowCount=15&pageUnit=15&searchCnt=1&searchLclasId=&searchKeyword=%EC%8B%A0%EC%9A%A9%EB%B3%B4%EC%A6%9D%EC%9E%AC%EB%8B%A8",
    fallbackUrl: "https://www.koreg.or.kr/",
  },
  {
    name: "한국무역보험공사",
    url: "https://www.ksure.or.kr/rh-kr/cntnts/i-104/web.do",
    fallbackUrl: "https://www.ksure.or.kr/",
  },
  {
    name: "소상공인시장진흥공단",
    url: "https://www.semas.or.kr/web/board/webBoardList.kmdc?bCd=1",
    fallbackUrl: "https://www.semas.or.kr/",
  },
  {
    name: "중소벤처기업진흥공단",
    // 공식 사이트가 JS 렌더링(SPA)이라 정적 크롤링 불가 → 기업마당 기관 검색으로 대체
    url: "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?rowCount=15&pageUnit=15&searchCnt=1&searchKeyword=%EC%A4%91%EC%86%8C%EB%B2%A4%EC%B2%98%EA%B8%B0%EC%97%85%EC%A7%84%ED%9D%A5%EA%B3%B5%EB%8B%A8",
    fallbackUrl: "https://www.kosmes.or.kr/nsh/SH/NTS/SHNTS001M0.do",
  },
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
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const canSave = !!(supaUrl && supaKey);

  let totalSaved = 0;
  const report = [];

  for (const site of TARGETS) {
    // 1차: 공고 게시판 URL → 실패 시 2차: fallback(홈) URL 재시도
    let html = await fetchHtml(site.url);
    let usedUrl = site.url;
    if (!html && site.fallbackUrl) {
      html = await fetchHtml(site.fallbackUrl);
      usedUrl = site.fallbackUrl;
    }
    if (!html) {
      report.push(`❌ ${site.name}: 접근 불가(봇차단/타임아웃)`);
      continue;
    }
    const items = extractAnnouncements(html, { ...site, url: usedUrl });
    report.push(`✅ ${site.name}: ${items.length}건 추출`);

    if (canSave && items.length) {
      const rows = items.map((i) => ({
        site_name: site.name,
        site_url: usedUrl,
        title: i.title,
        detail_url: i.detail_url,
        crawled_at: new Date().toISOString(),
      }));
      try {
        await supabaseInsert(supaUrl, supaKey, "crawled_announcements", rows);
        totalSaved += rows.length;
      } catch (err) {
        report.push(`   ⚠️ 저장 실패: ${err.message}`);
      }
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
