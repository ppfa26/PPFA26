-- ============================================================
-- 모두의사업친구 — 0003
--  · 기기 1개 고정(핸드폰 1대 / PC 1대) 바인딩
--  · 접속(IP) 기록 + 어드민 수동 차단
--  · 어드민: 전체 고객 진단서/결과 열람, 매출 통계(일/월)
-- 0001, 0002 실행 후 이 파일을 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 1. 접속 로그 (누가 · 언제 · 어떤 IP · 어떤 기기로 들어왔나)
-- ------------------------------------------------------------
create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  ip text,
  device_kind text,        -- 'mobile' | 'pc'
  device_fp text,          -- 기기 지문(브라우저에서 생성)
  user_agent text,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists idx_access_logs_user on access_logs(user_id);
create index if not exists idx_access_logs_ip on access_logs(ip);
create index if not exists idx_access_logs_created on access_logs(created_at desc);

alter table access_logs enable row level security;
-- 로그인 사용자는 자기 로그만 insert 가능
drop policy if exists "access_logs_insert_own" on access_logs;
create policy "access_logs_insert_own" on access_logs
  for insert with check (auth.uid() = user_id or user_id is null);

-- ------------------------------------------------------------
-- 2. 기기 바인딩 (사용자별 · 기기종류별 최초 1대만 허용)
--    핸드폰 1대 / PC 1대 로 결과 열람 기기를 고정한다.
-- ------------------------------------------------------------
create table if not exists device_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_kind text not null,          -- 'mobile' | 'pc'
  device_fp text not null,            -- 최초 등록된 기기 지문
  created_at timestamptz not null default now(),
  unique (user_id, device_kind)       -- 사용자당 종류별 1대
);
alter table device_bindings enable row level security;
drop policy if exists "device_bindings_select_own" on device_bindings;
create policy "device_bindings_select_own" on device_bindings
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. 수동 차단 목록 (어드민이 IP나 계정을 직접 막을 때)
-- ------------------------------------------------------------
create table if not exists blocklist (
  id uuid primary key default gen_random_uuid(),
  kind text not null,        -- 'ip' | 'email'
  value text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (kind, value)
);
alter table blocklist enable row level security;
-- 로그인 사용자는 자기가 차단됐는지 조회만 가능(정책은 함수로 판정)

-- ------------------------------------------------------------
-- 4. 기기 등록/검증 함수
--    결과 열람 기기를 등록한다. 이미 다른 지문이 등록돼 있으면 거부.
--    반환: (ok, message)
-- ------------------------------------------------------------
create or replace function register_view_device(p_kind text, p_fp text)
returns table (ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
begin
  if auth.uid() is null then
    return query select false, '로그인이 필요합니다.'::text;
    return;
  end if;
  if p_kind not in ('mobile','pc') then
    p_kind := 'pc';
  end if;

  select device_fp into v_existing
  from device_bindings
  where user_id = auth.uid() and device_kind = p_kind;

  if v_existing is null then
    -- 최초 등록
    insert into device_bindings (user_id, device_kind, device_fp)
    values (auth.uid(), p_kind, p_fp)
    on conflict (user_id, device_kind) do nothing;
    return query select true, '이 기기에서 열람이 등록되었습니다.'::text;
    return;
  end if;

  if v_existing = p_fp then
    return query select true, '등록된 기기입니다.'::text;
  else
    return query select false,
      (case when p_kind = 'mobile'
            then '결과는 최초 등록한 휴대폰 1대에서만 열람할 수 있습니다.'
            else '결과는 최초 등록한 PC 1대에서만 열람할 수 있습니다.' end)::text;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5. 접속 로그 기록 함수 + 차단 여부 반환
--    로그인 사용자의 접속을 기록하고, 차단(IP/계정) 여부를 알려준다.
-- ------------------------------------------------------------
create or replace function log_access(
  p_ip text, p_kind text, p_fp text, p_ua text, p_path text
)
returns table (blocked boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_blocked boolean := false;
  v_reason text := null;
begin
  select email into v_email from auth.users where id = auth.uid();

  insert into access_logs (user_id, email, ip, device_kind, device_fp, user_agent, path)
  values (auth.uid(), v_email, p_ip, p_kind, p_fp, p_ua, p_path);

  -- 어드민이 등록한 차단 목록 확인
  if exists (select 1 from blocklist where kind='ip' and value = p_ip) then
    v_blocked := true; v_reason := '접근이 제한된 IP입니다.';
  elsif v_email is not null and exists (
    select 1 from blocklist where kind='email' and value = v_email
  ) then
    v_blocked := true; v_reason := '접근이 제한된 계정입니다.';
  end if;

  return query select v_blocked, v_reason;
end;
$$;

-- ============================================================
-- 6. 어드민 확장 함수들 (관리자 전용)
-- ============================================================

-- 6-1. 전체 고객 진단서(질문지 + 결과) 목록
create or replace function admin_list_diagnoses()
returns table (
  id uuid,
  email text,
  name text,
  phone text,
  profile jsonb,
  matched_programs jsonb,
  created_at timestamptz
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
  select d.id, d.email::text, d.name, d.phone, d.profile, d.matched_programs, d.created_at
  from diagnoses d
  order by d.created_at desc;
end;
$$;

-- 6-2. 일별 매출 (최근 30일)
create or replace function admin_daily_revenue()
returns table (day date, revenue bigint, cnt bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  return query
  select date_trunc('day', paid_at)::date as day,
         coalesce(sum(amount),0)::bigint as revenue,
         count(*)::bigint as cnt
  from payments
  where status='paid' and paid_at >= now() - interval '30 days'
  group by 1 order by 1 desc;
end;
$$;

-- 6-3. 월별 매출 (최근 12개월)
create or replace function admin_monthly_revenue()
returns table (month text, revenue bigint, cnt bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  return query
  select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
         coalesce(sum(amount),0)::bigint as revenue,
         count(*)::bigint as cnt
  from payments
  where status='paid' and paid_at >= now() - interval '12 months'
  group by 1 order by 1 desc;
end;
$$;

-- 6-4. 최근 접속 로그 (IP/기기 현황)
create or replace function admin_list_access(p_limit integer default 200)
returns table (
  email text, ip text, device_kind text, path text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  return query
  select a.email, a.ip, a.device_kind, a.path, a.created_at
  from access_logs a
  order by a.created_at desc
  limit p_limit;
end;
$$;

-- 6-5. IP별 접속 집계 (어뷰징 의심 IP 파악용)
create or replace function admin_ip_summary()
returns table (ip text, hits bigint, users bigint, last_seen timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  return query
  select a.ip,
         count(*)::bigint as hits,
         count(distinct a.user_id)::bigint as users,
         max(a.created_at) as last_seen
  from access_logs a
  where a.ip is not null
  group by a.ip
  order by hits desc
  limit 100;
end;
$$;

-- 6-6. 차단 추가 / 해제
create or replace function admin_block(p_kind text, p_value text, p_reason text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  insert into blocklist (kind, value, reason) values (p_kind, p_value, p_reason)
  on conflict (kind, value) do update set reason = excluded.reason;
  return p_value || ' 을(를) 차단했습니다.';
end;
$$;

create or replace function admin_unblock(p_kind text, p_value text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  delete from blocklist where kind = p_kind and value = p_value;
  return p_value || ' 차단을 해제했습니다.';
end;
$$;

create or replace function admin_list_blocks()
returns table (kind text, value text, reason text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  return query
  select b.kind, b.value, b.reason, b.created_at
  from blocklist b order by b.created_at desc;
end;
$$;

-- 6-7. 어드민이 특정 사용자의 기기 바인딩 초기화 (기기 변경 컴플레인 대응)
create or replace function admin_reset_device(p_email text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid;
begin
  if not is_admin() then raise exception '권한이 없습니다.'; end if;
  select id into v_uid from auth.users where email = p_email;
  if v_uid is null then return '해당 이메일 사용자를 찾을 수 없습니다.'; end if;
  delete from device_bindings where user_id = v_uid;
  return p_email || ' 의 기기 등록을 초기화했습니다. (다음 접속 기기로 재등록)';
end;
$$;
