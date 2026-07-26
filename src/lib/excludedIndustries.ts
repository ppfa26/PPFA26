// ══════════════════════════════════════════════════════════════════════
//  공통 제외업종 안전망 (대표님 실무 기준)
//  ---------------------------------------------------------------------
//  정부지원사업은 기관마다 세부 제외기준이 조금씩 다르지만,
//  향락·사행·도박·금융(대부)·부동산투기·비영리 등
//  "어느 기관이나 공통으로 걸러지는 기본 제외업종 기준선"은 거의 동일하다.
//
//  이 파일은 그 공통 기준선을 담아, 매칭 "결과 노출 직전"에 한 겹 안전망으로
//  작동한다. 매칭 로직(matching.ts)의 점수·자격 계산은 절대 건드리지 않는다.
//  → 제외업종 사업자면, 어떤 사업이든 추천하지 않고 결과를 비운다.
//
//  ⚠️ 이건 "기본 기준선"이며 최종 자격은 각 기관 공고문 기준이다.
//     (결과 화면에 그 안내 문구를 함께 노출한다)
// ══════════════════════════════════════════════════════════════════════

// 공통 제외업종 키워드 (업종명·업태·종목 문자열에서 부분일치로 탐지)
//  ─ 사업자가 입력/선택한 업종 텍스트에 아래 키워드가 포함되면 제외 후보.
export const EXCLUDED_INDUSTRY_KEYWORDS: { group: string; keywords: string[] }[] = [
  {
    group: "향락·유흥",
    keywords: [
      "유흥", "룸살롱", "단란주점", "단란", "요정", "카바레", "나이트",
      "무도장", "무도유흥", "댄스홀", "성인", "안마", "마사지",
      "이용업소", "퇴폐", "향락", "접객",
    ],
  },
  {
    group: "사행·도박",
    keywords: [
      "사행", "도박", "카지노", "복권", "경마", "경륜", "경정",
      "베팅", "슬롯", "게임장", "성인오락", "오락실", "pc방게임머니",
    ],
  },
  {
    group: "금융·대부",
    keywords: [
      "대부업", "대부", "사채", "채권추심", "추심", "저축은행",
      "투자자문", "유사수신", "가상자산", "코인거래소", "환전",
    ],
  },
  {
    group: "부동산 투기·임대",
    keywords: [
      "부동산투기", "부동산 투기", "부동산 임대", "부동산임대",
      "분양대행", "부동산 매매", "부동산매매",
    ],
  },
  {
    group: "비영리·공공",
    keywords: [
      "비영리", "종교", "종교단체", "정당", "협회", "공공기관",
    ],
  },
  {
    group: "기타 지원제외",
    keywords: [
      "담배", "주류 제조", "무기", "총포", "도축", "밀수",
    ],
  },
];

export type ExcludedIndustryCheck = {
  excluded: boolean;
  group?: string; // 어떤 제외 그룹에 걸렸는지
  matched?: string; // 실제로 걸린 키워드
};

/**
 * 사업자 업종 문자열들을 받아, 공통 제외업종에 해당하는지 판정한다.
 * 여러 업종을 선택했어도(중복) 하나라도 제외업종이면 제외로 본다.
 *
 * @param industryTexts 업종/업태/종목 등 판정 대상 문자열들
 */
export function checkExcludedIndustry(
  industryTexts: (string | undefined | null)[]
): ExcludedIndustryCheck {
  const haystack = industryTexts
    .filter(Boolean)
    .map((s) => (s as string).replace(/\s/g, "").toLowerCase())
    .join(" | ");

  if (!haystack) return { excluded: false };

  for (const { group, keywords } of EXCLUDED_INDUSTRY_KEYWORDS) {
    for (const kw of keywords) {
      const needle = kw.replace(/\s/g, "").toLowerCase();
      if (needle && haystack.includes(needle)) {
        return { excluded: true, group, matched: kw };
      }
    }
  }
  return { excluded: false };
}
