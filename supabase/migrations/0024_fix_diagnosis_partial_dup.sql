-- ════════════════════════════════════════════════════════════════
--  0024. 진단서 "완료 + 중단" 2건 중복 완전 차단 (대표님 버그)
--
--  ─ 증상 ─
--  같은 사업자(같은 전화번호)인데 관리자 화면에서 진단서가
--  "완료(completed) 1건 + 중단(partial) 1건" = 총 2건으로 쌓임.
--
--  ─ 근본 원인 ─
--  진단 완료 시 saveCompletedDiagnosis 를 await 없이 백그라운드(fire-and-forget)
--  로 던지고 즉시 결과로 이동한다(멈춤버그 수정 때문). 이때 마지막 단계의
--  savePartialLead(중단 저장)와 saveCompletedDiagnosis(완료 저장)가 거의
--  동시에 실행되면서, 완료 RPC 가 "partial 찾기"를 할 때 partial 이 아직
--  DB 커밋 전이라 못 찾고 → completed 를 '새로' insert → 결국 2건이 된다.
--  (전화번호는 숫자만으로 정규화되어 저장되므로 하이픈 문제는 아님)
--
--  ─ 해결 ─
--  1) save_completed_diagnosis 를 "완료 저장 후, 같은 전화번호의 남은
--     partial 을 전부 삭제"하도록 강화 → 타이밍과 무관하게 항상 1건만 남음.
--  2) save_partial_lead 도 "이미 completed 가 있으면 partial 을 새로
--     만들지 않도록" 방어(늦게 도착한 partial 이 중단을 다시 만드는 것 차단).
--  3) 기존에 이미 쌓인 (completed + partial) 중복 정리: 같은 전화번호에
--     completed 가 있으면 그 전화번호의 partial 은 모두 삭제.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1) 완료 저장 RPC 강화: 완료 후 잔여 partial 정리
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
  else
    -- partial 을 못 찾았으면(타이밍 이슈 포함) 새 completed insert
    insert into diagnoses (user_id, profile, name, phone, email, status)
    values (p_user_id, p_profile, nullif(trim(p_name), ''), v_phone,
            nullif(trim(p_email), ''), 'completed')
    returning id into v_id;
  end if;

  -- ★★ 핵심 수정 ★★
  --  완료가 확정된 뒤, 같은 전화번호의 '남은 partial' 을 모두 삭제한다.
  --  (동시에 들어온 partial, 늦게 커밋된 partial 까지 여기서 정리 → 항상 1건)
  if v_phone is not null then
    delete from diagnoses
    where status = 'partial'
      and phone = v_phone
      and id <> v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function save_completed_diagnosis(uuid, jsonb, text, text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 2) 부분리드 저장 RPC 방어: 이미 completed 가 있으면 partial 만들지 않음
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
  v_completed_id uuid;
begin
  -- 전화번호가 없으면 저장하지 않음 (리드 가치 없음)
  if v_phone is null then
    return null;
  end if;

  -- ★ 방어 ★ 이미 같은 전화번호로 '완료(completed)' 된 진단이 있으면
  --   partial 을 새로/다시 만들지 않는다. (늦게 도착한 중단이 완료 뒤에
  --   다시 '중단' 레코드를 만들어 2건이 되는 것을 원천 차단)
  select id into v_completed_id
  from diagnoses
  where status = 'completed' and phone = v_phone
  order by created_at desc
  limit 1;
  if v_completed_id is not null then
    return v_completed_id;
  end if;

  -- 같은 전화번호의 '진행중(partial)' 최근 레코드 찾기 → 있으면 갱신
  select id into v_id
  from diagnoses
  where status = 'partial' and phone = v_phone
  order by created_at desc
  limit 1;

  if v_id is not null then
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
-- 3) 기존에 이미 쌓인 (completed + partial) 중복 정리 (1회성)
--    같은 전화번호에 completed 가 존재하면, 그 전화번호의 partial 은 삭제.
-- ────────────────────────────────────────────────────────────────
delete from diagnoses p
where p.status = 'partial'
  and exists (
    select 1 from diagnoses c
    where c.status = 'completed'
      and c.phone = p.phone
      and c.phone is not null
  );
