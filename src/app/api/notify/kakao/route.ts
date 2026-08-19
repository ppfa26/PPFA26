import { NextRequest, NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";
import { createClient } from "@supabase/supabase-js";

// solapi SDK 는 Node.js 런타임 필요 (Edge 아님)
export const runtime = "nodejs";

// ════════════════════════════════════════════════════════════════
//  SOLAPI 카카오 알림톡 발송 (서버 전용)
//
//  ★ 대표님 안내 ★
//  · 진단(설문)을 '끝까지 완료'한 회원에게만 카카오 알림톡을 1회 발송합니다.
//  · 회원가입만 하고 진단을 안 하면 → 여기로 요청 자체가 오지 않습니다.
//  · 같은 번호는 '평생 딱 1번만' 발송합니다(대표님 요청).
//    → 발송 이력을 Supabase(alimtalk_sent 테이블)에 남겨 기기·브라우저·시간과
//      무관하게 영구 중복방지. (localStorage 는 같은 브라우저만 막고,
//       서버 메모리 캐시는 서버 재시작 시 초기화되므로 DB 가 최종 방어선)
//
//  ★ 보안 ★
//   API 키/시크릿·pfId·템플릿ID·발신번호는 전부 서버 환경변수(process.env)에서만
//   읽습니다. 절대 프론트로 내려가지 않으며, 코드/깃에도 저장하지 않습니다.
//     - SOLAPI_API_KEY      : 솔라피 API 키
//     - SOLAPI_API_SECRET   : 솔라피 API 시크릿
//     - SOLAPI_PFID         : 카카오 채널 pfId
//     - SOLAPI_TEMPLATE_ID  : 승인된 알림톡 템플릿 ID (변수 없음)
//     - SOLAPI_FROM         : 발신번호 (솔라피 발신번호 관리에 등록·인증된 번호)
// ════════════════════════════════════════════════════════════════

const API_KEY = process.env.SOLAPI_API_KEY || "";
const API_SECRET = process.env.SOLAPI_API_SECRET || "";
const PF_ID = process.env.SOLAPI_PFID || "";
const TEMPLATE_ID = process.env.SOLAPI_TEMPLATE_ID || "";
const FROM = process.env.SOLAPI_FROM || "";

// 발송 이력 테이블 이름(Supabase)
const SENT_TABLE = "alimtalk_sent";

// ── 서버 메모리 중복 방지 캐시(보조 2차 방어) ────────────────────
//  DB 가 최종 방어선이지만, 같은 인스턴스의 초단기 동시요청은 메모리로도 한번 더 막는다.
const SENT = new Map<string, number>();
const SENT_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
function memAlreadySent(phone: string): boolean {
  const now = Date.now();
  Array.from(SENT.entries()).forEach(([k, t]) => {
    if (now - t > SENT_TTL_MS) SENT.delete(k);
  });
  const t = SENT.get(phone);
  return typeof t === "number" && now - t <= SENT_TTL_MS;
}

// 전화번호 정규화: 숫자만
function normalizePhone(raw: string): string {
  return String(raw ?? "").replace(/[^0-9]/g, "");
}

// 서버 전용 Supabase 클라이언트(서비스 롤). 미설정이면 null.
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    // 환경변수 미설정 시 조용히 스킵(진단 흐름에는 절대 영향 없음)
    if (!API_KEY || !API_SECRET || !PF_ID || !TEMPLATE_ID || !FROM) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: "not_configured" },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const to = normalizePhone(body?.phone);

    // 010 으로 시작하는 11자리 휴대폰만 발송(가짜/유선번호 차단)
    if (!/^010\d{8}$/.test(to)) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: "invalid_phone" },
        { status: 200 }
      );
    }

    // ── (1차) 서버 메모리 초단기 중복 차단 ──
    if (memAlreadySent(to)) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "already_sent_mem" },
        { status: 200 }
      );
    }

    // ── (2차·최종) DB 발송 이력으로 '번호당 평생 1회' 보장 ──
    //   테이블이 없거나 조회 실패 시엔 막지 않고 진행(발송은 되게 하되,
    //   가능하면 DB 로 확실히 막는다). 발송 후 반드시 이력을 남긴다.
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from(SENT_TABLE)
          .select("phone")
          .eq("phone", to)
          .maybeSingle();
        if (existing) {
          return NextResponse.json(
            { ok: true, skipped: true, reason: "already_sent_db" },
            { status: 200 }
          );
        }
      } catch {
        /* 조회 실패(테이블 없음 등)는 무시하고 발송 진행 */
      }
    }

    // ── 실제 발송 ──
    const messageService = new SolapiMessageService(API_KEY, API_SECRET);
    await messageService.send({
      to,
      from: FROM,
      kakaoOptions: {
        pfId: PF_ID,
        templateId: TEMPLATE_ID,
        // 이 템플릿은 치환변수가 없음
      },
    });

    // 발송 성공 → 메모리 + DB 양쪽에 이력 기록(다음부터 영구 차단)
    SENT.set(to, Date.now());
    if (supabase) {
      try {
        // phone 이 PK/UNIQUE 이므로 중복이면 조용히 무시(upsert)
        await supabase
          .from(SENT_TABLE)
          .upsert({ phone: to }, { onConflict: "phone", ignoreDuplicates: true });
      } catch {
        /* 이력 기록 실패해도 발송은 이미 성공 - 메모리 캐시로 당분간 방어 */
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // 발송 실패해도 진단/결과 흐름에는 절대 영향 주지 않음(조용히 200)
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 200 }
    );
  }
}
