-- ============================================================
-- 모두의사업친구 — 0020
--  · (1) 조회권 환불이 "열람"까지 확실히 막도록 get_view_status 수정
--  · (2) 결제 안 한 회원에게도 관리자가 임의로 조회권을 지급하는 함수 추가
--
--  ★ 배경 (대표님 요청) ★
--   "결제 완료한 사람도 조회권 환불을 누르면 결과를 못 보게 하고,
--    결제 안 한 사람도 내가 임의로 조회권을 줄 수 있게 해줘."
--
--  0001 ~ 0019 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- (1) get_view_status 수정
--     기존: is_active = "미만료(expires_at>now) 결제가 하나라도 있으면 true"
--           → 조회권 환불(remaining=0)해도 is_active 가 계속 true 라
--             결과 페이지 블러가 풀린 채로 남는 문제가 있었다.
--     수정: is_active = "미만료 AND (남은 조회권 remaining > 0)"
--           → 환불(view_credits_used = view_credits_total, remaining=0)하면
--             is_active 가 즉시 false 가 되어 열람이 실제로 차단된다.
-- ------------------------------------------------------------
create or replace function get_view_status()
returns table (
  is_active boolean,
  total integer,
  used integer,
  remaining integer,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with agg as (
    select
      coalesce(sum(case when p.expires_at > now() then p.view_credits_total else 0 end), 0)::int as total,
      coalesce(sum(case when p.expires_at > now() then p.view_credits_used  else 0 end), 0)::int as used,
      max(case when p.expires_at > now() then p.expires_at end) as expires_at
    from payments p
    where p.user_id = auth.uid()
      and p.status = 'paid'
  )
  select
    -- ★ 핵심 수정 ★ 미만료 결제가 있고(남은 만료시각 존재) AND 남은 조회권이 1개 이상일 때만 활성
    (agg.expires_at is not null and (agg.total - agg.used) > 0) as is_active,
    agg.total,
    agg.used,
    greatest(agg.total - agg.used, 0) as remaining,
    agg.expires_at
  from agg;
$$;

-- ------------------------------------------------------------
-- (2) admin_grant_credits : 결제 안 한 회원에게 조회권 지급 (관리자 전용)
--     · 이메일로 회원(auth.users)을 찾아, 가상 결제 행(status='paid')을 1건 삽입한다.
--       - amount = 0 (실결제 아님 → 매출 통계와 구분하기 위해 tier='grant')
--       - view_credits_total = p_count (지급할 조회권 수)
--       - view_credits_used  = 0
--       - expires_at = now() + 30일 (일반 결제와 동일한 1개월 열람 기한)
--     · 이렇게 하면 get_view_status 가 이 회원을 is_active=true 로 인식해
--       결제 없이도 결과 페이지 전체를 볼 수 있게 된다.
--     · order_id 는 유니크 제약이 있으므로 grant 전용 접두어로 충돌을 피한다.
--     반환: 지급한 조회권 개수(p_count). 회원을 못 찾으면 예외.
-- ------------------------------------------------------------
create or replace function admin_grant_credits(p_email text, p_count integer default 2)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer := greatest(coalesce(p_count, 0), 1);  -- 최소 1개
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  -- 이메일로 회원 계정(user_id) 찾기 (대소문자 무시)
  select id into v_uid
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_uid is null then
    raise exception '해당 이메일의 회원을 찾을 수 없습니다: %', p_email;
  end if;

  -- 가상 결제(조회권 지급) 행 삽입
  insert into payments (
    user_id, order_id, tier, amount, status, payment_key, email, paid_at,
    view_credits_total, view_credits_used, expires_at
  ) values (
    v_uid,
    'grant_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text), 1, 6),
    'grant',           -- 실결제와 구분되는 지급 전용 tier
    0,                 -- 무료 지급 → 매출 0
    'paid',
    null,
    p_email,
    now(),
    v_count,
    0,
    now() + interval '30 days'
  );

  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- (3) admin_stats 보정 : '결제 건수(total_paid)'에서 무료 지급(grant) 제외
--     · grant 는 amount=0 이라 매출(total_revenue/month_revenue)엔 원래 영향이 없지만,
--       count(*) 기반의 total_paid 에는 잡혀 실제 결제 건수가 부풀려진다.
--     · tier <> 'grant' 조건으로 실결제 건수만 집계한다.
--     · active_members(유효 열람 회원)는 지급 회원도 '지금 볼 수 있는 회원'이므로 그대로 포함.
-- ------------------------------------------------------------
create or replace function admin_stats()
returns table (
  total_users bigint,
  total_paid bigint,
  total_revenue bigint,
  month_revenue bigint,
  active_members bigint
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
    (select count(*) from auth.users)::bigint as total_users,
    (select count(*) from payments where status = 'paid' and tier <> 'grant')::bigint as total_paid,
    (select coalesce(sum(amount),0) from payments where status = 'paid')::bigint as total_revenue,
    (select coalesce(sum(amount),0) from payments
       where status = 'paid'
         and paid_at >= date_trunc('month', now()))::bigint as month_revenue,
    (select count(distinct user_id) from payments
       where status = 'paid' and expires_at > now())::bigint as active_members;
end;
$$;
