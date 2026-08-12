# 🔁 재활용 가이드 (REUSE GUIDE)

> **이 문서의 목적**: 지금의 "모두의사업친구" 사이트를 뼈대(디자인·레이아웃·fit-to-width·결과 리포트 로직)는 그대로 두고,
> **새로운 아이템/사업**으로 내용만 바꿔 다시 만들 때 **"어디를 고치면 되는지"** 한눈에 보는 지도입니다.
>
> 작성 기준 커밋: `a0a046a` (2026-08) / 브랜치 `main`

---

## 0. 시작 전 3분 체크 (재활용 표준 순서)

1. 이 프로젝트 폴더를 **통째로 복사**하거나, tar.gz 백업을 새 폴더에 풀어서 시작합니다.
2. 새 GitHub 저장소 / 새 Vercel 프로젝트 / 새 도메인을 준비합니다.
3. 아래 **1~7단계** 순서대로 내용만 교체합니다.
4. `rm -rf .next && npm run build` 로 빌드 통과 확인 → 배포.
5. **실제 휴대폰**에서 첫 화면·마이페이지·결과 리포트 확인 (curl 은 렌더링을 못 봅니다).

> 💡 디자인/화면 폭 맞춤(fit-to-width)·결과 리포트 방어코드 등 **구조는 절대 건드릴 필요 없음**. "글자·문구·항목·브랜드"만 바꾸는 게 재활용의 핵심입니다.

---

## 1. 브랜드 / 이름 / 로고

| 무엇을 | 어디서 (파일) | 비고 |
|---|---|---|
| 서비스명·상단 로고·슬로건 | `src/components/Header.tsx` | 예: 69행 "정부지원사업 통합 매칭 플랫폼" 문구 |
| 하단 회사정보·저작권 | `src/components/Footer.tsx` | 상호/사업자번호/연락처 |
| 파비콘·앱 아이콘 | `public/favicon.ico`, `public/apple-touch-icon.png`, `public/manifest.ts`(→ `src/app/manifest.ts`) | PWA 설치 이름도 여기 |
| 테마 색상 | 각 `layout.tsx` 의 `themeColor: "#0b0b0f"` | 브랜드 컬러로 교체 |
| 전역 색/폰트 | `src/app/globals.css`, `tailwind.config.*` | Tailwind 커스텀 색 |

---

## 2. 첫 화면(홈) 콘텐츠 — 가장 자주 바꾸는 곳

**파일: `src/app/(home)/page.tsx`**  (⚠️ `(home)` 은 route group. URL 은 그대로 `/`)

교체 대상 상수/섹션:

- **`TRUST_BADGES`** — 상단 신뢰 배지(예: "1만명 이용" 등) 문구
- **`VALUES`** — 핵심 가치/특징 카드 3~4개
- **`FAQS`** — 자주 묻는 질문 목록
- **히어로 섹션** (`id="hero-section"`) — 메인 카피/부제/CTA 버튼 문구
- 그 밖의 소개 문구는 대부분 이 파일 안 JSX 텍스트

> ⛔ 이 파일의 `useEffect` viewport 코드(“width=820 …”)와 `src/app/(home)/layout.tsx`(device-width) 는 **화면 폭 맞춤 핵심 장치**라 손대지 마세요.

---

## 3. 진단 질문(설문) 항목 — 사업 성격에 맞게 교체

**파일: `src/lib/diagnosisConfig.ts`**

- `STEP1_FIELDS` / `STEP2_FIELDS` / `STEP3_FIELDS` — 진단 챗봇이 물어보는 **질문·선택지(opts)** 정의
- 질문 라벨/말풍선 문구는 `src/app/diagnosis-chat/page.tsx` 에서 조정
  - (참고) 129행 질문 제목, 145행 "대표자 연령대", 167행 "사업장 소재 지역" 등

### ⚠️⚠️ 절대 주의: 선택지 문구가 "판정 키" 로도 쓰인다
예) `파산/회생 중` 이라는 옵션 문구는 **화면 표시 + "신청 불가" 판정 로직의 매칭 키**를 겸합니다.
- 옵션 문구만 바꾸면 → 판정 로직(`getPaymentBlockReasons` in `diagnosisConfig.ts`, `supportPrograms.ts`)이 못 알아들어 필터링이 깨집니다.
- **문구를 바꿀 땐 반드시 판정 로직의 매칭 문자열도 함께 수정**하거나, 지금처럼 `startsWith(신문구) || startsWith(구문구)` 로 둘 다 인식하게 하세요.

---

## 4. 매칭/심사 로직 & 지원사업 데이터 — 새 아이템의 "두뇌"

| 무엇을 | 파일 |
|---|---|
| 지원사업 목록/조건/매칭 규칙 | `src/lib/supportPrograms.ts` (`profileToCompany`, `computeSupportStatus`, `countMatchedItems`, `getMatchedTitles`) |
| 고급 심사 엔진(스텝별 질문·점수) | `src/lib/advancedScreening.ts` + UI `src/components/AdvancedScreeningPanel.tsx` |
| 제외 업종 | `src/lib/excludedIndustries.ts` |
| 졸업/자격 기준 | `src/lib/graduationCriteria.ts` |
| 프로그램/상품 데이터 | `src/lib/programs.ts`, `src/lib/products.ts` |
| 유용한 사이트 링크 | `src/lib/usefulSites.ts` |
| 공식 문서/안내 | `src/lib/officialDocs.ts`, `src/lib/knowledge.ts` |

> 새 사업이 "정부지원 매칭"이 아니라면(예: 컨설팅 추천, 상품 추천 등) → 위 데이터/규칙을 통째로 새 도메인 데이터로 교체하면 됩니다. 결과 리포트 화면 구조는 재사용 가능.

---

## 5. 결과 리포트 화면 (거의 손댈 필요 없음)

**파일: `src/app/matching-preview/page.tsx`** + `src/components/report/*`
- gate 상태(checking/analyzing/ready/guest/limited), 방어코드(try/catch, `|| []`, 0-나눗셈 가드) 이미 견고 → **구조 유지**.
- 바꿀 것: 리포트에 뿌리는 **텍스트/항목 라벨** 정도.

---

## 6. 가격 / 결제 / 법적 페이지

| 페이지 | 파일 |
|---|---|
| 요금제 | `src/app/pricing/`, `src/components/PricingCards.tsx` |
| 결제 | `src/app/payment/` (PG/결제 연동 키 확인) |
| 약관/개인정보/환불 | `src/app/terms/`, `src/app/privacy/`, `src/app/refund/` (상호·연락처·환불정책 문구) |
| 고객지원 | `src/app/support/` |

---

## 7. 도메인 / 메타 / 배포 설정

| 무엇을 | 어디서 |
|---|---|
| 도메인 | 새 도메인으로 교체. 한글 도메인은 punycode 변환값으로 검증 |
| SEO 메타(title/description/OG) | 각 `layout.tsx` 의 `metadata`, 루트 `src/app/layout.tsx` |
| sitemap / robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| OG/공유 이미지 | `public/og-image-v2.jpg`, `public/naver-cover-*.jpg` (⚠️ 메타 미리보기에 쓰이는지 확인 후 교체) |
| 환경변수(Supabase/OpenAI/PG 키 등) | `.env.local` (커밋 금지) + Vercel 대시보드 환경변수 |
| Supabase 프로젝트 | `src/lib/supabaseClient.ts` — 새 프로젝트 URL/anon key |
| 서버 API(AI 상담/SNS 생성) | `src/app/api/advisor/route.ts`, `src/app/api/sns/generate/route.ts` (OpenAI 키는 **서버에서만**) |

---

## 8. 절대 건드리지 말 것 (구조·안정성 핵심)

- **fit-to-width 3종 세트**: 각 페이지 `layout.tsx` 의 `viewport = { width: "device-width" }` + `page.tsx` 의 `useEffect` "width=820" 전환. (홈은 `(home)` route group 방식)
- **루트 `src/app/layout.tsx`** 의 `viewport width: 820` (initialScale 없음) — 전역이므로 개별 페이지 목적 없이 바꾸지 말 것.
- 결과 리포트/심사 엔진의 방어코드(try/catch·`|| []`·0-나눗셈 가드).
- `src/components/CopyGuard.tsx` 74행 저작권 경고 `console.log` (의도된 것).

---

## 9. 재활용 체크리스트 (복붙용)

```
[ ] 1. 브랜드명/로고/푸터/파비콘/테마색 교체 (Header/Footer/manifest/globals.css)
[ ] 2. 홈 콘텐츠 교체 (TRUST_BADGES / VALUES / FAQS / 히어로)  ← (home)/page.tsx
[ ] 3. 진단 질문·선택지 교체 (diagnosisConfig STEP*_FIELDS + diagnosis-chat 문구)
        ↳ 선택지 문구가 판정 키인지 확인! 로직도 같이 수정
[ ] 4. 매칭/심사 데이터·규칙 교체 (supportPrograms/advancedScreening/programs...)
[ ] 5. 결과 리포트 라벨 텍스트만 손봄 (구조 유지)
[ ] 6. 요금제/결제/약관/환불/지원 문구·상호 교체
[ ] 7. 도메인/메타/OG이미지/sitemap/robots/환경변수/Supabase/PG 키 교체
[ ] 8. rm -rf .next && npm run build 통과 확인
[ ] 9. 실제 휴대폰에서 홈·마이페이지·결과 리포트 렌더링 확인
[ ] 10. 배포 후 punycode/HTTPS 로 최종 확인
```

---

## 10. 배포 요약 (참고)

- **스택**: Next.js 14.2.35 App Router + Vercel + Supabase + Tailwind
- **자동배포**: `main` push → Vercel 자동배포(~90초)
- **GitHub push(토큰 주입)**:
  ```bash
  TOKEN=$(gh auth token) && git push "https://x-access-token:${TOKEN}@github.com/<계정>/<저장소>.git" main
  ```
- **한글 도메인 검증**: punycode 변환값으로 `curl -s "https://xn--...kr/<path>"`
- **배포 검증**: `sleep 90` 후 curl → viewport meta / 번들 chunk 문자열 grep

---

_이 가이드는 커밋 `a0a046a` 시점 기준입니다. 구조를 바꾸면 이 문서도 함께 업데이트하세요._
