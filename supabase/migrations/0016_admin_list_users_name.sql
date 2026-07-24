-- ============================================================
-- 모두의사업친구 — 0016
--  · 회원 목록에 "회원 이름(full_name)" 컬럼 추가
--
--  ★ 배경 ★
--  관리자 [회원 목록]에서 회원 이름이 "이름 미입력"으로 표시되는 문제.
--  기존에는 회원 계정 자체에 이름이 없어서, 같은 이메일의 '진단서'를 역추적해
--  이름을 빌려왔는데, 진단서에 로그인 이메일이 안 붙은 경우(비회원 진단 후 가입 등)
--  이메일 매칭이 실패해 이름을 못 찾았습니다.
--
--  ★ 해결 ★
--  카카오·구글 소셜 로그인 시 auth.users.raw_user_meta_data 에는 provider 가
--  이름을 넣어줍니다(제공자마다 키가 달라 name / full_name / nickname /
--  user_name / preferred_username 순으로 우선 채택). 이 값을 full_name 으로
--  함께 반환해, 회원 목록이 '계정 자체의 이름'을 바로 쓰도록 합니다.
--
--  ⚠️ 반환 컬럼이 바뀌므로 create or replace 가 아니라 drop 후 재생성합니다.
--     (0001~0015 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.)
-- ============================================================

drop function if exists admin_list_users();

create or replace function admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  joined_at timestamptz,
  last_sign_in timestamptz,
  paid_count integer,
  total_amount bigint,
  credits_total integer,
  credits_used integer,
  latest_expiry timestamptz,
  utm_source text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text,
    -- 소셜 로그인 메타데이터에서 이름을 순서대로 찾아온다 (provider 별 키가 다름).
    --  · 카카오: 보통 name / nickname
    --  · 구글  : full_name / name
    --  · 자체가입: full_name (가입 시 저장했다면)
    -- 빈 문자열('')은 없는 것으로 간주하고 다음 후보로 넘어간다(nullif).
    nullif(trim(coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'nickname', ''),
      nullif(u.raw_user_meta_data->>'user_name', ''),
      nullif(u.raw_user_meta_data->>'preferred_username', '')
    )), '')::text as full_name,
    u.created_at as joined_at,
    u.last_sign_in_at as last_sign_in,
    coalesce(count(p.id) filter (where p.status = 'paid'), 0)::int as paid_count,
    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)::bigint as total_amount,
    coalesce(sum(p.view_credits_total) filter (where p.status = 'paid'), 0)::int as credits_total,
    coalesce(sum(p.view_credits_used) filter (where p.status = 'paid'), 0)::int as credits_used,
    max(p.expires_at) filter (where p.status = 'paid') as latest_expiry,
    coalesce(u.raw_user_meta_data->>'utm_source', 'direct')::text as utm_source
  from auth.users u
  left join payments p on p.user_id = u.id
  group by u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data
  order by u.created_at desc;
end;
$$;
