-- ============================================================
-- 모두의사업친구 — 계정당 "서로 다른 사업자 조회 수" 한도 조정 (3 → 2)
-- Supabase (PostgreSQL) SQL Editor 에서 실행하세요.
-- 0018_free_business_view_limit.sql 이후에 실행합니다.
-- ------------------------------------------------------------
-- [대표님 요청]
--   · 1개 아이디로 "서로 다른 사업자 2곳까지" 무료 진단 결과 열람 허용
--   · "3번째(3번째 사업자)"부터 어뷰징 차단 문구 노출
--
-- [판정 방식 — 0018 의 check_free_view() 그대로 재사용]
--   free_view_limit() 상수만 2 로 낮추면, check_free_view() 의
--   차단 조건 `v_used >= v_limit` 이 다음과 같이 동작한다.
--     · 1번째 새 사업자 → used=0  < 2 → 통과(기록 후 used=1)
--     · 2번째 새 사업자 → used=1  < 2 → 통과(기록 후 used=2)
--     · 3번째 새 사업자 → used=2 >= 2 → 차단 ✅ (여기서 어뷰징 문구)
--   ※ 이미 본 사업자(같은 지문) 재열람은 한도와 무관하게 항상 통과.
--   ※ 같은 사업자번호(bno)면 지문이 동일 → 같은 사업장으로 취급되어 1곳으로 카운트.
--     따라서 "같은 사업자번호/전화번호"로 다시 봐도 새 사업자로 세지 않는다.
-- ============================================================

create or replace function free_view_limit()
returns integer
language sql
immutable
as $$
  select 2;
$$;

grant execute on function free_view_limit() to anon, authenticated;
