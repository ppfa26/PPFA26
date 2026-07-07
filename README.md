# 모두의공공조달 (Public Procurement For All · PPFA)

## 프로젝트 개요
- **정체성**: 정책자금 대행이 아닌 "방법을 알려주는 경영 자문 컨설팅"
- **핵심**: 브로커 승인 수수료 5% 대신, 39,000원으로 직접 신청 방법을 배우는 SaaS
- **원칙**: 대행 없음 · 승인 보장 없음 · 자동결제 없음

## 기술 스택
Next.js 14 (App Router) · TailwindCSS v3 · Supabase · Toss Payments · Pretendard · PM2(포트 3000)

## 미리보기 URL
https://3000-iogiifki8yhf89r1f87ly-2e1b9533.sandbox.novita.ai

## 완료된 기능 (Phase 1~5)
- ✅ **Phase 1** 기초 셋업: Next.js14/Tailwind/Supabase/Toss, 로고·파비콘
- ✅ **Phase 2** 홈페이지: 헤더(1줄유지·360px)/히어로/신뢰배지4/가치제안4/비교/가격표3카드/FAQ6/푸터
- ✅ **Phase 3** 인라인 편집: 전 페이지 텍스트 클릭편집 + 폰트/색상/크기 툴바 + LocalStorage 저장(자가검증 ALL-PASS)
- ✅ **Phase 4** 지식베이스: 공문38개·89사이트·프로그램14개 데이터화 + 매칭엔진 + 크롤러/cron + RAG 자문 API + Supabase 스키마(SQL)
- ✅ **Phase 5** 무료 진단: 3단계 폼(진행률바) + 매칭 미리보기(6카테고리 통합·블러)

## 주요 URL(경로)
| 경로 | 상태 |
|---|---|
| `/` 홈 | ✅ 완성 |
| `/pricing` 가격표 | ✅ 완성 |
| `/diagnosis` 3단계 진단 | ✅ 완성 |
| `/matching-preview` 매칭 결과 | ✅ 완성 |
| `/signup` `/payment` `/dashboard` `/mypage` `/community` `/fund/[id]` | 🛠️ 플레이스홀더(디자인·편집 적용됨) |
| `/terms` `/privacy` `/refund` `/business-info` | 🛠️ 플레이스홀더 |
| `POST /api/advisor` 자문 | ✅ 동작(규칙기반, LLM키 넣으면 AI전환) |
| `GET /api/crawl` 크롤링 공고 | ✅ 동작 |

## 남은 작업 (Phase 6~8) — 내일 이어서
- **Phase 6** 회원가입(Supabase Auth) + Toss 결제 위젯 연동
- **Phase 7** 대시보드(6카테고리 매칭+채널톡+단톡방) / fund 상세 / 마이페이지
- **Phase 8** 법적 페이지 4종 본문 + OG/SEO 마무리

## 대표님이 직접 하셔야 할 설정
1. **Supabase**: 대시보드 SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (테이블 생성)
2. **OpenAI 키**(선택): AI 자문을 쓰려면 실제 OpenAI API 키를 `OPENAI_API_KEY`로 설정 (없으면 규칙기반으로 자동 동작)
3. **사업자 정보**: 푸터/사업자정보 페이지의 `[대표자명]`, `[사업자등록번호]` 등을 인라인 편집(✏️ 버튼)으로 채우기

## 인라인 편집 사용법
우측 하단 🔒 버튼 클릭 → ✏️(편집모드) → 텍스트 클릭해서 수정 → 상단 툴바로 색상/크기/폰트 변경 → 자동 저장

## 배포
- **플랫폼**: 현재 샌드박스(PM2). Cloudflare/Vercel 배포는 Phase 8 이후 권장
- **최종 업데이트**: 2026-07-07
