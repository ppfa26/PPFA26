-- ════════════════════════════════════════════════════════════════
--  0011. 진단 "부분완료 리드(partial lead)" 저장 기능
--
--  ─ 목적 (대표님 전략) ─
--  사업자등록번호 필터(뜨내기·동종업계 차단)는 그대로 유지하되,
--  "사업자번호 조회 통과 + 이름·전화 입력"까지 마친 '검증된 진짜 사업자'가
--  진단 도중 이탈하더라도 연락처를 놓치지 않도록 그 시점에 즉시 저장한다.
--
--  · status = 'partial'   → 1단계(사업자번호·이름·전화)만 통과, 진단 미완료
--  · status = 'completed' → 진단을 끝까지 마침
--
--  중복 방지: 같은 (전화번호) 리드가 진단을 진행하며 여러 번 호출해도
--  가장 최근 partial 1건만 갱신(upsert)하고, 완료되면 completed로 승격.
-- ════════════════════════════════════════════════════════════════

-- 1) status 컬럼 추가 (이미 있으면 무시)
alter table diagnoses
  add column if not exists status text not null default 'completed';
--  ※ 기존에 쌓인 데이터(진단 완료분)는 default 'completed'로 채워진다.

-- 2) 갱신 시각 컬럼 (partial → completed 로 언제 바뀌었는지 추적)
alter table diagnoses
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_diagnoses_status on diagnoses(status);

-- ────────────────────────────────────────────────────────────────
-- 3) 부분리드 저장 RPC (비회원도 호출 → SECURITY DEFINER 로 RLS 우회)
--    같은 전화번호의 최근 'partial' 레코드가 있으면 갱신, 없으면 새로 insert.
--    이미 'completed' 된 건은 건드리지 않는다(중복 완료 방지).
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
begin
  -- 전화번호가 없으면 저장하지 않음 (리드 가치 없음)
  if v_phone is null then
    return null;
  end if;

  -- 같은 전화번호의 '진행중(partial)' 최근 레코드 찾기
  select id into v_id
  from diagnoses
  where status = 'partial' and phone = v_phone
  order by created_at desc
  limit 1;

  if v_id is not null then
    -- 기존 partial 갱신 (계속 진행하며 프로필이 채워짐)
    update diagnoses
    set profile = p_profile,
        name = nullif(trim(p_name), ''),
        email = nullif(trim(p_email), ''),
        user_id = coalesce(p_user_id, user_id),
        updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  -- 신규 partial insert
  insert into diagnoses (user_id, profile, name, phone, email, status)
  values (p_user_id, p_profile, nullif(trim(p_name), ''), v_phone,
          nullif(trim(p_email), ''), 'partial')
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function save_partial_lead(uuid, jsonb, text, text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 4) 진단 완료 저장 RPC — partial 레코드를 completed 로 승격(있으면 갱신, 없으면 insert)
--    기존 page.tsx 의 직접 insert 대신 이 함수를 쓰면 partial→completed 중복이 안 생긴다.
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
  -- 같은 전화번호의 partial 레코드가 있으면 그걸 완료로 승격
  if v_phone is not null then
    select id into v_id
    from diagnoses
    where status = 'partial' and phone = v_phone
    order by created_at desc
    limit 1;
  end if;

  if v_id is not null then
    update diagnoses
    set profile = p_profile,
        name = nullif(trim(p_name), ''),
        email = nullif(trim(p_email), ''),
        user_id = coalesce(p_user_id, user_id),
        status = 'completed',
        updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  insert into diagnoses (user_id, profile, name, phone, email, status)
  values (p_user_id, p_profile, nullif(trim(p_name), ''), v_phone,
          nullif(trim(p_email), ''), 'completed')
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function save_completed_diagnosis(uuid, jsonb, text, text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 5) admin_list_diagnoses 에 status 컬럼 추가 (관리자 목록에서 완료/미완료 구분)
-- ────────────────────────────────────────────────────────────────
create or replace function admin_list_diagnoses()
returns table (
  id uuid,
  email text,
  name text,
  phone text,
  profile jsonb,
  matched_programs jsonb,
  status text,
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
  select d.id, d.email::text, d.name, d.phone, d.profile, d.matched_programs,
         d.status, d.created_at
  from diagnoses d
  order by d.created_at desc;
end;
$$;
