// ────────────────────────────────────────────────────────────────
//  무료진단 퍼널(단계별 이탈) 추적 — 익명 진행 로그
//
//  ★ 목적 ★ 방문자가 무료진단 중 '어느 질문에서 이탈했는지'를 관리자
//    페이지에서 보기 위한 익명 진행 기록. (대표님 요청)
//
//  ★ 안전 원칙 (대표님 우려 반영) ★
//   · 회원(auth.users)·진단서(diagnoses)와 완전히 분리된 독립 기록이다.
//     여기서 하는 일은 오직 diagnosis_funnel 테이블에 '익명 방문자별
//     최대 도달단계'를 upsert 하는 것뿐 → 회원목록/진단서에 영향 0.
//   · 개인정보를 전혀 담지 않는다(브라우저별 랜덤 uuid 만 사용).
//   · 모든 전송은 fire-and-forget: 실패해도 조용히 무시하며, 진단 흐름을
//     절대 막지 않는다. (기존 savePartialLead 등과 동일한 방어 패턴)
// ────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";

const VISITOR_KEY = "mpp_visitor_id";

/** 브라우저별 익명 방문자 ID(uuid) 획득. 없으면 새로 발급해 localStorage 에 보관. */
export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      // crypto.randomUUID 우선, 미지원 브라우저는 폴백
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random()
              .toString(16)
              .slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // localStorage 접근 불가(시크릿 등)면 추적 생략(진단엔 영향 없음)
    return null;
  }
}

/**
 * 진단 한 단계를 지날 때마다 호출(fire-and-forget).
 *  @param step      0-base 단계 인덱스(도달한 단계)
 *  @param stepKey   그 단계의 key(bizEligibility 등)
 *  @param total     전체 단계 수
 *  @param opts      completed(완주), bizType(사업자 구분) 등 부가정보
 */
export function trackFunnelStep(
  step: number,
  stepKey: string,
  total: number,
  opts?: { completed?: boolean; bizType?: string | null }
): void {
  const visitorId = getVisitorId();
  if (!visitorId) return; // 추적 불가 환경이면 조용히 생략
  try {
    // await 하지 않는다(진단 흐름 논블로킹). 실패는 무시.
    void supabase.rpc("save_funnel_step", {
      p_visitor_id: visitorId,
      p_step: step,
      p_step_key: stepKey,
      p_total: total,
      p_completed: opts?.completed ?? false,
      p_biz_type: opts?.bizType ?? null,
    });
  } catch {
    /* 진행도 기록 실패는 조용히 무시(진단 방해 금지) */
  }
}

/** 진단 완주 시 호출(fire-and-forget). 마지막 단계 + completed=true 로 마킹. */
export function trackFunnelComplete(
  lastStep: number,
  lastStepKey: string,
  total: number,
  bizType?: string | null
): void {
  trackFunnelStep(lastStep, lastStepKey, total, { completed: true, bizType });
}
