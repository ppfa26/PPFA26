// ════════════════════════════════════════════════════════════════
//  고객 진단서 — 한글 라벨 매핑 + 엑셀(CSV) 다운로드 유틸
//
//  ★ 대표님 안내 ★
//  어드민 '고객 진단서' 탭에서 쓰이는 도우미입니다.
//  - 진단서 데이터의 영어 키(businessType 등)를 한글(사업자 유형)로 바꿔 보여줍니다.
//  - '엑셀로 다운로드'는 CSV(엑셀에서 바로 열림) 파일을 만듭니다. 별도 라이브러리 없이
//    브라우저만으로 동작하므로 가볍고 빠릅니다. (한글 깨짐 방지 BOM 포함)
// ════════════════════════════════════════════════════════════════
import {
  STEP1_FIELDS,
  STEP2_FIELDS,
  STEP3_FIELDS,
  STEP3_CONDITIONAL_FIELDS,
} from "./diagnosisConfig";

// 진단 프로필 키 → 한글 라벨 (질문 설정 파일에서 자동 수집 + 기본정보 보강)
function buildLabelMap(): Record<string, string> {
  const map: Record<string, string> = {
    // 사업자번호 자동조회·연락처 등 설정 파일에 없는 기본 항목
    name: "이름",
    phone: "연락처",
    email: "이메일",
    bno: "사업자등록번호",
    bnoStatus: "사업자 상태",
    bnoTaxType: "과세유형",
    // ★ 관리자 진단서 표시용 한글 라벨 보강 (대표님 요청 — 영어로 뜨던 항목 한글 통일) ★
    //   질문 설정에 라벨이 비어있거나(purposes) 설정 파일에 없어서(interests·bnoVerified·phoneConsult)
    //   영어 key 그대로 노출되던 것을, 원 질문을 짧게 요약한 한글 라벨로 덮어쓴다.
    //   ※ 표시 라벨만 바꾸는 것 — 진단/매칭 로직에는 전혀 영향 없음.
    purposes: "필요한 지원 항목",
    interests: "관심 분야",
    bnoVerified: "사업자번호 국세청 검증",
  };
  const collect = (fields: Record<string, { label: string }>) => {
    Object.entries(fields).forEach(([k, v]) => {
      // 라벨에서 괄호 안 부가설명 제거 → 표 헤더로 깔끔하게
      const cleaned = (v.label || "").replace(/\s*\(.*?\)\s*/g, "").trim();
      // 라벨이 비어있으면(예: purposes) 위에서 지정한 보강 라벨을 유지 — 빈 값으로 덮어쓰지 않음
      if (cleaned) map[k] = cleaned;
    });
  };
  collect(STEP1_FIELDS as any);
  collect(STEP2_FIELDS as any);
  collect(STEP3_FIELDS as any);
  collect(STEP3_CONDITIONAL_FIELDS as any);

  // ★ 관리자 표 가독성용 — 긴 질문형 라벨을 짧은 명사형으로 요약 (대표님 요청) ★
  //   진단/결과 화면에는 원문 질문이 그대로 노출되고, 여기(관리자 진단서 표·엑셀)에서만 축약해 보인다.
  //   collect 이후에 덮어써야 요약본이 최종 적용된다.
  const shortLabels: Record<string, string> = {
    revenueGrowth2y: "최근 2년 매출 매년 10%↑",
    smartFactory: "스마트공장 구축·도입",
    smartDevice: "매장 스마트기기 사용",
    govSelected: "정부 선정 프로그램 이력",
    reFounder: "재창업[재도전] 여부",
    wantsRefinance: "저금리 대환 희망",
    privateInvestment: "민간 투자(엔젤·VC) 여부",
    innovation: "혁신성장 분야 해당",
    bankruptcy: "대표자 회생·파산 상태",
    taxDelinquent: "국세·지방세 완납 여부",
    capitalImpairment: "자본잠식 상태[법인]",
    credit: "대표자 개인 신용점수",
    certifications: "특허·인증 보유",
    currentInstitutions: "현재 이용 정책기관",
    phoneConsult: "전화 무료 상담 희망",
  };
  Object.assign(map, shortLabels);

  return map;
}

export const DIAGNOSIS_LABELS = buildLabelMap();

// 키 → 한글 라벨 (없으면 키 그대로)
export function labelForKey(key: string): string {
  return DIAGNOSIS_LABELS[key] ?? key;
}

// 값(배열/객체/원시)을 사람이 읽기 쉬운 문자열로
export function valueToText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// CSV 셀 이스케이프 (쉼표·따옴표·줄바꿈 대응)
function csvCell(s: string): string {
  const needsQuote = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export type DiagnosisRecord = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  profile: Record<string, unknown>;
  status?: string | null; // 'completed'(완료) | 'partial'(미완료·중간이탈)
  created_at: string;
  dupIndex?: number; // 몇 번째 신청인지 (중복 감지 결과)
};

// 여러 진단서를 하나의 CSV(엑셀)로 변환 — ★세로 방식★ (대표님 요청)
//  화면 질문지처럼 A열=질문 / B열=답변 이 세로로 쭉 나열됩니다.
//    (제목 줄)  ■ 신주엽 개인사업자 · 01030329388 · 5971202897 · 2026-07-16 …
//    질문        | 답변
//    대표자 연령 | 만 39세 이하 (청년)
//    이름        | 신주엽
//    …          | …
//  한 사람이 끝나면 빈 줄 1칸을 두고 다음 사람 정보가 이어집니다.
export function diagnosesToCsv(records: DiagnosisRecord[]): string {
  const lines: string[] = [];

  // ── 모든 고객에 공통으로 쓸 질문(행) 순서를 통일한다 ──
  //   기본 항목(이름·연락처·이메일) + 프로필에 등장한 모든 질문 키
  const profileKeys: string[] = [];
  const seen = new Set<string>();
  records.forEach((rec) => {
    Object.keys(rec.profile || {}).forEach((k) => {
      if (["name", "phone", "email"].includes(k)) return; // 기본 항목으로 따로 처리
      if (!seen.has(k)) {
        seen.add(k);
        profileKeys.push(k);
      }
    });
  });

  records.forEach((rec, i) => {
    if (i > 0) {
      lines.push(""); // 사람 사이 빈 줄 1칸으로 구분
    }

    const applicant = rec.name || (rec.profile as any)?.name || "이름미입력";
    const bizType = valueToText((rec.profile as any)?.businessType);
    const phoneText = valueToText(rec.phone ?? (rec.profile as any)?.phone);
    const bnoText = valueToText((rec.profile as any)?.bno);
    const dupNote =
      rec.dupIndex && rec.dupIndex > 1 ? ` · ${rec.dupIndex}번째 신청(중복)` : "";
    // 완료/미완료 상태 — 엑셀에서도 전화 돌릴 미완료 리드를 바로 구분
    const statusNote = rec.status === "partial" ? "[미완료-중간이탈]" : "[완료]";

    // ── 사람 구분 제목 줄 (상태 · 이름 · 사업자유형 · 연락처 · 사업자번호 · 접수일시) ──
    const headerParts = [statusNote, applicant];
    if (bizType !== "-") headerParts.push(bizType);
    if (phoneText !== "-") headerParts.push(phoneText);
    if (bnoText !== "-") headerParts.push(bnoText);
    headerParts.push(fmtKST(rec.created_at));
    lines.push(csvCell(`■ ${headerParts.join(" · ")}${dupNote}`));

    // ── 질문 | 답변 헤더 줄 ──
    lines.push([csvCell("질문"), csvCell("답변")].join(","));

    // ── 기본 항목 (이름·연락처·이메일) 먼저 ──
    const rows: [string, string][] = [
      ["이름", valueToText(applicant)],
      ["연락처", valueToText(rec.phone ?? (rec.profile as any)?.phone)],
      ["이메일", valueToText(rec.email ?? (rec.profile as any)?.email)],
    ];

    // ── 프로필 질문들 세로로 나열 ──
    profileKeys.forEach((k) => {
      rows.push([labelForKey(k), valueToText((rec.profile as any)?.[k])]);
    });

    rows.forEach(([q, a]) => {
      lines.push([csvCell(q), csvCell(a)].join(","));
    });
  });

  // 엑셀 한글 깨짐 방지: UTF-8 BOM
  return "\uFEFF" + lines.join("\r\n");
}

// KST(한국시간) 표기
function fmtKST(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

// 브라우저에서 CSV 파일 다운로드 실행
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 중복 신청 감지: 같은 연락처(우선) 또는 이메일 기준으로 몇 번째 신청인지 계산.
//  접수일시 오름차순으로 정렬해 1,2,3… 순번을 매긴다.
export function computeDuplicateIndex(records: DiagnosisRecord[]): Map<string, number> {
  const norm = (s?: string | null) => (s ? s.replace(/[^0-9a-zA-Z가-힣@.]/g, "").toLowerCase() : "");
  const keyOf = (r: DiagnosisRecord) => {
    const phone = norm(r.phone ?? (r.profile as any)?.phone);
    if (phone) return `p:${phone}`;
    const email = norm(r.email ?? (r.profile as any)?.email);
    if (email) return `e:${email}`;
    return "";
  };
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const counter = new Map<string, number>();
  const result = new Map<string, number>();
  sorted.forEach((r) => {
    const k = keyOf(r);
    if (!k) {
      result.set(r.id, 1);
      return;
    }
    const next = (counter.get(k) ?? 0) + 1;
    counter.set(k, next);
    result.set(r.id, next);
  });
  return result;
}
