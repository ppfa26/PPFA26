# 모두의사업친구 — 인스타 카드뉴스 썸네일 제작 규칙 (반드시 지킬 것)

> ⚠️ 이 파일은 카드뉴스 썸네일을 만들 때마다 **먼저 읽고** 그대로 따른다.
> 사용자가 "썸네일 만들어줘" 라고 하면 아래 방식으로만 제작한다. 절대 새 스타일을 상상해서 만들지 않는다.

## 핵심 원칙 (제일 중요)
- **레퍼런스 이미지를 "틀"로 그대로 쓰고, 텍스트(상단 뱃지 / 중앙 골드 제목 / 서브)만 바꾼다.**
- 배경(다크네이비 + 실사 도시 야경), 흰색 라운드 프레임, 골드 메탈릭 폰트, 골드 광선(streak), 하단 "m" 오렌지 원형 로고 + "모두의사업친구" 텍스트 = **전부 100% 유지. 절대 새로 그리지 않는다.**
- 방법: `image_generation` 모델 `nano-banana-pro`, `aspect_ratio: auto`, `image_urls`에 아래 레퍼런스 URL을 넣고 **image-to-image 편집** 프롬프트로 "텍스트만 교체" 지시.

## 확정 레퍼런스 이미지 (틀로 사용)
글자 수 / 줄 수에 맞춰 가장 비슷한 레퍼런스를 틀로 고른다.

### 중앙 제목 2줄 (제목 길 때)
- `https://www.genspark.ai/api/files/s/FDRfm0LU`  — "골목상권 소상공인 / 활력 대출" (2줄 + 서브 1줄) ← **기본 틀**
- `https://www.genspark.ai/api/files/s/8cfxjbmV`  — "프랜차이즈 가맹점 / 금융지원 협약보증" (2줄 + 긴 서브)
- `https://www.genspark.ai/api/files/s/adAx2NiB`  — "가산금리 상승분 / 특별감면 프로그램" (2줄)

### 중앙 제목 1줄 (짧고 임팩트)
- `https://www.genspark.ai/api/files/s/7TjcA4AK`  — "성장지원" (1줄, 대형)
- `https://www.genspark.ai/api/files/s/wB9Ab7dh`  — "창업지원" (1줄)

### CTA 카드 (별점 + 도메인 포함)
- `https://www.genspark.ai/api/files/s/LXPWrRKX`  — "내 정부지원사업 / 3분 만에 확인" + "★ 4.3 / 5 당근 평점" + "모두의사업친구.kr" + 뱃지 "무료 AI 진단"

## 고정 스타일 스펙 (레퍼런스에서 확정)
- 배경: 다크 네이비-블랙 #0B101D, 하단 25% 실사 도시 야경(마천루, 따뜻한 불빛)
- 프레임: 얇은 흰색 라운드 사각 테두리, edge에서 약 4% inset, 모서리 큰 라운드
- 상단 뱃지: 흰색 알약(pill), 검정 볼드 한글 산세리프
- 중앙 제목: 골드 메탈릭 그라데이션(밝은골드→진한골드) + 3D 베벨 + 드롭섀도, 볼드 고딕, 가운데 정렬
- 골드 광선: 제목 아래 가로 렌즈플레어, 중앙 가장 밝고 양끝 페이드
- 서브: 흰색 미디엄 산세리프, 제목보다 작게
- 하단 로고: 오렌지 원형 안 흰색 소문자 "m" + 흰색 볼드 "모두의사업친구"
- CTA 전용: 서브 아래 "★ 4.3 / 5 당근 평점"(연골드), 로고 아래 "모두의사업친구.kr"(작은 흰색)

## 브랜드 컬러 (참고)
orange #FF6F0F / gold gradFrom #FFD500 → gradTo #FF9500 / dark #191919 / bgDark #0A0A0A

## 편집 프롬프트 템플릿 (image-to-image)
```
Edit this image. Keep EVERYTHING exactly the same — dark navy background, real night city
skyline photo at bottom, white rounded frame border, gold horizontal light streak, metallic
gold font style, orange "m" circle logo with "모두의사업친구" at bottom, overall layout and
positions. Do NOT change background, frame, colors, skyline, logo, or lighting.

ONLY replace text, using the SAME fonts / gold metallic style / sizes / positions:
1) Top white pill badge → {뱃지텍스트}
2) Center gold metallic title ({N} lines) → {중앙제목}
3) White subtitle below the gold streak → {서브텍스트}
(CTA 카드만) star rating line → ★ 4.3 / 5 당근 평점 ; domain under logo → 모두의사업친구.kr
Keep bottom logo "모두의사업친구" unchanged. All Korean text perfectly spelled, crisp, legible.
```

## 예술업 융자 캠페인 8장 (2026-08 진행분)
- Card1(대표): 뱃지 "예술산업 금융지원(융자)" / 중앙 "예술업 사장님 / 운전자금 막힐 때" / 서브 "2026년 신청 안내"
  - 완성본: https://www.genspark.ai/api/files/s/XM2saTTs (틀=FDRfm0LU)
- Card2: 중앙 "2026년 4차 / 예술산업 금융지원(융자)" / 서브 "시범사업 신청 안내"
- Card3: 중앙 "누가 신청하나요?" / 서브 "사업자등록증 있는 예술 분야 사업자"
- Card4: 중앙 "대상 예시" / 서브 "민간예술시설업체 · 예술서비스업체"
- Card5: 중앙 "어디에 쓰나요?" / 서브 "시설자금(자산취득) · 운전자금(비용지출)"
- Card6: 중앙 "신청은 온라인으로" / 서브 "국가문화예술지원시스템(NCAS) 접수"
- Card7: 중앙 "한도 · 금리 · 서류" / 서브 "자세한 내용은 공고문에서 확인"
- Card8(CTA): 뱃지 "무료 AI 진단" / 중앙 "내 사업 맞춤 공고 / 30초 만에 정리" / 서브 "오픈 베타 무료" / + 별점 + 모두의사업친구.kr
