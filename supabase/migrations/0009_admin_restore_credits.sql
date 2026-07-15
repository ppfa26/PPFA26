-- ============================================================
-- 모두의사업친구 — 0009
--  · 관리자용 "조회권 환불 취소(열람 복구)" 함수
--
--  ★ 배경 ★
--  0007 의 admin_refund_credits 로 조회권을 0으로 만들어 열람을 막았다가,
--  환불을 취소(되돌리기)할 때 사용합니다. 회원 목록의 '조회권+' 버튼이
--  누르면 이 함수를 호출해 view_credits_used 를 0으로 되돌려
--  다시 결과를 볼 수 있게 합니다.
--
--  · 이메일 기준으로 status = 'paid' 인 모든 결제 건의
--    view_credits_used 를 0 으로 세팅 (= 남은 조회권 = 전체 조회권).
--
--  · payments 테이블은 RLS가 켜져 있어 직접 update 가 막히므로,
--    is_admin() 검사를 통과한 관리자만 실행되는 security definer 함수로 처리합니다.
--
--  0001 ~ 0008 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

create or replace function admin_restore_credits(p_email text)
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
  set view_credits_used = 0
  where email = p_email
    and status = 'paid';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
