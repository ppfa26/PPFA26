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

const STORAGE_KEY = "mpp_diagnosis";
// 저장한 시각(밀리초)을 함께 담아두는 별도 키
const STAMP_KEY = "mpp_diagnosis_savedAt";

// 진단 결과 유지 기간 (일) — 여기 숫자만 바꾸면 됩니다.
export const DIAGNOSIS_TTL_DAYS = 30;
const TTL_MS = DIAGNOSIS_TTL_DAYS * 24 * 60 * 60 * 1000;

/** 진단 결과(profile 객체)를 저장합니다. 저장 시각도 함께 기록. */
export function saveDiagnosis(profile: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(STAMP_KEY, String(Date.now()));
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
