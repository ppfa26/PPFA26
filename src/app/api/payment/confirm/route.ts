import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// 토스페이먼츠 시크릿 키 (서버 전용).
//  ★ 폴백 ★ 배포 환경변수가 비어 있으면 토스 '공식 문서 테스트 시크릿 키'로 자동 대체합니다.
//     → 실제 돈은 빠지지 않는 테스트 결제로 처리됩니다. (클라이언트 키와 반드시 세트여야 함)
//     심사 통과 후 운영 시크릿 키를 배포 환경변수(TOSS_SECRET_KEY)에 넣으면 그 값이 우선 사용됩니다.
// ★ 토스페이먼츠 '표준 테스트' API 개별 연동 시크릿 키 ★
//   클라이언트 키(page.tsx: test_ck_BX7zk2yd8y2dQXxv6GD03x9POLqK)와 '세트'인 표준 테스트 시크릿.
//   ⚠️ 우리 상점 시크릿(test_sk_Z1aOwX7K8m4gGjLJW7j9ryQxzvNP)은 상점 계약 활성화 전이라
//      결제창(2003)이 막혀 있어, 계약 완료 전까지는 표준 테스트 키 세트를 사용합니다.
const TOSS_TEST_SECRET_KEY = "test_sk_pP2YxJ4K87qo5mA1GExzVRGZwXLO";

// ★ 키 방어 로직 ★
//   클라이언트 키(page.tsx)와 시크릿 키는 반드시 '같은 종류'의 세트여야 합니다.
//   클라이언트에서 위젯 키(gck)를 개별 연동 키(ck)로 대체하므로, 여기서도 동일하게
//   위젯 시크릿(_gsk_)이 들어오면 무시하고 개별 연동 테스트 시크릿으로 대체합니다.
function pickIndividualSecretKey(): string {
  const envKey = (process.env.TOSS_SECRET_KEY as string) || "";
  const isWidgetKey = envKey.includes("_gsk_");
  const isIndividualKey = envKey.includes("_sk_") && !isWidgetKey;
  if (isIndividualKey) return envKey;
  return TOSS_TEST_SECRET_KEY;
}
const TOSS_SECRET_KEY = pickIndividualSecretKey();

// 토스페이먼츠 결제 승인 (서버 전용 시크릿 키 사용)
export async function POST(req: NextRequest) {
  try {
    // ── 남용 방지 ──────────────────────────────────────────────
    //  토스 승인 자체는 paymentKey 검증이 있지만, 반복 시도(카드 스캐닝 등)
    //  를 막기 위해 IP 기준 1분 20회로 제한. 정상 결제 흐름엔 영향 없음.
    const blocked = enforceRateLimit(
      req,
      { namespace: "pay", windowMs: 60_000, max: 20 },
      "결제 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
    );
    if (blocked) return blocked;

    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { ok: false, message: "결제 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const basic = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");

    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: data?.message || "결제 승인에 실패했습니다.", code: data?.code },
        { status: 400 }
      );
    }

    // 승인 성공
    return NextResponse.json({
      ok: true,
      payment: {
        orderId: data.orderId,
        paymentKey: data.paymentKey,
        amount: data.totalAmount,
        method: data.method,
        approvedAt: data.approvedAt,
        orderName: data.orderName,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
