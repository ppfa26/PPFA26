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
- **할 일**: ① 인포크링크(ppfa25) 정리(2위 지저분함 원인) ② sitemap.xml 제출 확인 ③ ~~JSON-LD 구조화 데이터~~ ✅완료 ④ NAP 일관성 ⑤ 블로그/카페 콘텐츠 신호 쌓기

### SEO 코드 작업 완료 내역 (2026-07-22)
- **JSON-LD 보강** (`src/app/layout.tsx`): Organization에 email·telephone·sameAs(당근·카카오) 추가 / **LocalBusiness 신규 추가**(주소·전화·평점 4.3/75 AggregateRating) → 네이버 지역검색·지식카드 대응. 실렌더 검증 통과.
- **"정부지원금"·"경영컨설팅" 제거**: layout keywords에서 규칙 위반 단어 제거("정부지원금"→"정부지원사업 조회"). 이제 layout 전체에 "정부지원금" 0건.
- **sitemap.ts**: 지원제도 상세 6개(`/support/{employment,duru,export-voucher,innovation-voucher,sbiz-voucher,youth-leap}`) 자동 추가 — SUPPORT_PROGRAMS에서 동적 생성.
- ⚠️ 검증 팁: `npm start` 후 curl 검증 시 이전 서버 프로세스가 살아있으면 stale 응답을 줌. 반드시 `fuser -k 3000/tcp`로 완전 종료 후 새로 띄워서 검증할 것.

---

## 8. 진행 이력 요약 (최근 세션)

- [완료] 고객진단서 답변 흰색 가독성 개선
- [완료] 유입경로 UTM 버그 수정 (크롬 검색인데 스레드 표시)
- [완료] 커뮤니티 페이지 세로 공백 축소
- [완료] 홈페이지 결과예시 페이드/공백 축소
- [완료] 기보 매칭 정밀화 ("해당 없음" 필터 + 수출업 추가), node 6/6 통과
- [완료] SNS 홍보글 5종 + 홍보 이미지 3종 (고정 템플릿)
- [완료] 코드 최적화 1차: 미사용 컴포넌트 4개 제거(ComingSoon/EditToolbar/MobilePcNotice/ViewCreditGate, 총 612줄) + 빈 thumbnails 폴더 정리. 빌드 정상.

## 9. 코드 최적화 규칙 (주기적 정리)

- 미사용 컴포넌트/파일 제거 전 반드시 `grep`으로 전체 참조 확인 → 완전 미사용만 삭제 → `npm run build`로 검증
- console.log는 CopyGuard.tsx의 저작권 경고문만 의도적 유지 (나머지는 제거)
- lib 파일은 모두 사용 중 (crawlSites·diagnosisExport·innovationAreas·knowledge·usefulSites 포함) — 함부로 지우지 말 것
- 정리 후 항상 3곳 저장: 로컬 → GitHub(ppfa26/PPFA26) → Genspark 브레인(SB-Git)
- **브레인/허브 저장은 주기적으로 업데이트** (대표님 요청 2026-07-22)

## 10. 성능 최적화 진단 결과 (2026-07-22, 2차)

이미 잘 되어 있는 부분 (손대지 말 것 — 건드리면 오히려 느려짐):
- **의존성**: cheerio→scripts/crawler.mjs, node-cron→scripts/scheduler.mjs, openai→API 라우트(서버). 프론트 번들에 무거운 서버 라이브러리 안 섞임 ✅
- **이미지**: `<img>` 태그 0개, 전부 next/image 또는 CSS 배경 ✅. sitemap.xml·robots.txt 존재 ✅
- **폰트**: Pretendard 1종만 media="print" 비동기 로딩 + preconnect + noscript 폴백. 구글 권장 패턴 ✅ (예전엔 Noto·나눔까지 받던 것 이미 정리됨)
- **공유 번들**: 87.3 kB (경량)

미사용 이미지 (재사용 위해 보존, 필요시 삭제 가능 — logo/ 폴더):
- app-icon-black/white/white-alt/white-new.png, header-black/white.png, instagram-white.png, favicon-src.png, og-image.png (구버전)
- 실사용: brand-header.png, brand-footer-dark.png, favicon.png, apple-icon-180.png, og-image-v2.png

매칭 로직 정확도: 12/12 테스트 통과 (`/tmp/test_matching.mjs`). 서비스/음식/도소매/건설+해당없음→기보 미노출, 실제혁신·특허·경력·이노비즈·제조·수출·IT→기보 노출. 정확함 ✅

결론: 사이트는 이미 성능 최적화가 상당히 잘 되어 있음. 무리한 리팩터링보다 정확도 유지가 우선.

---

## 11. 정부지원사업 / 정책자금 매칭 로직 최신 코드 (2026-07-22 기준 · 핵심 자산)

> 파일: `src/lib/advancedScreening.ts` (1617줄) · `src/lib/supportPrograms.ts`
> 이 로직이 사이트의 심장. 수정 시 반드시 `node /tmp/test_matching.mjs`로 12/12 재검증.

### 11-1. 업종 분류 `normalizeIndustry(industry)` — 5분류
반환값: `manufacturing | tech_innov | retail_food | service | etc`
- 제조 → **manufacturing**
- 로봇·AI·인공지능·바이오·혁신·소프트·IT·기술·딥테크·반도체·이차전지 → **tech_innov**
- 도소매·도매·소매·음식·외식·유통 → **retail_food**
- 서비스·운수·물류·건설·농림·어업 → **service**
- 그 외 → **etc**

### 11-2. 기술기업(기보 트랙) 판정 `isTechCompany(company)` → boolean
기보(기술보증기금)를 여는 게이트. 아래 중 하나라도 true면 true:
1. 업종이 manufacturing 또는 tech_innov
2. 수출업(업종에 "수출" 포함) 또는 `is_exporter === true`
3. 실증 인증/신호 보유: `has_patent | has_rnd_center | has_venture_cert | has_innobiz | is_innovation_area | has_tech_career`

★ 핵심: `is_innovation_area`는 진단에서 '해당 없음/없음'을 고르면 **false**로 계산됨(아래 11-4). 그래서 음식·서비스·도소매인데 혁신분야도 '해당 없음'이면 기보 대상 아님 → 재단·신보로 안내. (기보 과대추천 방지 버그픽스)

### 11-3. 규모 판정 `resolveSegment(company)` → `"small" | "sme"`
- `is_small_business` 명시값 있으면 그대로 사용
- 법인 + 매출 5억↑ → **sme** (소상공인 오판 방지)
- 직원수 입력 시: 상시근로자 기준(제조·건설·운수 10명 미만, 그 외 5명 미만) **그리고** 매출이 업종상한 미만이어야 small. 하나라도 초과 → sme
- 업종별 소상공인 매출상한(추정): 도소매·음식 30억 / 서비스·제조 10억 / 기타 5억
- 직원수 미입력: 법인=sme, 개인=업종별 매출기준 추정

### 11-4. 혁신분야 실제 해당 판정 `isInnovationArea` (supportPrograms.ts ~422줄)
'해당 없음'/'해당없음'/'없음'을 제외한 **실제 혁신테마가 1개 이상**일 때만 true.
→ 사용자가 '해당 없음'만 골라도 기보가 잘못 열리는 것 방지.

### 11-5. 기관 매칭 `matchInstitutions(company)` → CreditMatch[]

**중복배제 핵심 규칙 (2005년 신보·기보 업무협약):**
신보·기보·재단은 같은 신용보증 → 원칙적으로 **하나만** 신청.
- 기술기업 → **기보** 우선 (재단·신보 X)
- 비기술 + 매출 5억↑(또는 sme) → **신보** 우선 (기보·재단 X)
- 비기술 + 소액 → **재단** 우선 (신보·기보 X)
- **예외**: 기술기업 + 규모(매출5억↑ or sme) → 신보·기보 **둘 다** 안내하되 `DUP_NOTE`로 '중복 신청 불가, 택1' 명시
- 소진공·중진공은 보증기관 아닌 정책자금(직접대출) → **병행 가능**
- 무역보험공사는 수출 전용 + 한도 별도 → **항상 병행 가능**

**분기 순서:**
1. **재도전자**(`bankruptcy_status === "discharged"`) → 소진공 재도전특별자금 전용만 반환하고 종료 (일반 정책자금·보증은 면책·인가 후 3년 경과 필요, 기관이 채권자였으면 사실상 제한)
2. **보증기관 택1** (위 규칙):
   - `techWithScale = isTech && (매출5억↑ || sme)` → 기보 + 신보 둘 다 push (exclusiveNote=DUP_NOTE)
   - else `isTech` → 기보 단독
   - else `qualifiesSinbo`(매출5억↑ || sme) → 신보 단독
   - else → 지역신용보증재단 단독
3. **중진공(직접대출) 병행** — `isManufacturingCore || is_innovation_area || isExport || 청년자금자격 || 청년특례 || 직원5명↑` (매출 하한 없음, 성장성·자금계획·대표의지 종합)
4. **소진공(직접대출) 병행** — `segment==="small" || isManufacturingCore || uses_smart_tech`
5. **무역보험공사** — `isExport`(수출실적증명원 발급). 법인 선호, BB+↑ 승인율 높음
6. **고정 정렬**: 재단 → 신보 → 기보 → 중진공 → 소진공 → 무역보험공사 → 농신보 → 기타

**청년전용창업자금 자격:**
- 정식: 대표 만39세↓ **AND** 업력 3년 미만 (`qualifiesYouthFund`)
- 특례: 39세↓ + 업력 3~7년 (창업성공패키지·기보 청년보증·VC투자 시) (`youthFundSpecialMaybe`)
- ★ 업력 미상이면 노출 안 함(과대추천 방지). 나이만 보고 노출하던 버그 픽스됨.

### 11-6. 승인 시기 `timingAdvice(month)` (대표님 실무 기준)
1~6월 승인율 높음 / 7~9월 추경·일부 / 10~12월 어려움.

### 11-7. 소진공 상품별 승인율(결과창 정직 명시)
- 승인율 높음: 혁신성장촉진·재도전특별·대환·청년고용연계·일반경영안정·민간투자연계·TIPS
- 승인율 낮음: 스마트기기·일시적경영애로·신용취약소상공인
- 지역별 편차 큼. 대표자 신용·매출·상환여력 종합 판단.

### 11-8. 검증 방법
`node /tmp/test_matching.mjs` → **12/12 통과** 기준. 서비스/음식/도소매/건설+해당없음 → 기보 미노출, 특허·경력·이노비즈·제조·수출·IT → 기보 노출.
