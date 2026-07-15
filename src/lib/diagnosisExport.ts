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
  };
  const collect = (fields: Record<string, { label: string }>) => {
    Object.entries(fields).forEach(([k, v]) => {
      // 라벨에서 괄호 안 부가설명 제거 → 표 헤더로 깔끔하게
      map[k] = (v.label || k).replace(/\s*\(.*?\)\s*/g, "").trim();
    });
  };
  collect(STEP1_FIELDS as any);
  collect(STEP2_FIELDS as any);
  collect(STEP3_FIELDS as any);
  collect(STEP3_CONDITIONAL_FIELDS as any);
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
  created_at: string;
  dupIndex?: number; // 몇 번째 신청인지 (중복 감지 결과)
};

// 여러 진단서를 하나의 CSV(엑셀)로 변환.
//  세로 방식: 각 진단서를 블록으로 이어 붙여, 고객이 많아도 항목이 안 잘림.
export function diagnosesToCsv(records: DiagnosisRecord[]): string {
  const lines: string[] = [];
  records.forEach((rec, i) => {
    if (i > 0) {
      lines.push(""); // 진단서 사이 빈 줄
      lines.push(""); // 고객이 많을 때 구분이 잘 되도록 한 줄 더
    }
    const applicant = rec.name || (rec.profile as any)?.name || "이름미입력";
    const phoneText = valueToText(rec.phone ?? (rec.profile as any)?.phone);
    // ── 어떤 고객인지 한눈에 보이도록 상단에 이름·연락처를 굵게 표시 ──
    lines.push(csvCell(`════════════════════════════════════`));
    lines.push(csvCell(`■ 고객 진단서 #${i + 1}  ▶  ${applicant} (${phoneText})`));
    lines.push(csvCell(`════════════════════════════════════`));
    lines.push([csvCell("항목"), csvCell("내용")].join(","));
    // 기본 메타
    lines.push([csvCell("접수일시"), csvCell(fmtKST(rec.created_at))].join(","));
    if (rec.dupIndex && rec.dupIndex > 1) {
      lines.push([csvCell("중복 신청"), csvCell(`${rec.dupIndex}번째 신청 (동일 연락처/이메일)`)].join(","));
    }
    lines.push([csvCell("이름"), csvCell(valueToText(applicant))].join(","));
    lines.push([csvCell("연락처"), csvCell(valueToText(rec.phone ?? (rec.profile as any)?.phone))].join(","));
    lines.push([csvCell("이메일"), csvCell(valueToText(rec.email ?? (rec.profile as any)?.email))].join(","));
    // 프로필(질문 답변) 전체 — 라벨을 한글로
    Object.entries(rec.profile || {}).forEach(([k, v]) => {
      if (["name", "phone", "email"].includes(k)) return; // 위에서 이미 출력
      lines.push([csvCell(labelForKey(k)), csvCell(valueToText(v))].join(","));
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
