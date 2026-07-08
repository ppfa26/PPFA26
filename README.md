# 모두의공공조달 (Public Procurement For All · PPFA)

## 프로젝트 개요
- **정체성**: 정책자금 대행이 아닌 "방법을 알려주는 경영 자문 컨설팅"
- **핵심**: 브로커 승인 수수료 5% 대신, 99,000원으로 직접 신청 방법을 배우는 SaaS
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
| `/signup` 회원가입/로그인(Supabase Auth) | ✅ 완성 |
| `/payment` `/payment/success` 토스 결제 | ✅ 완성 |
| `/dashboard` 6카테고리 통합 매칭 + 상담채널 | ✅ 완성 |
| `/fund/[id]` 지원사업 상세(서류·전략·공식공문PDF) | ✅ 완성 |
| `/mypage` 계정·결제내역·진단결과 | ✅ 완성 |
| `/terms` `/privacy` `/refund` `/business-info` 법적 페이지 | ✅ 완성 |
| `POST /api/advisor` 자문 | ✅ 동작(규칙기반, LLM키 넣으면 AI전환) |
| `GET /api/crawl` 크롤링 공고 | ✅ 동작 |
| `POST /api/payment/confirm` 토스 결제 승인 | ✅ 동작 |

## 완료된 기능 (Phase 6~8)
- ✅ **Phase 6** 회원가입(Supabase Auth) + Toss 결제 위젯 연동
- ✅ **Phase 7** 대시보드(6카테고리 매칭+상담채널+단톡방) / fund 상세 / 마이페이지
- ✅ **Phase 8** 법적 페이지 4종 본문(약관/개인정보/환불/사업자정보) + OG/파비콘 SEO

## 🚀 Vercel 배포 가이드 (권장)
Next.js는 제작사 Vercel에서 코드 수정 없이 그대로 배포됩니다.

1. **GitHub에 코드 푸시** (완료 후)
2. **vercel.com** 접속 → GitHub 계정으로 로그인
3. **Add New → Project** → 이 저장소(webapp) 선택 → Import
4. **Environment Variables**에 아래 값 입력 (`.env.local` 내용 그대로):
   | 변수명 | 설명 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
   | `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스 클라이언트 키 |
   | `TOSS_SECRET_KEY` | 토스 시크릿 키 (서버 전용) |
   | `OPENAI_API_KEY` | (선택) AI 자문용 |
   | `OPENAI_BASE_URL` | (선택) OpenAI 호환 엔드포인트 |
5. **Deploy** 클릭 → 몇 분 후 `xxx.vercel.app` 주소 생성
6. (선택) **Settings → Domains**에서 대표님 도메인 연결

## 대표님이 직접 하셔야 할 설정
1. **Supabase**: 대시보드 SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (테이블 생성)
2. **토스 실결제 전환**: 현재 `test_` 테스트 키 → 실서비스 시 라이브 키로 교체
3. **통신판매업 신고번호**: 인천 서구청 신고 후 사업자정보 페이지에 입력 (결제 오픈 전 필수)
4. **오픈 단톡방 URL**: 대시보드/상세의 임시 카톡 링크 교체
5. **OpenAI 키**(선택): AI 자문을 쓰려면 `OPENAI_API_KEY` 설정 (없으면 규칙기반 동작)

## 인라인 편집 사용법
우측 하단 [✏️ 글자 수정하기] 클릭 → 텍스트 클릭해서 수정 → [💾 저장하고 끝내기] → 자동 저장(새로고침 후에도 유지)

## 배포
- **플랫폼**: Vercel 권장 (Next.js 네이티브). 현재 개발은 샌드박스(PM2 · 포트 3000)
- **최종 업데이트**: 2026-07-08
