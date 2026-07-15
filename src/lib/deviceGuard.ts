import { supabase } from "@/lib/supabaseClient";

// ============================================================
// 기기 바인딩 · 접속(IP) 로그 헬퍼
//   · 결과 열람은 "핸드폰 1대 / PC 1대" 로만 허용
//   · 기기 지문(fingerprint)은 브라우저 특성으로 안정적으로 생성
//   · 최초 접속 IP/기기 기록 → 어드민에서 어뷰징 파악
// ============================================================

const FP_KEY = "mpp_device_fp";

// 모바일/PC 판별
export function deviceKind(): "mobile" | "pc" {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua)
    ? "mobile"
    : "pc";
}

// 안정적인 기기 지문 생성 (localStorage 저장 + 브라우저 특성 조합)
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  try {
    // ★ 지문은 "브라우저 특성"만으로 결정론적으로 생성한다.
    //   (Math.random() 랜덤값을 붙이지 않는다!)
    //   → localStorage 가 지워지거나 시크릿 모드여도 같은 기기면 같은 지문이
    //     다시 나오므로, 정상 고객이 억울하게 잠기는 일이 없다.
    const parts = [
      // deviceKind 를 앞에 넣어 모바일/PC 를 확실히 구분
      /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
        navigator.userAgent || ""
      )
        ? "mobile"
        : "pc",
      navigator.userAgent,
      navigator.language,
      String(screen.width) + "x" + String(screen.height),
      String(screen.colorDepth),
      String(new Date().getTimezoneOffset()),
      String(navigator.hardwareConcurrency || ""),
      // @ts-ignore
      String((navigator as any).deviceMemory || ""),
    ].join("|");
    // 간단 해시(djb2)
    let h = 5381;
    for (let i = 0; i < parts.length; i++) {
      h = (h * 33) ^ parts.charCodeAt(i);
    }
    const fp = (h >>> 0).toString(16);
    // 캐시(같은 세션 내 재계산 방지) — 없어도 동일 값이 나오도록 설계됨
    localStorage.setItem(FP_KEY, fp);
    return fp;
  } catch {
    return "no-fp";
  }
}

// 공개 IP 조회 (실패 시 null)
async function getPublicIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.ip ?? null;
  } catch {
    return null;
  }
}

// 결과 열람 기기 등록/검증 (로그인 상태에서 호출)
//   반환: { ok, message } — ok=false 면 다른 기기로 잠긴 것
export async function registerViewDevice(): Promise<{
  ok: boolean;
  message: string;
}> {
  const kind = deviceKind();
  const fp = getDeviceFingerprint();
  try {
    const { data, error } = await supabase.rpc("register_view_device", {
      p_kind: kind,
      p_fp: fp,
    });
    // ★ 안전장치 ★ RPC 자체가 실패(함수 미배포·네트워크 장애 등)한 경우는
    //   "다른 기기라서 거부"가 아니라 "확인 불가"이므로, 결제까지 마친 고객을
    //   막아버리면 안 된다. → 시스템 오류일 땐 열람을 허용(통과)한다.
    //   (진짜 다른 기기 거부는 error 없이 data[0].ok === false 로 내려옴)
    if (error || !data || !data[0]) {
      return { ok: true, message: "" };
    }
    return { ok: !!data[0].ok, message: data[0].message || "" };
  } catch {
    // 예기치 못한 예외도 정상 고객을 막지 않도록 통과 처리
    return { ok: true, message: "" };
  }
}

// 접속 로그 기록 + 차단 여부 반환
export async function logAccess(
  path: string
): Promise<{ blocked: boolean; reason: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return { blocked: false, reason: null };
    const ip = await getPublicIp();
    const { data, error } = await supabase.rpc("log_access", {
      p_ip: ip,
      p_kind: deviceKind(),
      p_fp: getDeviceFingerprint(),
      p_ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      p_path: path,
    });
    if (error || !data || !data[0]) return { blocked: false, reason: null };
    return { blocked: !!data[0].blocked, reason: data[0].reason ?? null };
  } catch {
    return { blocked: false, reason: null };
  }
}
