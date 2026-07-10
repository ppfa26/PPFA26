-- ============================================================
-- 모두의공공조달 · 고객 후기 테이블
-- Supabase 대시보드 > SQL Editor 에서 아래 전체를 복사해 실행하세요.
-- ============================================================

-- 1) 후기 테이블 생성
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  author_name   text not null,                 -- 표시용 이름 (예: 김O호 대표)
  business      text,                           -- 업종 (예: 육류 포장처리업)
  region        text,                           -- 지역 (예: 인천 서구)
  rating        int  not null default 5 check (rating between 1 and 5),
  title         text not null,
  body          text not null,
  result        text,                           -- 승인 결과 (선택)
  is_approved   boolean not null default false, -- 관리자 검수 후 true 로 변경해야 노출
  created_at    timestamptz not null default now()
);

-- 2) 인덱스 (승인된 최신 후기 빠르게 조회)
create index if not exists idx_reviews_approved_created
  on public.reviews (is_approved, created_at desc);

-- 3) RLS(행 수준 보안) 활성화
alter table public.reviews enable row level security;

-- 4) 정책: 누구나 "승인된 후기"만 읽을 수 있음
drop policy if exists "read approved reviews" on public.reviews;
create policy "read approved reviews"
  on public.reviews for select
  using (is_approved = true);

-- 5) 정책: 로그인한 사용자는 본인 후기를 작성할 수 있음
drop policy if exists "insert own review" on public.reviews;
create policy "insert own review"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- 6) 정책: 로그인한 사용자는 본인이 쓴 후기를 (검수 전) 조회 가능
drop policy if exists "read own review" on public.reviews;
create policy "read own review"
  on public.reviews for select
  using (auth.uid() = user_id);

-- ============================================================
-- [관리자 안내]
-- - 새 후기는 is_approved = false 상태로 저장됩니다. (스팸/악성 방지)
-- - Supabase > Table Editor > reviews 에서 확인 후,
--   문제 없는 후기는 is_approved 를 true 로 바꾸면 사이트에 노출됩니다.
-- - 부적절한 후기는 해당 행을 삭제하면 됩니다.
-- ============================================================
