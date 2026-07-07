// 매칭 대상 6개 카테고리 + 지원사업 데이터베이스
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
  정책자금: { icon: "🏦", label: "정책자금 대출", desc: "소상공인정책자금, 중진공, 신보/기보, 지자체" },
  정부지원금: { icon: "💰", label: "정부지원금·보조금", desc: "기업마당, 보조금24, 지자체 보조금" },
  창업지원: { icon: "🎓", label: "창업 지원사업", desc: "청년창업사관학교, K-Startup, 예비창업패키지, 창업대학" },
  바우처인증: { icon: "🎯", label: "바우처·인증", desc: "수출바우처, 창업기업확인서, 벤처확인, 이노비즈, 메인비즈" },
  교육컨설팅: { icon: "📚", label: "교육·컨설팅", desc: "희망리턴패키지, 소상공인 지식배움터, 서울시 아카데미" },
  재기재도전: { icon: "🔄", label: "재기·재도전", desc: "새출발기금, 재도전특별자금, 신용취약소상공인 교육" },
};

export type Program = {
  id: string;
  category: MatchCategory;
  name: string;
  organization: string;
  summary: string;
  target: string[]; // 대상 프로필 태그
  amount: string;
  applyUrl: string;
  applySite: string;
  docs: string[]; // 필요 서류
  strategy: string; // 승인 확률 높이는 전략
  relatedDocIds?: string[]; // 참조 공문 id
};

export const PROGRAMS: Program[] = [
  {
    id: "sbiz-policy-fund",
    category: "정책자금",
    name: "소상공인 정책자금 (일반경영안정자금)",
    organization: "소상공인시장진흥공단",
    summary:
      "소상공인의 경영 안정을 위한 저금리 정책자금 융자. 운전자금 중심으로 지원됩니다.",
    target: ["소상공인", "개인사업자", "매출없음", "1억미만"],
    amount: "업체당 최대 7,000만원",
    applyUrl: "https://ols.sbiz.or.kr/",
    applySite: "소상공인정책자금 (OLS)",
    docs: ["사업자등록증", "소상공인 확인", "국세·지방세 완납증명", "매출 증빙(부가세과세표준증명 등)"],
    strategy:
      "신청 전 '신용취약소상공인 사전 이수 교육'을 미리 완료해두면 접수 지연을 막을 수 있습니다. 세금 체납이 있으면 반드시 완납 후 신청하세요.",
    relatedDocIds: ["d02", "d06", "d16", "d19", "d34"],
  },
  {
    id: "kosmes-fund",
    category: "정책자금",
    name: "중진공 정책자금 융자 (혁신성장촉진자금 등)",
    organization: "중소벤처기업진흥공단",
    summary:
      "성장 가능성이 높은 중소기업 대상 시설·운전자금 저금리 직접대출.",
    target: ["법인", "중소기업", "5억미만", "5억이상", "시설자금", "운전자금"],
    amount: "연간 최대 60억원 (사업별 상이)",
    applyUrl: "https://www.kosmes.or.kr/",
    applySite: "중소벤처기업진흥공단",
    docs: ["사업자등록증", "재무제표", "사업계획서", "중소기업 확인서"],
    strategy:
      "사업계획서의 '기술성·성장성' 항목이 핵심 평가 요소입니다. 매출 성장률·고용 계획을 구체적 수치로 제시하세요.",
    relatedDocIds: ["d09", "d17", "d31", "d32"],
  },
  {
    id: "kodit-guarantee",
    category: "정책자금",
    name: "신용보증기금 보증서 발급",
    organization: "신용보증기금 (KODIT)",
    summary:
      "담보가 부족한 기업이 은행 대출을 받을 수 있도록 보증서를 제공합니다.",
    target: ["개인사업자", "법인", "중소기업", "담보없음"],
    amount: "보증 한도 기업별 산정",
    applyUrl: "https://www.kodit.or.kr/",
    applySite: "신용보증기금 (KODIT)",
    docs: ["사업자등록증", "재무제표", "부채현황", "사업장 임대차계약서"],
    strategy:
      "보증 심사 전 재무비율(부채비율·유동비율)을 정리해두면 유리합니다. 담당 영업점에 사전 상담을 받아보세요.",
    relatedDocIds: ["d12", "d13", "d14"],
  },
  {
    id: "kibo-tech-guarantee",
    category: "정책자금",
    name: "기술보증기금 기술보증",
    organization: "기술보증기금 (KIBO)",
    summary:
      "우수 기술을 보유한 기업 대상 기술평가 기반 보증. 특허·기술력이 있으면 유리합니다.",
    target: ["법인", "중소기업", "R&D자금", "담보없음"],
    amount: "기술평가 등급별 산정",
    applyUrl: "https://www.kibo.or.kr/",
    applySite: "기술보증기금 (KIBO)",
    docs: ["사업자등록증", "특허·지식재산권 증빙", "기술 관련 자료", "재무제표"],
    strategy:
      "보유 특허·인증·R&D 실적을 체계적으로 정리하면 기술평가 등급이 올라갑니다.",
    relatedDocIds: ["d10", "d11"],
  },
  {
    id: "bizinfo-subsidy",
    category: "정부지원금",
    name: "기업마당 정부지원사업 (통합)",
    organization: "중소벤처기업부",
    summary:
      "전국 부처·지자체의 정부지원사업 공고를 한 곳에서 검색·신청할 수 있습니다.",
    target: ["소상공인", "중소기업", "개인사업자", "법인", "예비창업자"],
    amount: "사업별 상이",
    applyUrl: "https://www.bizinfo.go.kr/",
    applySite: "기업마당",
    docs: ["사업자등록증", "사업계획서(사업별)"],
    strategy:
      "관심 분야 알림을 설정해두면 마감 전에 공고를 놓치지 않습니다. 접수 초반에 신청할수록 유리한 경우가 많습니다.",
    relatedDocIds: ["d01"],
  },
  {
    id: "gov24-subsidy",
    category: "정부지원금",
    name: "보조금24 (정부24) 맞춤형 보조금",
    organization: "행정안전부 정부24",
    summary:
      "개인·사업자가 받을 수 있는 정부 보조금을 자동으로 찾아주는 서비스.",
    target: ["소상공인", "개인사업자", "자영업자", "매출없음"],
    amount: "보조금별 상이",
    applyUrl: "https://www.gov.kr/",
    applySite: "보조금24 (정부24)",
    docs: ["본인인증", "사업자등록증"],
    strategy:
      "로그인 후 '나의 혜택 찾기'를 실행하면 놓친 보조금을 발견할 수 있습니다.",
  },
  {
    id: "youth-startup-academy",
    category: "창업지원",
    name: "청년창업사관학교",
    organization: "중소벤처기업진흥공단",
    summary:
      "만 39세 이하 청년 창업자에게 사업화 자금·공간·멘토링을 종합 지원합니다.",
    target: ["청년", "예비창업자", "1년미만", "창업자금"],
    amount: "사업화 자금 최대 1억원 (총사업비 70%)",
    applyUrl: "https://start.kosmes.or.kr/",
    applySite: "청년창업사관학교",
    docs: ["사업계획서", "신분증", "창업 아이템 설명자료"],
    strategy:
      "아이템의 '혁신성·시장성·실현 가능성'을 명확히 정리하세요. 데모/시제품이 있으면 선정 확률이 크게 올라갑니다.",
    relatedDocIds: ["d18", "d26"],
  },
  {
    id: "k-startup-pre",
    category: "창업지원",
    name: "예비창업패키지 (K-Startup)",
    organization: "창업진흥원 (KISED)",
    summary:
      "예비창업자에게 사업화 자금과 창업 교육·멘토링을 제공하는 대표 창업지원사업.",
    target: ["예비창업자", "청년", "창업자금"],
    amount: "최대 1억원 (평균 약 5천만원)",
    applyUrl: "https://www.k-startup.go.kr/",
    applySite: "K-Startup 창업지원포털",
    docs: ["사업계획서(PSST 양식)", "신분증"],
    strategy:
      "PSST(문제-해결-성장-팀) 양식에 맞춰 사업계획서를 작성하는 것이 핵심입니다. 팀 구성의 전문성을 강조하세요.",
    relatedDocIds: ["d18", "d26"],
  },
  {
    id: "export-voucher",
    category: "바우처인증",
    name: "수출바우처",
    organization: "중소벤처기업부 / KOTRA",
    summary:
      "수출을 원하는 기업에 마케팅·전시회·통번역 등 서비스를 바우처로 지원합니다.",
    target: ["중소기업", "수출기업", "수출자금"],
    amount: "바우처 최대 1억원 (자부담 비율 있음)",
    applyUrl: "https://www.exportvoucher.com/",
    applySite: "수출바우처",
    docs: ["사업자등록증", "수출실적 증빙(있는 경우)", "중소기업 확인서"],
    strategy:
      "수출실적이 없어도 지원 가능한 트랙이 있습니다. 수출 계획의 구체성이 평가 포인트입니다.",
    relatedDocIds: ["d21", "d27", "d28"],
  },
  {
    id: "venture-cert",
    category: "바우처인증",
    name: "벤처기업확인 / 이노비즈 / 메인비즈 인증",
    organization: "중소벤처기업부",
    summary:
      "각종 인증을 받으면 정책자금·세제·판로에서 우대를 받을 수 있습니다.",
    target: ["법인", "중소기업", "R&D자금"],
    amount: "인증(직접 지원금 아님, 우대 혜택)",
    applyUrl: "https://www.smes.go.kr/venturein/",
    applySite: "벤처확인시스템",
    docs: ["재무제표", "기술·R&D 자료", "사업자등록증"],
    strategy:
      "인증 취득 후 정책자금 신청 시 가점을 받습니다. 인증→자금신청 순서로 전략을 짜세요.",
  },
  {
    id: "hope-return",
    category: "교육컨설팅",
    name: "희망리턴패키지",
    organization: "소상공인시장진흥공단",
    summary:
      "폐업(예정) 소상공인의 재기·재취업·재창업을 위한 교육·컨설팅·전직 지원.",
    target: ["소상공인", "자영업자", "재기자금"],
    amount: "점포철거비·재창업 교육 등 지원",
    applyUrl: "https://www.sbiz.or.kr/nhrp/intro/bizIntroduce.do",
    applySite: "희망리턴패키지",
    docs: ["사업자등록증(또는 폐업사실증명)", "신분증"],
    strategy:
      "폐업 전에 신청하면 받을 수 있는 지원이 더 많습니다. 폐업 시점 전에 상담받으세요.",
  },
  {
    id: "sbiz-edu",
    category: "교육컨설팅",
    name: "소상공인 지식배움터 (온라인 교육)",
    organization: "소상공인시장진흥공단",
    summary:
      "소상공인 경영·마케팅·정책자금 신청 방법 등을 무료 온라인 교육으로 제공합니다.",
    target: ["소상공인", "예비창업자", "자영업자"],
    amount: "무료",
    applyUrl: "https://edu.sbiz.or.kr/",
    applySite: "소상공인 지식배움터",
    docs: ["회원가입"],
    strategy:
      "정책자금 신청 전 관련 교육을 이수하면 사전 요건을 충족해 접수가 원활합니다.",
    relatedDocIds: ["d02"],
  },
  {
    id: "newstart-fund",
    category: "재기재도전",
    name: "새출발기금 (채무조정)",
    organization: "한국자산관리공사(캠코)",
    summary:
      "코로나 등으로 어려움을 겪는 소상공인·자영업자의 채무를 조정해줍니다.",
    target: ["소상공인", "자영업자", "재기자금", "회생파산"],
    amount: "채무조정 (원금감면·상환유예)",
    applyUrl: "https://www.newstartfund.or.kr/",
    applySite: "새출발기금",
    docs: ["신분증", "채무 관련 서류", "소득·재산 증빙"],
    strategy:
      "연체 상태·채무 규모에 따라 조정 조건이 달라집니다. 정확한 채무 현황을 먼저 파악하세요.",
  },
  {
    id: "restart-special",
    category: "재기재도전",
    name: "재도전특별자금",
    organization: "중소벤처기업진흥공단",
    summary:
      "실패 경험이 있는 기업인의 재창업·재기를 위한 정책자금 융자.",
    target: ["재기자금", "회생파산", "예비창업자", "법인"],
    amount: "기업당 최대 60억원 (사업별)",
    applyUrl: "https://www.kosmes.or.kr/",
    applySite: "중소벤처기업진흥공단",
    docs: ["재창업 사업계획서", "이전 사업 정리 증빙", "신분증"],
    strategy:
      "실패 원인 분석과 재창업 아이템의 차별성을 명확히 제시하는 것이 핵심입니다.",
    relatedDocIds: ["d08"],
  },
];

export const PROGRAM_MAP = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
