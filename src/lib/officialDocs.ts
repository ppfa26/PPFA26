// 공식 공문 PDF 지식 베이스 (자문 답변 시 1차 참조)
//
// ── 최신화 정책 (대표님 지시) ────────────────────────────────
//  • 원칙: 2026년 자료만 노출한다.
//  • 신보/기보 2026년 신규 자료 반영 완료 (2026-07 최신화):
//    - d10 = 2026 기보 업무안내 책자, d13 = 2026 신보 업무가이드 책자
//    - d14 = 2026 기보 리플렛, d15 = 2026 신보 업무설명 PPT
//    ⇒ 기존 2025 예외 조항은 2026본 출간으로 해소됨.
//  • 연도 미표기 자료(제도 안내·서류 양식 등)는 상시 유효 자료로 간주해 유지.
//  • 모든 URL은 2026년 실제 업로드 공문 최신본으로 갱신됨.
// ────────────────────────────────────────────────────────────
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
  // 정책자금·융자 (2026 소진공 주요 공문 및 붙임 자료)
  { id: "d02", category: "정책자금융자", title: "(붙임) 신용취약소상공인자금 사전 이수 교육 수료 안내", url: "https://www.genspark.ai/api/files/s/kpzQc4O8" },
  { id: "d06", category: "정책자금융자", title: "(붙임1) 신용취약소상공인자금 신청안내자료", url: "https://www.genspark.ai/api/files/s/PmXDAzh8" },
  { id: "d08", category: "정책자금융자", title: "(붙임1) 재도전특별자금 신청안내자료", url: "https://www.genspark.ai/api/files/s/EnwBoScv" },

  // 기관 업무 안내
  { id: "d10", category: "기관업무안내", title: "2026 기술보증기금 업무안내(책자)", url: "https://www.genspark.ai/api/files/s/6CaW6Vta" },
  { id: "d14", category: "기관업무안내", title: "2026 기술보증기금 업무안내 리플렛", url: "https://www.genspark.ai/api/files/s/i9w0KXFp" },
  { id: "d11", category: "기관업무안내", title: "(기술보증기금) 기술보증 지원제도 소개", url: "https://www.genspark.ai/api/files/s/QmFaZNAR" },
  { id: "d13", category: "기관업무안내", title: "2026 신용보증기금 업무가이드(책자)", url: "https://www.genspark.ai/api/files/s/0iVpxDw9" },
  { id: "d15", category: "기관업무안내", title: "2026 신용보증기금 업무설명 PPT", url: "https://www.genspark.ai/api/files/s/oSiMQuW6" },
  { id: "d12", category: "기관업무안내", title: "(신용보증기금) 2026년 신용보증기금 업무설명", url: "https://www.genspark.ai/api/files/s/fgza5vrz" },

  // 2026년 통합 공고
  { id: "d16", category: "2026통합공고", title: "2026년 소진공(소상공인시장진흥공단) 주요 공문", url: "https://www.genspark.ai/api/files/s/DsEWpl6G" },
  { id: "d17", category: "2026통합공고", title: "2026년 중진공(중소벤처기업진흥공단) 주요 공문", url: "https://www.genspark.ai/api/files/s/WZWqlnKn" },
  { id: "d18", category: "2026통합공고", title: "2026년 창업지원사업 통합 공고문", url: "https://www.genspark.ai/api/files/s/06BJSDtA" },
  { id: "d19", category: "2026통합공고", title: "2026년 중소벤처기업부 소상공인 지원사업 통합 공고", url: "https://www.genspark.ai/api/files/s/YR94kQ4E" },
  { id: "d20", category: "2026통합공고", title: "2026년 경기도 중소기업육성자금 지원계획", url: "https://www.genspark.ai/api/files/s/E30FmK9b" },
  { id: "d21", category: "2026통합공고", title: "2026년도 중소기업 수출지원사업 통합공고", url: "https://www.genspark.ai/api/files/s/RflkjenN" },

  // 지원사업 안내
  { id: "d26", category: "지원사업안내", title: "(창업진흥원) 2026년도 창업지원사업 안내", url: "https://www.genspark.ai/api/files/s/FUrUHTHW" },
  { id: "d27", category: "지원사업안내", title: "(중소벤처기업부) 2026년 수출분야 시책", url: "https://www.genspark.ai/api/files/s/jx35psqF" },
  { id: "d28", category: "지원사업안내", title: "중소중견기업 지원제도 안내 (K-SURE 한국무역보험공사)", url: "https://www.genspark.ai/api/files/s/bwhMmbDX" },
  { id: "d30", category: "지원사업안내", title: "(중소기업기술정보진흥원) 2026년 중소기업 R&D 지원사업 안내", url: "https://www.genspark.ai/api/files/s/I1TyNqkH" },
  { id: "d31", category: "지원사업안내", title: "(중소벤처기업진흥공단) 2026년 중소기업 정책자금 융자사업 안내", url: "https://www.genspark.ai/api/files/s/0W3fmuXR" },
  { id: "d34", category: "지원사업안내", title: "(소상공인시장진흥공단) 2026년 소상공인 전통시장 지원시책", url: "https://www.genspark.ai/api/files/s/TUQtAVa4" },

  // 서류 양식·예시
  { id: "d35", category: "서류양식", title: "주식·주주명부 양식 (docx)", url: "https://www.genspark.ai/api/files/s/PTT7NQbf" },
  { id: "d36", category: "서류양식", title: "중소기업확인서 예시", url: "https://www.genspark.ai/api/files/s/iTiiN1I0" },
  { id: "d37", category: "서류양식", title: "창업기업확인서 예시", url: "https://www.genspark.ai/api/files/s/O9bvW9sZ" },
  { id: "d38", category: "서류양식", title: "전자계약 방법 안내", url: "https://www.genspark.ai/api/files/s/i1ibDcda" },
];

export const DOC_CATEGORIES = [
  { key: "정책자금융자", label: "📗 정책자금·융자" },
  { key: "기관업무안내", label: "📘 기관 업무 안내" },
  { key: "2026통합공고", label: "📙 2026년 통합 공고" },
  { key: "지원사업안내", label: "📕 지원사업 안내" },
  { key: "서류양식", label: "📄 서류 양식·예시" },
] as const;
