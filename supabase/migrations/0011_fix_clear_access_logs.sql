-- ============================================================
-- 모두의사업친구 — 0011
--  · 접속 로그 전체 삭제 오류 수정
--    (오류: "DELETE requires a WHERE clause")
--
--  ★ 배경 ★
--  0005 의 admin_clear_access_logs() 는 `delete from access_logs;` 처럼
--  WHERE 절 없이 전체 삭제를 시도합니다. Supabase(Postgres)는 실수로
--  전체 데이터를 지우는 것을 막기 위해 WHERE 없는 DELETE를 거부하는
--  안전장치(sql_safe_updates)가 있어, 관리자 페이지의
--  "🗑️ 접속 로그 전체 삭제" 버튼이 이 오류로 동작하지 않았습니다.
--
--  ★ 해결 ★
--  함수 내부에서 `set local session_replication_role`가 아니라,
--  안전하게 `where true`(= 모든 행) 조건을 붙여 전체 삭제를 명시합니다.
--  이렇게 하면 안전장치를 건드리지 않고도 전체 삭제가 정상 실행됩니다.
--
--  0001 ~ 0010 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

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

  -- WHERE 절을 명시(where true = 전체)해 Supabase 안전장치를 우회
  delete from access_logs where true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
