// 매칭 대상 6개 카테고리 + 지원사업 데이터베이스
// ⚠️ 모든 데이터는 2026년 정부/기관 공식 공문 원문 기반 (추측 금지)
//    - 2026 소상공인 정책자금 융자사업 공고(중기부 제2025-656호)
//    - 2026 중소기업 정책자금 융자계획 공고(중기부 제2025-649호)
//    - 2026 신용보증기금 업무설명 / 2026 기술보증기금
//    - 2025.10 한국무역보험공사 중소중견기업 지원제도 안내
//    - 2026 창업지원사업 통합공고(제2025-648호) / 2026 소상공인 지원사업 통합공고(제2025-652호)
//    - 2026 중소기업 수출지원사업 통합공고 / 2026 경기도 중소기업육성자금
export type MatchCategory =
  | "정책자금"
  | "정부지원금"
  | "창업지원"
  | "바우처인증"
  | "교육컨설팅"
  | "재기재도전";

export const CATEGORY_META: Record<
  MatchCategory,
  { icon: string; label: string; desc: string }
> = {
  정책자금: { icon: "🏦", label: "정책자금 대출", desc: "소상공인정책자금, 중진공, 신보/기보, 무역보험공사, 지자체" },
  정부지원금: { icon: "💰", label: "정부지원금·보조금", desc: "기업마당, 보조금24, 지자체 보조금" },
  창업지원: { icon: "🎓", label: "창업 지원사업", desc: "예비창업패키지, 초기창업패키지, 청년창업사관학교, 혁신 소상공인 창업지원" },
  바우처인증: { icon: "🎯", label: "바우처·인증", desc: "수출바우처, 스마트상점, 벤처확인, 이노비즈, 메인비즈" },
  교육컨설팅: { icon: "📚", label: "교육·컨설팅", desc: "신용관리교육, 소상공인 지식배움터, 경영교육·컨설팅" },
  재기재도전: { icon: "🔄", label: "재기·재도전", desc: "새출발기금, 재도전특별자금, 희망리턴패키지" },
};

// 기관 특성(대출/보증 구조) — 결과 상세 및 매칭 근거에 활용
export type LoanType = "직접대출" | "대리대출" | "직접·대리대출" | "보증서(대리)" | "이차보전" | "비융자";

export type Program = {
  id: string;
  category: MatchCategory;
  name: string;
  organization: string; // 정식 기관명 (풀네임)
  summary: string;
  target: string[]; // 대상 프로필 태그
  amount: string;
  applyUrl: string;
  applySite: string; // "OO 사이트 바로가기" 형태로 결과창에 표시
  loanType?: LoanType; // 대출/보증 방식
  docs: string[]; // 필요 서류 (100% 확실한 것만. 불확실하면 빈 배열 → 상담 안내로 대체)
  strategy: string; // 승인 확률 높이는 전략
  relatedDocIds?: string[]; // 참조 공문 id (officialDocs.ts)
};

export const PROGRAMS: Program[] = [
  // ─────────────────────────── 정책자금 ───────────────────────────
  {
    id: "sbiz-policy-fund",
    category: "정책자금",
    name: "일반경영안정자금",
    organization: "소상공인시장진흥공단",
    summary:
      "「소상공인기본법」상 소상공인(업력 무관)이면 신청할 수 있는 일반 경영안정 융자입니다. 신용점수 제한이나 사전 교육 요건이 없어 가장 많은 소상공인이 이용합니다.",
    target: ["소상공인", "개인사업자", "신용양호", "매출없음", "1억미만"],
    amount: "연간 7,000만원 이내 · 기준금리 +0.6%p (변동)",
    applyUrl: "https://ols.sbiz.or.kr/",
    applySite: "소상공인정책자금",
    loanType: "대리대출",
    docs: [],
    strategy:
      "업력과 무관하게 소상공인이면 신청 가능합니다. 은행을 통한 대리대출이며 세금 체납이 있으면 완납 후 신청하세요. 신용점수 839점 이하라면 '신용취약소상공인자금(직접대출)'이 별도로 유리할 수 있으니 먼저 상담받아 보세요.",
    relatedDocIds: ["d16", "d19"],
  },
  {
    id: "sbiz-credit-weak-fund",
    category: "정책자금",
    name: "신용취약소상공인자금 (직접대출)",
    organization: "소상공인시장진흥공단",
    summary:
      "NCB(NICE) 개인신용평점 839점 이하 중·저신용 소상공인 전용 소진공 직접대출입니다. 신청 전 '신용관리교육' 사전 이수가 반드시 필요합니다.",
    target: ["소상공인", "개인사업자", "신용취약", "담보없음"],
    amount: "3,000만원 · 기준금리 +1.6%p (1년 후 신용개선 시 0.5%p 인하)",
    applyUrl: "https://ols.sbiz.or.kr/",
    applySite: "소상공인정책자금",
    loanType: "직접대출",
    docs: [],
    strategy:
      "① 반드시 신청 전에 '소상공인 지식배움터(edu.sbiz.or.kr)'의 신용회복위원회 신용관리교육('신용관리의 새로운 지평선')을 이수하세요. 미이수 시 접수가 불가합니다. ② 고신용자가 점수를 일부러 낮추면 금융거래에 불이익이 생기니, 고신용자는 일반경영안정자금을 이용하세요. ③ 소진공 직접대출이라 신청 전 상담을 먼저 받는 것이 유리합니다.",
    relatedDocIds: ["d02", "d06", "d16"],
  },
  {
    id: "kosmes-fund",
    category: "정책자금",
    name: "중소기업 정책자금 융자 (혁신창업·신성장기반 등)",
    organization: "중소벤처기업진흥공단",
    summary:
      "기술·사업성 우수 중소기업 대상 시설·운전자금 융자입니다. 업력에 따라 혁신창업사업화자금(7년 미만)·신성장기반자금(7년 이상)으로 나뉩니다.",
    target: ["법인", "중소기업", "5억미만", "5억이상", "시설자금", "운전자금"],
    amount: "연간 최대 60억원 이내 (운전자금 5억원) · 사업별 기준금리 가감",
    applyUrl: "https://www.kosmes.or.kr/",
    applySite: "중소벤처기업진흥공단",
    loanType: "직접·대리대출",
    docs: [],
    strategy:
      "혁신성장분야·초격차·뿌리산업 등 중점지원분야는 우선 지원됩니다. 사업계획서의 '기술성·성장성'이 핵심 평가요소이니 매출 성장률·고용 계획을 구체적 수치로 제시하세요. 직접대출과 대리대출 방식이 있으며, 신청 전 지역본부·지부 상담을 먼저 받는 것을 권합니다.",
    relatedDocIds: ["d17", "d31"],
  },
  {
    id: "kodit-guarantee",
    category: "정책자금",
    name: "신용보증기금 보증부 대출",
    organization: "신용보증기금",
    summary:
      "담보가 부족한 기업이 은행 대출을 받을 수 있도록 신용보증기금이 보증서를 발급합니다. 소상공인부터 중소·중견기업까지, 특히 매출·사업 규모가 어느 정도 되는 기업에 적합합니다.",
    target: ["개인사업자", "법인", "중소기업", "담보없음", "매출5억이상", "신용양호"],
    amount: "기업별 보증한도 산정 (프로그램별 상이) · 보증서 발급 후 은행 대출",
    applyUrl: "https://www.kodit.or.kr/",
    applySite: "신용보증기금",
    loanType: "보증서(대리)",
    docs: [],
    strategy:
      "신보는 매출·재무 등 사업체 '규모'를 중시합니다(일반적으로 매출 5억원 이상 기업에 유리). 보증서를 받은 뒤 은행에서 대출을 실행하는 구조라 반드시 사전 상담부터 받으세요. 혁신성장 분야는 승인율이 높습니다. 재무비율(부채비율·유동비율)을 미리 정리하면 유리합니다.",
    relatedDocIds: ["d13"],
  },
  {
    id: "kibo-tech-guarantee",
    category: "정책자금",
    name: "기술보증기금 보증부 대출",
    organization: "기술보증기금",
    summary:
      "제조·IT·기술기업 대상 기술평가 기반 보증입니다. 매출이 낮아도 특허·기술력·벤처·이노비즈 등 기술 경쟁력이 있으면 보증받을 수 있어, 창업 초기·기술기업에 유리합니다.",
    target: ["법인", "개인사업자", "중소기업", "제조업", "R&D자금", "담보없음", "기술기업"],
    amount: "기술평가 등급별 보증한도 산정 · 보증서 발급 후 은행 대출",
    applyUrl: "https://www.kibo.or.kr/",
    applySite: "기술보증기금",
    loanType: "보증서(대리)",
    docs: [],
    strategy:
      "기보는 매출보다 '기술력·성장성'을 봅니다. 특허·지식재산권·R&D 실적·벤처/이노비즈 인증을 체계적으로 정리하면 기술평가 등급이 올라갑니다. 청년창업기업 우대프로그램(청년테크스타)도 있으니 해당되면 활용하세요. 혁신 분야는 승인율이 높고, 신청 전 상담이 중요합니다.",
    relatedDocIds: ["d10"],
  },
  {
    id: "ksure-export-guarantee",
    category: "정책자금",
    name: "한국무역보험공사 수출신용보증 (선적전/선적후)",
    organization: "한국무역보험공사",
    summary:
      "수출기업이 수출물품 제조·조달 자금을 은행에서 대출받을 때 무역보험공사가 연대보증하는 제도입니다. 신보·기보 보증한도와 별개로 운영되어, 수출기업은 함께 활용하면 자금 여력이 커집니다.",
    target: ["중소기업", "수출기업", "수출자금", "법인"],
    amount: "기업별 보증한도 산정 · 신보/기보 한도와 별도 운영",
    applyUrl: "https://www.ksure.or.kr/",
    applySite: "한국무역보험공사",
    loanType: "보증서(대리)",
    docs: [],
    strategy:
      "수출실적이 있는 기업이라면 소진공·중진공·(신보 또는 기보)에 더해 무역보험공사까지 병행해 4곳을 함께 활용할 수 있습니다(한도 미합산). 수출계약서·수출실적 증빙을 준비하고, 어느 자금을 먼저 받을지 순서를 상담으로 설계하는 것이 중요합니다.",
    relatedDocIds: ["d27"],
  },
  {
    id: "gyeonggi-fund",
    category: "정책자금",
    name: "경기도 중소기업육성자금",
    organization: "경기신용보증재단",
    summary:
      "경기도 소재 중소기업·소상공인 대상 융자로, 협약은행 대출금리의 일부를 경기도가 이자지원(이차보전)합니다. 신청·상담은 지역신용보증재단인 경기신용보증재단을 통해 진행합니다.",
    target: ["소상공인", "중소기업", "개인사업자", "법인", "경기"],
    amount: "소상공인 최대 1.5억원 / 운전 5억원(특별 10억원) / 시설 최대 30억원 · 이차보전",
    applyUrl: "https://www.gcgf.or.kr/",
    applySite: "경기신용보증재단",
    loanType: "이차보전",
    docs: [],
    strategy:
      "지역신용보증재단(경기신보)은 소상공인 전용으로 대리대출(이차보전) 형태입니다. 경기도 소재 사업장이어야 하며, 재단 방문 상담 또는 보증드림을 통한 비대면 신청이 가능합니다. 상담 예약 후 진행하는 것이 빠릅니다. (고객센터 1577-5900)",
    relatedDocIds: [],
  },

  // ─────────────────────────── 정부지원금 ───────────────────────────
  {
    id: "bizinfo-subsidy",
    category: "정부지원금",
    name: "기업마당 정부지원사업 (통합)",
    organization: "중소벤처기업부",
    summary:
      "전국 부처·지자체의 정부지원사업 공고를 한 곳에서 검색·신청할 수 있는 통합 포털입니다.",
    target: ["소상공인", "중소기업", "개인사업자", "법인", "예비창업자"],
    amount: "사업별 상이",
    applyUrl: "https://www.bizinfo.go.kr/",
    applySite: "기업마당",
    loanType: "비융자",
    docs: [],
    strategy:
      "관심 분야 알림을 설정해두면 마감 전에 공고를 놓치지 않습니다. 접수 초반에 신청할수록 유리한 경우가 많습니다.",
    relatedDocIds: ["d19"],
  },
  {
    id: "gov24-subsidy",
    category: "정부지원금",
    name: "보조금24 (정부24)",
    organization: "행정안전부 정부24",
    summary:
      "개인·사업자가 받을 수 있는 정부 보조금을 자동으로 찾아주는 서비스입니다.",
    target: ["소상공인", "개인사업자", "자영업자", "매출없음"],
    amount: "보조금별 상이",
    applyUrl: "https://www.gov.kr/",
    applySite: "정부24 보조금24",
    loanType: "비융자",
    docs: [],
    strategy:
      "로그인 후 '나의 혜택 찾기'를 실행하면 놓친 보조금을 발견할 수 있습니다.",
  },

  // ─────────────────────────── 창업지원 ───────────────────────────
  {
    id: "k-startup-pre",
    category: "창업지원",
    name: "예비창업패키지",
    organization: "창업진흥원",
    summary:
      "사업자등록을 하지 않은 예비창업자에게 사업화 자금과 창업 교육·멘토링을 제공하는 대표 창업지원사업입니다.",
    target: ["예비창업자", "청년", "창업자금"],
    amount: "사업화 자금 + 창업프로그램 (규모는 개별 공고)",
    applyUrl: "https://www.k-startup.go.kr/",
    applySite: "K-Startup 창업지원포털",
    loanType: "비융자",
    docs: [],
    strategy:
      "공고일 기준 개인·법인 사업자등록 및 법인 설립등기를 하지 않은 자만 신청 가능합니다. PSST(문제-해결-성장-팀) 양식으로 사업계획서를 작성하고 팀 구성의 전문성을 강조하세요.",
    relatedDocIds: ["d18"],
  },
  {
    id: "k-startup-early",
    category: "창업지원",
    name: "초기창업패키지",
    organization: "창업진흥원",
    summary:
      "업력 3년 이내 초기 창업기업의 사업화를 지원해 안정적 시장 진입과 성장을 돕습니다.",
    target: ["창업자금", "1년미만", "법인", "개인사업자"],
    amount: "사업화 자금 (규모는 개별 공고)",
    applyUrl: "https://www.k-startup.go.kr/",
    applySite: "K-Startup 창업지원포털",
    loanType: "비융자",
    docs: [],
    strategy:
      "업력 3년 이내 창업기업이 대상입니다. 이미 확보한 매출·시장 반응(트랙션)을 수치로 보여주면 선정 확률이 높아집니다.",
    relatedDocIds: ["d18"],
  },
  {
    id: "youth-startup-academy",
    category: "창업지원",
    name: "청년창업사관학교 (창업성공패키지)",
    organization: "중소벤처기업진흥공단",
    summary:
      "만 39세 이하 청년 창업자에게 사업화 자금·교육·창업공간·기술지원을 종합 제공합니다.",
    target: ["청년", "예비창업자", "1년미만", "창업자금"],
    amount: "사업화 자금 + 교육·공간·연계지원 (규모는 개별 공고)",
    applyUrl: "https://start.kosmes.or.kr/",
    applySite: "청년창업사관학교",
    loanType: "비융자",
    docs: [],
    strategy:
      "만 39세 이하 청년 창업자가 대상입니다. 아이템의 '혁신성·시장성·실현 가능성'을 명확히 정리하세요. 데모/시제품이 있으면 선정 확률이 크게 올라갑니다.",
    relatedDocIds: ["d18"],
  },
  {
    id: "sbiz-startup-academy",
    category: "창업지원",
    name: "혁신 소상공인 창업지원 (구 신사업창업사관학교)",
    organization: "소상공인시장진흥공단",
    summary:
      "사업자등록을 하지 않은 예비 소상공인에게 창업교육·1:1 멘토링·시제품/패키징/마케팅/점포 리모델링 등 사업화 자금을 지원합니다.",
    target: ["예비창업자", "소상공인", "창업자금"],
    amount: "창업교육 + 사업화 자금 (규모는 개별 공고)",
    applyUrl: "https://www.sbiz24.kr/#/combinePbancList",
    applySite: "소상공인24",
    loanType: "비융자",
    docs: [],
    strategy:
      "공고일 기준 사업자(개인·법인)를 보유하지 않은 예비창업자만 신청할 수 있습니다. 이미 사업자가 있으면 업종을 추가해도 지원 대상이 아니니 주의하세요. 소상공인 정책자금(직접대출)과 연계도 가능합니다.",
    relatedDocIds: ["d19", "d34"],
  },

  // ─────────────────────────── 바우처·인증 ───────────────────────────
  {
    id: "export-voucher",
    category: "바우처인증",
    name: "수출바우처",
    organization: "중소벤처기업부",
    summary:
      "수출을 원하는 중소기업(소상공인도 신청 가능)에 마케팅·전시회·통번역 등 서비스를 바우처로 지원합니다.",
    target: ["중소기업", "소상공인", "수출기업", "수출자금"],
    amount: "매출 100억 미만 보조율 70%(자부담 30%) · 내수기업 최대 3,000만원",
    applyUrl: "https://www.exportvoucher.com/",
    applySite: "수출바우처",
    loanType: "비융자",
    docs: [],
    strategy:
      "전년도 수출액 1,000불 미만이면 '내수기업' 트랙으로 수출 첫걸음을 지원받을 수 있습니다. 직전년도 매출 100억 미만이면 보조율 70%로 자부담이 가장 적습니다. 수출 계획의 구체성이 평가 포인트입니다.",
    relatedDocIds: ["d21", "d27"],
  },
  {
    id: "venture-cert",
    category: "바우처인증",
    name: "벤처기업확인 / 이노비즈 / 메인비즈 인증",
    organization: "중소벤처기업부",
    summary:
      "인증을 받으면 정책자금·세제·판로에서 우대(가점)를 받을 수 있습니다.",
    target: ["법인", "중소기업", "R&D자금", "기술기업"],
    amount: "인증(직접 지원금 아님, 우대 혜택)",
    applyUrl: "https://www.smes.go.kr/venturein/",
    applySite: "벤처확인시스템",
    loanType: "비융자",
    docs: [],
    strategy:
      "인증 취득 후 정책자금 신청 시 가점을 받습니다. 인증 → 자금신청 순서로 전략을 짜세요. 기술보증기금 기술평가와 연계하면 유리합니다.",
  },

  // ─────────────────────────── 교육·컨설팅 ───────────────────────────
  {
    id: "sbiz-credit-edu",
    category: "교육컨설팅",
    name: "신용관리교육 (신용취약소상공인자금 사전 이수)",
    organization: "소상공인시장진흥공단",
    summary:
      "신용점수 839점 이하 소상공인이 '신용취약소상공인자금'을 신청하기 전에 반드시 이수해야 하는 무료 온라인 교육입니다.",
    target: ["소상공인", "신용취약", "예비창업자"],
    amount: "무료 (신용회복위원회 '신용관리의 새로운 지평선')",
    applyUrl: "https://edu.sbiz.or.kr/",
    applySite: "소상공인 지식배움터",
    loanType: "비융자",
    docs: [],
    strategy:
      "소상공인 지식배움터 → 제휴기관 → 신용회복위원회 페이지에서 '신용관리의 새로운 지평선'을 학습시간 80% 이상 수강하면 수료됩니다. 이 수료증이 있어야 신용취약소상공인자금 접수가 가능합니다.",
    relatedDocIds: ["d02", "d06"],
  },
  {
    id: "sbiz-edu",
    category: "교육컨설팅",
    name: "소상공인 경영교육·컨설팅",
    organization: "소상공인시장진흥공단",
    summary:
      "소상공인·예비창업자 대상 경영개선교육, 업종전문기술교육, AI 활용 교육, 찾아가는 1:1 교육을 제공합니다.",
    target: ["소상공인", "예비창업자", "자영업자"],
    amount: "무료 또는 소액 자부담",
    applyUrl: "https://www.sbiz24.kr/#/combinePbancList",
    applySite: "소상공인24",
    loanType: "비융자",
    docs: [],
    strategy:
      "정책자금 신청 전 관련 교육을 이수하면 사업 이해도가 높아지고 심사에도 도움이 됩니다.",
    relatedDocIds: ["d19"],
  },

  // ─────────────────────────── 재기·재도전 ───────────────────────────
  {
    id: "newstart-fund",
    category: "재기재도전",
    name: "새출발기금 (채무조정)",
    organization: "한국자산관리공사(캠코)",
    summary:
      "경영난을 겪는 소상공인·자영업자의 채무를 원금감면·상환유예 등으로 조정해 줍니다.",
    target: ["소상공인", "자영업자", "재기자금", "회생파산"],
    amount: "채무조정 (원금감면·상환유예)",
    applyUrl: "https://www.newstartfund.or.kr/",
    applySite: "새출발기금",
    loanType: "비융자",
    docs: [],
    strategy:
      "연체 상태·채무 규모에 따라 조정 조건이 달라집니다. 정확한 채무 현황을 먼저 파악하고 상담받으세요.",
  },
  {
    id: "restart-special",
    category: "재기재도전",
    name: "재도전특별자금",
    organization: "소상공인시장진흥공단",
    summary:
      "재창업·채무조정 성실상환·재도약 유망 소상공인을 위한 소진공 직접대출입니다.",
    target: ["재기자금", "회생파산", "예비창업자", "소상공인", "개인사업자"],
    amount: "일반형 7,000만원 / 희망형 1억원 / 도약형 2억원 · 기준금리 +0.4~1.6%p",
    applyUrl: "https://ols.sbiz.or.kr/",
    applySite: "소상공인정책자금",
    loanType: "직접대출",
    docs: [],
    strategy:
      "실패 원인 분석과 재창업 아이템의 차별성을 명확히 제시하세요. 개인·법인 중 하나의 사업자에 집중 지원하며, 소진공 직접대출이라 신청 전 상담이 중요합니다.",
    relatedDocIds: ["d08", "d16"],
  },
  {
    id: "hope-return",
    category: "재기재도전",
    name: "희망리턴패키지",
    organization: "소상공인시장진흥공단",
    summary:
      "폐업(예정) 소상공인의 재기·재취업·재창업을 위한 교육·컨설팅·점포철거비·전직 지원입니다.",
    target: ["소상공인", "자영업자", "재기자금"],
    amount: "점포철거비·재창업 교육 등 지원",
    applyUrl: "https://www.sbiz.or.kr/nhrp/intro/bizIntroduce.do",
    applySite: "희망리턴패키지",
    loanType: "비융자",
    docs: [],
    strategy:
      "폐업 전에 신청하면 받을 수 있는 지원이 더 많습니다. 폐업 시점 전에 상담받으세요.",
  },
];

export const PROGRAM_MAP = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
