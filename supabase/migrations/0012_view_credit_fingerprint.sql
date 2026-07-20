-- ============================================================
-- 모두의사업친구 — 조회권 "중복 차감" 근본 방지 (서버 지문 기준)
-- Supabase (PostgreSQL) SQL Editor 에서 실행하세요.
-- 0002_view_credits_admin.sql 이후에 실행합니다.
-- ------------------------------------------------------------
-- [배경]
--  기존에는 "이미 본 사업장인가?"(재열람 무료) 판정을 브라우저
--  localStorage(mpp_consumed_fingerprints) 로만 했습니다. 그래서
--  고객이 브라우저 캐시를 지우거나 다른 기기(폰↔PC)로 열람하면
--  localStorage 가 비어 같은 사업장을 '새 사업장'으로 오인 → 조회권을
--  한 번 더 차감하는 컴플레인 소지가 있었습니다.
--
-- [해결]
--  서버(view_logs)에는 이미 조회한 사업장의 스냅샷이 기록되고 있으므로,
--  '사업장 지문(fingerprint)' 을 서버에도 저장하고, 차감 직전에 같은
--  지문이 이미 있으면 차감하지 않고 '이미 조회한 사업장' 으로 통과시킨다.
--  → 기기/캐시와 무관하게 "같은 사업장은 한 번만 차감" 이 서버에서 보장된다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. view_logs 에 지문(fingerprint) 컬럼 추가
--    · 사업자번호(10자리)가 있으면 'bno:숫자' 로 식별 (가장 정확)
--    · 없으면 'nm:이름|유형' 으로 식별 (클라이언트 규칙과 동일)
-- ------------------------------------------------------------
alter table view_logs add column if not exists fingerprint text;

create index if not exists idx_view_logs_user_fp on view_logs(user_id, fingerprint);

-- ------------------------------------------------------------
-- 2. 스냅샷(jsonb) → 지문 계산 헬퍼 함수
--    클라이언트(ViewCreditGate.fingerprint)와 100% 동일한 규칙을 사용한다.
--      bno 있으면        → 'bno:' || 숫자만
--      없으면            → 'nm:' || 이름(trim) || '|' || businessType
-- ------------------------------------------------------------
create or replace function view_fingerprint(p_snapshot jsonb)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_snapshot->>'bno',''), '[^0-9]', '', 'g')) = 10
      then 'bno:' || regexp_replace(coalesce(p_snapshot->>'bno',''), '[^0-9]', '', 'g')
    else 'nm:' || btrim(coalesce(p_snapshot->>'name','')) || '|' || coalesce(p_snapshot->>'businessType','')
  end;
$$;

-- ------------------------------------------------------------
-- 3. 과거 기록(fingerprint 비어있는 행)에 지문 백필
--    이미 조회했던 사업장들도 앞으로 '재열람 무료' 로 인식되도록.
-- ------------------------------------------------------------
update view_logs
set fingerprint = view_fingerprint(business_snapshot)
where fingerprint is null
  and business_snapshot is not null;

-- ------------------------------------------------------------
-- 4. consume_view_credit 재정의 — 지문 기준 "중복 차감 방지"
--    · 같은 사용자가 같은 지문을 '유효 결제 기간 내'에 이미 조회했다면
--      → 차감하지 않고 재열람으로 통과 (ok=true, message='재열람')
--    · 처음 보는 사업장일 때만 조회권 1개 차감
--    반환 시그니처(ok, remaining, message)는 그대로라 프런트 수정 불필요.
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
  v_fp text;
  v_already boolean;
begin
  -- 이번 조회 대상의 지문 계산
  v_fp := view_fingerprint(coalesce(p_snapshot, '{}'::jsonb));

  -- 전체 남은 조회권(표시용) 미리 계산
  select coalesce(sum(view_credits_total - view_credits_used), 0)::int into v_remaining
  from payments
  where user_id = auth.uid()
    and status = 'paid'
    and expires_at > now();

  -- (A) 같은 지문을 '아직 만료되지 않은 결제 기간 내'에 이미 조회했는가?
  --     view_logs 를 그 결제(payment)들과 조인해 만료 전 기록만 인정한다.
  select exists (
    select 1
    from view_logs vl
    join payments p on p.id = vl.payment_id
    where vl.user_id = auth.uid()
      and vl.fingerprint = v_fp
      and v_fp is not null
      and v_fp <> 'nm:|'          -- 이름/사업자번호가 전혀 없는 빈 지문은 식별 불가 → 재열람 취급 안 함
      and p.expires_at > now()
  ) into v_already;

  if v_already then
    -- 이미 조회한 사업장 → 차감 없이 재열람 통과 (기기/캐시 무관 일관)
    return query select true, v_remaining, '재열람(차감 없음)'::text;
    return;
  end if;

  -- (B) 새 사업장 → 유효(미만료) & 조회권 남은 결제를 오래된 순으로 하나 잠금 선택
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

  -- 조회 기록 남기기 (지문 포함)
  insert into view_logs (user_id, payment_id, business_name, business_snapshot, fingerprint)
  values (auth.uid(), v_payment.id, p_business_name, p_snapshot, v_fp);

  -- 전체 남은 조회권 재계산
  select coalesce(sum(view_credits_total - view_credits_used), 0)::int into v_remaining
  from payments
  where user_id = auth.uid()
    and status = 'paid'
    and expires_at > now();

  return query select true, v_remaining, '조회가 완료되었습니다.'::text;
end;
$$;
