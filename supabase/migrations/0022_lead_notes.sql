-- ============================================================
-- 모두의사업친구 — 0022
--  · 상담 메모 · 통화 상태를 "서버(DB)"에 저장하도록 이관
--
--  ★ 배경 (대표님 요청) ★
--   기존엔 상담 메모·통화상태가 브라우저(localStorage)에만 저장돼
--   직원마다 다른 PC에서 서로의 메모를 볼 수 없었다.
--   → 서버(Supabase)에 저장해 어느 PC에서든 동일하게 공유되도록 한다.
--
--  0001 ~ 0021 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- (1) lead_notes 테이블
--     note_key = 고객 1건 식별키 (진단서 id 또는 'u:email' / 'lead:...' 문자열)
--     status   = 통화 상태 (none | done | absent | contract)
--     memo     = 상담 메모
-- ------------------------------------------------------------
create table if not exists lead_notes (
  note_key    text primary key,
  status      text not null default 'none'
                check (status in ('none', 'done', 'absent', 'contract')),
  memo        text not null default '',
  updated_at  timestamptz not null default now()
);

-- RLS 잠금 — 일반 사용자 직접 접근 전면 차단. 오직 아래 RPC(정의자 권한)로만 접근.
alter table lead_notes enable row level security;
-- (정책을 하나도 만들지 않으면 RLS 켜진 상태에서 일반 롤은 전부 거부됨)

-- ------------------------------------------------------------
-- (2) admin_load_lead_notes : 전체 상담 메모 로드 (관리자 전용)
--     관리자 화면 마운트 시 1회 호출 → 모든 리드의 메모/상태를 가져온다.
-- ------------------------------------------------------------
create or replace function admin_load_lead_notes()
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
    select l.note_key, l.status, l.memo, l.updated_at
    from lead_notes l
    order by l.updated_at desc;
end;
$$;

-- ------------------------------------------------------------
-- (3) admin_save_lead_note : 상담 메모/상태 저장(upsert) (관리자 전용)
--     · p_status 가 null 이면 상태는 건드리지 않고 메모만 갱신
--     · p_memo   가 null 이면 메모는 건드리지 않고 상태만 갱신
--     → 프론트에서 "상태만 바꾸는 버튼" / "메모만 저장하는 버튼" 둘 다 대응
-- ------------------------------------------------------------
create or replace function admin_save_lead_note(
  p_note_key text,
  p_status   text default null,
  p_memo     text default null
)
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

  if p_note_key is null or length(trim(p_note_key)) = 0 then
    raise exception 'note_key 가 필요합니다.';
  end if;

  -- 상태 값 유효성 (넘어온 경우에만)
  if p_status is not null
     and p_status not in ('none', 'done', 'absent', 'contract') then
    raise exception '잘못된 통화 상태입니다: %', p_status;
  end if;

  insert into lead_notes (note_key, status, memo, updated_at)
  values (
    p_note_key,
    coalesce(p_status, 'none'),
    coalesce(p_memo, ''),
    now()
  )
  on conflict (note_key) do update
    set status     = coalesce(p_status, lead_notes.status),
        memo       = coalesce(p_memo,   lead_notes.memo),
        updated_at = now();

  return query
    select l.note_key, l.status, l.memo, l.updated_at
    from lead_notes l
    where l.note_key = p_note_key;
end;
$$;

-- 실행 권한: 로그인 사용자에게 열되, 내부 is_admin() 가드로 실제 접근 제한
grant execute on function admin_load_lead_notes()                  to authenticated;
grant execute on function admin_save_lead_note(text, text, text)   to authenticated;
