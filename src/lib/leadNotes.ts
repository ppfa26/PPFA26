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
  none: {
    label: "미접촉",
    short: "미접촉",
    cls: "bg-gray-100 text-gray-500 border-gray-200",
    dot: "bg-gray-300",
  },
  done: {
    label: "통화 완료",
    short: "통화완료",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  absent: {
    label: "부재중",
    short: "부재중",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  contract: {
    label: "계약",
    short: "계약",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
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
