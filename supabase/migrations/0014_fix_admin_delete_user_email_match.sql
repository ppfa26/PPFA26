-- ============================================================
-- 모두의사업친구 — 0014
--  · admin_delete_user 이메일 매칭을 대소문자·공백 무시로 수정
--
--  ★ 배경 ★
--  소셜 로그인(카카오/구글)으로 저장된 auth.users.email 이 화면에 보이는
--  값과 대소문자/공백이 미묘하게 달라, 기존 함수의 `email = p_email`
--  (정확히 일치) 조건이 계정을 못 찾아 실제 삭제가 되지 않았습니다.
--  → lower(trim()) 정규화 비교로 바꿔 확실히 매칭되게 합니다.
--
--  · 관련 데이터(diagnoses/payments) 삭제 조건도 동일하게 정규화합니다.
--  · 0013 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

create or replace function admin_delete_user(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text := lower(trim(p_email));  -- 정규화된 비교 기준
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  if v_email is null or length(v_email) = 0 then
    return '이메일 정보가 없어 삭제할 수 없습니다.';
  end if;

  -- 계정 id 조회 (대소문자·공백 무시)
  select id into v_uid
  from auth.users
  where lower(trim(email)) = v_email
  limit 1;

  -- 앱 데이터 정리 (정규화된 이메일 기준 + 계정 id 기준 둘 다)
  delete from diagnoses
  where lower(trim(email)) = v_email
     or (v_uid is not null and user_id = v_uid);
  delete from payments
  where lower(trim(email)) = v_email
     or (v_uid is not null and user_id = v_uid);

  if v_uid is not null then
    delete from device_bindings where user_id = v_uid;
    -- 로그인 계정 삭제 (access_logs/view_logs 등은 FK 규칙으로 자동 정리)
    delete from auth.users where id = v_uid;
  end if;

  return p_email || ' 회원 계정과 관련 데이터를 삭제했습니다.';
end;
$$;
