-- ════════════════════════════════════════════════════════════════
--  관리자 권한 진단용 쿼리 (Supabase SQL Editor에서 실행)
--  ※ SQL Editor는 service_role로 실행되므로 auth.uid()가 NULL입니다.
--    따라서 아래 [A]는 참고용이고, 실제 원인은 [B][C]로 판단합니다.
-- ════════════════════════════════════════════════════════════════

-- [A] 현재 배포된 is_admin() 함수 정의 확인
--     (아래 결과에 biospartners@naver.com / meolhae1993@gmail.com 두 개가
--      정확히 들어있는지 눈으로 확인하세요.)
select pg_get_functiondef('public.is_admin()'::regprocedure);

-- [B] auth.users에 실제로 저장된 관리자 계정 이메일 확인 (★가장 중요)
--     소셜 로그인 시 대소문자/공백/형식이 코드와 다르면 권한 검사가 실패합니다.
select
  id,
  email,
  '['|| email ||']' as email_괄호로_공백확인,
  length(email)      as 글자수,
  lower(email)       as 소문자변환,
  raw_app_meta_data->>'provider' as 로그인방식,
  created_at,
  last_sign_in_at
from auth.users
where lower(email) like '%biospartners%'
   or lower(email) like '%meolhae%'
order by last_sign_in_at desc nulls last;

-- [C] 이 두 이메일로 로그인한 유저가 diagnoses/payments에 남긴 데이터 개수
--     (데이터가 실제로 몇 건 있는지 = 관리자 페이지에 떠야 할 정답)
select 'diagnoses' as 테이블, count(*) as 건수
from public.diagnoses
where lower(email) in ('biospartners@naver.com','meolhae1993@gmail.com')
union all
select 'payments', count(*)
from public.payments
where lower(email) in ('biospartners@naver.com','meolhae1993@gmail.com');
