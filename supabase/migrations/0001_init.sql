-- ============================================================
-- 모두의공공조달 (PPFA) 데이터베이스 스키마
-- Supabase (PostgreSQL) 에서 실행하세요.
-- ============================================================

-- 1. 크롤링된 공고 저장 테이블
create table if not exists crawled_announcements (
  id bigint generated always as identity primary key,
  site_name text not null,               -- 사이트명
  site_url text not null,                -- 사이트 URL
  title text not null,                   -- 공고 제목
  deadline text,                         -- 마감일
  target text,                           -- 대상
  support_scale text,                    -- 지원 규모
  detail_url text,                       -- 공고 상세 URL
  crawled_at timestamptz not null default now(),  -- 크롤링 일시
  created_at timestamptz not null default now()
);

create index if not exists idx_crawled_site on crawled_announcements(site_name);
create index if not exists idx_crawled_at on crawled_announcements(crawled_at desc);

-- 2. 공식 공문 문서 메타 (RAG 참조용)
create table if not exists official_documents (
  id text primary key,                   -- d01, d02 ...
  category text not null,
  title text not null,
  url text not null,
  content text,                          -- 추출된 본문 텍스트 (선택)
  updated_at timestamptz not null default now()
);

-- 3. 진단 결과 저장
create table if not exists diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile jsonb not null,                -- 진단 응답 전체
  matched_programs jsonb,                -- 매칭 결과
  name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_diagnoses_user on diagnoses(user_id);
create index if not exists idx_diagnoses_created on diagnoses(created_at desc);

-- 4. 결제 내역
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_id text unique not null,
  tier text not null,                    -- basic / premier / pro
  amount integer not null,               -- 39000 / 89000 / 198000
  status text not null default 'pending',-- pending / paid / cancelled / refunded
  payment_key text,
  email text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_payments_order on payments(order_id);

-- 5. 커뮤니티 게시글 (후기·Q&A)
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  category text not null default 'review', -- review(후기) / qna(질문)
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_created on community_posts(created_at desc);

-- ============================================================
-- RLS (Row Level Security) 정책
-- ============================================================
alter table diagnoses enable row level security;
alter table payments enable row level security;
alter table community_posts enable row level security;

-- 진단: 누구나 삽입 가능(비회원 진단 허용), 본인 것만 조회
create policy "diagnoses_insert_any" on diagnoses for insert with check (true);
create policy "diagnoses_select_own" on diagnoses for select using (auth.uid() = user_id or user_id is null);

-- 결제: 본인 것만
create policy "payments_insert_any" on payments for insert with check (true);
create policy "payments_select_own" on payments for select using (auth.uid() = user_id or user_id is null);
create policy "payments_update_own" on payments for update using (auth.uid() = user_id or user_id is null);

-- 커뮤니티: 누구나 조회, 로그인 사용자만 작성
create policy "community_select_all" on community_posts for select using (true);
create policy "community_insert_auth" on community_posts for insert with check (auth.uid() = user_id);

-- crawled_announcements, official_documents 는 공개 읽기
alter table crawled_announcements enable row level security;
alter table official_documents enable row level security;
create policy "crawled_public_read" on crawled_announcements for select using (true);
create policy "docs_public_read" on official_documents for select using (true);
