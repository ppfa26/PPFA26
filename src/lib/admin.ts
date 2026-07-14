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
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}
