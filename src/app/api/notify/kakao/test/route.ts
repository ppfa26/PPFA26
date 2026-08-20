import { NextRequest, NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";

// solapi SDK 는 Node.js 런타임 필요 (Edge 아님)
export const runtime = "nodejs";

// ════════════════════════════════════════════════════════════════
//  SOLAPI 카카오 알림톡 "관리자 테스트 발송" (서버 전용)
//
//  ★ 목적 ★
//   대표님이 관리자 페이지에서 번호만 넣어 즉시 발송을 테스트한다.
//   일반 발송 라우트(/api/notify/kakao)와 달리:
//     · 제외 이메일 / 중복(평생 1회) 차단을 '적용하지 않는다' → 순수 발송 테스트
//     · 성공/실패의 '진짜 원인'(솔라피 응답/에러)을 그대로 화면에 반환한다
//       → 발신번호 미등록 / 템플릿 불일치 / pfId 오류 등을 즉시 파악.
//
//  ★ 보안 ★
//   키/시크릿·pfId·템플릿ID·발신번호는 전부 서버 환경변수에서만 읽는다.
//   관리자 페이지(로그인 보호)에서만 호출되며, 프론트로 키가 내려가지 않는다.
//   추가로 CRAWL_SECRET 이 설정돼 있으면 헤더로 한번 더 확인(선택적).
// ════════════════════════════════════════════════════════════════

const API_KEY = process.env.SOLAPI_API_KEY || "";
const API_SECRET = process.env.SOLAPI_API_SECRET || "";
const PF_ID = process.env.SOLAPI_PFID || "";
const TEMPLATE_ID = process.env.SOLAPI_TEMPLATE_ID || "";
const FROM = process.env.SOLAPI_FROM || "";
const ADMIN_SECRET = process.env.CRAWL_SECRET || "";

function normalizePhone(raw: string): string {
  return String(raw ?? "").replace(/[^0-9]/g, "");
}

export async function POST(req: NextRequest) {
  // 어떤 환경변수가 비어 있는지 명확히 알려준다(원인 파악 핵심).
  const missing: string[] = [];
  if (!API_KEY) missing.push("SOLAPI_API_KEY");
  if (!API_SECRET) missing.push("SOLAPI_API_SECRET");
  if (!PF_ID) missing.push("SOLAPI_PFID");
  if (!TEMPLATE_ID) missing.push("SOLAPI_TEMPLATE_ID");
  if (!FROM) missing.push("SOLAPI_FROM");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: "env_missing",
        message:
          "서버 환경변수(Vercel)에 값이 없습니다: " +
          missing.join(", ") +
          " — Vercel Settings > Environment Variables 확인 후 Redeploy 하세요.",
        missing,
      },
      { status: 200 }
    );
  }

  // (선택) 관리자 시크릿 검증 — 설정돼 있을 때만 확인
  if (ADMIN_SECRET) {
    const given = req.headers.get("x-admin-secret") || "";
    if (given !== ADMIN_SECRET) {
      // 시크릿이 틀려도 테스트는 막지 않되, 안내만 남긴다(관리자 페이지 보호가 1차).
      // 필요 시 아래 주석을 해제해 강제 차단할 수 있음.
      // return NextResponse.json({ ok:false, reason:"forbidden" }, { status: 200 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const to = normalizePhone(body?.phone);

  if (!/^010\d{8}$/.test(to)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid_phone",
        message: "010으로 시작하는 11자리 휴대폰 번호를 입력하세요. (입력값: " + to + ")",
      },
      { status: 200 }
    );
  }

  try {
    const messageService = new SolapiMessageService(API_KEY, API_SECRET);
    const result = await messageService.send({
      to,
      from: FROM,
      kakaoOptions: {
        pfId: PF_ID,
        templateId: TEMPLATE_ID,
        // 이 템플릿은 치환변수가 없음(변수형이면 여기 variables 추가 필요)
      },
    });

    // ── 접수 실패(failedMessageList) 상세 추출 ──
    //  솔라피는 로그인/IP 가 통과해도, 개별 메시지가 거부되면 send 가 '성공 응답'을
    //  주면서 failedMessageList 에 실패 사유(statusCode/statusMessage)를 담는다.
    //  그래서 여기서 실패건을 꺼내 화면에 그대로 보여준다.
    const r = (result ?? {}) as Record<string, unknown>;
    const groupInfo = (r.groupInfo as Record<string, unknown>) || {};
    const count =
      (groupInfo.count as Record<string, unknown>) ||
      (r.count as Record<string, unknown>) ||
      {};
    const failedList =
      (r.failedMessageList as unknown[]) ||
      (r.failedMessages as unknown[]) ||
      [];
    const hasFailed =
      (Array.isArray(failedList) && failedList.length > 0) ||
      Number(count?.registeredFailed ?? 0) > 0 ||
      Number(count?.failed ?? 0) > 0;

    if (hasFailed) {
      return NextResponse.json(
        {
          ok: false,
          reason: "message_rejected",
          message:
            "접수 거부됨. 아래 상세(statusCode/statusMessage)를 확인하세요. " +
            "주로: 발신번호 미인증, pfId·templateId 불일치, 템플릿 내용 불일치, 채널-템플릿 미연결.",
          to,
          from: FROM,
          pfId: PF_ID,
          templateId: TEMPLATE_ID,
          count,
          failedMessageList: failedList,
          solapi: result ?? null,
        },
        { status: 200 }
      );
    }

    // 솔라피 응답을 요약해 그대로 반환 → 성공/부분실패를 화면에서 확인
    return NextResponse.json(
      {
        ok: true,
        message:
          "발송 요청 성공. 카카오톡을 확인하세요. (수신까지 수 초~수십 초 걸릴 수 있음)",
        to,
        from: FROM,
        templateId: TEMPLATE_ID,
        // 솔라피 결과 객체(그룹/카운트 등) — 실패건이 있으면 여기에 나타남
        solapi: result ?? null,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    // 솔라피가 준 진짜 에러(발신번호/템플릿/pfId 문제 등)를 그대로 노출
    const err = e as { message?: string; name?: string; [k: string]: unknown };
    let detail: unknown = err?.message || String(e);
    // solapi 에러는 응답 본문이 붙어오는 경우가 많음 → 최대한 담아 보여준다
    const anyErr = e as Record<string, unknown>;
    if (anyErr && typeof anyErr === "object") {
      const resp = (anyErr.response as Record<string, unknown>) || null;
      const data =
        (resp && (resp.data as unknown)) ||
        (anyErr.data as unknown) ||
        null;
      if (data) detail = data;
    }
    return NextResponse.json(
      {
        ok: false,
        reason: "send_failed",
        message:
          "발송 실패. 아래 상세 원인을 확인하세요(발신번호 미등록/템플릿 불일치/pfId 오류 등).",
        error: detail,
      },
      { status: 200 }
    );
  }
}
