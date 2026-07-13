-- ============================================================
-- 모두의사업친구 — 조회권(2회 제한) + 1개월 만료 + 어드민
-- Supabase (PostgreSQL) SQL Editor 에서 실행하세요.
-- 기존 0001_init.sql 이후에 추가로 실행합니다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. payments 테이블에 조회권 관련 컬럼 추가
--    - view_credits_total : 이 결제로 부여된 총 조회권 (기본 2)
--    - view_credits_used  : 사용한 조회권 수
--    - expires_at         : 열람 만료 시각 (결제 1개월 뒤)
-- ------------------------------------------------------------
alter table payments add column if not exists view_credits_total integer not null default 2;
alter table payments add column if not exists view_credits_used  integer not null default 0;
alter table payments add column if not exists expires_at timestamptz;

-- 기존 결제(만료시각 없는 행)에 대해 paid_at + 30일로 자동 설정
update payments
set expires_at = coalesce(paid_at, created_at) + interval '30 days'
where expires_at is null;

-- ------------------------------------------------------------
-- 2. 조회 기록 테이블 (새 사업자 정보로 조회할 때마다 1건 기록)
-- ------------------------------------------------------------
create table if not exists view_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  business_name text,          -- 조회 대상 사업자명 (실수 판별/관리용)
  business_snapshot jsonb,     -- 조회 시점 입력값 스냅샷
  created_at timestamptz not null default now()
);

create index if not exists idx_view_logs_user on view_logs(user_id);
create index if not exists idx_view_logs_created on view_logs(created_at desc);

alter table view_logs enable row level security;
create policy "view_logs_select_own" on view_logs
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. 사용자별 조회 권한 요약 함수
--    현재 로그인 사용자가 "새 조회"를 할 수 있는지 판단하는 데 필요한
--    값들을 한 번에 돌려준다.
--      - is_active  : 유효한(만료 안된) 결제가 있는가
--      - total      : 총 조회권 (유효 결제들의 합)
--      - used       : 사용한 조회권
--      - remaining  : 남은 조회권
--      - expires_at : 가장 늦은 만료 시각 (열람 가능 기한)
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
  select
    coalesce(bool_or(p.expires_at > now()), false) as is_active,
    coalesce(sum(case when p.expires_at > now() then p.view_credits_total else 0 end), 0)::int as total,
    coalesce(sum(case when p.expires_at > now() then p.view_credits_used  else 0 end), 0)::int as used,
    greatest(
      coalesce(sum(case when p.expires_at > now() then p.view_credits_total else 0 end), 0)::int
      - coalesce(sum(case when p.expires_at > now() then p.view_credits_used else 0 end), 0)::int,
      0
    ) as remaining,
    max(case when p.expires_at > now() then p.expires_at end) as expires_at
  from payments p
  where p.user_id = auth.uid()
    and p.status = 'paid';
$$;

-- ------------------------------------------------------------
-- 4. 조회권 1개 소진 함수 (새 사업자 조회 시 호출)
--    - 유효한 결제 중 조회권이 남은 가장 오래된 결제에서 1개 차감
--    - 조회 기록(view_logs)도 함께 남긴다
--    - 반환: 성공 여부 + 남은 조회권 + 메시지
--    동시성 안전을 위해 FOR UPDATE 로 잠금
-- ------------------------------------------------------------
create or replace function consume_view_credit(p_business_name text, p_snapshot jsonb)
returns table (
  ok boolean,
  remaining integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_remaining int;
begin
  -- 유효(미만료) & 조회권 남은 결제를 오래된 순으로 하나 잠금 선택
  select * into v_payment
  from payments
  where user_id = auth.uid()
    and status = 'paid'
    and expires_at > now()
    and view_credits_used < view_credits_total
  order by paid_at asc nulls last
  limit 1
  for update;

  if not found then
    -- 남은 조회권이 없거나 만료됨
    return query
      select false,
             0,
             '남은 조회 횟수가 없습니다. (1개 결제당 조회 2회 · 결제 후 1개월간 열람 가능)'::text;
    return;
  end if;

  -- 조회권 1개 차감
  update payments
  set view_credits_used = view_credits_used + 1
  where id = v_payment.id;

  -- 조회 기록 남기기
  insert into view_logs (user_id, payment_id, business_name, business_snapshot)
  values (auth.uid(), v_payment.id, p_business_name, p_snapshot);

  -- 전체 남은 조회권 재계산
  select
    coalesce(sum(view_credits_total - view_credits_used), 0)::int into v_remaining
  from payments
  where user_id = auth.uid()
    and status = 'paid'
    and expires_at > now();

  return query select true, v_remaining, '조회가 완료되었습니다.'::text;
end;
$$;

-- ------------------------------------------------------------
-- 5. 결제 시 만료시각 자동 세팅 트리거
--    payment 가 paid 로 저장될 때 expires_at 이 비어있으면
--    paid_at(없으면 now) + 30일로 자동 설정
-- ------------------------------------------------------------
create or replace function set_payment_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and new.expires_at is null then
    new.expires_at := coalesce(new.paid_at, now()) + interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_payment_expiry on payments;
create trigger trg_set_payment_expiry
  before insert or update on payments
  for each row execute function set_payment_expiry();

-- ------------------------------------------------------------
-- 6. 어드민 판별 — 대표님 계정만 관리자
--    (이메일 기준. 필요 시 이메일 추가 가능)
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select email from auth.users where id = auth.uid()) in (
      'biospartners@naver.com'
    ),
    false
  );
$$;

-- ------------------------------------------------------------
-- 7. 어드민용 조회 함수들 (관리자만 실행 가능)
-- ------------------------------------------------------------

-- 7-1. 회원 + 결제/조회권 통합 목록
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
  latest_expiry timestamptz
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
    max(p.expires_at) filter (where p.status = 'paid') as latest_expiry
  from auth.users u
  left join payments p on p.user_id = u.id
  group by u.id, u.email, u.created_at, u.last_sign_in_at
  order by u.created_at desc;
end;
$$;

-- 7-2. 결제 내역 전체
create or replace function admin_list_payments()
returns table (
  order_id text,
  email text,
  tier text,
  amount integer,
  status text,
  credits_total integer,
  credits_used integer,
  paid_at timestamptz,
  expires_at timestamptz
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
    p.order_id, p.email::text, p.tier, p.amount, p.status,
    p.view_credits_total, p.view_credits_used, p.paid_at, p.expires_at
  from payments p
  order by p.created_at desc;
end;
$$;

-- 7-3. 매출 요약 (전체/이번달/유효회원수)
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
    (select count(*) from payments where status = 'paid')::bigint as total_paid,
    (select coalesce(sum(amount),0) from payments where status = 'paid')::bigint as total_revenue,
    (select coalesce(sum(amount),0) from payments
       where status = 'paid'
         and paid_at >= date_trunc('month', now()))::bigint as month_revenue,
    (select count(distinct user_id) from payments
       where status = 'paid' and expires_at > now())::bigint as active_members;
end;
$$;

-- 7-4. 관리자가 특정 결제에 조회권 수동 부여 (컴플레인 대응용)
create or replace function admin_add_credits(p_order_id text, p_add integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  update payments
  set view_credits_total = view_credits_total + p_add
  where order_id = p_order_id;

  if not found then
    return '해당 주문번호를 찾을 수 없습니다.';
  end if;
  return '조회권 ' || p_add || '개를 추가했습니다.';
end;
$$;

-- 7-5. 관리자가 특정 결제의 열람 기한 연장 (일 단위)
create or replace function admin_extend_expiry(p_order_id text, p_days integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  update payments
  set expires_at = coalesce(expires_at, now()) + (p_days || ' days')::interval
  where order_id = p_order_id;

  if not found then
    return '해당 주문번호를 찾을 수 없습니다.';
  end if;
  return '열람 기한을 ' || p_days || '일 연장했습니다.';
end;
$$;
