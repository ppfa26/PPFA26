import { supabase } from "@/lib/supabaseClient";

// ============================================================
// 조회권(열람 권한) 관리 - 서버(Supabase RPC) 기준
//   · 1개 결제당 "새 사업자 조회" 2회 제한
//   · 결제 후 1개월간 결과 열람 가능, 이후 만료
//   모든 판정은 Supabase 함수(security definer)에서 이루어지므로
//   브라우저에서 조작할 수 없다.
// ============================================================

export type ViewStatus = {
  isActive: boolean; // 유효(미만료) 결제가 있는가
  total: number; // 총 조회권
  used: number; // 사용한 조회권
  remaining: number; // 남은 조회권
  expiresAt: string | null; // 열람 만료 시각
};

// 현재 로그인 사용자의 조회 권한 상태 조회
export async function fetchViewStatus(): Promise<ViewStatus | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null; // 비로그인

  const { data, error } = await supabase.rpc("get_view_status");
  if (error || !data || !data[0]) {
    return {
      isActive: false,
      total: 0,
      used: 0,
      remaining: 0,
      expiresAt: null,
    };
  }
  const row = data[0];
  return {
    isActive: !!row.is_active,
    total: Number(row.total) || 0,
    used: Number(row.used) || 0,
    remaining: Number(row.remaining) || 0,
    expiresAt: row.expires_at ?? null,
  };
}

// 조회권 1개 소진 (새 사업자 조회를 "확정"할 때만 호출)
export async function consumeViewCredit(
  businessName: string,
  snapshot: unknown
): Promise<{ ok: boolean; remaining: number; message: string }> {
  const { data, error } = await supabase.rpc("consume_view_credit", {
    p_business_name: businessName || "",
    p_snapshot: snapshot ?? {},
  });
  if (error || !data || !data[0]) {
    return {
      ok: false,
      remaining: 0,
      message: "조회 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  const row = data[0];
  return {
    ok: !!row.ok,
    remaining: Number(row.remaining) || 0,
    message: row.message || "",
  };
}

// ============================================================
// [무료 베타] 계정당 "서로 다른 사업자 조회 수" 제한 (check_free_view RPC)
//   · 결제 조회권과 별개로, 무료 모드에서 한 계정이 사업자를 바꿔가며
//     무제한 열람하는 어뷰징을 서버(security definer)에서 차단한다.
//   · 판정/기록 모두 서버에서 이뤄져 브라우저 조작 불가.
// ============================================================
export type FreeViewResult = {
  allowed: boolean; // 열람 허용 여부
  used: number; // 지금까지 조회한 서로 다른 사업자 수
  limit: number; // 계정당 한도
  isNew: boolean; // 이번이 새 사업자였는지
  message: string;
};

// 무료 조회 한도 판정(+확정 기록). commit=false면 기록 없이 판정만.
export async function checkFreeView(
  snapshot: unknown,
  commit = true
): Promise<FreeViewResult | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null; // 비로그인은 로그인 게이트가 별도 처리

  const { data, error } = await supabase.rpc("check_free_view", {
    p_snapshot: snapshot ?? {},
    p_commit: commit,
  });
  if (error || !data || !data[0]) {
    // 서버 오류 시엔 정상 고객이 막히지 않도록 통과시킨다(오탐 방지).
    return { allowed: true, used: 0, limit: 0, isNew: false, message: "" };
  }
  const row = data[0];
  return {
    allowed: !!row.allowed,
    used: Number(row.used) || 0,
    limit: Number(row.limit_n) || 0,
    isNew: !!row.is_new,
    message: row.message || "",
  };
}

// 만료일까지 남은 일수 (표시용)
export function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
