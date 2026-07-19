// ════════════════════════════════════════════════════════════════
//  관리자(운영자) 계정 공용 설정
//
//  ★ 대표님 안내 ★
//  아래 ADMIN_EMAILS 목록에 있는 계정은 "운영자(관리자)"로 취급됩니다.
//  - 로그인/결제/무료진단을 해도 DB(payments·diagnoses)에 기록하지 않습니다.
//  - 매출·통계·IP 집계에서도 자동으로 빠집니다.
//  → 대표님이 직접 테스트할 때 진짜 고객 데이터에 섞이지 않게 하려는 목적입니다.
//
//  계정을 추가/변경하려면 아래 큰따옴표(" ") 안 이메일만 바꾸거나 한 줄 추가하세요.
// ════════════════════════════════════════════════════════════════
export const ADMIN_EMAILS = [
  "biospartners@naver.com",
  "meolhae1993@gmail.com",
];

// 주어진 이메일이 관리자(운영자) 계정인지 판정 (대소문자·공백 무시)
// → 이 판정은 '관리자 메뉴 접근 권한'에만 사용됩니다. (통계 제외와 분리)
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

// ════════════════════════════════════════════════════════════════
//  ★ 통계/DB 집계 제외 계정 (관리자 권한과 별개) ★
//
//  ★ 대표님 안내 ★
//  여기 있는 계정만 진단결과·결제·접속기록 저장/통계에서 제외됩니다.
//  현재는 "관리자 계정도 일반 고객처럼 전부 기록되게" 하기 위해 비워두었습니다.
//  → 관리자 메뉴 접근 권한은 그대로 유지되고, 데이터만 똑같이 쌓입니다.
//
//  다시 특정 계정을 통계에서 빼고 싶으면 아래 목록에 이메일을 추가하세요.
//  예) const STATS_EXCLUDED_EMAILS = ["biospartners@naver.com"];
// ════════════════════════════════════════════════════════════════
export const STATS_EXCLUDED_EMAILS: string[] = [
  // (비어 있음) — 관리자 계정도 테스트 데이터가 일반 고객처럼 기록됩니다.
];

// 주어진 이메일이 통계/DB 집계에서 제외되는 계정인지 판정
export function isStatsExcludedEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return STATS_EXCLUDED_EMAILS.some((e) => e.toLowerCase() === normalized);
}
