/* ------------------------------------------------------------------ */
/*  리드(상담 대상) 메모 · 통화 상태 관리                              */
/*                                                                     */
/*  ⚠️ 설계 원칙 (0022 이후 — 서버 저장으로 이관)                      */
/*  - "진짜 저장소"는 Supabase 서버(lead_notes 테이블)다.             */
/*    → 어느 PC/직원이 저장해도 동일하게 공유된다.                    */
/*  - localStorage 는 "즉시 표시용 캐시"로만 쓴다.                    */
/*    (서버 로드 전 잠깐, 또는 오프라인일 때 이전 값이라도 보이게)     */
/*  - 저장은 낙관적(로컬 즉시 반영) + 백그라운드 서버 upsert.         */
/*  - key = 진단서 id (고객 1건 단위). 없으면 'u:email'/'lead:..' 대체 */
/* ------------------------------------------------------------------ */

import { supabase } from "@/lib/supabaseClient";

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
    // 통화완료 = 완료된 정상상태 → (대표님 요청) 회색은 활성/비활성 구분이 안 돼
    //   'ON' 이 잘 안 보였다. 초록으로 바꿔 한눈에 활성 표시가 보이게.
    //   (미접촉=레드 / 부재중=주황 / 계약=진주황 과 색이 겹치지 않는 초록)
    label: "통화 완료",
    short: "통화완료",
    cls: "bg-green-100 text-green-700 border-green-300",
    dot: "bg-green-500",
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

/* ------------------------------------------------------------------ */
/*  로컬 캐시 (localStorage) — 즉시 표시용                             */
/* ------------------------------------------------------------------ */

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

/** 로컬 캐시(즉시 표시용)를 동기로 읽어온다. 서버 로드 전 임시 표시에 사용. */
export function loadCachedLeadNotes(): Store {
  return readStore();
}

/**
 * (하위호환) 기존 코드가 동기로 호출하던 이름.
 * 이제 localStorage 캐시만 반환한다. 실제 최신값은 loadLeadNotesFromServer() 로 받는다.
 */
export function loadAllLeadNotes(): Store {
  return readStore();
}

/* ------------------------------------------------------------------ */
/*  서버(Supabase) 저장소 — 진짜 저장소                               */
/* ------------------------------------------------------------------ */

function normStatus(v: unknown): CallStatus {
  return v === "done" || v === "absent" || v === "contract" ? v : "none";
}

/** 서버에서 전체 상담 메모/상태를 로드하고, 로컬 캐시도 갱신한다. (관리자 전용) */
export async function loadLeadNotesFromServer(): Promise<Store> {
  try {
    const { data, error } = await supabase.rpc("admin_load_lead_notes");
    if (error) throw error;

    const store: Store = {};
    for (const row of (data ?? []) as Array<{
      note_key: string;
      status: string;
      memo: string | null;
      updated_at: string;
    }>) {
      store[row.note_key] = {
        status: normStatus(row.status),
        memo: row.memo ?? "",
        updatedAt: row.updated_at ?? "",
      };
    }
    writeStore(store); // 로컬 캐시 동기화
    return store;
  } catch {
    // 서버 실패 시엔 최소한 로컬 캐시라도 반환 (화면이 비지 않게)
    return readStore();
  }
}

/**
 * 특정 리드의 메모/상태를 저장한다.
 *  1) 로컬 캐시를 즉시 갱신해 반환 (낙관적 업데이트 → UI 즉시 반영)
 *  2) 백그라운드로 서버에 upsert (fire-and-forget)
 *
 * 반환값은 갱신된 "로컬 캐시 전체 맵" (기존 동기 호출부와 호환).
 * 서버 저장 결과를 기다리려면 saveLeadNoteToServer() 를 별도로 await 하면 된다.
 */
export function saveLeadNote(
  id: string,
  patch: Partial<Omit<LeadNote, "updatedAt">>
): Store {
  // (1) 로컬 캐시 즉시 갱신
  const store = readStore();
  const prev: LeadNote = store[id] ?? { status: "none", memo: "", updatedAt: "" };
  store[id] = {
    status: patch.status ?? prev.status,
    memo: patch.memo ?? prev.memo,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);

  // (2) 백그라운드 서버 upsert (실패는 조용히 무시 — 로컬 캐시엔 남아있음)
  void saveLeadNoteToServer(id, patch).catch(() => {});

  return { ...store };
}

/**
 * 서버에 저장하고 결과를 기다린다(성공/실패 반환).
 * 저장 버튼처럼 "정말 저장됐는지" 확인이 필요한 곳에서 await 해서 쓴다.
 */
export async function saveLeadNoteToServer(
  id: string,
  patch: Partial<Omit<LeadNote, "updatedAt">>
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_save_lead_note", {
      p_note_key: id,
      p_status: patch.status ?? null,
      p_memo: patch.memo ?? null,
    });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
