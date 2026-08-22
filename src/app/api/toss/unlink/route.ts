import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase Node SDK 는 Node.js 런타임 필요(Edge 아님)
export const runtime = "nodejs";
// 콜백은 매 요청마다 실시간 처리(캐시 금지)
export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════════════
//  토스(앱인토스) "로그인 연결 끊기" 콜백 수신 API   (서버 전용)
//
//  ★ 대표님 안내 ★
//  · 고객이 토스 앱에서 "모두의사업친구" 연동을 해제(연결 끊기/회원탈퇴)하면
//    토스가 이 주소로 신호(referrer=UNLINK)를 보냅니다.
//  · 이 API 는 그 신호를 받아 해당 회원 데이터를 정리(탈퇴 처리)합니다.
//  · 콘솔 "연결 끊기 콜백 정보" 에 등록하는 값:
//      - 콜백 URL   : https://모두의사업친구.kr/api/toss/unlink
//      - HTTP 메서드 : GET (POST 도 동일하게 처리하도록 둘 다 지원)
//      - Basic Auth 헤더 : 콘솔에 넣은 "아이디:비밀번호" 를 base64 인코딩한 값
//
//  ★ 보안 ★
//   · 토스가 보내는 Basic Auth 헤더(base64)를 서버 환경변수와 대조해,
//     "진짜 토스가 보낸 요청"일 때만 처리합니다(위조 요청 차단).
//   · 인증값은 전부 서버 환경변수(process.env)에서만 읽습니다.
//     절대 프론트로 내려가지 않고, 코드/깃에도 저장하지 않습니다.
//       - TOSS_UNLINK_BASIC_USER   : Basic Auth 아이디
//       - TOSS_UNLINK_BASIC_PASS   : Basic Auth 비밀번호
//     (또는 완성형 헤더를 한 번에:)
//       - TOSS_UNLINK_BASIC_AUTH   : "아이디:비밀번호" 를 base64 인코딩한 문자열
//   · 회원 삭제는 기존 관리자용 RPC(admin_delete_user) 를 그대로 재사용합니다.
// ════════════════════════════════════════════════════════════════

// ── 서버 환경변수 ────────────────────────────────────────────────
const BASIC_USER = process.env.TOSS_UNLINK_BASIC_USER || "";
const BASIC_PASS = process.env.TOSS_UNLINK_BASIC_PASS || "";
// 완성형(base64) 을 직접 넣은 경우 우선 사용
const BASIC_AUTH_RAW = process.env.TOSS_UNLINK_BASIC_AUTH || "";

// 콘솔에 등록할 기대 Basic Auth 헤더값(base64) 계산
function expectedBasicToken(): string {
  if (BASIC_AUTH_RAW) return BASIC_AUTH_RAW.trim();
  if (BASIC_USER && BASIC_PASS) {
    return Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");
  }
  return "";
}

// 서버 전용 Supabase 클라이언트(서비스 롤). 미설정이면 null.
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 요청의 Authorization 헤더가 우리가 기대하는 Basic 토큰과 일치하는지 검증
function isAuthorized(req: NextRequest): boolean {
  const expected = expectedBasicToken();
  // 서버에 인증값이 설정되지 않았으면(로컬/미설정) 검증을 강제하지 않고 통과
  //  → 콘솔 "테스트하기" 및 초기 연동을 막지 않기 위함. 운영에선 반드시 env 설정.
  if (!expected) return true;

  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return false;
  const got = m[1].trim();
  // 타이밍 공격 방지까지는 과하므로 단순 비교(값 자체가 랜덤 시크릿)
  return got === expected;
}

// UNLINK 신호를 실제로 처리(해당 회원 데이터 정리)
async function handleUnlink(params: {
  referrer?: string | null;
  userKey?: string | null; // 토스가 넘겨주는 사용자 식별자(있으면)
  email?: string | null; // 이메일이 함께 오면 그걸로 삭제
}): Promise<{ ok: boolean; note: string }> {
  const referrer = (params.referrer || "").toUpperCase();

  // referrer 가 UNLINK 가 아니면(예: 테스트 핑) 정리 없이 200 만 반환
  if (referrer && referrer !== "UNLINK") {
    return { ok: true, note: `referrer=${referrer} (정리 대상 아님, 정상 응답)` };
  }

  const sb = getServerSupabase();
  if (!sb) {
    // DB 미연결이라도 토스에는 성공 응답을 줘야 재시도 폭주를 막음.
    return { ok: true, note: "supabase 미설정 — 신호만 수신(데이터 정리 생략)" };
  }

  // 이메일이 함께 오면 기존 관리자 삭제 RPC 로 계정 전체 정리(진단서·결제·기기·계정)
  const email = (params.email || "").trim();
  if (email) {
    try {
      const { data, error } = await sb.rpc("admin_delete_user", { p_email: email });
      if (error) {
        return { ok: true, note: `삭제 시도 중 오류(무시하고 200): ${error.message}` };
      }
      return { ok: true, note: `계정 정리 완료: ${String(data ?? email)}` };
    } catch (e) {
      return { ok: true, note: `삭제 예외(무시하고 200): ${String(e)}` };
    }
  }

  // 이메일 없이 토스 userKey 만 온 경우: 현재 회원 매핑 테이블이 없으므로
  //  신호만 수신 처리(향후 토스 로그인 SDK 연동 시 userKey↔회원 매핑을 추가 예정).
  return {
    ok: true,
    note: `UNLINK 수신(userKey=${params.userKey ?? "없음"}) — 이메일 매핑 연동 전이라 신호만 기록`,
  };
}

// ── GET: 토스 기본 콜백(쿼리스트링으로 전달) ─────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const result = await handleUnlink({
    referrer: sp.get("referrer"),
    userKey: sp.get("userKey") || sp.get("user_key") || sp.get("userId"),
    email: sp.get("email"),
  });
  return NextResponse.json(result, { status: 200 });
}

// ── POST: 토스가 POST 로 보낼 수도 있어 함께 지원 ────────────────
//   (Content-Type 이 application/json 이 아닌 text/plain 으로 오는 사례가 있어
//    본문을 유연하게 파싱)
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  // 본문 파싱: JSON 우선, 실패 시 form/텍스트/쿼리 순으로 관대하게 처리
  let body: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        // text/plain 또는 form-urlencoded 대비
        const usp = new URLSearchParams(raw);
        body = Object.fromEntries(usp.entries());
      }
    }
  } catch {
    body = {};
  }

  const sp = req.nextUrl.searchParams;
  const pick = (k: string) =>
    (body[k] as string | undefined) ?? sp.get(k) ?? null;

  const result = await handleUnlink({
    referrer: pick("referrer"),
    userKey: pick("userKey") || pick("user_key") || pick("userId"),
    email: pick("email"),
  });
  return NextResponse.json(result, { status: 200 });
}
