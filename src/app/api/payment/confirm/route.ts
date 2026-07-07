import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY as string;

// 토스페이먼츠 결제 승인 (서버 전용 시크릿 키 사용)
export async function POST(req: NextRequest) {
  try {
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
