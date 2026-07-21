import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 최대 실행 시간(초) — 여러 페이지 수집 대비 넉넉히
export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────
// 정부지원사업 공고 자동 수집(크롤러)
//   출처: 기업마당(bizinfo.go.kr) 공공데이터포털 OpenAPI
//   라이선스: 공공저작물 제3유형(출처표시 + 변경금지) → 원문 그대로 저장
//
//  GET  : 최근 수집된 공고 조회(프론트 표시용)
//  POST : 실제 수집 실행
//         - Vercel Cron(자동, 매일) 또는 관리자 수동 버튼에서 호출
//         - CRAWL_SECRET 로 보호(외부인이 함부로 못 돌리게)
// ────────────────────────────────────────────────────────────────

const DATA_KEY = process.env.DATA_GO_KR_API_KEY || process.env.NTS_BUSINESS_API_KEY || "";
const CRAWL_SECRET = process.env.CRAWL_SECRET || "";

// HTML 태그/공백 정리(기업마당 사업개요가 HTML 로 옴 — 지금은 미저장이지만 유틸로 둠)
function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, max: number): string {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

// ── 기업마당 한 페이지 수집 ──
async function fetchBizinfoPage(pageNo: number, numOfRows: number) {
  const base = "https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService";
  const url =
    `${base}?serviceKey=${encodeURIComponent(DATA_KEY)}` +
    `&pageNo=${pageNo}&numOfRows=${numOfRows}&dataType=json`;

  const res = await fetch(url, {
    // 공공데이터포털은 가끔 느림 — 캐시 없이 매번 새로
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`기업마당 API HTTP ${res.status}`);

  const text = await res.text();
  // 정상은 JSON, 키 오류 등은 XML(SOAP 에러) 로 옴 → JSON 파싱 실패 시 메시지 추출
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    const msg =
      text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/)?.[1] ||
      text.match(/<errMsg>(.*?)<\/errMsg>/)?.[1] ||
      "API 응답 형식 오류(서비스키/트래픽 확인 필요)";
    throw new Error(msg);
  }

  const resultCode = json?.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(json?.response?.header?.resultMsg || `API resultCode ${resultCode}`);
  }

  const rawItems = json?.response?.body?.items?.item;
  const items: any[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return items;
}

// ── 기업마당 item → crawled_announcements row 매핑 ──
function mapBizinfoItem(it: any) {
  const title = clip(stripHtml(it?.pblancNm), 500);
  if (!title) return null; // 제목 없으면 스킵(NOT NULL)

  return {
    source: "기업마당",
    source_id: it?.pblancId ? String(it.pblancId) : null,
    site_name: clip(stripHtml(it?.jrsdInsttNm) || "기업마당", 200), // 소관기관
    site_url: "https://www.bizinfo.go.kr",
    title,
    // 신청기간(예: '2026-07-20 ~ 2026-08-14')을 마감일 칸에 원문 저장
    deadline: clip(stripHtml(it?.reqstBeginEndDe), 100) || null,
    target: clip(stripHtml(it?.trgetNm), 300) || null, // 지원대상
    support_scale: clip(stripHtml(it?.pldirSportRealmLclasCodeNm), 100) || null, // 지원분야
    detail_url: it?.pblancUrl ? String(it.pblancUrl) : null,
    crawled_at: new Date().toISOString(),
  };
}

// ─────────────────────────── GET: 최근 수집 공고 조회 ───────────────────────────
// (Vercel Cron 은 기본 GET 으로 호출됨 → x-vercel-cron 헤더가 있으면 수집 실행)
export async function GET(req: Request) {
  // Vercel Cron 자동 호출 → 실제 수집 실행(POST 로직 재사용)
  if (req.headers.get("x-vercel-cron") === "1") {
    return POST(req);
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ announcements: [], note: "DB 미설정" });
    }
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("crawled_announcements")
      .select("site_name, title, deadline, target, detail_url, source, crawled_at")
      .order("crawled_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ announcements: [], note: error.message });
    }
    return NextResponse.json({ announcements: data || [] });
  } catch (e: any) {
    return NextResponse.json({ announcements: [], note: "조회 실패" });
  }
}

// ─────────────────────────── POST: 실제 크롤링 실행 ───────────────────────────
export async function POST(req: Request) {
  const started = Date.now();
  try {
    // 1) 인증 — 다음 중 하나면 통과
    //    (a) Vercel Cron 자동 호출(x-vercel-cron 헤더)
    //    (b) 서버 시크릿(CRAWL_SECRET) — 수동/디버그용
    //    (c) 로그인한 관리자 세션 토큰(관리자 페이지 버튼) → is_admin() 검증
    const url = new URL(req.url);
    const givenSecret =
      req.headers.get("x-crawl-secret") || url.searchParams.get("secret") || "";
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    let authOk = isVercelCron;
    // (b) 서버 시크릿
    if (!authOk && CRAWL_SECRET && (givenSecret === CRAWL_SECRET || bearer === CRAWL_SECRET)) {
      authOk = true;
    }
    // (c) 관리자 세션 토큰 검증(프론트에서 supabase access_token 을 Bearer 로 전달)
    if (!authOk && bearer) {
      try {
        const supaUrlV = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const userClient = createClient(supaUrlV, anonV, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false },
        });
        const { data: adminCheck } = await userClient.rpc("is_admin");
        if (adminCheck === true) authOk = true;
      } catch {
        /* 관리자 아님 → authOk 유지(false) */
      }
    }

    if (!authOk) {
      return NextResponse.json({ ok: false, note: "권한이 없습니다." }, { status: 401 });
    }

    if (!DATA_KEY) {
      return NextResponse.json(
        { ok: false, note: "DATA_GO_KR_API_KEY(공공데이터 서비스키)가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 2) Supabase(서비스 롤 우선 — 없으면 anon)
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supaUrl || !serviceKey) {
      return NextResponse.json({ ok: false, note: "DB 미설정" }, { status: 500 });
    }
    const supabase = createClient(supaUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 3) 몇 페이지까지 수집할지(기본 3페이지 x 100건 = 최대 300건)
    const pages = Math.min(Math.max(Number(url.searchParams.get("pages") || 3), 1), 10);
    const numOfRows = 100;

    let fetched = 0;
    const rows: any[] = [];
    const errors: string[] = [];

    for (let p = 1; p <= pages; p++) {
      try {
        const items = await fetchBizinfoPage(p, numOfRows);
        if (items.length === 0) break; // 더 이상 공고 없음
        fetched += items.length;
        for (const it of items) {
          const row = mapBizinfoItem(it);
          if (row) rows.push(row);
        }
      } catch (e: any) {
        errors.push(`page ${p}: ${e?.message || "수집 실패"}`);
        break; // API 에러면 이후 페이지도 실패할 가능성 높음 → 중단
      }
    }

    // 4) UPSERT — (source, source_id) 기준 중복 방지 & 최신화
    let upserted = 0;
    const withId = rows.filter((r) => r.source_id);
    const withoutId = rows.filter((r) => !r.source_id);

    if (withId.length > 0) {
      const { error } = await supabase
        .from("crawled_announcements")
        .upsert(withId, { onConflict: "source,source_id", ignoreDuplicates: false });
      if (error) errors.push(`upsert(id): ${error.message}`);
      else upserted += withId.length;
    }
    // source_id 없는 건은 그냥 insert(드묾)
    if (withoutId.length > 0) {
      const { error } = await supabase.from("crawled_announcements").insert(withoutId);
      if (error) errors.push(`insert(no-id): ${error.message}`);
      else upserted += withoutId.length;
    }

    return NextResponse.json({
      ok: errors.length === 0,
      source: "기업마당",
      pages,
      fetched,
      saved: upserted,
      elapsed_ms: Date.now() - started,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, note: e?.message || "크롤링 실행 실패", elapsed_ms: Date.now() - started },
      { status: 500 }
    );
  }
}
