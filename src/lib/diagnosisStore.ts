// ════════════════════════════════════════════════════════════════
//  진단 결과 저장소 (localStorage · 30일 유지)
//
//  ★ 대표님 안내 ★
//  예전에는 진단 결과를 sessionStorage(임시 저장소)에 담아서
//  브라우저 탭/창을 닫으면 바로 사라졌습니다.
//  → 이제 localStorage(탭을 닫아도 유지)에 "저장한 시각"과 함께 담아서
//     30일(1달) 동안 계속 확인할 수 있게 바뀌었습니다.
//
//  ─ 규칙 ─
//   • 아래 DIAGNOSIS_TTL_DAYS 숫자만 바꾸면 유지 기간이 바뀝니다. (기본 30일)
//   • 다른 파일에서는 이 파일의 saveDiagnosis / loadDiagnosis / clearDiagnosis
//     세 함수만 쓰면 됩니다.
// ════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabaseClient";

const STORAGE_KEY = "mpp_diagnosis";
// 저장한 시각(밀리초)을 함께 담아두는 별도 키
const STAMP_KEY = "mpp_diagnosis_savedAt";
// ★ 이 진단 결과가 '어느 로그인 계정(user.id)'의 것인지 기록하는 키 ★
//   로그인 계정이 바뀌면 예전 사람의 진단이 따라오면 안 되므로 소유자를 함께 저장한다.
const OWNER_KEY = "mpp_diagnosis_owner";
// ★ 관리자 '결과보기' 전용 임시 키 ★
//   관리자가 고객 결과창을 새 탭으로 열 때 이 키(localStorage)에 고객 진단을 심는다.
//   sessionStorage 는 새 탭(특히 noopener)과 공유되지 않아 이름이 섞이는 문제가 있어
//   같은 도메인 모든 탭이 공유하는 localStorage 를 쓴다. (본인 진단 mpp_diagnosis 와 분리)
const ADMIN_KEY = "mpp_diagnosis_admin";

// 진단 결과 유지 기간 (일) — 여기 숫자만 바꾸면 됩니다.
export const DIAGNOSIS_TTL_DAYS = 30;
const TTL_MS = DIAGNOSIS_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * 진단 결과(profile 객체)를 저장합니다. 저장 시각과 소유자(로그인 계정)도 함께 기록.
 * @param profile 진단 프로필 객체
 * @param ownerId 이 진단을 소유한 로그인 계정 id (user.id). 비회원이면 생략/빈값.
 */
export function saveDiagnosis(profile: unknown, ownerId?: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(STAMP_KEY, String(Date.now()));
    // 소유자 기록 — 나중에 다른 계정으로 로그인하면 이 값과 달라 무시된다.
    if (ownerId) {
      localStorage.setItem(OWNER_KEY, ownerId);
    } else {
      localStorage.removeItem(OWNER_KEY);
    }
    // 예전 sessionStorage 값이 남아 혼선을 주지 않도록 정리
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  } catch {
    /* 저장 불가(사생활 보호 모드 등)여도 흐름은 계속 진행 */
  }
}

/** 현재 저장된 진단 결과의 소유자 계정 id를 돌려줍니다. (없으면 null = 비회원 진단) */
export function getDiagnosisOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

/**
 * ★ 진단 결과 '입양(소유자 자동 연결)' ★
 * 비회원 상태에서 진단을 마친 뒤(소유자 없음) 나중에 로그인하는 흐름을 위한 함수.
 *  - 저장된 진단이 있고, 소유자 정보가 아직 비어 있으면 → 지금 로그인한 계정을 소유자로 등록.
 *  - 이렇게 하면 '진단 먼저 → 로그인 나중' 순서에서도 진단 결과가 그대로 유지된다.
 *  - 이미 다른 소유자가 기록돼 있으면 건드리지 않는다. (남의 진단 보호는 clearDiagnosisIfNotOwner 담당)
 */
export function adoptDiagnosisIfOwnerless(currentUserId: string | null): void {
  try {
    if (!currentUserId) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return; // 저장된 진단 자체가 없으면 할 일 없음
    const owner = localStorage.getItem(OWNER_KEY);
    if (!owner) {
      // 소유자 미기록(비회원 진단) → 지금 로그인 계정으로 연결
      localStorage.setItem(OWNER_KEY, currentUserId);
    }
  } catch {
    /* noop */
  }
}

/**
 * 현재 로그인 계정(currentUserId)이 저장된 진단의 소유자와 일치하는지 확인합니다.
 *  - 소유자 정보가 없는(예전/비회원) 데이터는 "확정할 수 없음"으로 보고 false 반환하지 않음(호출부 판단).
 *  - 소유자가 있는데 현재 계정과 다르면 → 남의 데이터이므로 지우고 true(=지웠음) 반환.
 */
export function clearDiagnosisIfNotOwner(currentUserId: string | null): boolean {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    // 소유자가 명시돼 있고, 지금 로그인 계정과 다르면 → 남의 진단 → 삭제
    if (owner && owner !== (currentUserId ?? "")) {
      clearDiagnosis();
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}

/**
 * ★ 관리자 '결과보기' 전용 로드 ★
 * 관리자가 새 탭으로 연 고객 결과창(?admin=1)에서 호출한다.
 * localStorage 의 관리자 전용 임시 키를 최우선으로 읽고, 없으면 sessionStorage(구방식) 폴백.
 * 본인 진단(mpp_diagnosis)과 완전히 분리돼 이름이 섞이지 않는다.
 */
export function loadAdminDiagnosisRaw(): string | null {
  try {
    const admin = localStorage.getItem(ADMIN_KEY);
    if (admin) return admin;
  } catch {
    /* noop */
  }
  try {
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) return session;
  } catch {
    /* noop */
  }
  return null;
}

/** 관리자 전용 임시 진단 데이터를 지웁니다. */
export function clearAdminDiagnosis(): void {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* noop */
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * 저장된 진단 결과의 원본 문자열(JSON)을 돌려줍니다.
 *  - 없거나 30일이 지났으면 자동으로 지우고 null 반환.
 *
 *  ★ 관리자 '결과보기' 우선 규칙 ★
 *  관리자(admin)가 고객 결과를 임시로 열어볼 때는 sessionStorage 에 데이터를 심습니다.
 *  이 임시 데이터는 영구 저장하면 안 되므로, sessionStorage 에 값이 있으면
 *  그 값을 (localStorage 로 옮기지 않고) 그대로 우선 사용합니다.
 *  단, 실제 고객이 예전 버전에서 sessionStorage 에만 저장했던 값은
 *  _adminLabel 플래그가 없으므로 → localStorage 로 자동 이관합니다.
 */
export function loadDiagnosisRaw(): string | null {
  try {
    // ── 1) sessionStorage 우선 확인 (관리자 임시 결과 또는 예전 사용자 값) ──
    let session: string | null = null;
    try {
      session = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      session = null;
    }
    if (session) {
      let isAdminTemp = false;
      try {
        isAdminTemp = !!JSON.parse(session)?._adminLabel;
      } catch {
        isAdminTemp = false;
      }
      if (isAdminTemp) {
        // 관리자 임시 데이터 → 영구 저장하지 않고 그대로 사용
        return session;
      }
      // 예전 사용자 값 → localStorage 로 이관 후 sessionStorage 정리
      try {
        localStorage.setItem(STORAGE_KEY, session);
        localStorage.setItem(STAMP_KEY, String(Date.now()));
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    }

    // ── 2) localStorage(실제 저장소) 확인 + 만료 검사 ──
    const raw = localStorage.getItem(STORAGE_KEY);
    const stampStr = localStorage.getItem(STAMP_KEY);
    if (!raw) return null;

    if (stampStr) {
      const savedAt = Number(stampStr);
      if (Number.isFinite(savedAt) && Date.now() - savedAt > TTL_MS) {
        clearDiagnosis();
        return null;
      }
    }

    return raw;
  } catch {
    return null;
  }
}

/** 저장된 진단 결과를 객체로 돌려줍니다. (없거나 만료면 null) */
export function loadDiagnosis<T = unknown>(): T | null {
  const raw = loadDiagnosisRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 저장된 진단 결과를 완전히 지웁니다. */
export function clearDiagnosis(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STAMP_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* noop */
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 저장된 진단 결과가 만료되는 날짜(Date)를 돌려줍니다. 없으면 null. */
export function getDiagnosisExpiry(): Date | null {
  try {
    const stampStr = localStorage.getItem(STAMP_KEY);
    if (!stampStr) return null;
    const savedAt = Number(stampStr);
    if (!Number.isFinite(savedAt)) return null;
    return new Date(savedAt + TTL_MS);
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
//  ★ 서버(Supabase) 진단 결과 동기화 ★
//
//  ─ 왜 필요한가 ─
//  진단 결과를 브라우저(localStorage)에만 두면, 같은 PC에서 다른 계정으로
//  로그인했다가 돌아오거나(계정 분리 로직이 지움), 다른 기기(폰↔PC)에서 보면
//  결과가 안 보입니다. 진단 시점에 Supabase `diagnoses` 테이블에 계정별로
//  이미 저장되고 있으므로, "로그인 계정 기준 최근 진단(30일 이내)"을 서버에서
//  다시 불러와 화면에 항상 뿌려줄 수 있습니다. (기기·로그인 순서 무관)
// ════════════════════════════════════════════════════════════════

/**
 * 로그인한 계정의 최근 진단(30일 이내)을 서버에서 불러옵니다.
 *  · 서버에 있으면 그 profile 을 반환하고, 동시에 localStorage 에도 심어
 *    (owner=본인) 이후 오프라인/빠른 조회에도 대비합니다.
 *  · 서버에 없거나(비회원·기록없음) 30일 초과면 null 을 반환합니다.
 * @param currentUserId 현재 로그인 계정 user.id (없으면 서버 조회 생략)
 */
export async function loadDiagnosisFromServer(
  currentUserId: string | null
): Promise<unknown | null> {
  if (!currentUserId) return null;
  try {
    // 본인(user_id=현재계정)의 가장 최근 진단 1건
    const { data, error } = await supabase
      .from("diagnoses")
      .select("profile, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0] as { profile: unknown; created_at: string };
    const savedAtMs = new Date(row.created_at).getTime();
    // 30일(TTL) 초과한 진단은 보여주지 않는다.
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > TTL_MS) {
      return null;
    }
    if (!row.profile) return null;

    // 화면·이후 조회를 위해 localStorage 에도 반영 (소유자=본인, 저장시각=진단 생성시각)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(row.profile));
      localStorage.setItem(STAMP_KEY, String(savedAtMs));
      localStorage.setItem(OWNER_KEY, currentUserId);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    } catch {
      /* localStorage 실패해도 반환값은 유효 */
    }

    return row.profile;
  } catch {
    return null;
  }
}
