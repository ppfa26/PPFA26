-- ============================================================
-- 모두의사업친구 — 0005
--  · 관리자용 접속 로그 삭제 함수 (전체 / IP별)
--
--  ★ 배경 ★
--  access_logs 테이블은 RLS가 켜져 있고 INSERT/SELECT 정책만 있어
--  관리자 페이지에서 직접 delete 를 호출해도 막힙니다.
--  테스트로 쌓인 접속 기록을 대표님이 직접 정리할 수 있도록
--  is_admin() 검사를 통과한 관리자만 실행되는
--  security definer 함수(RLS 우회)로 삭제를 처리합니다.
--
--  0001 ~ 0004 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 1. 접속 로그 전체 삭제 (관리자 전용)
--    반환: 삭제된 건수
-- ------------------------------------------------------------
create or replace function admin_clear_access_logs()
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

  delete from access_logs;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 2. 특정 IP의 접속 로그만 삭제 (관리자 전용)
--    반환: 삭제된 건수
-- ------------------------------------------------------------
create or replace function admin_delete_access_by_ip(p_ip text)
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

  delete from access_logs where ip = p_ip;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
