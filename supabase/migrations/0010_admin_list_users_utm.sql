-- ============================================================
-- 모두의사업친구 — 0010
--  · 회원 목록에 "유입경로(광고 채널)" 컬럼 추가
--
--  ★ 배경 ★
--  방문자가 광고 링크(?utm_source=daangn 등)로 들어오면 UtmCapture 가
--  채널을 저장하고, 회원가입 시 auth.users 의 메타데이터(raw_user_meta_data)에
--  utm_source 로 기록됩니다. 이 값을 관리자 회원 목록에서 배지로 보여주기 위해
--  admin_list_users() 가 utm_source 를 함께 반환하도록 재정의합니다.
--
--  · utm_source 예시: daangn(당근) / meta(메타·페북) / instagram(인스타)
--    / naver(네이버) / google(구글) / kakao(카카오) / youtube(유튜브)
--    / direct(직접 유입) / etc(기타)
--
--  ⚠️ 반환 컬럼이 바뀌므로 create or replace 가 아니라 drop 후 재생성합니다.
--
--  0001 ~ 0009 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

drop function if exists admin_list_users();

create or replace function admin_list_users()
returns table (
  user_id uuid,
  email text,
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
