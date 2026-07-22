# 🧠 모두의사업친구 — 프로젝트 브레인 (절대 지우지 말 것)

> 이 문서는 신주엽 대표님과의 작업에서 **반복적으로 지켜야 할 규칙 · 자주 하는 작업 · 절대 지우면 안 되는 정보**를 정리한 마스터 문서입니다.
> 새 작업을 시작하기 전에 항상 이 문서를 먼저 읽습니다.
> 최종 업데이트: 2026-07-22

---

## 1. 회사 / 서비스 기본 정보 (NAP — 절대 변경 금지, 모든 채널 동일하게)

| 항목 | 값 |
|------|-----|
| 상호 | 모두의사업친구 |
| 포지셔닝 | **정부지원사업 AI 통합 매칭 플랫폼** (※ "경영컨설팅"으로 소개하지 말 것) |
| 대표 | 신주엽 |
| 사업자등록번호 | 597-12-02897 |
| 통신판매업신고 | 제2026-인천서해-0109호 |
| 주소 | 인천광역시 서구 청라커낼로288번길 26, 285호 |
| 대표번호 | 1551-7886 (※ 홍보글에는 넣지 말 것 — 아래 규칙 참고) |
| 문의 이메일 | biospartners@naver.com |
| 도메인 | 모두의사업친구.kr |
| 카카오채널 채팅 | http://pf.kakao.com/_VxfWxan/chat |
| 당근 평점 | ★4.3 / 5 (75 참여) |

---

## 2. 기술 스택 / 배포 (건드리기 전에 필독)

- **프레임워크**: Next.js 14 App Router (`src/app/`), TypeScript, TailwindCSS
- **DB**: Supabase — `https://akjlulfbhoukbhuyaybo.supabase.co`
  - 주요 테이블: `crawled_announcements`(약 300건), `diagnoses`, auth(user_metadata.utm_source)
- **배포**: **git push → GitHub(ppfa26/PPFA26) → Vercel 자동 빌드**. ❌ 수동 배포(manual deploy) 절대 안 함.
- **브랜치**: 항상 `main`
- **BETA_FREE 모드**: 진단 무료, 결과 전체 잠금 해제 상태

### 🔑 git push 인증 방법 (중요 — 이 방법만 됨)
`git push origin main`은 "Invalid username or token"으로 실패함. 아래 방법 사용:
```bash
GHTOK=$(gh auth token) && git -c credential.helper= push "https://x-access-token:${GHTOK}@github.com/ppfa26/PPFA26.git" HEAD:main
```
(gh CLI는 `genspark-ai-developer[bot]`으로 인증됨)

---

## 3. 절대 규칙 (STANDING RULES — 매번 지킬 것)

1. **용어**: 항상 "정부지원사업" 사용. ❌ "정부지원금" 금지.
2. **포지셔닝**: "정부지원사업 AI 통합 매칭 플랫폼". 기존 경영컨설팅 경력은 홍보에서 언급 안 함.
3. **API 키**: 서버사이드 전용. 프론트엔드 노출 금지.
4. **DB 변경**: 수동으로 Supabase SQL Editor에서. (자동 마이그레이션 안 함)
5. **배포**: git push만. 수동 배포 없음. 브랜치는 항상 main.
6. **작업 반복 질문 금지**: 이미 정한 규칙(썸네일 템플릿, 홍보 포맷 등)은 매번 다시 묻지 말 것.

---

## 4. 홍보글 작성 폼 (SNS — 이 규칙대로 작성)

### 공통 규칙
- **`**` 마크다운 강조 표시 절대 사용 금지** (AI 티 남 → 대표님이 싫어함)
- **홍보글에 대표번호(1551-7886) 넣지 말 것** (링크·채팅 유도만)
- 핵심 메시지: "정부지원사업을 한 곳에서, AI가 내 사업장에 맞춰 자동 매칭"
- 심리 훅 3가지: ① 손실회피("몰라서 못 받는 돈") ② 구체성("수백 개 중 내 것만", "3분") ③ 무위험("무료")
- BETA 무료 훅 강조
- 링크는 항상 `모두의사업친구.kr`

### 플랫폼별 톤/길이
| 플랫폼 | 톤 | 길이 | 승부처 |
|--------|-----|------|--------|
| 네이버 블로그 | SEO·정보형 | 길게 | 제목에 검색어, 첫 3줄 결론 |
| 인스타 | 임팩트·해시태그 | 짧게 | 첫 줄 훅 + 저장 유도 |
| 스레드 | 대화체·공감 | 짧게 | 광고티 제거, 리플 유도 |
| 카카오채널 | 친근·CTA 1개 | 짧게 | 즉시 채팅 유도 |
| 당근 | 동네·겸손 | 중간 | 사람 냄새, ★4.3 언급 |

---

## 5. 썸네일 / 홍보 이미지 고정 템플릿 (PERMANENT — 매번 묻지 말 것)

**기준 이미지 톤 (Ogjee1KE 스타일):**
- 다크 네이비/차콜 그라데이션 배경
- 흰색 얇은 라운드 사각 프레임 테두리 (안쪽 여백)
- 하단에 어두운 도시 야경 실루엣
- 상단 중앙: 흰색 알약(pill) 배지
- 중앙: 골드 그라데이션 볼드 메인 타이틀 (중앙 정렬)
- 타이틀 아래: 골드 빛줄기(light-beam) divider
- 그 아래: 흰색 서브 텍스트
- 하단 중앙: 로고 (빨간 원형 m + "모두의사업친구") + "모두의사업친구.kr"
- 1:1 정사각

**생성 방법:**
- 모델: `nano-banana-pro`, aspect_ratio: `1:1`
- 참조 이미지 URL: `https://www.genspark.ai/api/files/s/Ogjee1KE` (고정 템플릿 기준)
- 프롬프트: "ONLY change main title" 패턴으로 메인 타이틀만 교체
- **한글 깨짐 방지**: 잔글씨(본문 설명) 최소화. 짧고 굵은 텍스트만. "All Korean text spelled EXACTLY as given, no broken Hangul" 명시.

---

## 6. 주요 코드 위치 (자주 건드리는 파일)

| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | 홈페이지 (히어로·진단결과예시·FAQ·CTA) |
| `src/app/admin/page.tsx` | 관리자 (회원목록·고객진단서·유입경로 배지) |
| `src/app/community/page.tsx` | 커뮤니티/후기 페이지 |
| `src/components/UtmCapture.tsx` | 유입경로 추적 (2단계 strength: hard/soft) |
| `src/lib/advancedScreening.ts` | 기관 매칭 엔진 (isTechCompany, matchInstitutions) |
| `src/lib/supportPrograms.ts` | 지원사업 매칭 (isInnovationArea 등) |
| `src/lib/diagnosisConfig.ts` | 진단 문항 설정 |
| `src/components/Footer.tsx` | 푸터 (회사정보 NAP) |

### 핵심 로직 메모
- **UTM 추적**: STORAGE_KEY="mpp_utm_source", STRENGTH_KEY="mpp_utm_strength". "hard"=광고링크(utm 파라미터, 잠금), "soft"=referrer 추측(덮어쓰기 가능).
- **기관 매칭**: 음식점/서비스→재단+소진공 / 제조→중진공·소진공·기보·신보 / 기술력·경력→기보+중진공+소진공. 신보/기보/재단 상호배타, 소진공/중진공 병행.
- **isInnovationArea**: "해당 없음"/"해당없음"/"없음"은 제외하고 실제 혁신테마만 카운트 (기보 오노출 방지).

---

## 7. SEO 현황 & 할 일 (2026-07 기준)

- 네이버 서치어드바이저 + 구글 서치콘솔 등록 완료
- 검색 시 노출: 1위 당근, 2위 인포크링크(ppfa25) ⚠️, 3위 자사 도메인
- **정착 예상**: 구글 1~2주 / 네이버 3~6주
- **할 일**: ① 인포크링크(ppfa25) 정리(2위 지저분함 원인) ② sitemap.xml 제출 확인 ③ JSON-LD 구조화 데이터(회사명·주소·전화·평점) ④ NAP 일관성 ⑤ 블로그/카페 콘텐츠 신호 쌓기

---

## 8. 진행 이력 요약 (최근 세션)

- [완료] 고객진단서 답변 흰색 가독성 개선
- [완료] 유입경로 UTM 버그 수정 (크롬 검색인데 스레드 표시)
- [완료] 커뮤니티 페이지 세로 공백 축소
- [완료] 홈페이지 결과예시 페이드/공백 축소
- [완료] 기보 매칭 정밀화 ("해당 없음" 필터 + 수출업 추가), node 6/6 통과
- [완료] SNS 홍보글 5종 + 홍보 이미지 3종 (고정 템플릿)
- [완료] 코드 최적화 1차: 미사용 컴포넌트 4개 제거(ComingSoon/EditToolbar/MobilePcNotice/ViewCreditGate, 총 612줄) + 빈 thumbnails 폴더 정리. 빌드 정상.
- [보류] 네이버 블로그 썸네일 7~16 (중단됨, 대표님이 그만하기로 함)
- [대기] 사업계획서 총자산 수치 (대표님 회신 대기)

## 9. 코드 최적화 규칙 (주기적 정리)

- 미사용 컴포넌트/파일 제거 전 반드시 `grep`으로 전체 참조 확인 → 완전 미사용만 삭제 → `npm run build`로 검증
- console.log는 CopyGuard.tsx의 저작권 경고문만 의도적 유지 (나머지는 제거)
- lib 파일은 모두 사용 중 (crawlSites·diagnosisExport·innovationAreas·knowledge·usefulSites 포함) — 함부로 지우지 말 것
- 정리 후 항상 3곳 저장: 로컬 → GitHub(ppfa26/PPFA26) → Genspark 브레인(SB-Git)
- **브레인/허브 저장은 주기적으로 업데이트** (대표님 요청 2026-07-22)
