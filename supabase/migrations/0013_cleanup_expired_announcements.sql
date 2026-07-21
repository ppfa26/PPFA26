-- ────────────────────────────────────────────────────────────────
-- 0013_cleanup_expired_announcements.sql
--
-- 목적: crawled_announcements(정부공고 크롤링 데이터)의 만료 공고 자동 정리
--   → DB 용량을 최신·유효 공고 위주로 유지하고, 마감된 공고가
--     매칭 결과에 섞여 나오는 것을 방지한다.
--
-- ⚠️ 삭제 대상: crawled_announcements 테이블 "만" 정리한다.
--    diagnoses(진단)·payments(결제)·reviews(후기) 등 고객 데이터는
--    절대 건드리지 않는다. (대표님 자산 = 영구 보존)
--
-- 삭제 규칙 (안전 3중 장치):
--   ① deadline(마감일) 정보가 있고, 그 마감일이 이미 지난 공고 → 삭제
--   ② deadline 정보가 없고(NULL), 수집(crawled_at) 후 90일이 지난 공고 → 삭제
--      (분기=3개월=90일 단위 반복 상품도 최소 한 분기는 보존되도록 넉넉히 설정)
--   ③ 그 외(마감일이 미래 / 수집 90일 이내) → 보존
--
-- deadline 컬럼은 현재 text 형이며 값이 비어있는 경우가 많다.
-- 안전을 위해 날짜 파싱이 실패하면 "삭제하지 않고 보존"한다.
-- ────────────────────────────────────────────────────────────────

-- 1) 만료 공고 정리 함수
create or replace function public.cleanup_expired_announcements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  keep_days     integer := 90;   -- deadline 없을 때 보존 일수(=한 분기)
begin
  with removed as (
    delete from public.crawled_announcements a
    where
      -- ① 마감일이 파싱 가능하고, 그 날짜가 오늘 이전(=마감)인 경우
      (
        a.deadline is not null
        and btrim(a.deadline) <> ''
        -- '2026-07-31', '2026.07.31', '2026/07/31' 형태를 날짜로 정규화 시도
        and (
          case
            when btrim(a.deadline) ~ '^\d{4}[-./]\d{1,2}[-./]\d{1,2}'
              then to_date(
                     regexp_replace(substring(btrim(a.deadline) from '^\d{4}[-./]\d{1,2}[-./]\d{1,2}'),
                                    '[./]', '-', 'g'),
                     'YYYY-MM-DD'
                   ) < current_date
            else false   -- 형식을 못 알아보면 보존(삭제 안 함)
          end
        )
      )
      -- ② 마감일 정보가 없고, 수집 후 90일이 지난 경우
      or (
        (a.deadline is null or btrim(a.deadline) = '')
        and a.crawled_at < (now() - make_interval(days => keep_days))
      )
    returning 1
  )
  select count(*) into deleted_count from removed;

  return deleted_count;
end;
$$;

comment on function public.cleanup_expired_announcements() is
  '만료된 정부공고(crawled_announcements)만 정리한다. 고객 데이터(진단/결제/후기)는 삭제하지 않는다. 반환값=삭제 건수.';


-- 2) 매일 새벽 자동 실행 스케줄 (pg_cron)
--    Supabase 대시보드에서 pg_cron 확장이 활성화되어 있어야 한다.
--    (Database → Extensions → pg_cron 검색 → Enable)
--    아래는 확장이 켜져 있으면 스케줄을 등록하고, 없으면 조용히 건너뛴다.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- 기존 동일 스케줄이 있으면 지우고 다시 등록 (중복 방지)
    perform cron.unschedule('cleanup_expired_announcements_daily')
      where exists (
        select 1 from cron.job where jobname = 'cleanup_expired_announcements_daily'
      );

    -- 매일 한국시간 새벽 4시(UTC 19시)에 실행
    perform cron.schedule(
      'cleanup_expired_announcements_daily',
      '0 19 * * *',
      $cron$ select public.cleanup_expired_announcements(); $cron$
    );
    raise notice '✅ 자동 정리 스케줄 등록 완료 (매일 한국시간 04:00)';
  else
    raise notice 'ℹ️ pg_cron 확장이 비활성 상태입니다. Extensions에서 pg_cron을 켠 뒤 이 파일을 다시 실행하면 자동 스케줄이 등록됩니다. (함수 자체는 이미 생성되어 수동 실행 가능)';
  end if;
end;
$$;
