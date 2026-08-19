import { NextRequest, NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";

// solapi SDK 는 Node.js 런타임 필요 (Edge 아님)
export const runtime = "nodejs";

// ════════════════════════════════════════════════════════════════
//  SOLAPI 카카오 알림톡 발송 (서버 전용)
//
//  ★ 대표님 안내 ★
//  · 진단(설문)을 '끝까지 완료'한 회원에게만 카카오 알림톡을 1회 발송합니다.
//  · 회원가입만 하고 진단을 안 하면 → 여기로 요청 자체가 오지 않습니다.
//    (진단 완료 시점에만 이 API 를 호출하도록 프론트에서 연결)
//  · 같은 번호 중복 발송 방지: 프론트 localStorage 1차 방어 +
//    이 서버에서 최근 발송번호를 메모리 캐시로 2차 방어(같은 인스턴스 재요청 차단).
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

// ── 서버 메모리 중복 방지 캐시 ─────────────────────────────────
//  같은 인스턴스에서 짧은 시간 내 같은 번호로 두 번 요청이 와도 1번만 보냄.
//  (프론트 localStorage 방어와 이중으로 안전장치. 서버리스 재시작 시 초기화되는
//   임시 캐시이므로 완벽한 영구 중복방지는 아니지만, 실사용 중복은 사실상 차단됨.)
const SENT = new Map<string, number>();
const SENT_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
function alreadySent(phone: string): boolean {
  const now = Date.now();
  // 만료된 항목 청소(가벼움)
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

    // 서버 메모리 중복 방지(2차)
    if (alreadySent(to)) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "already_sent" },
        { status: 200 }
      );
    }

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

    // 발송 성공 → 캐시에 기록(중복 방지)
    SENT.set(to, Date.now());

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // 발송 실패해도 진단/결과 흐름에는 절대 영향 주지 않음(조용히 200)
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 200 }
    );
  }
}
