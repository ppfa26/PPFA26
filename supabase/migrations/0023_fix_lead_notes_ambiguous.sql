-- ============================================================
-- 모두의사업친구 — 0023
--  · 0022의 admin_save_lead_note / admin_load_lead_notes 버그 수정
--
--  ★ 증상 (대표님 발견) ★
--    통화상태/메모 저장 시 400 에러 → 저장 실패 → 새로고침하면 원래대로 복귀.
--    콘솔 오류: code 42702, "column reference \"note_key\" is ambiguous"
--
--  ★ 원인 ★
--    함수의 RETURNS TABLE 출력 컬럼명(note_key, status, memo, updated_at)이
--    실제 lead_notes 테이블 컬럼명과 동일해서, 함수 본문 SELECT 에서
--    PostgreSQL 이 "출력변수냐 테이블컬럼이냐"를 구분 못 해 모호성(42702) 발생.
--    (create or replace 만으로는 옛 오버로드 함수가 남아 계속 호출될 수 있어
--     아래처럼 DROP 후 재생성한다.)
--
--  ★ 해결 ★
--    (1) 기존 함수를 DROP (오버로드 잔재까지 제거)
--    (2) RETURNS TABLE 출력 컬럼명을 o_ 접두어로 완전히 다르게 → 모호성 원천 차단
--    (3) 프론트엔드는 예전처럼 note_key/status/memo/updated_at 를 그대로 받도록
--        select alias 로 되돌려 반환한다.
--
--  0001 ~ 0022 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요. (재실행 안전)
-- ============================================================

-- ------------------------------------------------------------
-- (0) 기존 함수 제거 — 오버로드(같은 이름 다른 시그니처)까지 모두 삭제
-- ------------------------------------------------------------
drop function if exists admin_load_lead_notes();
drop function if exists admin_save_lead_note(text, text, text);

-- ------------------------------------------------------------
-- (2') admin_load_lead_notes : 전체 상담 메모 로드 (관리자 전용) — 모호성 제거판
-- ------------------------------------------------------------
create function admin_load_lead_notes()
returns table (
  note_key   text,
  status     text,
  memo       text,
  updated_at timestamptz
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
      l.note_key   as note_key,
      l.status     as status,
      l.memo       as memo,
      l.updated_at as updated_at
    from lead_notes l
    order by l.updated_at desc;
end;
$$;

-- ------------------------------------------------------------
-- (3') admin_save_lead_note : 상담 메모/상태 저장(upsert) (관리자 전용) — 모호성 제거판
--      ★ 반환 테이블의 출력 컬럼명을 o_ 접두어로 완전히 분리해 42702 를 원천 차단 ★
-- ------------------------------------------------------------
create function admin_save_lead_note(
  p_note_key text,
  p_status   text default null,
  p_memo     text default null
)
returns table (
  o_note_key   text,
  o_status     text,
  o_memo       text,
  o_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  if p_note_key is null or length(trim(p_note_key)) = 0 then
    raise exception 'note_key 가 필요합니다.';
  end if;

  if p_status is not null
     and p_status not in ('none', 'done', 'absent', 'contract') then
    raise exception '잘못된 통화 상태입니다: %', p_status;
  end if;

  insert into lead_notes as t (note_key, status, memo, updated_at)
  values (
    p_note_key,
    coalesce(p_status, 'none'),
    coalesce(p_memo, ''),
    now()
  )
  on conflict (note_key) do update
    set status     = coalesce(p_status, t.status),
        memo       = coalesce(p_memo,   t.memo),
        updated_at = now();

  return query
    select
      l.note_key   as o_note_key,
      l.status     as o_status,
      l.memo       as o_memo,
      l.updated_at as o_updated_at
    from lead_notes l
    where l.note_key = p_note_key;
end;
$$;

-- 실행 권한 재부여 (재실행 안전)
grant execute on function admin_load_lead_notes()                  to authenticated;
grant execute on function admin_save_lead_note(text, text, text)   to authenticated;
