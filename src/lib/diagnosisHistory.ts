// =========================================================================
//  내 진단 기록 목록 (마이페이지용) — localStorage 기반  [미니앱 → 홈페이지 이식]
//   · 홈페이지는 원래 '최신 진단 1건'만 저장(diagnosisStore)했는데,
//     대표님 요청으로 미니앱처럼 '여러 번의 진단 기록'을 목록으로 보관/재조회한다.
//   · 진단 완료 시점(payload 저장 직후)에 이 목록에도 1건 추가한다.
//   · 재조회: 목록에서 항목을 고르면 그 진단을 현재 진단(diagnosisStore)으로
//     되살려 결과 화면(/matching-preview)에서 다시 볼 수 있다.
//   · localStorage 기반(로그인 불필요, 이 기기(브라우저)에 저장).
//   · Supabase 진단 저장(diagnosisStore)과는 별개 — 이건 순수 재조회용 로컬 캐시.
// =========================================================================
import type { DiagnosisProfile } from "@/lib/matching";

const STORAGE_KEY = "mpp_diagnosis_history_v1";
const MAX_RECORDS = 20; // 너무 많이 쌓이지 않도록 상한

export type DiagnosisRecord = {
  id: string; // 고유 id (timestamp 기반)
  createdAt: number; // 저장 시각(ms)
  profile: DiagnosisProfile; // 진단 응답 전체(결과 재계산·재조회용)
  label: string; // 표시용 라벨(성함/사업자 구분 등)
  matchCount?: number; // 표시용 매칭 개수(요약)
};

// ── 안전한 JSON 파싱 ──
function readAll(): DiagnosisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        r.profile &&
        typeof r.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function writeAll(list: DiagnosisRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    try {
      window.dispatchEvent(new CustomEvent("mpp:diag-history-changed"));
    } catch {
      /* noop */
    }
  } catch {
    /* 저장 실패(용량초과 등) 시 무시 — 조회는 못하지만 앱은 정상 동작 */
  }
}

// 표시용 라벨 생성: "홍길동 대표님 · 개인사업자" 형태
function buildLabel(p: DiagnosisProfile): string {
  const name = (p.name ?? "").trim();
  const kind = (p.businessType ?? "").trim(); // "개인사업자"/"법인사업자"/"예비창업자"
  const parts: string[] = [];
  if (name) parts.push(`${name} 대표님`);
  if (kind) parts.push(kind);
  return parts.join(" · ") || "내 진단";
}

// ── 저장(또는 갱신) ──
//  같은 전화번호가 있으면 최신으로 갱신(중복 방지), 없으면 새로 추가.
export function saveDiagnosisRecord(
  profile: DiagnosisProfile,
  matchCount?: number
): DiagnosisRecord {
  const list = readAll();
  const phone = (profile.phone ?? "").replace(/\D/g, "");

  const now = Date.now();
  const record: DiagnosisRecord = {
    id: `dg_${now}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    profile,
    label: buildLabel(profile),
    matchCount,
  };

  // 같은 전화번호의 기존 기록 제거(최신 1건만 유지). 전화 없으면 그냥 추가.
  const deduped = phone
    ? list.filter((r) => (r.profile.phone ?? "").replace(/\D/g, "") !== phone)
    : list;

  writeAll([record, ...deduped]);
  return record;
}

// ── 전체 목록(최신순) ──
export function listDiagnosisRecords(): DiagnosisRecord[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

// ── 단건 조회 ──
export function getDiagnosisRecord(id: string): DiagnosisRecord | null {
  return readAll().find((r) => r.id === id) ?? null;
}

// ── 기록 존재 여부 ──
export function hasDiagnosisRecords(): boolean {
  return readAll().length > 0;
}

// ── 개수 ──
export function countDiagnosisRecords(): number {
  return readAll().length;
}

// ── 단건 삭제 ──
export function deleteDiagnosisRecord(id: string) {
  writeAll(readAll().filter((r) => r.id !== id));
}

// ── 전체 삭제 ──
export function clearDiagnosisRecords() {
  writeAll([]);
}

// ── 날짜 포맷(표시용): "2026.08.26 22:57" ──
export function formatRecordDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}
