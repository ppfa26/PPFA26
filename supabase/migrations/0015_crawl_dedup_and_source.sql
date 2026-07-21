-- ────────────────────────────────────────────────────────────────
-- 0015_crawl_dedup_and_source.sql
--
-- 목적: 실제 자동 크롤러(기업마당/K-Startup OpenAPI) 도입에 맞춰
--   crawled_announcements 테이블을 "중복 없이 매일 최신화"할 수 있게 보강.
--
-- 추가 내용:
--   ① source        text  — 공고 출처(예: '기업마당', 'K-Startup')
--   ② source_id     text  — 출처의 고유 공고ID(기업마당 pblancId 등). 중복 판별 키.
--   ③ (source, source_id) 유니크 인덱스 — 같은 공고 재수집 시 UPSERT로 갱신되게 함.
--
-- ⚠️ 기존 104건(수동입력) 데이터는 source/source_id 가 NULL 이므로
--    유니크 제약에 걸리지 않는다. (NULL 은 유니크 중복으로 취급되지 않음)
--    새 크롤러가 넣는 데이터만 (source, source_id) 로 중복 관리된다.
-- ────────────────────────────────────────────────────────────────

alter table public.crawled_announcements
  add column if not exists source     text,
  add column if not exists source_id  text;

comment on column public.crawled_announcements.source    is '공고 출처(기업마당/K-Startup 등). 라이선스 출처표시용.';
comment on column public.crawled_announcements.source_id is '출처 고유 공고ID(기업마당 pblancId 등). 중복 수집 방지 키.';

-- (source, source_id) 조합 유니크 — 둘 다 NOT NULL 인 행만 유니크 강제(부분 인덱스)
create unique index if not exists uq_crawled_source
  on public.crawled_announcements (source, source_id)
  where source is not null and source_id is not null;
