-- ════════════════════════════════════════════════════════════════
--  0017. 🔒 보안 긴급 수정: diagnoses / payments 고객정보 유출 구멍 차단
--
--  ─ 문제 (실측 확인) ─
--  0001_init.sql 의 조회 정책이 다음과 같았다:
--     using (auth.uid() = user_id OR user_id IS NULL)
--  비회원 진단서는 user_id 가 NULL 로 저장되므로, 이 "OR user_id IS NULL"
--  때문에 공개 anon 키만으로 '모든 비회원 고객 명단(이름·전화·진단내용)'을
--  통째로 조회할 수 있었다. anon 키는 브라우저에 노출되는 공개키라,
--  경쟁 컨설턴트가 개발자도구만 열면 대표님 리드 DB를 전부 빼갈 수 있는 상태.
--  또한 anon 이 테이블에 직접 INSERT/UPDATE 도 가능해 데이터 오염 위험이 있었다.
--
--  ─ 수정 원칙 ─
--   · 조회(select): 로그인한 '본인 것(auth.uid() = user_id)'만. NULL 우회 제거.
--       → 비회원(user_id NULL) 진단서는 아무도 REST 로 못 읽는다.
--       → 관리자(대표님)는 기존 admin_list_diagnoses() (is_admin 검증, SECURITY
--         DEFINER) 로만 전체를 본다. (앱/관리자 화면 동작 그대로)
--   · 저장(insert): 앱은 SECURITY DEFINER RPC(save_partial_lead /
--       save_completed_diagnosis)로만 저장하므로, 테이블 직접 insert 공개 정책은
--       제거한다. (RPC 저장은 RLS 우회 → 비회원 저장 기능은 그대로 유지됨)
--   · 앱 영향 없음(실측): 앱의 diagnoses/payments 조회는 전부
--       .eq("user_id", 현재로그인ID) 형태(본인 것)라 이 정책으로도 정상 작동.
-- ════════════════════════════════════════════════════════════════

-- ── diagnoses ────────────────────────────────────────────────────
-- 기존 취약 정책 제거
drop policy if exists "diagnoses_insert_any" on diagnoses;
drop policy if exists "diagnoses_select_own" on diagnoses;

-- 조회: 로그인 본인 것만. (비회원 NULL 진단서는 REST 로 노출되지 않음)
create policy "diagnoses_select_own_strict" on diagnoses
  for select
  using (auth.uid() is not null and auth.uid() = user_id);

--  ※ 테이블 직접 INSERT 공개 정책은 두지 않는다.
--    저장은 save_partial_lead / save_completed_diagnosis (SECURITY DEFINER)
--    RPC 를 통해서만 일어나며, 이 함수들은 RLS 를 우회하므로 비회원 저장도 정상.

-- ── payments ─────────────────────────────────────────────────────
drop policy if exists "payments_insert_any" on payments;
drop policy if exists "payments_select_own" on payments;
drop policy if exists "payments_update_own" on payments;

-- 조회: 로그인 본인 것만 (NULL 우회 제거)
create policy "payments_select_own_strict" on payments
  for select
  using (auth.uid() is not null and auth.uid() = user_id);

-- 결제 생성/갱신: 로그인 본인 것만 (비회원 임의 결제행 삽입/변조 차단)
create policy "payments_insert_own_strict" on payments
  for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "payments_update_own_strict" on payments
  for update
  using (auth.uid() is not null and auth.uid() = user_id);

--  ※ 관리자(대표님)의 전체 결제/조회권 관리는 기존 admin_* RPC (is_admin 검증,
--    SECURITY DEFINER) 로 이루어지므로 이 정책과 무관하게 그대로 동작한다.
