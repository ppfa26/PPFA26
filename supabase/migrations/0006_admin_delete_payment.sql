-- ============================================================
-- 모두의사업친구 — 0006
--  · 관리자용 개별 결제 건 삭제 함수
--
--  ★ 배경 ★
--  payments 테이블은 RLS가 켜져 있어 관리자 페이지에서 직접
--  delete 를 호출해도 막힙니다. 매출 통계(일별/월별)에서 잘못된
--  결제나 테스트 결제를 대표님이 1건씩 직접 정리할 수 있도록,
--  is_admin() 검사를 통과한 관리자만 실행되는
--  security definer 함수(RLS 우회)로 삭제를 처리합니다.
--
--  · view_logs.payment_id 는 payments(id) 를 'on delete set null'
--    로 참조하므로, 결제 건을 지워도 조회 로그는 남고 참조만
--    자동으로 비워집니다. (FK 제약으로 삭제가 막히지 않음)
--
--  0001 ~ 0005 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 개별 결제 건 삭제 (관리자 전용, order_id 기준)
--    반환: 삭제된 건수 (0 또는 1)
-- ------------------------------------------------------------
create or replace function admin_delete_payment(p_order_id text)
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

  delete from payments where order_id = p_order_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
