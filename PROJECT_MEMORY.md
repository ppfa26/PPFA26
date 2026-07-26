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
  - 토큰 만료 시("Invalid username or token") → `setup_github_environment` 재호출 후 다시 위 명령.
- 실서버 검증(선택): `pm2 start ecosystem.config.cjs`(next start -p 3000) → `curl localhost:3000` → 끝나면 `pm2 delete all`.
- PDF/스샷: Playwright Chromium (`~/.cache/ms-playwright/chromium-1228`), 모듈 `NODE_PATH=/opt/npm-cache/_npx/e41f203b7505f1fb/node_modules`. 모바일 390×844 / PC 1280×900.

---

# 🔁 재현 플레이북 — 아이템(사업)만 바뀌어도 이 수준 홈페이지 재현
> "다음에 아이템만 바뀌어도 이 정도 홈페이지를 만들 수 있게" — 대표님 요청으로 핵심 노하우 총정리. 새 프로젝트 시 이 섹션만 보고 그대로 재현 가능.

## A. 기술 스택 & 초기 셋업
- **Next.js 14 App Router + TypeScript + TailwindCSS + Supabase Auth + Vercel(자동배포)**. 코드는 `src/app/`.
- GitHub push → Vercel 자동 배포. 항상 **main** 브랜치.
- 실서버 검증은 PM2로 `next start -p 3000`(`ecosystem.config.cjs`).
- 한글 도메인 쓸 땐 링크를 `window.location.origin`(퓨니코드 xn-- 노출) 대신 **한글 URL 하드코딩**.

## B. 브랜드 색상 팔레트 (tailwind.config.ts)
- brand.yellow `#FEE500` / gradFrom `#FFD500` / gradTo `#FF9500` / orange `#FF6F0F`
- brand.dark `#191919` / gray `#6B7280` / green(emerald) `#00C471` / red `#FF3B30`
- 폰트: Pretendard → Noto Sans KR → system-ui. 그라데이션: `brand-grad`(135deg #FFD500→#FF9500). 그림자: `card`/`cardHover`. 반응형 `xs:400px`.
- **색상 사용 규칙(절대)**: 기본 UI/버튼 = **흰색·회색·반투명(white)**. 상태 배지 = **초록/오렌지**. **위험 액션(삭제·계정차단·환불)만 레드 유지**. 브랜드 강조(CTA·핵심포인트)만 옐로/오렌지 그라데이션. 그 외 남발 금지(indigo/sky/rose/amber 등 → blue/orange/red/green으로 통일).

## C. 다크 야경 테마 구조 (globals.css)
- 몰입형 페이지(home/community/admin 등)는 `<body class="theme-dark">`. 밝은 페이지 코드(bg-white/text-brand-dark)를 전역 CSS가 자동으로 **반투명 글래스 + 밝은 글자**로 변환.
- `body { color:#f4f5f7; background-color:#0b1020; overflow-x:hidden; }`
- **배경 고정 레이어(핵심)**: `body::before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background-image: linear-gradient(오버레이) , url(야경); background-size:cover; background-position:center top; }`
  - ⚠️ `body`에 직접 `background-attachment:fixed`를 주면 **iOS 사파리 스크롤 떨림/튐 버그**. 반드시 `body::before` 고정레이어로 분리해야 PC·모바일 모두 100% 고정.
  - `body.theme-dark`는 **배경색 미지정**이어야 ::before가 정상 노출됨.
- **오버레이 어둡기**(야경 위 가독성): `linear-gradient(rgba(8,12,24,A1), rgba(8,12,24,A2))`. 현재값 PC `0.78~0.90`, 모바일(`@media max-width:640px`) `0.82~0.94`. 글씨 안 보이면 ↑, 너무 답답하면 ↓.
- 글래스 컴포넌트: `.hero-glass`(rgba(18,23,36,0.55)+blur18+border rgba(255,255,255,0.14)), `.section-title-glass`(rgba(18,23,36,0.5)+blur14), `.pricing-card-popular`(rgba(20,25,38,0.62)+골드테두리).
- 다크배경이라 테두리는 **`border-white/10`**(반투명 흰). `border-gray-200`은 라이트 잔재지만 다크테마 CSS가 커버하므로 강제 통일 불필요.

## D. 배경 이미지 생성·최적화 워크플로
1. 기존/원하는 색감 참조 → **nano-banana-pro, image-to-image**(`image_urls`에 기존 배경 넣어 색조 유지). 여러 안 생성 후 실제 오버레이+히어로 얹은 스샷 비교로 채택.
2. genspark file URL은 **curl 받으면 59바이트 JSON 인증에러** → 반드시 **DownloadFileWrapper 도구**로 다운로드.
3. ImageMagick 최적화(crop-to-fill):
   - PC: `convert src.jpg -resize 1920x1072^ -gravity center -extent 1920x1072 -quality 82 -strip public/images/city-night-bg.jpg`
   - 모바일 세로: `-resize 900x1613^ -extent 900x1613 -quality 82` → `city-night-bg-mobile.jpg`
4. `understand_images`로 글리치(건물 뭉개짐 등) 검증 후 image-to-image 재수정.

## E. 베타/유료 스위치 (src/lib/betaConfig.ts)
- `BETA_FREE = true` → 오픈베타 무료모드(가격·결제 UI 숨김). 결제 코드는 **지우지 않고 숨김만** → 심사 통과 후 `false`로 한 번에 유료 복구.
- `OFFICIAL_PRICE = 29900` / `OFFICIAL_PRICE_LABEL = "29,900원"`.

## F. 페이지 구성 (src/app/)
- `page.tsx`(홈 히어로: hero-glass 카드+배지+h1+CTA "지금 무료로 진단 시작하기", BETA_FREE 조건부) / `diagnosis`(진단 폼, 국세청 조회 폴백 안내) / `community`(승인 사례+통계바+CTA) / `mypage`(메뉴판·매칭결과) / `admin`(회원/결제/진단서/매출/접속 탭) / `pricing` / `privacy`.
- 자동화: `vercel.json` cron `/api/crawl` 매일 20시(공고 크롤링).

## G. 검증·배포 순서(항상)
`npx tsc --noEmit -p tsconfig.json` → `npm run build`(300s) → (필요시 PM2 실서버 curl) → 토큰주입 git push main → Vercel 자동배포.

## H. 절대 규칙(재확인)
- **matching.ts 스코어링 로직 불가침** — 표시 후처리만.
- 팩트 근거·솔직·미래지향. 이해 안 되면 실행 전 재질문. 크레딧 절약.

---

## 주요 파일
- `src/lib/advancedScreening.ts` — INSTITUTION_LINKS(신보/기보/중진공/소진공/재단), JAEDAN_PRODUCTS, filterProducts(low 제거), InstitutionProduct 타입.
- `src/components/AdvancedScreeningPanel.tsx` — 결과리포트 렌더(기관 아코디언, approvalRank 정렬, 배지).
- `src/app/admin/page.tsx` — 관리자 대시보드(회원/결제/진단서/매출/접속 5탭).
- `src/lib/leadNotes.ts` — 리드 통화상태·메모(localStorage, DB 불필요).
- `src/app/page.tsx` / `privacy/page.tsx` — 진단·개인정보처리방침.

## 진행 이력(최근순)
- **(이번 세션) 2026 공식 PDF 심층분석 → 결과리포트 정확도 대폭 향상 + 예비창업 아코디언 신설** [대표님 6문항 브리핑 답변 반영]
  - **상품 성격 배지 2종 체계로 정리(직접대출/대리대출)**: 기존 3종(직접대출/보증서/재단)에서 **직접대출(blue-100/700)·대리대출(purple-100/700) 2종**으로 통일. `LoanNature = "직접대출" | "대리대출"`, `InstitutionProduct.nature?: LoanNature | LoanNature[]`(상품 단위 지정, 없으면 `loanNatureOf(기관)` 폴백). 대리대출 = 보증부 = 보증서 = 확인서(현장 용어 통일). ※배지에 "○○형" 절대 금지.
  - **loanNatureOf 폴백**: 중진공=직접대출, 소진공=직접대출(기본), 신보·기보·무보·재단=대리대출.
  - **소진공(SMAN018M 공식표) 상품별 정확화**: 직접대출표 6종/대리대출표 7종 확정 반영. 일반경영안정자금=대리대출(기준금리+0.6%p), 혁신성장촉진자금 6개 variant=직접대출(기준금리+0.4%p), 재도전특별자금=직접대출(일반7천·희망1억·도약2억), 대환대출=대리대출(5천만·고정4.5%·최장10년), **민간투자연계형 매칭융자=직접대출 단독**(Q1 확정, 최대5억·시설포함10억).
  - **신보 3→5상품 세분화**: 일반보증(운전)·일반보증(시설)·퍼스트펭귄보증(최대30억, 업력<7)·스마트보증(최대2억·100%·0.7%)·수출기업우대보증(수출자). 전부 대리대출(보증서→은행).
  - **기보 3→4상품 세분화**: 청년창업기업보증(만17~39세·창업7년내·30억)·기술창업보증·기술보증(운전)·기술보증(시설). 전부 대리대출.
  - **무보 공식명칭화**: 수출신용보증(선적전)·수출신용보증(선적후)·단기수출보험(중소중견Plus+)·문화산업보증.
  - **🌱 예비창업자 전용 아코디언 신설(Q5)**: `report.company.is_pre_founder`=true일 때만 '사이트 바로가기' 바로 위에 노출. `PRE_FOUNDER_PROGRAMS`(예비창업패키지 최대1억·평균4천/생애최초청년 최대1억/청년창업사관학교 만39세·최대1억/신사업창업사관학교 최대4천) 사업화자금(무상) 중심, emerald 팔레트. autoRun 경로는 profileToCompany가 businessType"예비"→is_pre_founder 자동변환하므로 대시보드에서도 정상 노출.
  - **파일**: `src/lib/advancedScreening.ts`(LoanNature/loanNatureOf L825~, InstitutionProduct.nature L855, PRE_FOUNDER_PROGRAMS, 소진공/신보/기보/무보 상품 정확화), `src/components/AdvancedScreeningPanel.tsx`(배지 배열처리 렌더, 예비창업 아코디언). ⚠️matching.ts·runAdvancedScreening 스코어링 절대 미수정(표시 후처리만).
  - **⚠️ 팩트 vs 실무 충돌 목록(대표님 최종확인 필요)**: ①중진공 이차보전 — 대표님 Q2는 "대리대출 형태"라 하셨으나, 2026 공식 융자사업 안내는 거의 전 상품이 직접대출(이차보전은 예외적 공존). 현재 폴백=직접대출. ②무보 단기수출보험 — '보험'상품인데 폴백상 "대리대출" 배지가 붙음(엄밀히는 보증도 대출도 아님). 표기 방식 대표님 확정 필요.
- `daca8ff` **결과리포트 상품 성격 배지 추가**: 상품명 옆 작은 배지로 자금이 어떻게 나오는지 한눈에 안내. 기관 성격 기준 3종 — **직접대출**(소진공·중진공, 블루) / **보증서**(신보·기보·무보, 보라) / **재단**(지역신용보증재단, 그린). advancedScreening.ts에 `loanNatureOf(institution)` 헬퍼 추가(표시 후처리, matching 로직 무관), AdvancedScreeningPanel.tsx 상품명 span 뒤 배지 렌더. ※"○○형" 없이 직접대출/보증서/재단으로 통일(대표님 지정). ※미완료 5개 중 3번(괄호제거)=상품 구분정보라 미실행, 4번(ㅡ→-)=이미 코드에 긴대시 없어 스킵.
- (문서) **재현 플레이북 추가**: "아이템만 바뀌어도 이 수준 홈페이지 재현" 섹션 신설(A~H: 스택·브랜드색·다크테마·배경고정기법·이미지워크플로·베타스위치·페이지구성·배포순서·절대규칙). 지금까지 세션 노하우 총정리.
- `6af2366` **배경 완전 고정 + 살짝 어둡게**: 모바일 스크롤 시 배경이 콘텐츠 따라 밀려 바뀌던 현상 해결. body 직접 배경(attachment:fixed는 iOS 사파리 떨림버그)→**`body::before` 고정레이어**(position:fixed·inset:0·z-index:-1·pointer-events:none)로 분리. PC·모바일 모두 스크롤해도 배경 100% 고정. 오버레이 살짝 어둡게: PC 0.72~0.86→**0.78~0.90**, 모바일 0.74~0.90→**0.82~0.94**. (globals.css L19~46. body.theme-dark는 배경색 미지정이라 ::before 정상노출.)
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

## 결과리포트 정확도 개선 (advancedScreening.ts) — 처리결과
- [x] **상품 성격 태그**(2·5번 통합): `daca8ff`에서 완료. 직접대출/보증서/재단 3종 배지.
- [~] 1번(소진공/중진공 직접대출 우선정렬): 기관 간 정렬은 이미 step으로 처리됨. 기관 내 상품은 approval(승인율) 순 정렬이 우선이라 현행 유지.
- [–] 3번(상품명 괄호 제거): **미실행 확정** — 괄호 안이 상품 구분 핵심정보(일반형/혁신형 등)라 제거 시 구분 불가.
- [–] 4번(`ㅡ`→`-`): **스킵 확정** — 코드에 긴대시 없음(이미 `—`/`·` 사용).

## 산출물 URL
- 벽걸이 가로 PDF: https://www.genspark.ai/api/files/s/jhBNlbEy
- 벽걸이 세로 PDF: https://www.genspark.ai/api/files/s/NK8Ppece
