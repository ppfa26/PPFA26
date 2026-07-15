-- ============================================================
-- 모두의사업친구 — 0008
--  · 관리자용 "회원 계정 삭제" 함수
--
--  ★ 배경 ★
--  회원 목록(관리) 에서 계정차단 옆의 '삭제' 버튼으로, 해당 회원과
--  관련된 데이터를 정리하고 로그인 계정(auth.users)까지 제거합니다.
--  (탈퇴 요청·중복/오류 가입·스팸 계정 정리 용도)
--
--  · 이메일 기준으로 다음을 처리합니다.
--    1) 진단서(diagnoses) 삭제
--    2) 결제(payments) 삭제
--    3) 기기등록(device_bindings) 삭제
--    4) 로그인 계정(auth.users) 삭제  ← 여기서 access_logs / view_logs
--       등은 on delete set null / cascade 로 자동 정리됩니다.
--
--  · payments 등은 RLS가 켜져 있어 직접 delete 가 막히므로, is_admin()
--    검사를 통과한 관리자만 실행되는 security definer 함수로 처리합니다.
--
--  ⚠️ 되돌릴 수 없습니다. (프론트에서 한 번 더 확인창을 띄웁니다)
--
--  0001 ~ 0007 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

create or replace function admin_delete_user(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    return '이메일 정보가 없어 삭제할 수 없습니다.';
  end if;

  -- 계정 id 조회 (이메일 매칭)
  select id into v_uid from auth.users where email = p_email;

  -- 앱 데이터 정리 (이메일 기준 + 계정 id 기준 둘 다)
  delete from diagnoses where email = p_email or (v_uid is not null and user_id = v_uid);
  delete from payments  where email = p_email or (v_uid is not null and user_id = v_uid);

  if v_uid is not null then
    delete from device_bindings where user_id = v_uid;
    -- 로그인 계정 삭제 (access_logs/view_logs 등은 FK 규칙으로 자동 정리)
    delete from auth.users where id = v_uid;
  end if;

  return p_email || ' 회원 계정과 관련 데이터를 삭제했습니다.';
end;
$$;
