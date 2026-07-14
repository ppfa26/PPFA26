-- ============================================================
-- 모두의사업친구 — 0004
--  · 관리자용 진단서 삭제 함수 (단건 / 다건)
--
--  ★ 배경 ★
--  diagnoses 테이블은 RLS(행 수준 보안)가 켜져 있는데
--  INSERT · SELECT 정책만 있고 DELETE 정책이 없어서,
--  관리자 페이지에서 supabase.from("diagnoses").delete() 를 호출해도
--  RLS에 막혀 "삭제가 안 되는" 상태였습니다.
--
--  ★ 해결 ★
--  DELETE 정책을 아무나에게 여는 것은 위험하므로,
--  is_admin() 검사를 통과한 관리자만 실행되는
--  security definer 함수(RLS 우회)로 삭제를 처리합니다.
--
--  0001 ~ 0003 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 1. 진단서 단건 삭제 (관리자 전용)
--    반환: 삭제된 건수(0 또는 1)
-- ------------------------------------------------------------
create or replace function admin_delete_diagnosis(p_id uuid)
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

  delete from diagnoses where id = p_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 2. 진단서 다건 삭제 (관리자 전용 · 선택 삭제용)
--    반환: 삭제된 건수
-- ------------------------------------------------------------
create or replace function admin_delete_diagnoses(p_ids uuid[])
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

  delete from diagnoses where id = any(p_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
