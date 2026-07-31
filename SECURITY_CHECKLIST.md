# 🔐 보안 점검 체크리스트 (대표님 확인용)

> 작성일: 2026-07-31 · 대상: 모두의사업친구 (Supabase + Vercel + Next.js)
>
> 이 문서는 **코드로는 못 막고 Supabase 대시보드 설정으로만 막을 수 있는** 부분을 대표님이
> 직접 확인하시라고 정리한 것입니다. 코드 쪽 보안(레이트리밋·보안헤더·도용방지)은 이미 적용 완료했습니다.

---

## ⭐ 가장 중요 — Supabase RLS(행 수준 보안) 확인

**왜 중요한가:** 우리 사이트는 브라우저에서 Supabase에 직접 접속합니다(anon key 사용).
이 anon key는 **누구나 브라우저 개발자도구로 볼 수 있습니다(원래 그런 키라 정상).**
따라서 **DB를 지키는 진짜 방어선은 "RLS 정책"** 입니다.
RLS가 꺼져 있으면, 악의적 사용자가 anon key로 **전 회원 정보·결제내역을 통째로 긁어갈 수 있습니다.**

### ✅ 확인 방법
1. https://supabase.com 로그인 → 우리 프로젝트 선택
2. 왼쪽 메뉴 **Table Editor** 또는 **Authentication → Policies** 이동
3. 아래 **4개 테이블 각각** RLS가 **Enabled(켜짐)** 인지 확인:

| 테이블 | 용도 | RLS 켜짐? | 권장 정책 |
|--------|------|:--------:|-----------|
| `diagnoses` | 진단 결과(개인정보 포함) | ☐ | 본인 것만 읽기/쓰기 (`auth.uid() = user_id`) |
| `payments` | 결제 내역(민감!) | ☐ | 본인 것만 읽기. 쓰기는 서버(service_role)만 |
| `reviews` | 후기 | ☐ | 읽기는 전체 공개 OK, 쓰기는 로그인 사용자 본인만 |
| `crawled_announcements` | 정부공고(공개 데이터) | ☐ | 읽기 전체 공개, 쓰기는 서버(service_role)만 |

> **각 테이블 이름 옆에 자물쇠(🔒) 아이콘 + "RLS enabled"** 라고 떠 있으면 정상입니다.
> **"RLS disabled" / "Unrestricted"** 라고 떠 있으면 🚨 **즉시 켜야 합니다.**

### ✅ RLS 켜는 법 (disabled인 경우)
- Table Editor에서 해당 테이블 → 우측 상단 **"..." → Enable RLS**
- 그다음 **정책(Policy) 추가**가 필요합니다. 정책이 하나도 없으면 RLS 켜는 순간
  **아무도 접근 못 하게 되어 사이트가 멈출 수 있으니**, 켜기 전에 아래 정책부터 준비하세요.

#### 예시 정책 (SQL — Supabase SQL Editor에서 실행)
```sql
-- payments: 본인 결제내역만 조회 가능 (쓰기는 서버 전용이라 정책 안 만듦 = 차단)
alter table payments enable row level security;
create policy "본인 결제만 조회"
  on payments for select
  using ( auth.uid() = user_id );

-- diagnoses: 본인 진단만 조회/저장
alter table diagnoses enable row level security;
create policy "본인 진단 조회" on diagnoses for select using ( auth.uid() = user_id );
create policy "본인 진단 저장" on diagnoses for insert with check ( auth.uid() = user_id );

-- reviews: 후기는 누구나 읽기 OK, 작성은 로그인 사용자 본인만
alter table reviews enable row level security;
create policy "후기 전체 공개" on reviews for select using ( true );
create policy "후기 본인 작성" on reviews for insert with check ( auth.uid() = user_id );

-- crawled_announcements: 공고는 누구나 읽기 OK (쓰기는 서버 크롤러=service_role 전용)
alter table crawled_announcements enable row level security;
create policy "공고 전체 공개" on crawled_announcements for select using ( true );
```
> ⚠️ 위 SQL은 **컬럼명(user_id 등)이 실제 테이블과 같은지** 먼저 확인 후 실행하세요.
> 컬럼명이 다르면 그 부분만 맞춰 바꾸면 됩니다.
> **service_role 키로 도는 서버 API(크롤러·결제확정)는 RLS를 우회**하므로 정상 동작합니다.

---

## 2. Supabase API 키 점검

- ☐ **service_role 키가 프론트엔드(브라우저) 코드에 절대 없는지** 확인
  - 우리 코드는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`(공개용)만 브라우저에서 씁니다 ✅
  - `SUPABASE_SERVICE_ROLE_KEY`는 서버 API에서만 사용 → 노출 안 됨 ✅
  - (혹시 대표님이 어딘가 service_role 키를 프론트에 넣으셨다면 **즉시 제거 + 재발급**)
- ☐ Supabase → Settings → API → **anon key가 유출되어도 RLS로 막히는 구조**인지 재확인
  (= 위 1번이 되어 있으면 anon key 노출은 문제 없음)

---

## 3. Vercel 환경변수 점검

- ☐ 아래 민감 키들이 **모두 Vercel 환경변수에만** 있고, 코드/깃허브에 하드코딩 안 됨:
  - `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TOSS_SECRET_KEY`,
    `NTS_BUSINESS_API_KEY`, `SMES_API_TOKEN`, `DATA_GO_KR_API_KEY`, `CRAWL_SECRET`
- ☐ **`.env.local` 파일이 깃허브에 커밋되지 않았는지** (`.gitignore`에 포함되어야 함)

---

## 4. 계정/접근 보안

- ☐ **Supabase 대시보드 로그인에 2단계 인증(2FA)** 켜기
- ☐ **Vercel 계정 2FA** 켜기
- ☐ **GitHub 계정 2FA** 켜기
- ☐ 관리자 대시보드 접근이 `is_admin()` 로 보호되는지 (코드상 적용됨 ✅ — 로그인+관리자만)

---

## 5. 이미 코드로 적용 완료된 것 (참고, 확인 불필요)

- ✅ **API 남용 방지(레이트리밋)**: AI/국세청/결제/매칭 API에 IP당 호출 제한
  - AI 상담 1분 8회 · SNS 생성 1분 6회 · 국세청 조회 1분 15회 · 결제 1분 20회 · 공고매칭 1분 30회
  - 초과 시 429 응답. 정상 사용자는 영향 없음(사람 손 속도보다 훨씬 큰 한도)
- ✅ **보안 헤더**: HSTS, CSP(frame-ancestors), X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy, Cross-Origin-Resource-Policy
- ✅ **도용/복제 방어(CopyGuard)**: 도메인 잠금(복제본은 원본으로 튕김), 우클릭/F12/소스보기
  단축키 차단, 드래그 억제, 대량복사 시 출처 자동삽입, 콘솔 저작권 경고
  - ※ 입력창(진단답변·검색·결제)에서는 붙여넣기·선택이 정상 동작하도록 예외 처리됨
- ✅ **소스 노출 최소화**: 프로덕션 소스맵 비활성화, X-Powered-By 헤더 제거
- ✅ **API 키 서버 전용**: 모든 외부 API 키는 서버 환경변수에서만 사용(프론트 노출 0)

---

### 📌 우선순위 요약
1. **🔴 1번(RLS)** — 이것만은 꼭 오늘/내일 안에 확인해 주세요. DB 통째 유출을 막는 핵심입니다.
2. 🟡 2·3번 — 키 노출 여부 점검 (대부분 이미 안전할 것)
3. 🟢 4번 — 계정 2FA (해두면 좋음)

궁금한 점은 언제든 물어봐 주세요. RLS 정책 SQL도 실제 컬럼명 맞춰서 다시 짜드릴 수 있습니다.
