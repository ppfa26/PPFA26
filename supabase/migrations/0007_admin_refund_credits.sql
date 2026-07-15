-- ============================================================
-- 모두의사업친구 — 0007
--  · 관리자용 "조회권 환불(열람 차단)" 함수
--
--  ★ 배경 ★
--  고객이 환불을 요청하면, 실제 결제 금액 환불은 PG사 홈페이지에서
--  대표님이 직접 처리합니다. 다만 사이트상에서 조회권을 그대로 두면
--  "환불만 받고 결과 정보를 전부 열람·복제해 가는" 문제가 생길 수 있어,
--  이 함수로 해당 회원의 남은 조회권을 즉시 0으로 만들어(=모두 소진 처리)
--  결과 페이지를 더 이상 볼 수 없게 차단합니다.
--
--  · 동작: 이메일 기준으로 status = 'paid' 인 모든 결제 건의
--    view_credits_used 를 view_credits_total 과 같게 세팅
--    (= 남은 조회권 0). 조회권을 다시 부여하려면 관리자 화면의
--    '조회권+' 버튼(admin_add_credits)으로 되돌릴 수 있습니다.
--
--  · payments 테이블은 RLS가 켜져 있어 관리자 페이지에서 직접
--    update 를 호출해도 막힙니다. 그래서 is_admin() 검사를 통과한
--    관리자만 실행되는 security definer 함수(RLS 우회)로 처리합니다.
--
--  0001 ~ 0006 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 조회권 환불(열람 차단) (관리자 전용, email 기준)
--    반환: 차단 처리된 결제 건수
-- ------------------------------------------------------------
create or replace function admin_refund_credits(p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  update payments
  set view_credits_used = view_credits_total
  where email = p_email
    and status = 'paid';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
