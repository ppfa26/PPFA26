// ════════════════════════════════════════════════════════════════
//  고객 진단서 - 한글 라벨 매핑 + 엑셀(CSV) 다운로드 유틸
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
    // ★ 관리자 진단서 표시용 한글 라벨 보강 (대표님 요청 - 영어로 뜨던 항목 한글 통일) ★
    //   질문 설정에 라벨이 비어있거나(purposes) 설정 파일에 없어서(interests·bnoVerified·phoneConsult)
    //   영어 key 그대로 노출되던 것을, 원 질문을 짧게 요약한 한글 라벨로 덮어쓴다.
    //   ※ 표시 라벨만 바꾸는 것 - 진단/매칭 로직에는 전혀 영향 없음.
    purposes: "필요한 지원 항목",
    interests: "관심 분야",
    bnoVerified: "사업자번호 국세청 검증",
  };
  const collect = (fields: Record<string, { label: string }>) => {
    Object.entries(fields).forEach(([k, v]) => {
      // 라벨에서 괄호 안 부가설명 제거 → 표 헤더로 깔끔하게
      const cleaned = (v.label || "").replace(/\s*\(.*?\)\s*/g, "").trim();
      // 라벨이 비어있으면(예: purposes) 위에서 지정한 보강 라벨을 유지 - 빈 값으로 덮어쓰지 않음
      if (cleaned) map[k] = cleaned;
    });
  };
  collect(STEP1_FIELDS as any);
  collect(STEP2_FIELDS as any);
  collect(STEP3_FIELDS as any);
  collect(STEP3_CONDITIONAL_FIELDS as any);

  // ★ 관리자 표 가독성용 - 긴 질문형 라벨을 짧은 명사형으로 요약 (대표님 요청) ★
  //   진단/결과 화면에는 원문 질문이 그대로 노출되고, 여기(관리자 진단서 표·엑셀)에서만 축약해 보인다.
  //   collect 이후에 덮어써야 요약본이 최종 적용된다.
  const shortLabels: Record<string, string> = {
    revenueGrowth2y: "최근 2년 매출 매년 10%↑",
    smartFactory: "스마트공장 구축·도입",
    smartDevice: "매장 스마트기기 사용",
    govSelected: "정부 선정 프로그램 이력",
    reFounder: "재창업 [재도전] 여부",
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

// ════════════════════════════════════════════════════════════════
//  상담용 "보기 편한 순서" (대표님 요청 - 질문지 순서 대신 상담 흐름에 맞게 재배치)
//    상담원이 위→아래로 훑을 때 관련 항목이 모여 있도록 5개 그룹으로 묶는다.
//    ① 기본/연락 정보  ② 사업 개요  ③ 자금·신용 상태  ④ 자격·강점  ⑤ 니즈
//    · 진단서 화면 표와 엑셀(CSV/xlsx) 다운로드가 모두 이 순서를 따른다.
//    ※ 여기 없는 예상 밖 키는 정렬 시 맨 뒤로 밀린다(누락 방지).
//    ※ 표시 순서만 바꾸는 것 - 진단/매칭 로직에는 전혀 영향 없음.
// ════════════════════════════════════════════════════════════════
export const DIAGNOSIS_KEY_ORDER: string[] = [
  // ── ① 기본 · 연락 정보 ──
  "name",              // 이름
  "phone",             // 연락처
  "email",             // 이메일
  "bno",               // 사업자등록번호
  "bnoStatus",         // 사업자 상태
  "bnoVerified",       // 사업자번호 국세청 검증
  "region",            // 지역
  "age",               // 대표자 연령
  "phoneConsult",      // 전화 무료 상담 희망

  // ── ② 사업 개요 ──
  "businessType",      // 사업자 구분(개인/법인)
  "industries",        // 업종
  "revenue",           // 연매출 규모
  "years",             // 업력(사업자등록증명원상)
  "employees",         // 직원 수
  "revenueGrowth2y",   // 최근 2년 매출 매년 10%↑

  // ── ③ 자금 · 신용 상태 ──
  "credit",            // 대표자 개인 신용점수
  "capitalImpairment", // 자본잠식 상태[법인]
  "bankruptcy",        // 대표자 회생·파산 상태
  "taxDelinquent",     // 국세·지방세 완납 여부
  "collateral",        // 담보 보유 여부
  "wantsRefinance",    // 저금리 대환 희망

  // ── ④ 자격 · 강점 ──
  "certifications",    // 특허·인증 보유
  "innovation",        // 혁신성장 분야 해당
  "smartFactory",      // 스마트공장 구축·도입
  "smartDevice",       // 매장 스마트기기 사용
  "govSelected",       // 정부 선정 프로그램 이력
  "reFounder",         // 재창업[재도전] 여부
  "privateInvestment", // 민간 투자(엔젤·VC) 여부

  // ── ⑤ 니즈 ──
  "purposes",          // 필요한 지원 항목(필요한 정부지원사업)
  "currentInstitutions", // 현재 이용 정책기관
];

// ↓ 참조 유지용(빌드 경고 방지) - 위 명시 순서에 빠진 키가 생기면 자동으로 뒤에 붙여 누락을 막는다.
const _ALL_FIELD_KEYS: string[] = [
  ...Object.keys(STEP1_FIELDS),
  ...Object.keys(STEP2_FIELDS),
  ...Object.keys(STEP3_CONDITIONAL_FIELDS),
  ...Object.keys(STEP3_FIELDS),
];
for (const k of _ALL_FIELD_KEYS) {
  if (!DIAGNOSIS_KEY_ORDER.includes(k)) DIAGNOSIS_KEY_ORDER.push(k);
}

const KEY_ORDER_INDEX: Record<string, number> = DIAGNOSIS_KEY_ORDER.reduce(
  (acc, k, i) => {
    acc[k] = i;
    return acc;
  },
  {} as Record<string, number>
);

// 진단서 항목 키들을 "정식 질문 순서"로 정렬한다.
//   순서 목록에 없는 키는 뒤로 밀되, 원래 등장 순서는 유지(안정 정렬).
export function sortKeysByQuestionOrder(keys: string[]): string[] {
  const BIG = DIAGNOSIS_KEY_ORDER.length + 1000;
  return keys
    .map((k, i) => ({ k, i }))
    .sort((a, b) => {
      const oa = KEY_ORDER_INDEX[a.k] ?? BIG + a.i;
      const ob = KEY_ORDER_INDEX[b.k] ?? BIG + b.i;
      return oa - ob;
    })
    .map((x) => x.k);
}

// 키 → 한글 라벨 (없으면 키 그대로)
export function labelForKey(key: string): string {
  return DIAGNOSIS_LABELS[key] ?? key;
}

// ★ 엑셀(XML) 손상 방지 - 셀 문자열에서 허용되지 않는 제어문자 제거 ★
//   XML 1.0 스펙상 \x09(탭)·\x0A(LF)·\x0D(CR) 외의 제어문자(\x00~\x1F 등)는 넣을 수 없다.
//   고객 프로필 데이터에 이런 문자가 섞여 있으면 Excel이 "파일 손상, 복구할까요?"를 띄우므로 미리 제거.
export function sanitizeCellText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// 값(배열/객체/원시)을 사람이 읽기 쉬운 문자열로
export function valueToText(v: unknown): string {
  let out: string;
  if (v === null || v === undefined || v === "") out = "-";
  else if (Array.isArray(v)) out = v.length ? v.join(", ") : "-";
  else if (typeof v === "object") out = JSON.stringify(v);
  else out = String(v);
  return sanitizeCellText(out);
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
  // ★ 상담 관리 상태 (대표님 요청) ★ 엑셀 제목 줄에 미접촉/통화 완료/부재중/계약을 그대로 표시
  //   admin 에서 leadNotes(localStorage) 를 읽어 채워 넣는다. 없으면 '미접촉'으로 취급.
  callStatusLabel?: string;
};

// ── 진단서 1명 분량을 "제목 + (질문,답변) 행들"로 구성하는 공통 헬퍼 ──
//   CSV·엑셀(xlsx) 두 출력이 완전히 같은 순서·내용을 쓰도록 한 곳에서 만든다.
type DiagBlock = {
  title: string;
  isPartial: boolean;
  rows: [string, string][];
  titleFillArgb: string; // 제목 줄 배경색 (상담 상태별)
};

// 상담 상태 라벨 → 엑셀 제목 줄 배경색 (화면 뱃지 색감과 맞춤)
//   미접촉=연회색 · 통화 완료=연파랑 · 부재중=연노랑 · 계약=연초록
function callStatusFillArgb(label: string): string {
  switch (label) {
    case "통화 완료":
      return "FFDCEBFA"; // 연파랑
    case "부재중":
      return "FFFDF0D5"; // 연노랑
    case "계약":
      return "FFDCF5E7"; // 연초록
    case "미접촉":
    default:
      return "FFEFF1F3"; // 연회색
  }
}

function buildDiagBlocks(records: DiagnosisRecord[]): DiagBlock[] {
  // ── 모든 고객에 공통으로 쓸 질문(행) 순서를 통일한다 ──
  const collected: string[] = [];
  const seen = new Set<string>();
  records.forEach((rec) => {
    Object.keys(rec.profile || {}).forEach((k) => {
      if (["name", "phone", "email"].includes(k)) return; // 기본 항목으로 따로 처리
      // 예전 질문지에만 있던 항목(과세유형·관심 분야) - 지금 질문지엔 없으므로 엑셀에서도 제외 (대표님 요청)
      if (["bnoTaxType", "interests"].includes(k)) return;
      if (!seen.has(k)) {
        seen.add(k);
        collected.push(k);
      }
    });
  });
  // ★ 정식 질문 순서로 정렬 (대표님 요청 - 엑셀도 실제 질문 순서와 동일하게) ★
  const profileKeys = sortKeysByQuestionOrder(collected);

  return records.map((rec) => {
    const applicant = rec.name || (rec.profile as any)?.name || "이름미입력";
    const bizType = valueToText((rec.profile as any)?.businessType);
    const phoneText = valueToText(rec.phone ?? (rec.profile as any)?.phone);
    const bnoText = valueToText((rec.profile as any)?.bno);
    const dupNote =
      rec.dupIndex && rec.dupIndex > 1 ? ` · ${rec.dupIndex}번째 신청(중복)` : "";
    const isPartial = rec.status === "partial";
    // ★ 상담 관리 상태를 맨 앞에 표시 (대표님 요청) - 미접촉/통화 완료/부재중/계약 ★
    //   없으면 '미접촉'으로 취급. 진단이 미완료(중간이탈)면 뒤에 표시를 덧붙여 전화 리드 구분.
    const callLabel = rec.callStatusLabel || "미접촉";
    const statusNote = isPartial
      ? `[${callLabel}] [미완료-중간이탈]`
      : `[${callLabel}]`;

    const headerParts = [statusNote, applicant];
    if (bizType !== "-") headerParts.push(bizType);
    if (phoneText !== "-") headerParts.push(phoneText);
    if (bnoText !== "-") headerParts.push(bnoText);
    headerParts.push(fmtKST(rec.created_at));
    const title = sanitizeCellText(`■ ${headerParts.join(" · ")}${dupNote}`);

    const rows: [string, string][] = [
      ["이름", valueToText(applicant)],
      ["연락처", valueToText(rec.phone ?? (rec.profile as any)?.phone)],
      ["이메일", valueToText(rec.email ?? (rec.profile as any)?.email)],
    ];
    profileKeys.forEach((k) => {
      rows.push([labelForKey(k), valueToText((rec.profile as any)?.[k])]);
    });

    // 미완료(중간이탈)는 상담 상태와 무관하게 연빨강으로 강조(전화 리드 즉시 구분)
    const titleFillArgb = isPartial ? "FFFDE2E1" : callStatusFillArgb(callLabel);

    return { title, isPartial, rows, titleFillArgb };
  });
}

// 여러 진단서를 하나의 CSV(엑셀)로 변환 - ★세로 방식★ (대표님 요청)
//  화면 질문지처럼 A열=질문 / B열=답변 이 세로로 쭉 나열됩니다.
export function diagnosesToCsv(records: DiagnosisRecord[]): string {
  const lines: string[] = [];
  const blocks = buildDiagBlocks(records);

  blocks.forEach((b, i) => {
    if (i > 0) lines.push(""); // 사람 사이 빈 줄 1칸으로 구분
    lines.push(csvCell(b.title));
    lines.push([csvCell("질문"), csvCell("답변")].join(","));
    b.rows.forEach(([q, a]) => {
      lines.push([csvCell(q), csvCell(a)].join(","));
    });
  });

  // 엑셀 한글 깨짐 방지: UTF-8 BOM
  return "\uFEFF" + lines.join("\r\n");
}

// ════════════════════════════════════════════════════════════════
//  ★ 진짜 엑셀(.xlsx) 다운로드 (대표님 요청 - 열 너비 넉넉히, 열자마자 한눈에) ★
//    · A열=질문, B열=답변 (세로형 유지)
//    · 열 너비를 넓게 지정 → 내용이 잘리지 않고 바로 보임
//    · 사람 구분 제목 줄(연한 파랑) / 질문·답변 헤더(굵게 회색) 스타일
//    · 미완료(중간이탈) 고객 제목 줄은 연한 빨강으로 강조 → 전화 돌릴 리드 즉시 구분
//    · exceljs는 무거우므로 다운로드 시점에만 동적 import (초기 로딩 영향 0)
// ════════════════════════════════════════════════════════════════
export async function diagnosesToXlsxBlob(records: DiagnosisRecord[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "모두의사업친구";
  wb.created = new Date();
  // ★ 파일 손상("복구하시겠습니까?") 원인이던 views 설정 제거 ★
  //   기존 views:[{state:"frozen",ySplit:0}] 는 '행을 하나도 고정하지 않는데 frozen 상태'라는
  //   OOXML 규격 위반 pane 을 만들어 Excel이 파일 손상으로 판단, 복구 대화상자를 띄웠다.
  //   이 파일은 사람마다 제목·헤더가 반복되므로 틀 고정이 불필요 → 아예 제거한다.
  const ws = wb.addWorksheet("고객진단서");

  // 열 너비 넉넉히 - 질문(라벨) 28, 답변 60 (긴 답변도 한눈에)
  ws.columns = [
    { key: "q", width: 30 },
    { key: "a", width: 62 },
  ];

  const blocks = buildDiagBlocks(records);

  blocks.forEach((b, i) => {
    if (i > 0) {
      ws.addRow([]); // 사람 사이 빈 줄 1칸
    }

    // ── 제목 줄 (2칸 병합 + 배경색) ──
    const titleRow = ws.addRow([b.title]);
    ws.mergeCells(`A${titleRow.number}:B${titleRow.number}`);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 12, color: { argb: "FF1F2937" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      // 상담 상태별 색 (미접촉=회색·통화완료=파랑·부재중=노랑·계약=초록, 미완료=빨강)
      fgColor: { argb: b.titleFillArgb },
    };
    titleCell.alignment = { vertical: "middle", wrapText: true };
    titleRow.height = 22;

    // ── 질문 | 답변 헤더 줄 ──
    const headRow = ws.addRow(["질문", "답변"]);
    headRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF374151" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    // ── 데이터 행들 ──
    b.rows.forEach(([q, a]) => {
      const r = ws.addRow([q, a]);
      r.getCell(1).font = { bold: true, color: { argb: "FF6B7280" } };
      r.getCell(1).alignment = { vertical: "top" };
      r.getCell(2).alignment = { vertical: "top", wrapText: true };
      r.eachCell((cell) => {
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
        };
      });
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// 브라우저에서 xlsx 파일 다운로드 실행
export async function downloadDiagnosesXlsx(
  filename: string,
  records: DiagnosisRecord[]
): Promise<void> {
  const blob = await diagnosesToXlsxBlob(records);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
