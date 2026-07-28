// ─────────────────────────────────────────────────────────────────
//  【업종별 소상공인 졸업후보기업 기준】 (대표님 제공 공식 기준표)
//   소진공 '졸업후보기업자금' 안내 시, 화면에 작은 아코디언으로 그대로 보여주는 참고표.
//   ⚠️ 순수 표시용 데이터. matching.ts 스코어링/판정과 무관.
//   출처: 대표님이 제공한 소상공인시장진흥공단 공식 기준표 이미지(중분류코드 01~96).
// ─────────────────────────────────────────────────────────────────

export type GraduationRow = {
  code: string; // 중분류코드 (2자리)
  industry: string; // 중분류(업종명)
  revenue: string; // 평균매출액 기준
  employees: string; // 상시근로자 수 기준
};

export const GRADUATION_CRITERIA: GraduationRow[] = [
  { code: "01", industry: "농업", revenue: "24억원 이상 ~ 80억원 이하", employees: "3~4인" },
  { code: "02", industry: "임업", revenue: "24억원 이상 ~ 80억원 이하", employees: "3~4인" },
  { code: "03", industry: "어업", revenue: "24억원 이상 ~ 80억원 이하", employees: "3~4인" },
  { code: "04", industry: "석탄, 원유 및 천연가스 광업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "05", industry: "금속 광업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "07", industry: "비금속광물 광업; 연료용 제외", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "08", industry: "광업 지원 서비스업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "10", industry: "식료품 제조업", revenue: "40억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "11", industry: "음료 제조업", revenue: "40억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "12", industry: "담배 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "13", industry: "섬유제품 제조업; 의복 제외", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "14", industry: "의복, 의복 액세서리 및 모피제품 제조업", revenue: "40억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "15", industry: "가죽, 가방 및 신발 제조업", revenue: "40억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "16", industry: "목재 및 나무제품 제조업; 가구 제외", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "17", industry: "펄프, 종이 및 종이제품 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "18", industry: "인쇄 및 기록매체 복제업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "19", industry: "코크스, 연탄 및 석유정제품 제조업", revenue: "42억원 이상 ~ 140억원 이하", employees: "8~9인" },
  { code: "20", industry: "화학 물질 및 화학제품 제조업; 의약품 제외", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "21", industry: "의료용 물질 및 의약품 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "22", industry: "고무 및 플라스틱제품 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "23", industry: "비금속 광물제품 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "24", industry: "1차 금속 제조업", revenue: "42억원 이상 ~ 140억원 이하", employees: "8~9인" },
  { code: "25", industry: "금속 가공제품 제조업; 기계 및 가구 제외", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "26", industry: "전자 부품, 컴퓨터, 영상, 음향 및 통신장비 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "27", industry: "의료, 정밀, 광학 기기 및 시계 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "28", industry: "전기장비 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "29", industry: "기타 기계 및 장비 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "30", industry: "자동차 및 트레일러 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "31", industry: "기타 운송장비 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "32", industry: "가구 제조업", revenue: "36억원 이상 ~ 120억원 이하", employees: "8~9인" },
  { code: "33", industry: "기타 제품 제조업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "34", industry: "산업용 기계 및 장비 수리업", revenue: "4.5억원 이상 ~ 10억원 이하", employees: "8~9인" },
  { code: "35", industry: "전기, 가스, 증기 및 공기 조절 공급업", revenue: "36억원 이상 ~ 120억원 이하", employees: "3~4인" },
  { code: "36", industry: "수도업", revenue: "40억원 이상 ~ 120억원 이하", employees: "3~4인" },
  { code: "37", industry: "하수, 폐수 및 분뇨 처리업", revenue: "12억원 이상 ~ 36억원 이하", employees: "3~4인" },
  { code: "38", industry: "폐기물 수집, 운반, 처리 및 원료 재생업", revenue: "12억원 이상 ~ 36억원 이하", employees: "3~4인" },
  { code: "39", industry: "환경 정화 및 복원업", revenue: "12억원 이상 ~ 36억원 이하", employees: "3~4인" },
  { code: "41", industry: "종합 건설업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "42", industry: "전문직별 공사업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "45", industry: "자동차 및 부품 판매업", revenue: "18억원 이상 ~ 60억원 이하", employees: "3~4인" },
  { code: "46", industry: "도매 및 상품 중개업", revenue: "18억원 이상 ~ 60억원 이하", employees: "3~4인" },
  { code: "47", industry: "소매업; 자동차 제외", revenue: "18억원 이상 ~ 60억원 이하", employees: "3~4인" },
  { code: "49", industry: "육상 운송 및 파이프라인 운송업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "50", industry: "수상 운송업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "51", industry: "항공 운송업", revenue: "24억원 이상 ~ 80억원 이하", employees: "8~9인" },
  { code: "52", industry: "창고 및 운송관련 서비스업", revenue: "30억원 이상 ~ 90억원 이하", employees: "8~9인" },
  { code: "55", industry: "숙박업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "56", industry: "음식점 및 주점업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "58", industry: "출판업", revenue: "15억원 이상 ~ 50억원 이하", employees: "3~4인" },
  { code: "60", industry: "방송업", revenue: "15억원 이상 ~ 50억원 이하", employees: "3~4인" },
  { code: "61", industry: "우편 및 통신업", revenue: "15억원 이상 ~ 50억원 이하", employees: "3~4인" },
  { code: "62", industry: "컴퓨터 프로그래밍, 시스템 통합 및 관리업", revenue: "15억원 이상 ~ 50억원 이하", employees: "3~4인" },
  { code: "63", industry: "정보서비스업", revenue: "15억원 이상 ~ 50억원 이하", employees: "3~4인" },
  { code: "68", industry: "부동산업", revenue: "12억원 이상 ~ 36억원 이하", employees: "3~4인" },
  { code: "70", industry: "연구개발업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "71", industry: "전문 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "72", industry: "건축 기술, 엔지니어링 및 기타 과학기술 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "73", industry: "기타 전문, 과학 및 기술 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "74", industry: "사업시설 관리 및 조경 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "75", industry: "사업 지원 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "76", industry: "임대업; 부동산 제외", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "85", industry: "교육 서비스업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "86", industry: "보건업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "87", industry: "사회복지 서비스업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "90", industry: "창작, 예술 및 여가관련 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "91", industry: "스포츠 및 오락관련 서비스업", revenue: "10억원 이상 ~ 30억원 이하", employees: "3~4인" },
  { code: "95", industry: "개인 및 소비용품 수리업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
  { code: "96", industry: "기타 개인 서비스업", revenue: "4.5억원 이상 ~ 15억원 이하", employees: "3~4인" },
];

// 각주: 졸업후보기업에 해당하지 않는 업종
export const GRADUATION_EXCLUDED_NOTE =
  "중분류코드 64~66, 94, 97~99에 해당하는 업종은 졸업후보기업에 해당하지 않습니다.";
