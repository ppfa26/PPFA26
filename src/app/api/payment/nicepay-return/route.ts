import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// ── 나이스페이먼츠(NICEPAY) Server 승인 방식 returnUrl 엔드포인트 ──
//  흐름:
//   1) 결제창(payment/page.tsx)에서 AUTHNICE.requestPay({ returnUrl: 이 라우트 })
//   2) 결제자 인증 완료 → 나이스가 이 라우트로 form POST (authResultCode, tid, amount, authToken, signature ...)
//   3) authResultCode === "0000" 확인 + signature 검증
//   4) 승인 API(POST /v1/payments/{tid}) 호출 → 최종 결제 확정
//   5) 결과를 쿼리로 담아 /payment/success 로 브라우저 redirect (기존 success 로직이 Supabase 저장·잠금해제 담당)
//
//  ※ signature 규칙(공식 문서):
//     - 인증결과 검증:  hex(sha256(authToken + clientId + amount + secretKey))
//     - 승인응답 검증:  hex(sha256(tid + amount + ediDate + secretKey))

// ★ 폴백 ★ 배포 환경변수 미설정 시 나이스 '공식 샌드박스 테스트키'로 자동 대체 (테스트 전용, 실 결제 아님)
//   운영 전환 시엔 배포 환경변수에 운영키를 넣고 NICEPAY_MODE=production 으로 바꾸면 그 값이 우선합니다.
const NICEPAY_SANDBOX_CLIENT_ID = "S2_af4543a0be4d49a98122e01ec2059a56";
const NICEPAY_SANDBOX_SECRET_KEY = "9eb85607103646da9f9c02b128f2e5ee";
const CLIENT_ID =
  (process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID as string) || NICEPAY_SANDBOX_CLIENT_ID;
const SECRET_KEY =
  (process.env.NICEPAY_SECRET_KEY as string) || NICEPAY_SANDBOX_SECRET_KEY;
const MODE = (process.env.NICEPAY_MODE || "sandbox").toLowerCase();

// sandbox(테스트) / production(운영) API 호스트 자동 분기
const API_BASE =
  MODE === "production"
    ? "https://api.nicepay.co.kr"
    : "https://sandbox-api.nicepay.co.kr";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// 실패 시 결제 페이지로 되돌려보내는 helper (사유를 쿼리로 전달)
function failRedirect(req: NextRequest, reason: string, tier?: string) {
  const url = new URL("/payment/success", req.url);
  url.searchParams.set("nicepay", "1");
  url.searchParams.set("result", "fail");
  url.searchParams.set("reason", reason);
  if (tier) url.searchParams.set("tier", tier);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  let tier = "basic";
  try {
    // 나이스는 application/x-www-form-urlencoded 로 POST
    const form = await req.formData();
    const authResultCode = String(form.get("authResultCode") || "");
    const tid = String(form.get("tid") || "");
    const orderId = String(form.get("orderId") || "");
    const amount = String(form.get("amount") || "");
    const authToken = String(form.get("authToken") || "");
    const signature = String(form.get("signature") || "");
    const clientId = String(form.get("clientId") || CLIENT_ID);
    // mallReserved 에 tier 를 실어 보냈다면 복구 (결제창에서 넣어줌)
    const mallReserved = String(form.get("mallReserved") || "");
    if (mallReserved) {
      try {
        const parsed = JSON.parse(mallReserved);
        if (parsed?.tier) tier = String(parsed.tier);
      } catch {}
    }

    // 1) 인증 결과 확인
    if (authResultCode !== "0000") {
      return failRedirect(req, "auth", tier);
    }

    // 2) 인증 signature 위변조 검증 — hex(sha256(authToken + clientId + amount + secretKey))
    const expectedAuthSig = sha256Hex(`${authToken}${clientId}${amount}${SECRET_KEY}`);
    if (signature && expectedAuthSig !== signature) {
      return failRedirect(req, "signature", tier);
    }

    // 3) 승인 API 호출 — POST {API_BASE}/v1/payments/{tid} (Basic auth: base64(clientId:secretKey))
    const basic = Buffer.from(`${clientId}:${SECRET_KEY}`).toString("base64");
    const approveRes = await fetch(`${API_BASE}/v1/payments/${encodeURIComponent(tid)}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const data = await approveRes.json();

    // 4) 승인 결과 확인 (resultCode 0000 + status paid)
    if (data?.resultCode !== "0000" || data?.status !== "paid") {
      return failRedirect(req, "approve", tier);
    }

    // 5) 승인응답 signature 검증(선택적) — hex(sha256(tid + amount + ediDate + secretKey))
    if (data?.signature && data?.ediDate) {
      const expectedApproveSig = sha256Hex(
        `${data.tid}${data.amount}${data.ediDate}${SECRET_KEY}`
      );
      if (expectedApproveSig !== data.signature) {
        return failRedirect(req, "approve_signature", tier);
      }
    }

    // 6) 성공 → success 페이지로 redirect (기존 success 로직이 Supabase 저장·잠금해제 수행)
    const url = new URL("/payment/success", req.url);
    url.searchParams.set("nicepay", "1");
    url.searchParams.set("result", "success");
    url.searchParams.set("orderId", data.orderId || orderId);
    url.searchParams.set("tid", data.tid || tid);
    url.searchParams.set("amount", String(data.amount ?? amount));
    url.searchParams.set("method", data.payMethod || "card");
    url.searchParams.set("tier", tier);
    return NextResponse.redirect(url, 303);
  } catch {
    return failRedirect(req, "server", tier);
  }
}

// 혹시 GET으로 접근하면 결제 페이지로 안내
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/pricing", req.url), 303);
}
