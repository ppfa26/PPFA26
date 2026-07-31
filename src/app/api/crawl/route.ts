import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 최대 실행 시간(초) - 여러 페이지 수집 대비 넉넉히
export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────
// 정부지원사업 공고 자동 수집(크롤러)
//   출처1: 기업마당(bizinfo.go.kr) 공공데이터포털 OpenAPI (1421000)
//   출처2: 창업진흥원 K-Startup 조회서비스 (data.go.kr 15125364 / B552735)
//          — 이용허락범위 제한 없음, 무료, 자동승인. 원문 그대로 저장.
//   출처3: 중소벤처24(smes.go.kr) 공고민간연계 API — 기정원 발급 token 필요.
//          token(SMES_API_TOKEN) 미설정 시 자동 스킵.
//   ★ 세 소스 모두 실제 정부 OpenAPI(JSON). 가짜/추정 데이터는 넣지 않음.
//
//  GET  : 최근 수집된 공고 조회(프론트 표시용)
//  POST : 실제 수집 실행
//         - Vercel Cron(자동, 매일) 또는 관리자 수동 버튼에서 호출
//         - CRAWL_SECRET 로 보호(외부인이 함부로 못 돌리게)
// ────────────────────────────────────────────────────────────────

const DATA_KEY = process.env.DATA_GO_KR_API_KEY || process.env.NTS_BUSINESS_API_KEY || "";
// K-Startup(창업진흥원) 전용 서비스키. 없으면 공용 DATA_GO_KR_API_KEY 로 폴백.
//  ★ 단, K-Startup(B552735) 서비스는 data.go.kr 15125364 '활용신청' 이 별도로
//    승인돼 있어야 호출된다. 승인 안 된 키면 아래에서 에러를 그대로 리포트한다.
//    (가짜 데이터 삽입 없음 — 대표님 원칙: 팩트근거)
const KSTARTUP_KEY = process.env.KSTARTUP_API_KEY || DATA_KEY;
// 중소벤처24(smes.go.kr) 공고민간연계 API 전용 token.
//  ★ data.go.kr 키와 전혀 다른 체계 — 기정원(중소기업기술정보진흥원)에 별도 발급 요청.
//    이 값이 없으면 중소벤처24 수집은 건너뛰고(에러 리포트만), 다른 소스는 정상 수집.
//    (가짜 데이터 삽입 없음 — 대표님 원칙: 팩트근거)
const SMES_TOKEN = process.env.SMES_API_TOKEN || "";
const CRAWL_SECRET = process.env.CRAWL_SECRET || "";

// HTML 태그/공백 정리(기업마당 사업개요가 HTML 로 옴 - 지금은 미저장이지만 유틸로 둠)
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
    // 공공데이터포털은 가끔 느림 - 캐시 없이 매번 새로
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

// ── K-Startup(창업진흥원) 한 페이지 수집 ──
//   서비스: 창업진흥원_K-Startup 조회서비스 (data.go.kr 15125364)
//   엔드포인트: /B552735/kisedKstartupService01/getAnnouncementInformation01
//   응답: { currentCount, data: [ { biz_pbanc_nm, pbanc_rcpt_bgng_dt, ... } ] }
//   ⚠️ data.go.kr 15125364 '활용신청' 승인된 키라야 정상 응답. 미승인이면 에러.
async function fetchKstartupPage(page: number, perPage: number) {
  const base =
    "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01";
  const url =
    `${base}?serviceKey=${encodeURIComponent(KSTARTUP_KEY)}` +
    `&page=${page}&perPage=${perPage}&returnType=json`;

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`K-Startup API HTTP ${res.status}`);

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // 키 미승인/오류는 XML(에러) 로 옴 → 메시지 추출
    const msg =
      text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/)?.[1] ||
      text.match(/<errMsg>(.*?)<\/errMsg>/)?.[1] ||
      text.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] ||
      "K-Startup API 응답 형식 오류(서비스키/활용신청 승인 확인 필요)";
    throw new Error(msg);
  }

  // 표준 오류 봉투(코드) 체크
  const code = json?.resultCode ?? json?.response?.header?.resultCode;
  if (code !== undefined && String(code) !== "0" && String(code) !== "00") {
    throw new Error(
      json?.resultMsg || json?.response?.header?.resultMsg || `K-Startup resultCode ${code}`
    );
  }

  const raw = json?.data ?? json?.response?.body?.items?.item;
  const items: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items;
}

// ── K-Startup item → crawled_announcements row 매핑 ──
function mapKstartupItem(it: any) {
  const title = clip(stripHtml(it?.biz_pbanc_nm || it?.intg_pbanc_biz_nm), 500);
  if (!title) return null;

  // 접수기간(yyyymmdd) 을 사람이 읽는 'yyyy-mm-dd ~ yyyy-mm-dd' 로 정규화
  const fmt = (d: any) => {
    const s = String(d ?? "").replace(/[^0-9]/g, "");
    return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : "";
  };
  const bgn = fmt(it?.pbanc_rcpt_bgng_dt);
  const end = fmt(it?.pbanc_rcpt_end_dt);
  const period = bgn && end ? `${bgn} ~ ${end}` : end || bgn || null;

  // 공고 고유키: 공고일련번호(pbanc_sn) 우선
  const sid = it?.pbanc_sn ?? it?.id ?? null;

  return {
    source: "K-Startup",
    source_id: sid !== null ? String(sid) : null,
    site_name: clip(stripHtml(it?.pbanc_ntrp_nm) || "창업진흥원", 200), // 공고기관
    site_url: "https://www.k-startup.go.kr",
    title,
    deadline: period,
    target: clip(stripHtml(it?.aply_trgt_ctnt || it?.aply_trgt), 300) || null, // 신청대상
    support_scale: clip(stripHtml(it?.supt_biz_clsfc), 100) || null, // 지원사업분류
    detail_url: it?.detl_pg_url ? String(it.detl_pg_url) : "https://www.k-startup.go.kr",
    crawled_at: new Date().toISOString(),
  };
}

// ── 중소벤처24(smes.go.kr) 공고민간연계 API 수집 ──
//   서비스: 중소벤처24 공고민간연계 API V2.0
//   엔드포인트: https://www.smes.go.kr/fnct/apiReqst/extPblancInfo (GET, JSON)
//   인증: token (기정원 발급) — GET 호출 시 URL 인코딩 필요
//   응답: { resultCd:"0", data:[{ pblancSeq, pblancNm, pblancBgnDt, ... }], resultMsg }
//   ⚠️ token 없으면 이 함수는 호출조차 안 하도록 상위에서 가드한다.
async function fetchSmesAnnouncements(strDt?: string, endDt?: string) {
  const base = "https://www.smes.go.kr/fnct/apiReqst/extPblancInfo";
  // ★ 발급된 token 은 이미 URL 인코딩된 형태(%2B, %2F 등)로 제공된다.
  //   URLSearchParams 를 쓰면 %2B → %252B 로 '이중 인코딩'되어 인증 실패한다.
  //   → token 은 원문 그대로 쿼리스트링에 붙이고, 나머지 값만 수동 인코딩한다.
  const qs = [`token=${SMES_TOKEN}`, `html=no`];
  if (strDt) qs.push(`strDt=${encodeURIComponent(strDt)}`);
  if (endDt) qs.push(`endDt=${encodeURIComponent(endDt)}`);

  const res = await fetch(`${base}?${qs.join("&")}`, {
    cache: "no-store",
    // 중소벤처24 는 기간이 길면 응답이 커서 느리다 → 넉넉히 45초
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`중소벤처24 API HTTP ${res.status}`);

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("중소벤처24 API 응답 형식 오류(token/IP 허용 확인 필요)");
  }

  // resultCd: 0 정상 / 9,10 인증키 오류 / 14 허용되지 않은 IP / 99 기타
  const code = String(json?.resultCd ?? "");
  if (code && code !== "0") {
    throw new Error(
      `중소벤처24 resultCd ${code}: ${json?.resultMsg || "조회 실패"}`
    );
  }

  const raw = json?.data;
  const items: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items;
}

// ── 중소벤처24 item → crawled_announcements row 매핑 ──
function mapSmesItem(it: any) {
  const title = clip(stripHtml(it?.pblancNm || it?.detailBsnsNm), 500);
  if (!title) return null;

  // 신청기간: 'yyyy-mm-dd ~ yyyy-mm-dd' (원문이 이미 날짜문자열)
  const bgn = clip(stripHtml(it?.pblancBgnDt), 30);
  const end = clip(stripHtml(it?.pblancEndDt), 30);
  const period = bgn && end ? `${bgn} ~ ${end}` : end || bgn || null;

  const sid = it?.pblancSeq ?? null;

  return {
    source: "중소벤처24",
    source_id: sid !== null ? String(sid) : null,
    site_name: clip(stripHtml(it?.sportInsttNm) || "중소벤처24", 200), // 지원기관명
    site_url: "https://www.smes.go.kr",
    title,
    deadline: period,
    target: clip(stripHtml(it?.sportTrget), 300) || null, // 지원대상
    support_scale: clip(stripHtml(it?.sportType || it?.bizType), 100) || null, // 지원유형/사업유형
    detail_url: it?.pblancDtlUrl ? String(it.pblancDtlUrl) : "https://www.smes.go.kr",
    crawled_at: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════
//  [확장 포인트] 공고 소스 추가 방법 (중소벤처24 / K-Startup / 기타 공공데이터)
//  ------------------------------------------------------------------------
//  이 크롤러는 (source, source_id) UPSERT 구조라 소스를 여러 개 붙일 수 있다.
//  새 소스를 추가하려면 아래 2개 함수만 이 파일에 더 만들고,
//  POST 수집 루프에서 호출해 rows 에 push 하면 끝.
//
//    1) async function fetchXxxPage(pageNo, numOfRows): 해당 OpenAPI 호출 → item[] 반환
//    2) function mapXxxItem(it): item → crawled_announcements row 매핑
//         · source     : "중소벤처24" 등 소스명(중복 방지 키의 일부)
//         · source_id  : 소스 고유 공고ID (UPSERT onConflict 기준)
//         · title/deadline/target/support_scale/detail_url/site_name/site_url
//
//  ⚠️ 인증키 체계는 소스마다 다르다:
//     · 기업마당/K-Startup: data.go.kr 서비스키(DATA_GO_KR_API_KEY) 공용.
//     · 중소벤처24: data.go.kr 이 아니라 기정원(중소기업기술정보진흥원)에 직접
//       요청해 발급받는 별도 token → 환경변수 SMES_API_TOKEN 에 넣는다.
//       (Vercel: Project Settings → Environment Variables 에 추가 후 재배포)
//     키/토큰 없이 임의 연동·가짜 데이터 삽입은 하지 않는다. — 대표님 원칙(팩트근거)
// ════════════════════════════════════════════════════════════════════════

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
    // 1) 인증 - 다음 중 하나면 통과
    //    (a) Vercel Cron 자동 호출(x-vercel-cron 헤더)
    //    (b) 서버 시크릿(CRAWL_SECRET) - 수동/디버그용
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

    // 2) Supabase(서비스 롤 우선 - 없으면 anon)
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
    const errors: string[] = [];   // 실제 오류(수집 실패). 하나라도 있으면 부분성공/실패 판단에 씀
    const notices: string[] = [];  // 오류 아님(선택 소스 스킵 등 안내). ok 판정에서 제외
    const perSource: Record<string, number> = { 기업마당: 0, "K-Startup": 0, 중소벤처24: 0 };

    // 4-1) 기업마당 수집
    for (let p = 1; p <= pages; p++) {
      try {
        const items = await fetchBizinfoPage(p, numOfRows);
        if (items.length === 0) break; // 더 이상 공고 없음
        fetched += items.length;
        for (const it of items) {
          const row = mapBizinfoItem(it);
          if (row) {
            rows.push(row);
            perSource["기업마당"]++;
          }
        }
      } catch (e: any) {
        errors.push(`기업마당 page ${p}: ${e?.message || "수집 실패"}`);
        break; // API 에러면 이후 페이지도 실패할 가능성 높음 → 중단
      }
    }

    // 4-2) K-Startup(창업진흥원) 수집
    //   ★ 별도 try 로 감싸므로, 키 미승인 등으로 실패해도 기업마당 결과는 그대로 저장됨.
    //     실패 사유는 errors[] 에 담아 응답으로 그대로 노출(팩트근거, 가짜데이터 없음).
    const kPages = Math.min(pages, 5); // K-Startup 은 perPage 최대 100 → 넉넉히 5페이지
    for (let p = 1; p <= kPages; p++) {
      try {
        const items = await fetchKstartupPage(p, numOfRows);
        if (items.length === 0) break;
        fetched += items.length;
        for (const it of items) {
          const row = mapKstartupItem(it);
          if (row) {
            rows.push(row);
            perSource["K-Startup"]++;
          }
        }
      } catch (e: any) {
        errors.push(`K-Startup page ${p}: ${e?.message || "수집 실패"}`);
        break;
      }
    }

    // 4-3) 중소벤처24(smes.go.kr) 수집
    //   ★ token(기정원 발급) 이 있을 때만 호출. 없으면 조용히 스킵(에러 아님).
    //     token 은 있는데 인증/IP 오류면 errors[] 에 사유를 그대로 담아 노출.
    if (SMES_TOKEN) {
      try {
        // 최근 14일 공고 조회.
        //  · 30일이면 1,800건+ 이라 UPSERT 부하/Cron 60초 제한에 부담 → 14일로 제한.
        //  · 매일 Cron 이 돌므로 14일 창이면 신규 공고를 놓치지 않는다.
        //  · 마감 지난 것 섞임은 표시단에서 isExpired 로 거른다.
        const today = new Date();
        const ago = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        const yyyymmdd = (d: Date) =>
          `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
            d.getDate()
          ).padStart(2, "0")}`;
        const items = await fetchSmesAnnouncements(yyyymmdd(ago), yyyymmdd(today));
        fetched += items.length;
        for (const it of items) {
          const row = mapSmesItem(it);
          if (row) {
            rows.push(row);
            perSource["중소벤처24"]++;
          }
        }
      } catch (e: any) {
        errors.push(`중소벤처24: ${e?.message || "수집 실패"}`);
      }
    } else {
      // ★ token 미설정은 '오류'가 아니라 '선택 소스 스킵'이다.
      //   여기에 errors 로 넣으면 기업마당·K-Startup 이 성공해도 전체가 '수집 실패'로 뜬다.
      //   → notices 로 분리해 ok 판정에서 제외한다.
      notices.push("중소벤처24: SMES_API_TOKEN 미설정 → 스킵(선택 소스, 기정원 인증키 발급 후 환경변수 추가 시 자동 포함)");
    }

    // 4) UPSERT - (source, source_id) 기준 중복 방지 & 최신화
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

    // ── 성공/실패 판정 ──
    //   · 저장(upserted)이 1건이라도 있으면 '성공'으로 본다(부분성공 포함).
    //     일부 소스가 실패해도 다른 소스가 공고를 수집했으면 사용자에겐 성공이다.
    //   · 저장이 0건이고 errors 가 있으면 그때만 '실패'.
    //   · notices(선택 소스 스킵)는 ok 판정에 영향 주지 않는다.
    const ok = upserted > 0 || errors.length === 0;
    return NextResponse.json({
      ok,
      partial: ok && errors.length > 0, // 일부 소스 실패했지만 저장은 됨
      sources: ["기업마당", "K-Startup", "중소벤처24"],
      per_source: perSource, // 소스별 매핑 성공 건수
      pages,
      fetched,
      saved: upserted,
      elapsed_ms: Date.now() - started,
      errors,   // 실제 실패한 소스만
      notices,  // 오류 아님(선택 소스 스킵 등 안내)
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, note: e?.message || "크롤링 실행 실패", elapsed_ms: Date.now() - started },
      { status: 500 }
    );
  }
}
