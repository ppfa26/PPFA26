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
    let fp = localStorage.getItem(FP_KEY);
    if (fp) return fp;
    const parts = [
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
    fp = (h >>> 0).toString(16) + "-" + Math.random().toString(36).slice(2, 8);
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
  const { data, error } = await supabase.rpc("register_view_device", {
    p_kind: kind,
    p_fp: fp,
  });
  if (error || !data || !data[0]) {
    return { ok: false, message: "기기 확인 중 오류가 발생했습니다." };
  }
  return { ok: !!data[0].ok, message: data[0].message || "" };
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
