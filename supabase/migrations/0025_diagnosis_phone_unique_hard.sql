-- ════════════════════════════════════════════════════════════════
--  0025. 진단서 "완료 + 중단" 2건 중복 — DB 물리 제약으로 완전 종결
--
--  ─ 왜 0024 로도 재발했나 (근본 원인) ─
--  0024 는 "전화번호로 partial 을 찾아서 삭제/승격"하는 '애플리케이션 레벨'
--  방어였다. 그러나 완료 저장(save_completed_diagnosis)과 중단 저장
--  (save_partial_lead)이 fire-and-forget 으로 '거의 동시에' 실행되면,
--  두 RPC 가 서로 상대의 커밋 전 상태를 읽어(race) 각각 새 레코드를
--  insert → 여전히 2건이 생겼다. SQL 로직만으로는 이 경쟁을 100% 못 막는다.
--
--  ─ 이번 해결 (물리적으로 2건이 불가능하게) ─
--  1) 기존 중복 정리: 같은 전화번호에 completed 가 있으면 partial 전부 삭제,
--     그래도 남는 같은 (phone,status) 중복은 최신 1건만 남기고 삭제.
--  2) '전화번호당 살아있는 레코드 1개'를 DB UNIQUE INDEX 로 강제
--     → 타이밍과 무관하게 물리적으로 2건 insert 자체가 불가능.
--  3) 두 RPC 를 UNIQUE 제약 기반 UPSERT(ON CONFLICT) 로 재작성
--     → 동시에 들어와도 한 쪽은 insert, 다른 쪽은 update 로 귀결(항상 1행).
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1) 기존에 쌓인 중복 정리 (유니크 인덱스를 걸기 전에 반드시 선행)
-- ────────────────────────────────────────────────────────────────

-- 1-a) 같은 전화번호에 completed 가 있으면 그 번호의 partial 은 모두 삭제
delete from diagnoses p
where p.status = 'partial'
  and p.phone is not null
  and exists (
    select 1 from diagnoses c
    where c.status = 'completed'
      and c.phone = p.phone
  );

-- 1-b) 그래도 같은 전화번호가 여러 건이면(예: completed 2건, partial 2건 등)
--      최신(updated_at, created_at 우선) 1건만 남기고 삭제.
--      user_id 가 있는 회원 레코드를 우선 보존.
delete from diagnoses d
using (
  select id,
         row_number() over (
           partition by phone
           order by (user_id is not null) desc,
                    coalesce(updated_at, created_at) desc,
                    created_at desc
         ) as rn
  from diagnoses
  where phone is not null
) ranked
where d.id = ranked.id
  and ranked.rn > 1;

-- ────────────────────────────────────────────────────────────────
-- 2) 전화번호당 '살아있는 레코드 1개'만 허용 (물리적 하드 제약)
--    phone 이 NULL 인 행(전화 없는 리드)은 제약 대상에서 제외.
-- ────────────────────────────────────────────────────────────────
create unique index if not exists uidx_diagnoses_phone_unique
  on diagnoses (phone)
  where phone is not null;

-- ────────────────────────────────────────────────────────────────
-- 3) 부분리드 저장 RPC — UNIQUE 기반 UPSERT 로 재작성
--    · 이미 completed 가 있으면 그대로 두고 그 id 반환(중단으로 덮지 않음).
--    · 없으면 (phone) 충돌 시 update, 없으면 insert (원자적).
-- ────────────────────────────────────────────────────────────────
create or replace function save_partial_lead(
  p_user_id uuid,
  p_profile jsonb,
  p_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_phone text := nullif(trim(p_phone), '');
  v_existing_status text;
begin
  if v_phone is null then
    return null;
  end if;

  -- 이미 같은 전화번호 레코드가 있으면 상태를 본다.
  select id, status into v_id, v_existing_status
  from diagnoses
  where phone = v_phone
  limit 1;

  -- 이미 완료된 진단이면: 중단으로 덮지 않고 그대로 둔다(완료 우선).
  if v_id is not null and v_existing_status = 'completed' then
    return v_id;
  end if;

  -- partial 이 이미 있으면 최신 내용으로 갱신.
  if v_id is not null then
    update diagnoses
    set profile = p_profile,
        name = nullif(trim(p_name), ''),
        email = nullif(trim(p_email), ''),
        user_id = coalesce(p_user_id, user_id),
        status = 'partial',
        updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  -- 신규 insert — 동시 요청과 충돌하면(같은 phone) update 로 귀결(원자적).
  insert into diagnoses (user_id, profile, name, phone, email, status)
  values (p_user_id, p_profile, nullif(trim(p_name), ''), v_phone,
          nullif(trim(p_email), ''), 'partial')
  on conflict (phone) where phone is not null
  do update set
        profile = excluded.profile,
        name = coalesce(excluded.name, diagnoses.name),
        email = coalesce(excluded.email, diagnoses.email),
        user_id = coalesce(excluded.user_id, diagnoses.user_id),
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function save_partial_lead(uuid, jsonb, text, text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 4) 완료 저장 RPC — UNIQUE 기반 UPSERT 로 재작성
--    · (phone) 충돌 시 무조건 completed 로 승격/갱신 (완료가 항상 이긴다).
--    · 동시에 partial 이 들어와도 같은 행을 건드리므로 2건이 될 수 없다.
-- ────────────────────────────────────────────────────────────────
create or replace function save_completed_diagnosis(
  p_user_id uuid,
  p_profile jsonb,
  p_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_phone text := nullif(trim(p_phone), '');
begin
  -- 전화번호가 없으면 유니크 제약을 못 쓰므로 단순 insert (드문 케이스).
  if v_phone is null then
    insert into diagnoses (user_id, profile, name, phone, email, status)
    values (p_user_id, p_profile, nullif(trim(p_name), ''), null,
            nullif(trim(p_email), ''), 'completed')
    returning id into v_id;
    return v_id;
  end if;

  -- 전화번호 기준 UPSERT — 있으면 completed 로 승격, 없으면 새로 insert.
  insert into diagnoses (user_id, profile, name, phone, email, status)
  values (p_user_id, p_profile, nullif(trim(p_name), ''), v_phone,
          nullif(trim(p_email), ''), 'completed')
  on conflict (phone) where phone is not null
  do update set
        profile = excluded.profile,
        name = coalesce(excluded.name, diagnoses.name),
        email = coalesce(excluded.email, diagnoses.email),
        user_id = coalesce(excluded.user_id, diagnoses.user_id),
        status = 'completed',
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function save_completed_diagnosis(uuid, jsonb, text, text, text) to anon, authenticated;
