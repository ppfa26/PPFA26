import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 국세청 사업자등록 상태조회 API (공공데이터포털)
// 인증키는 서버 환경변수에만 저장 — 프론트로 절대 노출되지 않음
const NTS_API_KEY = process.env.NTS_BUSINESS_API_KEY as string;
const NTS_STATUS_URL = "https://api.odcloud.kr/api/nts-businessman/v1/status";

// 과세유형 코드 → 사람이 읽기 쉬운 라벨 매핑은 API가 문자열로 직접 내려줌(tax_type)

export async function POST(req: NextRequest) {
  try {
    const { bno } = await req.json();

    // 사업자번호 정규화: 숫자만 추출 (하이픈 등 기호 제거)
    const digits = String(bno ?? "").replace(/[^0-9]/g, "");
    if (digits.length !== 10) {
      return NextResponse.json(
        { ok: false, message: "사업자등록번호 10자리를 정확히 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!NTS_API_KEY) {
      return NextResponse.json(
        { ok: false, message: "서버 설정 오류(인증키 미설정). 관리자에게 문의해 주세요." },
        { status: 500 }
      );
    }

    const url = `${NTS_STATUS_URL}?serviceKey=${encodeURIComponent(NTS_API_KEY)}&returnType=JSON`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ b_no: [digits] }),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: `국세청 조회 서버 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const json: any = await res.json();
    const item = json?.data?.[0];

    if (!item || !item.b_stt_cd) {
      // 국세청에 등록되지 않은(존재하지 않는) 사업자번호
      return NextResponse.json({
        ok: true,
        found: false,
        bno: digits,
        message: "국세청에 등록되지 않은 사업자등록번호입니다.",
      });
    }

    // b_stt_cd: 01=계속사업자, 02=휴업자, 03=폐업자
    const statusMap: Record<string, string> = {
      "01": "계속사업자 (정상 영업)",
      "02": "휴업자",
      "03": "폐업자",
    };

    return NextResponse.json({
      ok: true,
      found: true,
      bno: digits,
      status: item.b_stt || statusMap[item.b_stt_cd] || "확인 불가",
      statusCode: item.b_stt_cd,
      taxType: item.tax_type || "",
      taxTypeCode: item.tax_type_cd || "",
      endDate: item.end_dt || "", // 폐업일(있는 경우)
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
