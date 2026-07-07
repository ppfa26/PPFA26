// 40+개 공식 공문 PDF (자문 답변 시 1차 참조하는 지식 베이스)
export type OfficialDoc = {
  id: string;
  category:
    | "정책자금융자"
    | "기관업무안내"
    | "2026통합공고"
    | "지원사업안내"
    | "서류양식";
  title: string;
  url: string;
};

export const OFFICIAL_DOCS: OfficialDoc[] = [
  // 정책자금·융자
  { id: "d01", category: "정책자금융자", title: "(공개) 주요 부처별 달라지는 기업제도 안내", url: "https://www.genspark.ai/api/files/s/IS7apln6" },
  { id: "d02", category: "정책자금융자", title: "(붙임) 신용취약소상공인자금 사전 이수 교육", url: "https://www.genspark.ai/api/files/s/xxEgO0ur" },
  { id: "d03", category: "정책자금융자", title: "(붙임1) 긴급경영안정자금(직접대출)", url: "https://www.genspark.ai/api/files/s/Ky52kKD4" },
  { id: "d04", category: "정책자금융자", title: "(붙임1) 민간투자연계형매칭융자", url: "https://www.genspark.ai/api/files/s/XmAXJvRp" },
  { id: "d05", category: "정책자금융자", title: "(붙임1) 상생성장지원자금", url: "https://www.genspark.ai/api/files/s/7Fb2NSlm" },
  { id: "d06", category: "정책자금융자", title: "(붙임1) 신용취약소상공인자금", url: "https://www.genspark.ai/api/files/s/Fn7Z3jyb" },
  { id: "d07", category: "정책자금융자", title: "(붙임1) 일시적경영애로자금(직접대출)", url: "https://www.genspark.ai/api/files/s/O3F64Jy7" },
  { id: "d08", category: "정책자금융자", title: "(붙임1) 재도전특별자금", url: "https://www.genspark.ai/api/files/s/pK7q36qy" },
  { id: "d09", category: "정책자금융자", title: "(붙임1) 혁신성장촉진자금", url: "https://www.genspark.ai/api/files/s/44kfWywt" },

  // 기관 업무 안내
  { id: "d10", category: "기관업무안내", title: "2025년도 기술보증기금 업무안내", url: "https://www.genspark.ai/api/files/s/lTcQwO8W" },
  { id: "d11", category: "기관업무안내", title: "(기술보증기금) 기술보증 지원제도 소개", url: "https://www.genspark.ai/api/files/s/NT1tVl5c" },
  { id: "d12", category: "기관업무안내", title: "(신용보증기금) 2026년 업무설명", url: "https://www.genspark.ai/api/files/s/dGBTcawT" },
  { id: "d13", category: "기관업무안내", title: "2025 신용보증기금 업무가이드", url: "https://www.genspark.ai/api/files/s/hKxFZed1" },
  { id: "d14", category: "기관업무안내", title: "2025 신용보증기금 업무설명 PPT", url: "https://www.genspark.ai/api/files/s/zH7yjGV3" },
  { id: "d15", category: "기관업무안내", title: "신용보증재단 매뉴얼", url: "https://www.genspark.ai/api/files/s/XMiaswoJ" },

  // 2026년 통합 공고
  { id: "d16", category: "2026통합공고", title: "2026년 소진공 주요 공문", url: "https://www.genspark.ai/api/files/s/qF6AGaqc" },
  { id: "d17", category: "2026통합공고", title: "2026년 중진공 주요 공문", url: "https://www.genspark.ai/api/files/s/kbHaIM4S" },
  { id: "d18", category: "2026통합공고", title: "2026년 창업지원사업 통합 공고문", url: "https://www.genspark.ai/api/files/s/6qzujvfE" },
  { id: "d19", category: "2026통합공고", title: "2026년 소상공인 지원사업 통합 공고", url: "https://www.genspark.ai/api/files/s/voMabPR4" },
  { id: "d20", category: "2026통합공고", title: "2026년 경기도 중소기업육성자금", url: "https://www.genspark.ai/api/files/s/EVNxSbSf" },
  { id: "d21", category: "2026통합공고", title: "2026년도 중소기업 수출지원사업 통합공고", url: "https://www.genspark.ai/api/files/s/kJl0z9Rg" },
  { id: "d22", category: "2026통합공고", title: "2026년 중소기업 핵심사업 동시 안내", url: "https://www.genspark.ai/api/files/s/16iPfXeG" },

  // 지원사업 안내
  { id: "d23", category: "지원사업안내", title: "성장촉진분야", url: "https://www.genspark.ai/api/files/s/Ka2gxZjb" },
  { id: "d24", category: "지원사업안내", title: "소상공인 성장촉진 보증부 대출", url: "https://www.genspark.ai/api/files/s/BSCQktXy" },
  { id: "d25", category: "지원사업안내", title: "소상공인 신규자금 금융지원방안", url: "https://www.genspark.ai/api/files/s/GzLtbf6e" },
  { id: "d26", category: "지원사업안내", title: "(창업진흥원) 2026년도 창업지원사업 안내", url: "https://www.genspark.ai/api/files/s/GET0yCJc" },
  { id: "d27", category: "지원사업안내", title: "(중소벤처기업부) 2026년 수출분야 시책", url: "https://www.genspark.ai/api/files/s/TOjfCX50" },
  { id: "d28", category: "지원사업안내", title: "중소중견기업 지원제도 안내 (K-SURE)", url: "https://www.genspark.ai/api/files/s/A9dpmWUa" },
  { id: "d29", category: "지원사업안내", title: "한국콘텐츠진흥원 보증상품", url: "https://www.genspark.ai/api/files/s/L6hhELXu" },
  { id: "d30", category: "지원사업안내", title: "(중소기업기술정보진흥원) 2026년 R&D 지원사업", url: "https://www.genspark.ai/api/files/s/Neo9IYHE" },
  { id: "d31", category: "지원사업안내", title: "(중소벤처기업진흥공단) 2026년 정책자금 융자사업", url: "https://www.genspark.ai/api/files/s/ISzeWqCq" },
  { id: "d32", category: "지원사업안내", title: "[공개] (1권 중소벤처기업부편) 2026년도 중소벤처기업 지원사업", url: "https://www.genspark.ai/api/files/s/9PbtC6fz" },
  { id: "d33", category: "지원사업안내", title: "[공개] (2권 유관기관편) 2026년도 중소벤처기업 지원사업", url: "https://www.genspark.ai/api/files/s/Sn2JaEhp" },
  { id: "d34", category: "지원사업안내", title: "(소상공인시장진흥공단) 2026년 소상공인 전통시장 지원시책", url: "https://www.genspark.ai/api/files/s/xHrVbz8C" },

  // 서류 양식·예시
  { id: "d35", category: "서류양식", title: "주식·주주명부 양식 (docx)", url: "https://www.genspark.ai/api/files/s/ujQVfBBQ" },
  { id: "d36", category: "서류양식", title: "중소기업확인서 예시", url: "https://www.genspark.ai/api/files/s/Ix3PcIYp" },
  { id: "d37", category: "서류양식", title: "창업기업확인서 예시", url: "https://www.genspark.ai/api/files/s/1VXjirpw" },
  { id: "d38", category: "서류양식", title: "전자계약 방법 안내", url: "https://www.genspark.ai/api/files/s/9jIZ9sQU" },
];

export const DOC_CATEGORIES = [
  { key: "정책자금융자", label: "📗 정책자금·융자" },
  { key: "기관업무안내", label: "📘 기관 업무 안내" },
  { key: "2026통합공고", label: "📙 2026년 통합 공고" },
  { key: "지원사업안내", label: "📕 지원사업 안내" },
  { key: "서류양식", label: "📄 서류 양식·예시" },
] as const;
