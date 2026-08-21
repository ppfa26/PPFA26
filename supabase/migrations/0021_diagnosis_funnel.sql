-- ============================================================
-- 모두의사업친구 — 0021
--  · 무료진단 '퍼널(단계별 이탈)' 추적 — 익명 진행 로그
--
--  ★ 목적 ★
--  회원관리 페이지에서 "방문자가 무료진단 중 어느 질문에서 이탈했는지"를
--  본다. 지금은 진단서(diagnoses)가 '완주(completed) / 연락처까지 옴(partial)'
--  두 단계만 구분되고, 연락처를 맨 마지막(bnoContact)에서 받기 때문에
--  중간 질문에서 이탈한 방문자는 아무 기록이 없다.
--
--  ★ 설계 원칙 (대표님 우려 반영: 회원/진단서와 절대 안 섞이게) ★
--  · 완전히 독립된 테이블(diagnosis_funnel). auth.users / diagnoses 와
--    조인·FK 없음 → 회원목록·진단서 데이터에 영향 0.
--  · 브라우저별 '익명 방문자 ID(visitor_id, uuid)'로만 식별(개인정보 아님).
--  · 방문자 1명 = 1행(upsert). step 을 지날 때마다 최대 도달단계만 갱신.
--  · 진행도 기록 실패는 진단 흐름을 절대 막지 않음(프론트 fire-and-forget).
--  · RLS: anon/authenticated 는 오직 기록용 RPC(save_funnel_step)만 실행.
--    조회(집계)는 admin 전용 RPC(admin_funnel_stats)로만 가능.
--
--  0001 ~ 0020 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── 1) 퍼널 로그 테이블 (독립·익명) ─────────────────────────
create table if not exists public.diagnosis_funnel (
  visitor_id   uuid primary key,               -- 브라우저별 익명 ID
  max_step     integer not null default 0,      -- 도달한 '최대' 단계 인덱스(0-base)
  max_step_key text,                            -- 그 단계의 key(bizEligibility 등)
  total_steps  integer,                         -- 그 세션 기준 전체 단계 수
  completed    boolean not null default false,  -- 진단 완주 여부
  biz_type     text,                            -- 사업자 구분(예비/개인/법인) - 있으면 기록
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.diagnosis_funnel is
  '무료진단 단계별 이탈 추적(익명). 회원/진단서와 무관한 독립 통계 테이블.';

-- 집계 조회 성능용 인덱스
create index if not exists idx_diagnosis_funnel_max_step
  on public.diagnosis_funnel (max_step);
create index if not exists idx_diagnosis_funnel_updated_at
  on public.diagnosis_funnel (updated_at);

-- ── 2) RLS: 테이블 직접 접근 차단(오직 아래 RPC 통해서만) ────
alter table public.diagnosis_funnel enable row level security;
-- 정책을 따로 두지 않음 → anon/authenticated 는 직접 select/insert/update 불가.
--   기록/조회는 security definer RPC 로만 수행(아래).

-- ── 3) 진행도 기록 RPC (익명 허용) ──────────────────────────
--   · 방문자당 1행 upsert. max_step 은 '더 큰 값'일 때만 갱신(뒤로가기로
--     낮아지지 않게). completed=true 는 한 번 켜지면 유지.
--   · security definer 로 RLS 를 우회해 안전하게 기록.
create or replace function public.save_funnel_step(
  p_visitor_id uuid,
  p_step       integer,
  p_step_key   text,
  p_total      integer,
  p_completed  boolean default false,
  p_biz_type   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor_id is null then
    return;
  end if;

  insert into public.diagnosis_funnel
    (visitor_id, max_step, max_step_key, total_steps, completed, biz_type, created_at, updated_at)
  values
    (p_visitor_id, coalesce(p_step, 0), p_step_key, p_total, coalesce(p_completed, false), p_biz_type, now(), now())
  on conflict (visitor_id) do update set
    -- 더 멀리 간 경우에만 최대 단계 갱신(뒤로가기·재진입으로 낮아지지 않게)
    max_step     = greatest(public.diagnosis_funnel.max_step, excluded.max_step),
    max_step_key = case
                     when excluded.max_step >= public.diagnosis_funnel.max_step
                       then excluded.max_step_key
                     else public.diagnosis_funnel.max_step_key
                   end,
    total_steps  = coalesce(excluded.total_steps, public.diagnosis_funnel.total_steps),
    -- 완주 플래그는 한 번 true 면 유지
    completed    = public.diagnosis_funnel.completed or coalesce(excluded.completed, false),
    biz_type     = coalesce(excluded.biz_type, public.diagnosis_funnel.biz_type),
    updated_at   = now();
end;
$$;

-- 익명 방문자도 진행도를 남길 수 있어야 하므로 anon/authenticated 에 실행 권한 부여
grant execute on function public.save_funnel_step(uuid, integer, text, integer, boolean, text)
  to anon, authenticated;

-- ── 4) admin 집계 조회 RPC (관리자 전용) ─────────────────────
--   단계별 도달 수 / 이탈 수 / 이탈률을 한 번에 반환.
--   · reached  = 그 단계까지 도달한 방문자 수(max_step >= step)
--   · dropped  = 그 단계에서 멈춘(이탈한) 방문자 수(max_step = step 이고 미완주)
--   · 완주자(completed)는 마지막 단계까지 간 것으로 간주.
create or replace function public.admin_funnel_stats()
returns table (
  step         integer,
  step_key     text,
  reached      bigint,
  dropped      bigint,
  completed_cnt bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with steps as (
    -- 실제 로그에 등장한 단계 인덱스 + key 를 뽑아 축으로 사용
    select distinct df.max_step as step, df.max_step_key as step_key
    from public.diagnosis_funnel df
  ),
  -- 각 단계 인덱스별 대표 key(가장 흔한 것) 매핑
  step_keys as (
    select s.step,
           (select df2.max_step_key
              from public.diagnosis_funnel df2
             where df2.max_step = s.step and df2.max_step_key is not null
             group by df2.max_step_key
             order by count(*) desc
             limit 1) as step_key
    from (select distinct max_step as step from public.diagnosis_funnel) s
  )
  select
    sk.step,
    sk.step_key,
    (select count(*) from public.diagnosis_funnel d where d.max_step >= sk.step)                              as reached,
    (select count(*) from public.diagnosis_funnel d where d.max_step = sk.step and d.completed = false)       as dropped,
    (select count(*) from public.diagnosis_funnel d where d.max_step = sk.step and d.completed = true)        as completed_cnt
  from step_keys sk
  order by sk.step;
end;
$$;

grant execute on function public.admin_funnel_stats() to authenticated;

-- ── 5) admin 전체 요약(진단 시작/완주/전환율) RPC ────────────
create or replace function public.admin_funnel_summary()
returns table (
  started    bigint,  -- 진단을 1단계라도 시작한 방문자 수
  completed  bigint,  -- 완주한 방문자 수
  dropped    bigint   -- 중간 이탈(시작했지만 미완주)
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.diagnosis_funnel)                              as started,
    (select count(*) from public.diagnosis_funnel where completed = true)       as completed,
    (select count(*) from public.diagnosis_funnel where completed = false)      as dropped;
end;
$$;

grant execute on function public.admin_funnel_summary() to authenticated;
