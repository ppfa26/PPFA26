# 모두의사업친구 — 프로젝트 핵심 메모리 (항상 최신화)

> 대표님 요청: "대화 핵심은 항상 여기에 저장해서 최신화" · 크레딧 절약 원칙

## 사업 정체성
- **대표**: 신주엽 (인천 서구 청라). 직업군인·경영컨설턴트 출신, 정부지원사업 경력 약 3년.
- **실적**: 승인 컨설팅 100여 건, 지원금 100억+ (바우처 포함).
- **사업**: 정부지원사업 AI 통합 매칭 플랫폼.
- **회사가 크는 핵심(대표님 말)**: "그 사람한테 해당되는 정부지원사업/감면제도/정책자금을 얼마나 정확하게, 상품명 맞게, 보증서만 나오는지·재단 거쳐야 하는지·대출까지 한 번에 되는지를 잘 안내해야 CS 줄고 회사가 성공."
- **매출 경로**: 388→603→1,979→목표 3,000만/월. 컨설팅+대행 수수료로 3,000만 사정권. 자문·세미나는 추가매출(조급 금지).

## 기술 스택
- Next.js 14 App Router + TypeScript + TailwindCSS + Supabase Auth + Vercel(자동배포).
- GitHub: `ppfa26/PPFA26`, 항상 **main** 브랜치, 코드 `/home/user/webapp`.
- 도메인: `모두의사업친구.kr` = 퓨니코드 `xn--2e0br4kgyfb0gp4gbrcj9s.kr` (HTTP 200 확인).
- Supabase: URL `https://akjlulfbhoukbhuyaybo.supabase.co`, Callback `.../auth/v1/callback`. "Allow users without an email"=OFF.
- 카카오/구글 로그인 실제 작동 확인됨. 카카오싱크 이름·전화번호 동의항목 검수 중(3~5영업일).

## 절대 규칙
- **매칭 스코어링 로직(matching.ts)은 절대 안 건드림** — 표시 단계 후처리만 추가.
- 리포트는 **팩트 기반**.
- 이해 안 되면 실행 전 대표님께 다시 질문.
- 크레딧 많이 쓰는 작업 지양.

## 배포/작업 명령
- 타입체크: `npx tsc --noEmit -p tsconfig.json`
- 빌드: `npm run build` (300s)
- 푸시: `GHTOK=$(gh auth token) && git -c credential.helper= push "https://x-access-token:${GHTOK}@github.com/ppfa26/PPFA26.git" HEAD:main`
- PDF: Playwright Chromium (`~/.cache/ms-playwright/chromium-1228`).

## 주요 파일
- `src/lib/advancedScreening.ts` — INSTITUTION_LINKS(신보/기보/중진공/소진공/재단), JAEDAN_PRODUCTS, filterProducts(low 제거), InstitutionProduct 타입.
- `src/components/AdvancedScreeningPanel.tsx` — 결과리포트 렌더(기관 아코디언, approvalRank 정렬, 배지).
- `src/app/admin/page.tsx` — 관리자 대시보드(회원/결제/진단서/매출/접속 5탭).
- `src/lib/leadNotes.ts` — 리드 통화상태·메모(localStorage, DB 불필요).
- `src/app/page.tsx` / `privacy/page.tsx` — 진단·개인정보처리방침.

## 진행 이력(최근순)
- `25b1727` **홈 배경 야경 업그레이드**: 기존 도시야경(딥네이비#0B1325+골드불빛+수면반사) 정체성 유지하며 화질·디테일 업그레이드. nano-banana-pro로 3안(v1 수면반사스파클/v2 광원글로우Bloom/v3 지평선보라광운) 생성→실제 오버레이+히어로카드 얹은 스샷 비교→**v1 채택**(신뢰+활력·브랜드색조화·오버레이뚫는디테일). 상단 건물꼭대기 글리치 image-to-image로 수정. PC 1920×1072(363KB)·모바일 900×1613(134KB) JPG 최적화 교체. 파일: `public/images/city-night-bg.jpg`·`city-night-bg-mobile.jpg`. (globals.css 오버레이 rgba(8,12,24,0.72~0.86) 그대로.)
- `88168ff` 후기 CTA 문구 `내 사업장에 정부지원사업…`→`내 사업장에 **알맞은** 정부지원사업, 지금 무료로 진단받아 보세요.`
- `1643d96` 어드민 대시보드 안내 `회원·결제·조회권·매출을 한 곳에서 관리하세요.`→`관리하기`
- `822201b` 진단 국세청 점검 안내 문구 간결화(`지금은 국세청 조회 서버 점검 시간입니다.` + `직접 입력하고 계속하기를 클릭하시면 신청이 정상 접수됩니다.`). ※bnoServerDown일 때만 노출.
- `848b48a` 후기 문화산업보증 카드 상품명·기관명 축약(`문화산업보증`/`한국무역보험공사`) + 히어로 유입채널 `당근마켓·네이버블로그·카카오채널`→`당근 · 블로그 · 카카오 · 인스타 · 스레드`.
- `8fa88b9` 후기 소진공 카드: 지원금→정책자금, `일반경영안정자금(운전)`→`(대리)`, 배지 `지급완료`→`확인서 발급완료`(Approval에 `badge?` 옵션필드 추가, 미지정시 "지급완료" 기본).
- `b6c6f69` 후기 통계바 세로구분선 `divide-gray-200`→`divide-white/10`(연하게) + 후기 문화산업보증 카드 note `최대 승인 사례`→`신보/무보/중진공/소진공 총 9억 5천만원 승인 사례`.
- `848b48a`~ 참고: 후기(community) 페이지는 **다크 배경**(PageShell 다크). border-white/10 전면통일건은 무의미로 미실행, 테두리 gray-200 유지 + 통계바 divide만 white/10.
- `41dce17` **후기/마이페이지 미세 개선(다크테마)**: ①후기 상단 배지 `Customer Stories · 고객 성공 사례`→`이용자 정부지원사업 승인 사례`(community L244). ②후기 승인사례 데이터 `글로벌화 자금`→`신시장진출자금`(정책자금 1.5억원/중진공, community L169). ③마이페이지 하단 여백 축소 `py-6`→`pt-6 pb-4`(main L172). ④후기 페이지 하단 여백 축소 `pb-10`→`pb-6`(main L240). ⑤후기 CTA 문구 `내 사업장에 맞는 정책자금·지원금·바우처, 지금 무료로 진단받아 보세요.`→`내 사업장에 정부지원사업, 지금 무료로 진단받아 보세요.`(L397). ⑥어드민 진단서 요약박스(✅진단완료/⏳미완료) 두 카드 `text-center` 가운데정렬(admin L1566·1573). ※후기 페이지는 **다크 배경**(PageShell 다크). 대표님이 라이트로 오해했던 border-white/10 통일건은 실제 다크라 무의미 → 미실행(테두리 gray-200 유지). 통계바 세로줄 정리건은 대표님 답변 대기 중.
- `85888b9` 어드민 버튼 전체 hover scale-[1.02] 확대모션(상단·탭줄7·회원엑셀·회원액션6·진단서탭·기한연장).
- `efa37eb` 첫페이지 하단 CTA 카드~푸터 세로공백 축소(pb-8 sm:pb-12→pb-5 sm:pb-8).
- `22ba880` 진단링크복사→`https://모두의사업친구.kr` 첫페이지(/diagnosis 제거) + 어드민 진단서탭 완료/미완료 요약박스 흰·회색 통일 + 마이페이지 주요버튼 hover scale-[1.02].
- `0580a13` 후기(community) 테두리 brand-yellow→gray-200 통일(테두리·hover·구분선) + 마이페이지 만료문구 위 여백 mt-2.5→mt-5.
- `cc7980e` 탭명 `일주월 매출 리포트`→`요약 매출 리포트` + 어드민 버튼 흰/회색 통일(공고수집·새로고침·진단서엑셀·진단링크·회원엑셀·고객진단서·결과보기·기기초기화·조회권환불복구). **삭제·계정차단만 레드 유지**(대표님 "그대로 남겨"). 통계숫자·상태배지 유지.
- `9566ba7` 마이페이지 매칭결과 배너 테두리 `border-brand-red/10`→`border-gray-200`(배경 그라데이션 유지).
- `f44ff3c` **어드민 매출통계+요약리포트 병합** → 탭 1개 `📊 일주월 매출 리포트`(revenue 탭). 요약표(오늘/이번주/이번달/전체 × 신규가입·진단·결제·매출)를 매출탭 **맨 위**에 배치, 그 아래 기존 일별(30일)·월별(12개월) 상세표+드릴다운. **요약리포트 팝업 모달·버튼·state(showReport) 완전 제거**(기능 중복 제거). + **버튼 색상 팔레트 통일**: 대표님 지정 팔레트=**레드/그린(emerald)/오렌지/블루/반투명(white 5)/흰색**. 요약리포트 버튼(indigo) 삭제, 진단링크복사 white/gray→blue, 회원액션버튼 sky/indigo→blue·amber→orange·rose→red. (유입경로 배지 utmBadge는 채널 구분 목적이라 이모지+색 유지 — 추후 통일 여부 대표님 확인 대기.)
- `4ab2365` 진단링크 복사: 항상 한글 도메인 `https://모두의사업친구.kr/diagnosis` 하드코딩(copyDiagnosisLink). window.location.origin 퓨니코드(xn--) 방지.
- `566e0f1` 어드민 탭줄 순서·문구 변경(·→공백): 회원목록·고객진단서·결제조회권·매출통계·요약매출리포트·접속기기차단·진단서엑셀·진단링크복사 순. (※ f44ff3c에서 매출통계·요약매출리포트가 1개로 병합됨.)
- `43f85e8` 어드민 회원목록 기능추가(디자인 유지): ①표 헤더 클릭 정렬(가입일/최근접속/결제/누적금액, ▲▼) — state userSort{key,dir}, toggleUserSort, sortArrow. ②유입경로 필터 드롭다운(utmBadge 라벨+채널별 개수) — state userSourceFilter, userSourceCounts. 원본 검색(filteredUsers)·CSV 로직 그대로 두고 sortedUsers=filteredUsers→필터→정렬 후처리. 표 바디는 sortedUsers 사용.
- `037e870` 글자크기 통일: 탭줄 8버튼 13→14px, 전체N명 배지·회원표 헤더 12→13px.
- `2e9f94d` 탭줄 8버튼 flex-1 균등분배(빈공간 제거+구분선), 버튼명 '요약 리포트'→'요약 매출 리포트'.
- `171120c` 어드민 헤더 반투명박스, 하단 '관리자만 접근' 문구 제거.
- `f614ed6` 어드민 탭줄 빈자리에 **📊 요약 리포트 버튼**(모달). 오늘/이번주(월요일시작)/이번달/전체 × 신규가입·진단접수·결제·매출 표. state showReport, reportData=useMemo([users,diagnoses,payments]). 모달 위치=admin container 최상단(mx-auto max-w-6xl 직후).
- `c0e9a41` 어드민 회원검색창 폭 max-w-sm→max-w-md.
- `82359eb` 어드민 회원검색줄 정돈: 검색창 max-w 제한, 전체N명 반투명배지(bg-white/5 ring-white/10), flex-wrap+min-w-0로 가로 오버플로 방지. 회원표는 min-w-[920px]+overflow-x-auto라 세로로만 늘어남.
- `7734b26` 메뉴판: 정책자금 전화자문(10만원) 제거 → 8개(정부지원사업 러닝메이트 자문 포함).
- `800bc28` 메뉴판 문구정리(러닝메이트 자문 추가, 예비·초기창업패키지/세무조사·기장/수출 관세 상담/사업자 보험 상담).
- `802204f` **회원 CSV 전화번호 버그 수정**: downloadUsersCsv(admin L335)가 userInfoByEmail(이메일 정확매칭만) 써서 소셜로그인 이메일≠진단서 이메일이면 phone 못 찾음 → findUserDiagnosis(이름/연락처 폴백) 병용. + **메뉴판 글자 14px·1줄 고정**(mypage L300, text-[13px]→text-[14px]+truncate+whitespace-nowrap+min-w-0 flex-1).
- `d3ec934` 메뉴판 안내문구 2개 제거("필요하신 항목 눌러~" / "원하시는 서비스 버튼 누르면 카톡~").
- `87737cf` mypage 메뉴판 8개로 정리(POS·사업용자동차 제거). 어드민 탭줄 우측에 빠른실행 2버튼(🔗 진단링크 복사 → /diagnosis, 📋 진단서 엑셀). 메뉴판 위치=src/app/mypage/page.tsx L280~, 카톡링크 http://pf.kakao.com/_VxfWxan/chat.
- `46efef0` 어드민: '오늘 할 일' 요약 배너 제거(대표님 "안 씀" — 통화 미요청인데 카운트돼서 별로). 통화상태·메모·회원CSV·연결성은 유지.
- `0fb7439` 어드민: 리드관리(통화상태·메모)+오늘할일 요약+회원CSV+연결성(이름클릭→진단서) / 벽걸이 가로버전.
- `c193723` 신청 안내 3단계 문구 통일("담당 부처에 문의시 간편하게 신청 가능").
- `486d5a2` 결과리포트 low 상품 제거 + desk-summary(세로) 생성.
- `c362256`/`8fe7ace` 고객진단서 버튼 4단계 매칭 + 관리버튼 3×2 정렬.
- `9106b06` 개인정보처리방침 논리 정합(회원가입 시 이름·연락처 수집 명시).

## ⚠️ 미완료 (다음 우선작업) — 결과리포트 정확도 개선 (advancedScreening.ts)
1. 소진공/중진공 = **직접대출 먼저, 대리대출(확인서) 그 밑에** 정렬.
2. 설명란에 상품 성격 추가: 확인서형=보증(신보/기보/신보재단) 받아 은행 대출 / 직접대출=공단과 직접 약정 후 대출실행.
3. 상품명 괄호() 내용 제거 (예: 혁신성장촉진자금 (일반형)(혁신형)).
4. `ㅡ`(긴 대시) → `-`(짧은 하이픈) 전역 교체.
5. 상품 성격 태그 신설(보증서형/재단경유형/직접대출형/지원금형) — 대표님 승인됨.

## 산출물 URL
- 벽걸이 가로 PDF: https://www.genspark.ai/api/files/s/jhBNlbEy
- 벽걸이 세로 PDF: https://www.genspark.ai/api/files/s/NK8Ppece
