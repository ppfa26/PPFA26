/* ------------------------------------------------------------------ */
/*  리드(상담 대상) 메모 · 통화 상태 관리                              */
/*                                                                     */
/*  ⚠️ 설계 원칙                                                       */
/*  - DB 마이그레이션 없이 브라우저 localStorage 에만 저장한다.        */
/*    (회원 수십명 규모까지는 이걸로 충분. 커지면 Supabase 로 이관)   */
/*  - 기기(브라우저)별로 저장되므로, 대표님이 늘 쓰는 PC에서 관리.    */
/*  - key = 진단서 id (고객 1건 단위). 없으면 이메일로 대체 가능.     */
/* ------------------------------------------------------------------ */

export type CallStatus = "none" | "done" | "absent" | "contract";

export type LeadNote = {
  status: CallStatus; // 통화 상태
  memo: string; // 상담 메모
  updatedAt: string; // 마지막 수정 시각 (ISO)
};

export const CALL_STATUS_META: Record<
  CallStatus,
  { label: string; short: string; cls: string; dot: string }
> = {
  // 포인트색은 레드·주황·화이트(그레이) 위주로 통일한다.
  none: {
    // 미접촉 = 가장 급한 액션 → 레드로 강조
    label: "미접촉",
    short: "미접촉",
    cls: "bg-red-100 text-red-600 border-red-200",
    dot: "bg-red-500",
  },
  done: {
    // 통화완료 = 완료된 정상상태 → 뉴트럴 그레이(튀지 않게)
    label: "통화 완료",
    short: "통화완료",
    cls: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  absent: {
    // 부재중 = 재통화 필요(주의) → 주황
    label: "부재중",
    short: "부재중",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  contract: {
    // 계약 = 성과(강조) → 진한 주황
    label: "계약",
    short: "계약",
    cls: "bg-orange-500/15 text-brand-orange border-orange-300",
    dot: "bg-brand-orange",
  },
};

export const CALL_STATUS_ORDER: CallStatus[] = ["none", "done", "absent", "contract"];

const STORAGE_KEY = "mpp_lead_notes_v1";

type Store = Record<string, LeadNote>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 저장 실패는 조용히 무시 (용량 초과 등) */
  }
}

/** 전체 메모 맵을 읽어온다 (id → LeadNote). */
export function loadAllLeadNotes(): Store {
  return readStore();
}

/** 특정 리드의 메모를 저장/갱신하고, 갱신된 전체 맵을 반환한다. */
export function saveLeadNote(
  id: string,
  patch: Partial<Omit<LeadNote, "updatedAt">>
): Store {
  const store = readStore();
  const prev: LeadNote = store[id] ?? { status: "none", memo: "", updatedAt: "" };
  store[id] = {
    status: patch.status ?? prev.status,
    memo: patch.memo ?? prev.memo,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return { ...store };
}
