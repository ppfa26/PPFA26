-- ============================================================
-- 모두의사업친구 — [무료 베타] 계정당 "서로 다른 사업자 조회 수" 제한
-- Supabase (PostgreSQL) SQL Editor 에서 실행하세요.
-- 0012_view_credit_fingerprint.sql (view_fingerprint 헬퍼) 이후에 실행합니다.
-- ------------------------------------------------------------
-- [배경]
--  오픈 베타(무료) 기간에는 결제·조회권 차감 흐름이 꺼져 있어(BETA_FREE=true),
--  한 계정으로 로그인한 뒤 사업자(진단 프로필)만 계속 바꿔가며 무제한으로
--  전체 결과를 열람할 수 있었다. → 경쟁사/도용자가 계정 1개로 우리 매칭
--  결과를 대량 수집하는 어뷰징이 가능했다.
--
-- [해결]
--  '계정(user_id)당 서로 다른 사업자 지문(fingerprint) N개까지만' 결과 열람을
--  허용한다. 판정은 전적으로 서버(security definer 함수)에서 이뤄지므로
--  브라우저에서 조작할 수 없다.
--    · 이미 조회한 적 있는 사업자(같은 지문)  → 항상 통과(재열람 무료)
--    · 처음 보는 새 사업자인데 한도 내         → 통과 + 기록
--    · 처음 보는 새 사업자인데 한도 초과       → 차단
--  식별 규칙은 기존 view_fingerprint() 를 그대로 재사용해 일관성을 지킨다.
--  (사업자번호 10자리 있으면 'bno:...', 없으면 'nm:이름|유형')
-- ============================================================

-- ------------------------------------------------------------
-- 1. 무료 조회 로그 테이블 — 계정별로 '조회를 확정한 서로 다른 사업자'를 기록
--    · (user_id, fingerprint) 유일 → 같은 사업자는 한 번만 기록
-- ------------------------------------------------------------
create table if not exists free_view_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  business_name text,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists idx_free_view_logs_user on free_view_logs(user_id);

alter table free_view_logs enable row level security;

-- 본인 것만 조회 가능(관리자 함수는 security definer 라 무관). 쓰기는 RPC 로만.
drop policy if exists "free_view_logs_select_own" on free_view_logs;
create policy "free_view_logs_select_own" on free_view_logs
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. 계정당 허용 사업자 수 상수 (여기 숫자만 바꾸면 한도 조정)
--    기본 3 — 정상 사용자(본인 사업장 1개 + 오타 수정/재진단 여유)는 안 걸리고,
--    계정 1개로 사업자 바꿔가며 대량 수집하는 어뷰징만 차단.
-- ------------------------------------------------------------
create or replace function free_view_limit()
returns integer
language sql
immutable
as $$
  select 3;
$$;

-- ------------------------------------------------------------
-- 3. 조회 한도 판정 + 기록 RPC
--    반환: allowed(허용?), used(현재까지 조회한 서로 다른 사업자 수),
--          limit_n(한도), is_new(이번이 새 사업자였는지), message
--    · p_commit=false → 판정만(기록 안 함). 화면 진입 전 안내용.
--    · p_commit=true  → 새 사업자면 기록까지(열람 확정). 한도 초과면 기록 안 하고 차단.
-- ------------------------------------------------------------
create or replace function check_free_view(p_snapshot jsonb, p_commit boolean default true)
returns table (
  allowed boolean,
  used integer,
  limit_n integer,
  is_new boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fp text;
  v_limit int := free_view_limit();
  v_used int;
  v_already boolean;
begin
  -- 비로그인은 판정 대상 아님(로그인 게이트가 별도로 막음)
  if v_uid is null then
    return query select false, 0, v_limit, false, '로그인이 필요합니다.'::text;
    return;
  end if;

  v_fp := view_fingerprint(coalesce(p_snapshot, '{}'::jsonb));

  -- 식별 불가한 빈 지문은 제한 판정에서 제외(오탐 방지) → 통과시킴
  if v_fp is null or v_fp = 'nm:|' then
    return query select true, 0, v_limit, false, '통과'::text;
    return;
  end if;

  -- 현재까지 이 계정이 조회 확정한 '서로 다른 사업자' 수
  select count(*)::int into v_used
  from free_view_logs
  where user_id = v_uid;

  -- 이번 사업자가 이미 조회한 적 있는가?
  select exists (
    select 1 from free_view_logs
    where user_id = v_uid and fingerprint = v_fp
  ) into v_already;

  -- (A) 이미 본 사업자 → 항상 통과(재열람)
  if v_already then
    return query select true, v_used, v_limit, false, '재열람(통과)'::text;
    return;
  end if;

  -- (B) 새 사업자인데 한도 초과 → 차단
  if v_used >= v_limit then
    return query select false, v_used, v_limit, true,
      ('한 계정에서는 서로 다른 사업자 ' || v_limit || '곳까지만 결과를 확인할 수 있습니다.')::text;
    return;
  end if;

  -- (C) 새 사업자 + 한도 내 → 통과 (commit 이면 기록)
  if p_commit then
    insert into free_view_logs (user_id, fingerprint, business_name)
    values (v_uid, v_fp, btrim(coalesce(p_snapshot->>'name','')))
    on conflict (user_id, fingerprint) do nothing;
    v_used := v_used + 1;
  end if;

  return query select true, v_used, v_limit, true, '통과'::text;
end;
$$;

grant execute on function check_free_view(jsonb, boolean) to anon, authenticated;
grant execute on function free_view_limit() to anon, authenticated;
