"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";
import { classifyIp } from "@/lib/ipClassify";
import {
  labelForKey,
  valueToText,
  sortKeysByQuestionOrder,
  downloadDiagnosesXlsx,
  downloadCsv,
  computeDuplicateIndex,
  type DiagnosisRecord,
} from "@/lib/diagnosisExport";
import {
  loadAllLeadNotes,
  saveLeadNote,
  CALL_STATUS_META,
  CALL_STATUS_ORDER,
  type CallStatus,
  type LeadNote,
} from "@/lib/leadNotes";

/* ------------------------------------------------------------------ */
/*  타입                                                               */
/* ------------------------------------------------------------------ */
type Stats = {
  total_users: number;
  total_paid: number;
  total_revenue: number;
  month_revenue: number;
  active_members: number;
};

type AdminUser = {
  user_id: string;
  email: string;
  full_name?: string | null; // 소셜 로그인 메타데이터에서 온 회원 이름(카카오 닉네임 등)
  joined_at: string;
  last_sign_in: string | null;
  paid_count: number;
  total_amount: number;
  credits_total: number;
  credits_used: number;
  latest_expiry: string | null;
  utm_source: string | null;
};

type AdminPayment = {
  order_id: string;
  email: string;
  tier: string;
  amount: number;
  status: string;
  credits_total: number;
  credits_used: number;
  paid_at: string | null;
  expires_at: string | null;
};

type AdminDiagnosis = {
  id: string;
  user_id?: string | null; // ★ 진단서를 소유한 회원 uid (link_diagnosis_user 로 연결)
  email: string | null;
  name: string | null;
  phone: string | null;
  profile: Record<string, unknown>;
  matched_programs: unknown;
  status?: string | null; // 'completed'(완료) | 'partial'(미완료·중간이탈)
  created_at: string;
};
type DailyRow = { day: string; revenue: number; cnt: number };
type MonthlyRow = { month: string; revenue: number; cnt: number };
type AccessRow = {
  email: string | null;
  ip: string | null;
  device_kind: string | null;
  path: string | null;
  created_at: string;
};
type IpRow = { ip: string; hits: number; users: number; last_seen: string };
/**
 * IP별 어뷰징 판단용 파생 데이터 (프론트에서 접속 로그로 직접 계산).
 *  - diagCount : 이 IP가 진단 관련 페이지(/diagnosis*, /matching-preview)를 연 횟수
 *  - isMember  : 이 IP에서 로그인(이메일 있는) 접속이 한 번이라도 있었는지
 *  ※ Supabase RPC를 건드리지 않고, 이미 로드된 access 로그만으로 계산한다.
 */
type IpDerived = { diagCount: number; isMember: boolean };
type BlockRow = {
  kind: string;
  value: string;
  reason: string | null;
  created_at: string;
};

type Phase = "loading" | "denied" | "ready";
// 상단 탭: '고객 관리'(회원+진단서+통합) 하나로 합치고, 그 안에서 CustView 토글로 전환
type Tab = "customers" | "payments" | "revenue" | "access";
// 고객 관리 탭 내부 보기 모드
type CustView = "unified" | "diags";

/* ------------------------------------------------------------------ */
/*  유틸                                                               */
/* ------------------------------------------------------------------ */
const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

const fmtDate = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const fmtDateTime = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  return `${fmtDate(s)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

const daysLeft = (s: string | null) => {
  if (!s) return null;
  const diff = new Date(s).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const tierName = (t: string) => TIER_MAP?.[t as keyof typeof TIER_MAP]?.name ?? t;

// 유입경로(광고 채널) 코드 → 화면 배지(이모지+이름+색)
const utmBadge = (src: string | null) => {
  const key = (src || "direct").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    daangn: { label: "🥕 당근", cls: "bg-orange-100 text-orange-700" },
    meta: { label: "📘 메타", cls: "bg-blue-100 text-blue-700" },
    instagram: { label: "📷 인스타", cls: "bg-pink-100 text-pink-700" },
    naver: { label: "🟢 네이버", cls: "bg-green-100 text-green-700" },
    google: { label: "🔍 검색유입", cls: "bg-sky-100 text-sky-700" },
    kakao: { label: "💬 카카오", cls: "bg-yellow-100 text-yellow-800" },
    youtube: { label: "▶️ 유튜브", cls: "bg-red-100 text-red-700" },
    threads: { label: "🧵 스레드", cls: "bg-gray-800 text-white" },
    tiktok: { label: "🎵 틱톡", cls: "bg-gray-800 text-white" },
    band: { label: "🟩 밴드", cls: "bg-lime-100 text-lime-700" },
    direct: { label: "🔗 직접유입", cls: "bg-gray-100 text-gray-500" },
    etc: { label: "🌐 기타", cls: "bg-gray-100 text-gray-500" },
  };
  return map[key] ?? { label: `🌐 ${src}`, cls: "bg-gray-100 text-gray-600" };
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "결제완료", cls: "bg-emerald-100 text-emerald-700" },
    pending: { label: "대기중", cls: "bg-amber-100 text-amber-700" },
    cancelled: { label: "취소됨", cls: "bg-gray-200 text-gray-600" },
    refunded: { label: "환불됨", cls: "bg-rose-100 text-rose-700" },
  };
  const v = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${v.cls}`}>
      {v.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  통계 카드                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      {/* 라벨·금액이 좁은 카드에서 세로로 쪼개지지 않도록 한 줄 고정(whitespace-nowrap) */}
      <p className="whitespace-nowrap text-xs font-semibold text-gray-500 sm:text-sm">
        {label}
      </p>
      <p
        className={`mt-1.5 whitespace-nowrap text-xl font-extrabold sm:text-2xl lg:text-3xl ${accent}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 whitespace-nowrap text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  메인                                                               */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  // ── 관리자 대시보드도 진입 즉시 화면 폭에 맞게 보이도록 fit-to-width (대표님 요청) ──
  //  layout.tsx 가 서버에서 device-width 로 렌더링 → 여기서 width=820(initial-scale 없음)으로
  //  '전환'하면 브라우저(삼성인터넷·사파리)가 폭에 맞게 자동 축소한다(결과창과 동일한 검증 방식).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement | null;
    if (!meta) return;
    const prev = meta.getAttribute("content");
    meta.setAttribute("content", "width=820, maximum-scale=5, user-scalable=yes");
    return () => {
      if (prev) meta.setAttribute("content", prev);
    };
  }, []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [tab, setTab] = useState<Tab>("customers");
  const [custView, setCustView] = useState<CustView>("unified"); // 고객 관리 내부 보기

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [diagnoses, setDiagnoses] = useState<AdminDiagnosis[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [ipSummary, setIpSummary] = useState<IpRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [openDiag, setOpenDiag] = useState<string | null>(null);
  const [selectedDiag, setSelectedDiag] = useState<Set<string>>(new Set()); // 체크선택 다운로드용
  const [openDay, setOpenDay] = useState<string | null>(null); // 매출-일별 펼침 (YYYY-MM-DD)
  const [openMonth, setOpenMonth] = useState<string | null>(null); // 매출-월별 펼침 (YYYY-MM)
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [crawling, setCrawling] = useState(false); // 정부공고 수집 진행중
  // 데이터 로딩 진단 - RPC가 실패하면 (권한/함수누락 등) 원인을 화면에 그대로 표시한다.
  const [loadDebug, setLoadDebug] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState(""); // 회원 검색어(이름·이메일·연락처)
  const [userSourceFilter, setUserSourceFilter] = useState("all"); // 유입경로 필터(all=전체)
  // 회원 목록 정렬: 키 + 방향(desc=내림차순 기본). 기본은 가입일 최신순.
  const [userSort, setUserSort] = useState<{
    key: "joined_at" | "last_sign_in" | "paid_count" | "total_amount";
    dir: "asc" | "desc";
  }>({ key: "joined_at", dir: "desc" });
  const [diagSearch, setDiagSearch] = useState(""); // 진단서 검색어(이름·이메일·연락처·업종·사업자번호)
  const [unifiedSearch, setUnifiedSearch] = useState(""); // 통합 고객 뷰 검색어
  const [openUnified, setOpenUnified] = useState<string | null>(null); // 통합 카드 펼침(key)
  const [unifiedCall, setUnifiedCall] = useState<"all" | CallStatus>("all"); // 통화상태 필터
  const [unifiedMemoDraft, setUnifiedMemoDraft] = useState<Record<string, string>>({}); // 통합 카드 메모 입력

  // IP 집계·접속 로그 표가 세로로 너무 길어서 기본은 접어두고, 헤더 클릭 시 펼침.
  const [ipListOpen, setIpListOpen] = useState(false); // 🌐 IP별 접속 집계 접기/펼치기
  const [accessLogOpen, setAccessLogOpen] = useState(false); // 🕑 최근 접속 로그 접기/펼치기

  // 리드(상담 대상) 메모·통화 상태 - 브라우저 localStorage 기반 (DB 불필요)
  const [leadNotes, setLeadNotes] = useState<Record<string, LeadNote>>({});
  // 메모 입력창 임시 상태 (진단서 id → 입력중인 메모 텍스트)
  const [memoDraft, setMemoDraft] = useState<Record<string, string>>({});

  // 마운트 시 저장된 리드 메모 로드
  useEffect(() => {
    setLeadNotes(loadAllLeadNotes());
  }, []);

  // 무료진단 링크 복사 - 고객에게 카톡으로 진단 링크 보낼 때 원클릭
  // ※ 항상 한글 도메인으로 복사 (window.location.origin 은 퓨니코드 xn--... 로 나올 수 있어 고정)
  const copyDiagnosisLink = async () => {
    const url = "https://모두의사업친구.kr";
    try {
      await navigator.clipboard.writeText(url);
      setMsg("무료진단 링크를 복사했어요. 고객에게 붙여넣기 하세요.");
    } catch {
      // 클립보드 권한이 없을 때는 링크를 그대로 보여준다.
      setMsg(`복사 실패 - 이 링크를 직접 복사하세요: ${url}`);
    }
    setTimeout(() => setMsg(null), 3500);
  };

  // 🕵️ IP별 어뷰징 판단 데이터 - 접속 로그(access)를 IP 기준으로 훑어
  //   ① 진단 페이지를 몇 번 열었는지(diagCount), ② 로그인(회원) 접속이 있었는지(isMember)를 계산.
  //   ※ '회원가입 안 하고 진단 조회만 반복'하는 IP를 관리자가 눈으로 골라 차단하기 위함.
  //     서버 RPC를 건드리지 않고, 이미 불러온 access 로그만으로 만든다.
  const ipDerived = useMemo(() => {
    // 진단 관련 경로 판정 (/diagnosis, /diagnosis-chat, /diagnosis-form, /matching-preview)
    const isDiagPath = (p: string | null) => {
      if (!p) return false;
      return p.startsWith("/diagnosis") || p.startsWith("/matching-preview");
    };
    const map = new Map<string, IpDerived>();
    for (const row of access) {
      if (!row.ip) continue;
      const cur = map.get(row.ip) ?? { diagCount: 0, isMember: false };
      if (isDiagPath(row.path)) cur.diagCount += 1;
      // 이메일이 채워진 접속 로그가 하나라도 있으면 = 이 IP에서 로그인한 회원.
      if (row.email && row.email !== "-") cur.isMember = true;
      map.set(row.ip, cur);
    }
    return map;
  }, [access]);

  // 📊 요약 리포트 - 오늘/이번주/이번달 신규가입·진단접수·결제·매출을 집계한다.
  //  (관리자 계정은 회원 수에서 제외하지 않고, 실제 유입 판단은 대표님이 직접 확인)
  const reportData = useMemo(() => {
    const now = new Date();
    // 오늘 0시
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 이번 주 월요일 0시 (월요일 시작 기준)
    const dow = (now.getDay() + 6) % 7; // 월=0 ... 일=6
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dow);
    // 이번 달 1일 0시
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const inRange = (iso: string | null, from: Date) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t >= from.getTime();
    };
    const countUsers = (from: Date) => users.filter((u) => inRange(u.joined_at, from)).length;
    const countDiag = (from: Date) => diagnoses.filter((d) => inRange(d.created_at, from)).length;
    const paidIn = (from: Date) =>
      payments.filter((p) => p.status === "paid" && inRange(p.paid_at, from));
    const sumAmount = (list: AdminPayment[]) => list.reduce((s, p) => s + (p.amount || 0), 0);

    const build = (from: Date) => {
      const pays = paidIn(from);
      return {
        users: countUsers(from),
        diag: countDiag(from),
        pay: pays.length,
        revenue: sumAmount(pays),
      };
    };
    return {
      today: build(startOfToday),
      week: build(startOfWeek),
      month: build(startOfMonth),
      total: {
        users: users.length,
        diag: diagnoses.length,
        pay: payments.filter((p) => p.status === "paid").length,
        revenue: sumAmount(payments.filter((p) => p.status === "paid")),
      },
    };
  }, [users, diagnoses, payments]);

  // 통화 상태 변경
  const setCallStatus = (id: string, status: CallStatus) => {
    setLeadNotes(saveLeadNote(id, { status }));
  };
  // 메모 저장
  const saveMemo = (id: string) => {
    const memo = memoDraft[id] ?? leadNotes[id]?.memo ?? "";
    setLeadNotes(saveLeadNote(id, { memo }));
    setMsg("메모를 저장했어요.");
    setTimeout(() => setMsg(null), 2000);
  };

  // 중복 신청 순번 (같은 연락처/이메일 기준 몇 번째 신청인지)
  const dupIndexMap = computeDuplicateIndex(diagnoses as unknown as DiagnosisRecord[]);

  // 매출 통계 드릴다운용: 특정 일자(YYYY-MM-DD) 또는 월(YYYY-MM)에 해당하는
  // 개별 결제 건을 payments 에서 뽑아온다. (daily/monthly 집계와 동일한 로컬시간 기준)
  const paymentsByDay = (dayKey: string) =>
    payments
      .filter((p) => {
        if (p.status !== "paid" || !p.paid_at) return false;
        const dt = new Date(p.paid_at);
        const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
          dt.getDate()
        ).padStart(2, "0")}`;
        return k === dayKey;
      })
      .sort((a, b) => (a.paid_at! < b.paid_at! ? 1 : -1));
  const paymentsByMonth = (monKey: string) =>
    payments
      .filter((p) => {
        if (p.status !== "paid" || !p.paid_at) return false;
        const dt = new Date(p.paid_at);
        const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        return k === monKey;
      })
      .sort((a, b) => (a.paid_at! < b.paid_at! ? 1 : -1));

  // 체크박스 토글
  const toggleSelectDiag = (id: string) => {
    setSelectedDiag((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllDiag = () => {
    setSelectedDiag((prev) =>
      prev.size === diagnoses.length ? new Set() : new Set(diagnoses.map((d) => d.id))
    );
  };

  // 진단서 → 다운로드용 레코드로 변환 (중복 순번 + 상담 상태 라벨 포함)
  const toRecords = (list: AdminDiagnosis[]): DiagnosisRecord[] =>
    list.map((d) => {
      // ★ 상담 관리 상태(localStorage)를 엑셀 제목 줄에 실어 보낸다 (대표님 요청) ★
      //   미접촉/통화 완료/부재중/계약. 기록 없으면 '미접촉'(none).
      const st = leadNotes[d.id]?.status ?? "none";
      return {
        id: d.id,
        email: d.email,
        name: d.name,
        phone: d.phone,
        profile: (d.profile || {}) as Record<string, unknown>,
        status: d.status,
        created_at: d.created_at,
        dupIndex: dupIndexMap.get(d.id),
        callStatusLabel: CALL_STATUS_META[st]?.label ?? "미접촉",
      };
    });

  // 엑셀(.xlsx) 다운로드 - 전체 / 선택 / 개별 (열 너비 넉넉히·열자마자 한눈에)
  const downloadAllDiag = async () => {
    if (diagnoses.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await downloadDiagnosesXlsx(`고객진단서_전체_${stamp}`, toRecords(diagnoses));
    } catch {
      setMsg("엑셀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setTimeout(() => setMsg(null), 3000);
    }
  };
  const downloadSelectedDiag = async () => {
    const list = diagnoses.filter((d) => selectedDiag.has(d.id));
    if (list.length === 0) {
      setMsg("먼저 다운로드할 진단서를 체크해 주세요.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await downloadDiagnosesXlsx(`고객진단서_선택${list.length}건_${stamp}`, toRecords(list));
    } catch {
      setMsg("엑셀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setTimeout(() => setMsg(null), 3000);
    }
  };
  const downloadOneDiag = async (d: AdminDiagnosis) => {
    const applicant = d.name || (d.profile as any)?.name || "고객";
    // 동명이인 구분을 위해 연락처 뒤 4자리를 파일명에 추가
    const rawPhone = String(d.phone || (d.profile as any)?.phone || "").replace(/[^0-9]/g, "");
    const tail = rawPhone.length >= 4 ? `_${rawPhone.slice(-4)}` : "";
    const stamp = new Date(d.created_at).toISOString().slice(0, 10);
    try {
      await downloadDiagnosesXlsx(`고객진단서_${applicant}${tail}_${stamp}`, toRecords([d]));
    } catch {
      setMsg("엑셀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setTimeout(() => setMsg(null), 3000);
    }
  };

  // 회원 목록 CSV 다운로드 - 세무·백업·문자발송 명단용 (진단서에서 이름·연락처 역추적 포함)
  const downloadUsersCsv = () => {
    if (users.length === 0) return;
    const headers = [
      "이름",
      "이메일",
      "연락처",
      "유입경로",
      "가입일",
      "최근접속",
      "결제건수",
      "누적금액",
      "조회권(사용/전체)",
      "열람기한",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = users.map((u) => {
      // 연락처·이름은 ① 이메일 정확매칭(userInfoByEmail) → ② 이름/연락처 폴백(findUserDiagnosis)
      //   순으로 진단서에서 역추적한다. (소셜 로그인 이메일 ≠ 진단서 이메일인 경우 대비)
      const info = userInfoByEmail(u.email);
      const diag = findUserDiagnosis(u.email); // 폴백까지 포함된 진단서
      const diagPhone =
        info.phone || diag?.phone || (diag?.profile as any)?.phone || "";
      const diagName =
        info.name || diag?.name || (diag?.profile as any)?.name || "";
      const name = (u.full_name && u.full_name.trim()) || diagName || "";
      return [
        name,
        u.email || "",
        diagPhone,
        u.utm_source || "direct",
        fmtDate(u.joined_at),
        fmtDate(u.last_sign_in),
        `${u.paid_count}건`,
        u.total_amount || 0,
        `${u.credits_used}/${u.credits_total}`,
        u.latest_expiry ? fmtDate(u.latest_expiry) : "",
      ]
        .map(esc)
        .join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`회원목록_${users.length}명_${stamp}`, csv);
  };

  // 진단서 삭제 (관리자) - 관리자 전용 RPC 사용
  //  ※ diagnoses 테이블은 RLS(행 보안)로 직접 DELETE가 막혀 있어,
  //    is_admin() 검사를 통과한 관리자만 실행되는 서버 함수로 삭제한다.
  const deleteDiag = async (d: AdminDiagnosis) => {
    const applicant = d.name || (d.profile as any)?.name || "이 고객";
    if (!window.confirm(`${applicant} 님의 진단서를 삭제할까요?\n(되돌릴 수 없습니다)`)) return;
    const { data, error } = await supabase.rpc("admin_delete_diagnosis", { p_id: d.id });
    if (error) {
      setMsg(`삭제 실패: ${error.message}`);
    } else if (!data || Number(data) < 1) {
      setMsg("삭제할 진단서를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    } else {
      setDiagnoses((prev) => prev.filter((x) => x.id !== d.id));
      setSelectedDiag((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
      setMsg("진단서를 삭제했습니다.");
    }
    setTimeout(() => setMsg(null), 4000);
  };

  // 진단서 선택 삭제 (여러 건 한 번에) - 관리자 전용 RPC 사용
  const deleteSelectedDiag = async () => {
    const ids = Array.from(selectedDiag);
    if (ids.length === 0) {
      setMsg("먼저 삭제할 진단서를 체크해 주세요.");
      setTimeout(() => setMsg(null), 4000);
      return;
    }
    if (!window.confirm(`선택한 ${ids.length}건의 진단서를 삭제할까요?\n(되돌릴 수 없습니다)`)) return;
    const { data, error } = await supabase.rpc("admin_delete_diagnoses", { p_ids: ids });
    if (error) {
      setMsg(`삭제 실패: ${error.message}`);
    } else {
      setDiagnoses((prev) => prev.filter((x) => !selectedDiag.has(x.id)));
      setSelectedDiag(new Set());
      setMsg(`진단서 ${Number(data) || ids.length}건을 삭제했습니다.`);
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    // ※ 일별/월별 매출은 서버 RPC 대신 payList로 직접 재계산하므로(관리자 제외), 여기서 호출하지 않는다.
    const [s, u, p, d, ac, ip, bl] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_list_payments"),
      supabase.rpc("admin_list_diagnoses"),
      supabase.rpc("admin_list_access", { p_limit: 200 }),
      supabase.rpc("admin_ip_summary"),
      supabase.rpc("admin_list_blocks"),
    ]);

    // ── 로딩 진단: 어떤 RPC가 실패했는지 정확히 수집 (권한 없음/함수 누락 등) ──
    const errs: string[] = [];
    if (s.error) errs.push(`admin_stats: ${s.error.message}`);
    if (u.error) errs.push(`admin_list_users: ${u.error.message}`);
    if (p.error) errs.push(`admin_list_payments: ${p.error.message}`);
    if (d.error) errs.push(`admin_list_diagnoses: ${d.error.message}`);
    if (ac.error) errs.push(`admin_list_access: ${ac.error.message}`);
    if (ip.error) errs.push(`admin_ip_summary: ${ip.error.message}`);
    if (bl.error) errs.push(`admin_list_blocks: ${bl.error.message}`);

    // 데이터 로딩 중 오류가 발생하면 관리자에게만 조용히 알림 (정상이면 배너 없음)
    setLoadDebug(errs.length > 0 ? `⚠️ 일부 데이터 로딩 오류: ${errs.join(" | ")}` : null);
    // ★ 관리자(운영자) 계정 데이터도 일반 고객과 동일하게 목록·통계에 포함 (대표님 요청) ★
    //   테스트 단계 종료로, 관리자 무료진단·회원가입·접속기록도 고객과 똑같이 노출한다.
    const payList = !p.error && p.data ? (p.data as AdminPayment[]) : [];
    const userList = !u.error && u.data ? (u.data as AdminUser[]) : [];
    const diagList = !d.error && d.data ? (d.data as AdminDiagnosis[]) : [];

    if (!u.error && u.data) setUsers(userList);
    if (!p.error && p.data) setPayments(payList);
    if (!d.error && d.data) setDiagnoses(diagList);
    if (!ac.error && ac.data) setAccess(ac.data as AccessRow[]);
    if (!ip.error && ip.data) setIpSummary(ip.data as IpRow[]);
    if (!bl.error && bl.data) setBlocks(bl.data as BlockRow[]);

    // ★ 매출 통계(일별/월별)를 프론트에서 직접 재계산 (관리자 포함 전체 결제 기준) ★
    const paidRows = payList.filter((r) => r.status === "paid" && r.paid_at);

    // 일별 매출 (최근 30일) - YYYY-MM-DD 로 묶어 집계
    const dailyMap = new Map<string, { revenue: number; cnt: number }>();
    // 월별 매출 (최근 12개월) - YYYY-MM 로 묶어 집계
    const monthlyMap = new Map<string, { revenue: number; cnt: number }>();
    for (const r of paidRows) {
      const dt = new Date(r.paid_at as string);
      const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate()
      ).padStart(2, "0")}`;
      const monKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const dCur = dailyMap.get(dayKey) ?? { revenue: 0, cnt: 0 };
      dCur.revenue += r.amount || 0;
      dCur.cnt += 1;
      dailyMap.set(dayKey, dCur);
      const mCur = monthlyMap.get(monKey) ?? { revenue: 0, cnt: 0 };
      mCur.revenue += r.amount || 0;
      mCur.cnt += 1;
      monthlyMap.set(monKey, mCur);
    }
    const dailyRebuilt: DailyRow[] = Array.from(dailyMap.entries())
      .map(([day, v]) => ({ day, revenue: v.revenue, cnt: v.cnt }))
      .sort((a, b) => (a.day < b.day ? 1 : -1)) // 최신순
      .slice(0, 30);
    const monthlyRebuilt: MonthlyRow[] = Array.from(monthlyMap.entries())
      .map(([month, v]) => ({ month, revenue: v.revenue, cnt: v.cnt }))
      .sort((a, b) => (a.month < b.month ? 1 : -1)) // 최신순
      .slice(0, 12);
    setDaily(dailyRebuilt);
    setMonthly(monthlyRebuilt);

    // 통계: 관리자 결제를 뺀 값으로 재계산 (매출·결제건수·회원수·유효회원)
    if (!s.error && s.data?.[0]) {
      const base = s.data[0] as Stats;
      const paid = paidRows;
      const now = new Date();
      const monthRevenue = paid
        .filter((r) => {
          const d = new Date(r.paid_at as string);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      // 유효 회원 = 관리자 제외 회원 중 열람 기한(latest_expiry)이 아직 남은 사람 수
      const activeMembers = userList.filter((row) => {
        if (!row.latest_expiry) return false;
        return new Date(row.latest_expiry).getTime() > Date.now();
      }).length;
      setStats({
        ...base,
        total_users: userList.length,
        active_members: activeMembers,
        total_paid: paid.length,
        total_revenue: paid.reduce((sum, r) => sum + (r.amount || 0), 0),
        month_revenue: monthRevenue,
      });
    }
    setRefreshing(false);
  }, []);

  /* ------- IP/계정 차단 · 해제 · 기기 초기화 ------- */
  const doBlock = async (kind: "ip" | "email", value: string) => {
    const reason = window.prompt(`[${value}] 차단 사유를 입력하세요 (선택)`, "어뷰징 의심");
    const { data, error } = await supabase.rpc("admin_block", {
      p_kind: kind,
      p_value: value,
      p_reason: reason ?? "",
    });
    setMsg(error ? `오류: ${error.message}` : String(data));
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };
  const doUnblock = async (kind: string, value: string) => {
    const { data, error } = await supabase.rpc("admin_unblock", {
      p_kind: kind,
      p_value: value,
    });
    setMsg(error ? `오류: ${error.message}` : String(data));
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };
  const resetDevice = async (email: string) => {
    if (!window.confirm(`${email} 님의 기기 등록을 초기화할까요?\n(다음 접속 기기로 재등록됩니다)`))
      return;
    const { data, error } = await supabase.rpc("admin_reset_device", {
      p_email: email,
    });
    setMsg(error ? `오류: ${error.message}` : String(data));
    setTimeout(() => setMsg(null), 4000);
  };
  // 정부지원사업 공고 수집(기업마당 OpenAPI) - 관리자 세션 토큰으로 서버 호출
  const runCrawl = async () => {
    if (crawling) return;
    if (
      !window.confirm(
        "기업마당에서 최신 정부지원사업 공고를 지금 수집할까요?\n(최대 수백 건, 30초~1분 정도 걸릴 수 있습니다)"
      )
    )
      return;
    setCrawling(true);
    setMsg("공고 수집 중… 잠시만 기다려 주세요.");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        setMsg("로그인 세션이 만료되었습니다. 새로고침 후 다시 시도해 주세요.");
        setCrawling(false);
        return;
      }
      const res = await fetch("/api/crawl?pages=3", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) {
        // 진짜 실패(저장 0건 + 오류) 일 때만 여기로 온다.
        const detail = Array.isArray(j?.errors) && j.errors.length ? ` (${j.errors[0]})` : "";
        setMsg(`수집 실패: ${j?.note || "오류"}${detail}`);
      } else {
        // 성공(부분성공 포함). 소스별 건수를 그대로 보여줌.
        const ps = j?.per_source || {};
        const parts = Object.entries(ps)
          .filter(([, n]) => Number(n) > 0)
          .map(([name, n]) => `${name} ${n}건`);
        const srcText = parts.length ? parts.join(" · ") : "기업마당";
        // 일부 소스가 실패/스킵됐으면 꼬리표로 안내(경고 아님)
        const partialTail =
          Array.isArray(j?.errors) && j.errors.length
            ? ` ※ 일부 소스 지연: ${j.errors[0]}`
            : "";
        setMsg(
          `✅ 공고 수집 완료 - 조회 ${j.fetched ?? 0}건 / 저장·갱신 ${j.saved ?? 0}건 (${srcText})${partialTail}`
        );
      }
    } catch (e: any) {
      setMsg(`수집 실패: ${e?.message || "네트워크 오류"}`);
    } finally {
      setCrawling(false);
      setTimeout(() => setMsg(null), 8000);
    }
  };
  // 접속 로그 전체 삭제 (테스트 기록 정리용)
  const clearAccessLogs = async () => {
    if (
      !window.confirm(
        "접속 로그를 모두 삭제할까요?\n(IP별 집계 + 최근 접속 로그가 함께 초기화됩니다. 되돌릴 수 없습니다)"
      )
    )
      return;
    const { data, error } = await supabase.rpc("admin_clear_access_logs");
    setMsg(error ? `오류: ${error.message}` : `접속 로그를 정리했습니다. ${String(data ?? "")}`);
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };
  // 특정 IP의 접속 로그만 삭제
  const deleteAccessByIp = async (ip: string) => {
    if (!window.confirm(`[${ip}] IP의 접속 기록을 삭제할까요?\n(되돌릴 수 없습니다)`)) return;
    const { data, error } = await supabase.rpc("admin_delete_access_by_ip", {
      p_ip: ip,
    });
    setMsg(error ? `오류: ${error.message}` : `[${ip}] 접속 기록을 삭제했습니다. ${String(data ?? "")}`);
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };
  // 회원 이메일 → 그 회원이 작성한 진단서의 이름/연락처를 찾아온다 (가장 최근 것 우선)
  const userInfoByEmail = (email: string | null): { name: string | null; phone: string | null } => {
    if (!email) return { name: null, phone: null };
    const matched = diagnoses
      .filter((d) => (d.email || (d.profile as any)?.email) === email)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const t = matched[0];
    if (!t) return { name: null, phone: null };
    return {
      name: t.name || (t.profile as any)?.name || null,
      phone: t.phone || (t.profile as any)?.phone || null,
    };
  };

  // 회원 이메일 → 그 회원이 접속에 쓴 IP 목록(중복 제거, 최근 순). 접속 로그(access) 기반.
  //  · "누가 어떤 IP를 쓰는지" 한눈에 보고, 같은 IP를 여러 계정이 쓰면 어뷰징 의심용.
  const ipsByEmail = (email: string | null): string[] => {
    if (!email) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const a of access) {
      if (a.email !== email) continue;
      const ip = (a.ip || "").trim();
      if (!ip || seen.has(ip)) continue;
      seen.add(ip);
      list.push(ip);
    }
    return list;
  };

  // 한 IP를 몇 개의 서로 다른 회원(이메일)이 썼는지 → 2 이상이면 '공유 IP(의심)'.
  //  (같은 사람이 여러 계정 만들어 무료로 여러 번 쓰는지 빠르게 감지)
  const emailCountByIp = (() => {
    const map = new Map<string, Set<string>>();
    for (const a of access) {
      const ip = (a.ip || "").trim();
      const em = (a.email || "").trim();
      if (!ip || !em) continue;
      if (!map.has(ip)) map.set(ip, new Set());
      map.get(ip)!.add(em);
    }
    return (ip: string) => map.get(ip)?.size ?? 0;
  })();

  // user_id → 회원 가입 이메일 (진단서↔회원 연결의 가장 확실한 키)
  const emailByUserId = (() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.user_id) map.set(String(u.user_id), u.email);
    }
    return (uid: string | null | undefined): string | null =>
      uid ? map.get(String(uid)) ?? null : null;
  })();

  // 진단서 → 어느 '회원 계정(가입 이메일)'의 것인지 역추적.
  //  ★ 우선순위 ★
  //   1) user_id 로 직접 연결 (link_diagnosis_user 로 채워진 가장 확실한 키)
  //   2) 진단서 자체 이메일
  //   3) 전화번호로 회원 역추적 (소셜 로그인 등 이메일이 비어있는 경우 대비)
  //  회원 이름은 카카오 닉네임, 진단서 이름은 실제 대표자명이라 서로 달라
  //  '이름 매칭'은 신뢰할 수 없으므로 쓰지 않는다.
  const memberEmailForDiagnosis = (d: AdminDiagnosis): string | null => {
    // 1) user_id 직접 연결 (가장 확실 - link_diagnosis_user 로 채워진 값)
    const byUid = emailByUserId(d.user_id);
    if (byUid) return byUid;
    // 2) 진단서에 이메일이 실제로 있으면 그대로 (소셜 로그인은 대부분 비어있음)
    const direct = d.email || ((d.profile as any)?.email as string) || "";
    if (direct.trim()) return direct.trim();
    // 3) 그 외에는 억지로 잇지 않는다(오연결 방지). null 반환 → 뱃지 미표시.
    return null;
  };

  // ════════════════════════════════════════════════════════════════
  //  ★ 통합 고객 뷰(대표님 요청: "한눈에 다 보이게 합치기") ★
  //  회원 + 그 회원의 진단서 + 결제 + 접속 IP 를 '사람 단위'로 하나로 합친다.
  //  · 기준(그룹 키): 회원은 email, 회원 없는 진단서는 전화번호(digits).
  //  · 회원↔진단서 연결: user_id(가장 확실) → 이메일 → (회원 없으면 전화번호).
  //  탭을 오가며 대조할 필요 없이 카드 한 장에서 전부 보이게 하는 것이 목적.
  // ════════════════════════════════════════════════════════════════
  type UnifiedCustomer = {
    key: string;
    email: string | null;         // 회원 가입 이메일(있으면)
    memberName: string | null;    // 회원 계정 이름(카카오 닉네임 등)
    realName: string | null;      // 진단서의 실제 대표자명
    phone: string | null;         // 진단서 연락처
    bizType: string | null;       // 업종(개인/법인 등)
    bno: string | null;           // 사업자번호
    joinedAt: string | null;      // 가입일
    lastSignIn: string | null;    // 최근 접속
    paidCount: number;            // 결제 건수
    totalAmount: number;          // 누적 결제액
    creditsLeft: number;          // 남은 조회권
    diagList: AdminDiagnosis[];   // 이 사람의 진단서(최신순)
    isMember: boolean;            // 회원 계정 존재 여부
    diagDone: boolean;            // 완료 진단 존재 여부
    ips: string[];                // 접속 IP(최근순)
    latestAt: string;            // 정렬용 최신 활동 시각
    noteKey: string | null;       // 상담메모/통화상태 저장 키(대표 진단서 id)
    expiry: string | null;        // 열람 기한(latest_expiry)
    // ↓ 회원 관리(구 '회원' 탭)를 통합 카드로 흡수하기 위한 필드
    creditsTotal: number;         // 결제한 조회권 총량
    creditsUsed: number;          // 사용한 조회권
    utmSource: string | null;     // 유입경로(광고 채널)
  };

  const unifiedCustomers: UnifiedCustomer[] = (() => {
    const onlyDigits = (v: string | null | undefined) => (v || "").replace(/[^0-9]/g, "");
    const byCreatedDesc = (a: AdminDiagnosis, b: AdminDiagnosis) =>
      a.created_at < b.created_at ? 1 : -1;

    // 진단서를 회원별로 배분(각 진단서는 한 명에게만). 남는 건 전화번호 그룹으로.
    const usedDiagIds = new Set<string>();
    const list: UnifiedCustomer[] = [];

    // 진단서 전화번호 인덱스(과거 데이터는 전화번호가 유일한 공통키)
    const diagPhone = (d: AdminDiagnosis) =>
      onlyDigits(d.phone || (d.profile as any)?.phone);

    // 1) 회원 기준 카드
    for (const u of users) {
      const acctUid = u.user_id ? String(u.user_id) : null;
      // 1-1) user_id / 이메일 직접 매칭
      const mine = diagnoses
        .filter((d) => {
          if (usedDiagIds.has(d.id)) return false;
          // user_id 직접 매칭이 최우선
          if (acctUid && d.user_id && String(d.user_id) === acctUid) return true;
          // 이메일 매칭(진단서에 이메일이 실제로 있는 경우)
          const dEmail = (d.email || (d.profile as any)?.email || "").trim();
          if (dEmail && dEmail === u.email) return true;
          return false;
        })
        .sort(byCreatedDesc);

      // 1-2) 전화번호 매칭 — 위에서 붙은 진단서들의 전화번호로 나머지 과거 진단서까지 끌어옴
      //  (닉네임≠실명이라 이름 매칭은 불가하지만, 전화번호는 진단서에 100% 존재)
      const myPhones = new Set(mine.map(diagPhone).filter((p) => /^010\d{8}$/.test(p)));
      if (myPhones.size > 0) {
        const byPhone = diagnoses.filter((d) => {
          if (usedDiagIds.has(d.id)) return false;
          if (mine.some((m) => m.id === d.id)) return false;
          const ph = diagPhone(d);
          return /^010\d{8}$/.test(ph) && myPhones.has(ph);
        });
        byPhone.forEach((d) => mine.push(d));
        mine.sort(byCreatedDesc);
      }

      mine.forEach((d) => usedDiagIds.add(d.id));

      const top = mine[0];
      const p = (top?.profile || {}) as any;
      const ips = ipsByEmail(u.email);
      const done = mine.some((d) => (d.status || "completed") === "completed");
      const latest = [u.last_sign_in, u.joined_at, top?.created_at]
        .filter(Boolean)
        .sort()
        .pop() as string | undefined;

      list.push({
        key: `u:${u.email}`,
        email: u.email,
        memberName: u.full_name || null,
        realName: top?.name || p?.name || null,
        phone: top?.phone || p?.phone || null,
        bizType: p?.businessType || null,
        bno: p?.bno || null,
        joinedAt: u.joined_at,
        lastSignIn: u.last_sign_in,
        paidCount: u.paid_count || 0,
        totalAmount: u.total_amount || 0,
        creditsLeft: Math.max(0, (u.credits_total || 0) - (u.credits_used || 0)),
        diagList: mine,
        isMember: true,
        diagDone: done,
        ips,
        latestAt: latest || u.joined_at || "",
        noteKey: top?.id || null,
        expiry: u.latest_expiry,
        creditsTotal: u.credits_total || 0,
        creditsUsed: u.credits_used || 0,
        utmSource: u.utm_source || null,
      });
    }

    // 2) 정책: 결과 열람은 '회원가입 필수'이므로 실제 고객 = 전원 회원.
    //    가입하지 않고 진단만 하다 이탈한 비회원 진단서는 실고객이 아니므로
    //    통합보기에서 제외한다(고객 수 착시 제거). 이 이탈 진단서는 '진단서' 보기 탭에
    //    그대로 남아 있어 팔로우업/엑셀에는 계속 활용할 수 있다.
    //    → 통합보기 = 회원(users) 기준 그대로. usedDiagIds 로 회원에 흡수된 진단서만 카드에 포함됨.

    // 최신 활동순 정렬
    return list.sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));
  })();

  // 통합 카드의 통화 상태(대표 진단서의 leadNote 기준)
  const callStatusOf = (c: UnifiedCustomer): CallStatus =>
    (c.noteKey && leadNotes[c.noteKey]?.status) || "none";

  // 통합 뷰 검색: 이름(회원/실명)·이메일·전화·사업자번호·업종 어디에 걸려도 검색
  //  + 통화상태 필터(미접촉/통화완료/부재중/계약)
  const filteredUnified = unifiedCustomers.filter((c) => {
    if (unifiedCall !== "all" && callStatusOf(c) !== unifiedCall) return false;
    // 유입경로 필터(구 회원 탭 필터를 통합보기에 적용)
    if (userSourceFilter !== "all" && (c.utmSource || "direct").toLowerCase() !== userSourceFilter) return false;
    const q = unifiedSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [c.email, c.memberName, c.realName, c.phone, c.bno, c.bizType]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const digitsHay = `${c.phone || ""} ${c.bno || ""}`.replace(/[^0-9]/g, "");
    const digitsQ = q.replace(/[^0-9]/g, "");
    return hay.includes(q) || (digitsQ.length >= 2 && digitsHay.includes(digitsQ));
  });

  // 통화상태별 인원 집계(필터 버튼 옆 숫자용)
  const unifiedCallCounts = unifiedCustomers.reduce<Record<string, number>>((acc, c) => {
    const s = callStatusOf(c);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // ── 실무자용 오늘 지표(상단 KPI) ──────────────────────────
  // 오늘(로컬 기준) 새로 들어온 진단서 = 오늘 생긴 신규 리드
  const todayLeadCount = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const start = new Date(y, m, d).getTime();
    const end = start + 86400000;
    return diagnoses.filter((x) => {
      const t = new Date(x.created_at).getTime();
      return !Number.isNaN(t) && t >= start && t < end;
    }).length;
  })();

  // 회원 검색 필터 - 이메일·이름·연락처 어디에 걸려도 검색됨
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    const info = userInfoByEmail(u.email);
    const hay = [u.email, u.full_name, info.name, info.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    // 연락처는 숫자만으로도 검색되게
    const digitsHay = (info.phone || "").replace(/[^0-9]/g, "");
    const digitsQ = q.replace(/[^0-9]/g, "");
    return hay.includes(q) || (digitsQ.length >= 2 && digitsHay.includes(digitsQ));
  });

  // 유입경로별 회원 수 집계 - 드롭다운에 "인스타 (3)"처럼 개수 표시용
  const userSourceCounts = users.reduce<Record<string, number>>((acc, u) => {
    const key = (u.utm_source || "direct").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // 검색 결과에 유입경로 필터 + 정렬을 순서대로 얹는다. (원본 검색 로직은 그대로 유지)
  const sortedUsers = filteredUsers
    .filter((u) =>
      userSourceFilter === "all"
        ? true
        : (u.utm_source || "direct").toLowerCase() === userSourceFilter
    )
    .slice() // 원본 배열 훼손 방지
    .sort((a, b) => {
      const k = userSort.key;
      let av: number;
      let bv: number;
      if (k === "joined_at" || k === "last_sign_in") {
        av = a[k] ? new Date(a[k] as string).getTime() : 0;
        bv = b[k] ? new Date(b[k] as string).getTime() : 0;
      } else {
        av = (a[k] as number) || 0;
        bv = (b[k] as number) || 0;
      }
      return userSort.dir === "asc" ? av - bv : bv - av;
    });

  // 헤더 클릭 시 정렬 토글: 같은 키면 방향 반전, 다른 키면 그 키로 내림차순 시작
  const toggleUserSort = (key: typeof userSort.key) => {
    setUserSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  };
  // 정렬 화살표 표시(현재 정렬 중인 열에만)
  const sortArrow = (key: typeof userSort.key) =>
    userSort.key === key ? (userSort.dir === "asc" ? " ▲" : " ▼") : "";

  // 진단서 검색 필터 - 이름·이메일·연락처·업종·사업자번호 어디에 걸려도 검색됨
  const filteredDiagnoses = diagnoses.filter((d) => {
    const q = diagSearch.trim().toLowerCase();
    if (!q) return true;
    const p = (d.profile || {}) as Record<string, unknown>;
    const name = (d.name || (p.name as string) || "") + "";
    const email = (d.email || (p.email as string) || "") + "";
    const phone = (d.phone || (p.phone as string) || "") + "";
    const bizType = (p.businessType as string) || "";
    const bno = (p.bno as string) || "";
    const hay = [name, email, phone, bizType, bno]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    // 연락처·사업자번호는 숫자만으로도 검색되게
    const digitsHay = `${phone} ${bno}`.replace(/[^0-9]/g, "");
    const digitsQ = q.replace(/[^0-9]/g, "");
    return hay.includes(q) || (digitsQ.length >= 2 && digitsHay.includes(digitsQ));
  });

  // 회원 목록 → 그 회원의 고객 진단서로 바로 이동
  //  소셜 로그인(카카오/구글) 이메일과 진단서 작성 이메일/표기가 다를 수 있어
  //  ① 이메일 정확일치 → ② 이름 정확일치 → ③ 이름 부분일치 순으로 매칭하고,
  //  그래도 못 찾으면 무조건 '고객 진단서' 탭으로 이동하고 검색창에 이름을 넣어
  //  버튼이 '아무 반응 없는' 느낌을 없앤다(대표님 요청).
  const goToUserDiag = (email: string | null, fullName?: string | null) => {
    // 공백 제거 + 소문자로 통일(표기 차이 흡수)
    const norm = (v: unknown) =>
      String(v ?? "").replace(/\s+/g, "").toLowerCase();
    const emailKey = norm(email);
    const nameKey = norm(fullName);

    const byCreatedDesc = (a: AdminDiagnosis, b: AdminDiagnosis) =>
      a.created_at < b.created_at ? 1 : -1;
    const dEmail = (d: AdminDiagnosis) =>
      norm(d.email || (d.profile as any)?.email);
    const dName = (d: AdminDiagnosis) =>
      norm(d.name || (d.profile as any)?.name);

    // ① 이메일 정확 일치
    let matched = emailKey
      ? diagnoses.filter((d) => dEmail(d) === emailKey).sort(byCreatedDesc)
      : [];

    // ② 이름 정확 일치
    if (matched.length === 0 && nameKey) {
      matched = diagnoses.filter((d) => dName(d) === nameKey).sort(byCreatedDesc);
    }

    // ③ 이름 부분 일치(표기·오타·공백 차이까지 흡수)
    if (matched.length === 0 && nameKey.length >= 2) {
      matched = diagnoses
        .filter((d) => dName(d).includes(nameKey) || nameKey.includes(dName(d)))
        .sort(byCreatedDesc);
    }

    // ④ 그래도 못 찾으면 진단서 보기로 이동 + 검색창에 이름 자동 입력
    if (matched.length === 0) {
      setTab("customers");
      setCustView("diags");
      setDiagSearch(fullName?.trim() || "");
      setMsg(
        "정확히 일치하는 진단서를 못 찾아 '고객 관리 › 진단서' 보기로 이동했어요. 검색창에 이름을 넣어뒀으니 직접 확인해 주세요."
      );
      setTimeout(() => setMsg(null), 4000);
      return;
    }

    const target = matched[0];
    setTab("customers");
    setCustView("diags");
    setOpenDiag(target.id);
    // 탭 전환 렌더 후 해당 진단서로 스크롤 + 잠깐 강조
    setTimeout(() => {
      const el = document.getElementById(`diag-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand-orange");
        setTimeout(() => el.classList.remove("ring-2", "ring-brand-orange"), 2500);
      }
    }, 150);
  };

  // 진단서 하나(AdminDiagnosis)를 받아 그 '결과창'을 관리자 모드로 새 탭에서 연다.
  //   진단서에 저장된 profile(진단 원본)을 sessionStorage(mpp_diagnosis)에 심고
  //   /matching-preview?admin=1 로 열면 잠금 없이 전체 결과가 노출된다.
  //   (결제·조회권 차감이 없는 미리보기 페이지를 재사용 → 부작용 없음)
  const openResultForDiag = (target: AdminDiagnosis) => {
    // name/phone/email이 profile에 누락돼 있으면 컬럼값으로 보완한다.
    const profile: Record<string, unknown> = {
      ...(target.profile || {}),
    };
    if (!profile.name && target.name) profile.name = target.name;
    if (!profile.phone && target.phone) profile.phone = target.phone;
    if (!profile.email && target.email) profile.email = target.email;
    // 관리자 열람 배너에 항상 '누구 결과인지' 뜨게, 식별용 라벨을 따로 심는다.
    //   이름 없으면 → 연락처 → 이메일 순으로 대체 (상담 중 헷갈림 방지)
    const adminLabel =
      (profile.name as string) ||
      (profile.phone as string) ||
      (profile.email as string) ||
      "";
    (profile as any)._adminLabel = adminLabel;
    try {
      // ★ 중요 ★ 새 탭은 sessionStorage 를 공유하지 않으므로(특히 noopener),
      //   같은 도메인의 모든 탭이 공유하는 localStorage 의 '관리자 전용 임시 키'에 저장한다.
      //   결과창(matching-preview)은 ?admin=1 일 때 이 키를 최우선으로 읽는다.
      //   _adminLabel 플래그가 있어 대표님 마이페이지·대시보드는 본인 데이터가 아니라 무시한다.
      localStorage.setItem("mpp_diagnosis_admin", JSON.stringify(profile));
      // 예전 방식(sessionStorage)도 혹시 몰라 함께 심어 호환 유지
      sessionStorage.setItem("mpp_diagnosis", JSON.stringify(profile));
    } catch {
      setMsg("브라우저 저장소 오류로 결과를 열 수 없습니다.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    // 새 탭에서 관리자 열람 모드로 결과창 열기
    window.open("/matching-preview?admin=1", "_blank", "noopener");
  };

  // 회원 목록 → 그 고객의 '결과창'을 관리자 모드로 새 탭에서 열기.
  //   상담(전화·카톡) 중 고객과 같은 화면을 보며 안내하기 위한 기능.
  //   ★ 이메일이 딱 맞는 진단서가 없으면, 이름+연락처로도 다시 찾아본다(폴백). ★
  //     (비회원으로 진단 후 나중에 가입 등으로 진단서에 로그인 이메일이 안 붙는 경우 대비)
  //   ★ 진단서 찾기 로직을 함수로 분리 (회원 목록 버튼 활성/비활성 판단에도 재사용) ★
  //     이메일 정확 매칭 → 실패 시 이름/연락처 폴백. 찾으면 진단서, 없으면 null.
  const findUserDiagnosis = (email: string | null): AdminDiagnosis | null => {
    if (!email) return null;
    const byCreated = (a: AdminDiagnosis, b: AdminDiagnosis) =>
      a.created_at < b.created_at ? 1 : -1;

    // 0차(최우선): user_id 직접 매칭 - 진단서에 회원 uid 가 채워져 있으면 가장 확실.
    const acctUid = users.find((x) => x.email === email)?.user_id || null;
    if (acctUid) {
      const byUid = diagnoses
        .filter((d) => d.user_id && String(d.user_id) === String(acctUid))
        .sort(byCreated);
      if (byUid.length > 0) return byUid[0];
    }

    // 1차: 이메일 정확 매칭 (진단서 컬럼 email 또는 profile.email)
    let matched = diagnoses
      .filter((d) => (d.email || (d.profile as any)?.email) === email)
      .sort(byCreated);

    // 2차(폴백): 이메일로 못 찾으면, 이 회원의 이름/연락처로 진단서를 찾는다.
    if (matched.length === 0) {
      const info = userInfoByEmail(email); // { name, phone } (진단서에서 역추적)
      // 회원 계정 자체의 이름(소셜 로그인 닉네임)도 매칭 후보에 넣는다 (진단서 이메일이 안 붙은 경우 대비).
      const acctName = (users.find((x) => x.email === email)?.full_name || "").trim();
      const onlyDigits = (v: string | null | undefined) =>
        (v || "").replace(/[^0-9]/g, "");
      const phoneKey = onlyDigits(info.phone);
      const nameKey = (info.name || acctName || "").trim();
      if (phoneKey.length >= 8 || nameKey) {
        matched = diagnoses
          .filter((d) => {
            const dPhone = onlyDigits(d.phone || (d.profile as any)?.phone);
            const dName = ((d.name || (d.profile as any)?.name) as string | undefined || "").trim();
            const phoneHit = phoneKey.length >= 8 && dPhone === phoneKey;
            const nameHit = !!nameKey && dName === nameKey;
            return phoneHit || nameHit;
          })
          .sort(byCreated);
      }
    }
    return matched[0] ?? null;
  };

  const viewUserResult = (email: string | null) => {
    if (!email) {
      setMsg("이 회원은 이메일 정보가 없어 결과를 열 수 없습니다.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const target = findUserDiagnosis(email);
    if (!target) {
      setMsg(
        "이 회원은 아직 진단(설문)을 완료하지 않아 결과가 없습니다. (가입만 하고 진단 전인 회원)"
      );
      setTimeout(() => setMsg(null), 5000);
      return;
    }
    openResultForDiag(target);
  };

  // 조회권 환불(열람 차단) - 실제 결제 환불은 대표님이 PG사에서 처리하고,
  //   이 버튼은 '사이트에서 더 이상 정보를 못 보게' 조회권을 0으로 만들어 열람을 즉시 차단한다.
  //   (환불만 받고 정보를 계속 빼가는 것을 방지)
  const refundCredits = async (email: string | null) => {
    if (!email) return;
    if (
      !window.confirm(
        `${email} 님의 조회권을 환불(열람 차단) 처리할까요?\n\n` +
          `· 남은 조회권이 0이 되어 결과 페이지를 더 이상 볼 수 없게 됩니다.\n` +
          `· 실제 결제 금액 환불은 PG사에서 별도로 진행해 주세요.\n` +
          `(되돌리려면 초록색 '조회권 복구' 버튼을 누르면 됩니다)`
      )
    )
      return;
    const { data, error } = await supabase.rpc("admin_refund_credits", {
      p_email: email,
    });
    setMsg(
      error
        ? `오류: ${error.message}`
        : `${email} 님의 조회권을 차단(환불 처리)했습니다. (결제 ${String(data ?? 0)}건 열람 차단)`
    );
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  // 조회권 환불 취소(열람 복구) - 환불 처리했던 조회권을 되돌려 다시 볼 수 있게 한다.
  const restoreCredits = async (email: string | null) => {
    if (!email) return;
    if (
      !window.confirm(
        `${email} 님의 조회권을 복구(환불 취소)할까요?\n\n` +
          `· 결제했던 조회권이 되살아나 결과 페이지를 다시 볼 수 있게 됩니다.`
      )
    )
      return;
    const { data, error } = await supabase.rpc("admin_restore_credits", {
      p_email: email,
    });
    setMsg(
      error
        ? `오류: ${error.message}`
        : `${email} 님의 조회권을 복구했습니다. (결제 ${String(data ?? 0)}건 열람 재개)`
    );
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  // 회원 계정 삭제 - 관련 데이터(진단서·결제·기기)와 로그인 계정까지 제거. 되돌릴 수 없음.
  const deleteUser = async (email: string | null) => {
    if (!email) {
      setMsg("이 회원은 이메일 정보가 없어 삭제할 수 없습니다.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    if (
      !window.confirm(
        `${email} 님의 계정을 삭제할까요?\n\n` +
          `· 진단서 · 결제 내역 · 기기 등록 · 로그인 계정이 모두 삭제됩니다.\n` +
          `· 되돌릴 수 없습니다.\n\n정말 삭제하려면 [확인]을 눌러 주세요.`
      )
    )
      return;
    const { data, error } = await supabase.rpc("admin_delete_user", { p_email: email });
    setMsg(error ? `오류: ${error.message}` : String(data ?? "삭제 완료"));
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  // 개별 결제 건 삭제 (매출 통계 · 결제내역에서 1건씩 정리)
  const deletePayment = async (orderId: string) => {
    if (
      !window.confirm(
        `[${orderId}] 결제 건을 삭제할까요?\n(매출 통계·결제 내역에서 완전히 제거됩니다. 되돌릴 수 없습니다)`
      )
    )
      return;
    const { data, error } = await supabase.rpc("admin_delete_payment", {
      p_order_id: orderId,
    });
    setMsg(error ? `오류: ${error.message}` : `결제 건을 삭제했습니다. ${String(data ?? "")}`);
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setPhase("denied");
        return;
      }
      // 서버측 is_admin 으로 최종 판별 (admin_stats 호출 성공 여부)
      const test = await supabase.rpc("admin_stats");
      if (test.error) {
        setPhase("denied");
        return;
      }
      // ※ 관리자 미필터 값이 잠깐 보이지 않도록, 초기 setStats는 하지 않고 loadAll에서 필터된 값으로 채운다.
      setPhase("ready");
      await loadAll();
    })();
  }, [loadAll]);

  /* ------- 조회권 추가 ------- */
  const addCredits = async (orderId: string) => {
    const raw = window.prompt(`[${orderId}]\n추가할 조회권 개수를 입력하세요 (예: 1)`, "1");
    if (!raw) return;
    const add = parseInt(raw, 10);
    if (isNaN(add) || add === 0) return;
    const { data, error } = await supabase.rpc("admin_add_credits", {
      p_order_id: orderId,
      p_add: add,
    });
    setMsg(error ? `오류: ${error.message}` : String(data));
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  /* ------- 기한 연장 ------- */
  const extendExpiry = async (orderId: string) => {
    const raw = window.prompt(
      `[${orderId}]\n열람 기한을 며칠 연장할까요? (예: 30)`,
      "30"
    );
    if (!raw) return;
    const days = parseInt(raw, 10);
    if (isNaN(days) || days === 0) return;
    const { data, error } = await supabase.rpc("admin_extend_expiry", {
      p_order_id: orderId,
      p_days: days,
    });
    setMsg(error ? `오류: ${error.message}` : String(data));
    await loadAll();
    setTimeout(() => setMsg(null), 4000);
  };

  /* ================= 렌더 ================= */
  if (phase === "loading") {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-gray-50">
          <p className="animate-pulse text-gray-400">불러오는 중…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (phase === "denied") {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl">
              🔒
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">관리자 전용 페이지</h1>
            <p className="mt-2 text-sm text-gray-500">
              대표님 관리자 계정으로 로그인해야 접근할 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/signup"
                className="rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90"
              >
                관리자 로그인
              </Link>
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-8">
        {/* 대시보드 전체 최대폭(대표님 요청).
            회원 목록 테이블(min-w-920px + 관리 버튼 열)이 가로 스크롤 없이 들어가도록
            max-w-5xl(1024px)→max-w-6xl(1152px)로 넓힘. */}
        <div className="mx-auto max-w-6xl">
          {/* 상단 헤더 */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                🛠️ 관리자 대시보드
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                고객 상담 · 통화 · 결제 · 매출을 한 곳에서 관리하기
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/sns"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:scale-[1.02] hover:bg-gray-50"
                title="SNS 홍보글을 채널별로 자동 생성하는 글쓰기 허브"
              >
                📣 SNS 글쓰기 허브
              </Link>
              <button
                onClick={runCrawl}
                disabled={crawling}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:scale-[1.02] hover:bg-gray-50 disabled:opacity-50"
                title="기업마당에서 최신 정부지원사업 공고를 지금 수집합니다"
              >
                {crawling ? "공고 수집 중…" : "📡 공고 수집"}
              </button>
              <button
                onClick={loadAll}
                disabled={refreshing}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:scale-[1.02] hover:bg-gray-50 disabled:opacity-50"
              >
                {refreshing ? "새로고침 중…" : "🔄 새로고침"}
              </button>
            </div>
          </div>

          {msg && (
            <div className="mb-4 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-sm font-semibold text-brand-dark">
              {msg}
            </div>
          )}

          {/* 데이터 로딩 오류 배너 (정상 시에는 표시 안 됨) */}
          {loadDebug && (
            <div className="mb-4 break-keep rounded-xl border border-red-400/60 bg-red-50 px-4 py-3 text-xs font-semibold leading-relaxed text-red-900 sm:text-sm">
              {loadDebug}
            </div>
          )}

          {/* 통계 카드 - 실무(영업/상담) 우선 지표.
              클릭하면 고객 관리 › 통합보기에서 해당 통화상태로 바로 필터된다.
              (매출/회원 숫자는 매출 리포트 탭에서 상세 확인) */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* 오늘 신규 리드 - '오늘 전화할 대상' */}
            <button
              onClick={() => {
                setTab("customers");
                setCustView("diags");
              }}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left shadow-sm transition hover:scale-[1.02]"
              title="오늘 새로 접수된 진단(신규 리드) - 진단서 목록으로 이동"
            >
              <div className="text-[12px] font-semibold text-blue-500">🆕 오늘 신규 리드</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-700">{todayLeadCount}건</div>
            </button>
            {/* 미접촉 - 아직 전화 안 한 사람(가장 급한 액션) */}
            <button
              onClick={() => {
                setTab("customers");
                setCustView("unified");
                setUnifiedCall("none");
              }}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left shadow-sm transition hover:scale-[1.02]"
              title="아직 통화하지 않은 고객 - 통합보기에서 미접촉만 필터"
            >
              <div className="text-[12px] font-semibold text-rose-500">📞 미접촉(전화 필요)</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">{unifiedCallCounts["none"] ?? 0}명</div>
            </button>
            {/* 통화완료 */}
            <button
              onClick={() => {
                setTab("customers");
                setCustView("unified");
                setUnifiedCall("done");
              }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left shadow-sm transition hover:scale-[1.02]"
              title="통화 완료한 고객 - 통합보기에서 통화완료만 필터"
            >
              <div className="text-[12px] font-semibold text-emerald-500">✅ 통화완료</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{unifiedCallCounts["done"] ?? 0}명</div>
            </button>
            {/* 계약 - 성과 */}
            <button
              onClick={() => {
                setTab("customers");
                setCustView("unified");
                setUnifiedCall("contract");
              }}
              className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-left shadow-sm transition hover:scale-[1.02]"
              title="계약 완료 고객 - 통합보기에서 계약만 필터"
            >
              <div className="text-[12px] font-semibold text-brand-orange">🏆 계약</div>
              <div className="mt-1 text-2xl font-extrabold text-brand-orange">{unifiedCallCounts["contract"] ?? 0}명</div>
            </button>
            {/* 전체 회원 */}
            <StatCard
              label="전체 회원"
              value={`${stats?.total_users ?? 0}명`}
              accent="text-gray-900"
            />
            {/* 이번 달 매출 */}
            <StatCard
              label="이번 달 매출"
              value={won(stats?.month_revenue ?? 0)}
              sub={`${new Date().getMonth() + 1}월`}
              accent="text-brand-primary"
            />
          </section>

          {/* 탭(4개) - 성격이 같은 '보는 화면'끼리 한 줄에 균등 배치.
              고객관리(회원+진단서+통합) · 결제조회권 · 매출리포트 · 접속차단 */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(
              [
                ["customers", `👤 고객 관리 (${unifiedCustomers.length})`],
                ["payments", `💳 결제·조회권 (${payments.length})`],
                ["revenue", "📊 매출 리포트"],
                ["access", "🛡️ 접속 차단"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-[14px] font-bold transition hover:scale-[1.02] ${
                  tab === key
                    ? "bg-brand-dark text-white shadow"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 실행 버튼(누르면 바로 동작하는 것) - 탭과 시각적으로 구분해 아래 줄에 배치 */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={copyDiagnosisLink}
              className="whitespace-nowrap rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:scale-[1.02] hover:opacity-90"
              title="고객에게 보낼 무료진단 링크를 클립보드에 복사합니다"
            >
              🔗 진단링크 복사
            </button>
            <button
              onClick={downloadAllDiag}
              disabled={diagnoses.length === 0}
              className="whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm transition hover:scale-[1.02] hover:bg-gray-50 disabled:opacity-40"
              title="접수된 모든 고객 진단서를 엑셀(.xlsx)로 내려받습니다"
            >
              📋 진단서 엑셀
            </button>
          </div>

          {/* ======== 고객 관리 탭: 통합/회원/진단서 세그먼트 토글 ======== */}
          {tab === "customers" && (
            <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {(
                [
                  ["unified", `👤 고객 (${unifiedCustomers.length})`],
                  ["diags", `📋 진단서 (${diagnoses.length})`],
                ] as [CustView, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCustView(key)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-bold transition ${
                    custView === key
                      ? "bg-brand-dark text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ------- 통합 고객(회원+진단서+결제+IP를 사람 단위로 합침) ------- */}
          {tab === "customers" && custView === "unified" && (
            <div>
              {/* 🔍 통합 검색 - 이름·이메일·전화·사업자번호로 한 번에 */}
              <div className="mb-4 flex w-full flex-wrap items-center gap-2">
                <div className="relative w-full min-w-0 sm:w-auto sm:flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={unifiedSearch}
                    onChange={(e) => setUnifiedSearch(e.target.value)}
                    placeholder="통합 검색 - 이름 · 이메일 · 전화번호 · 사업자번호 (한 번에 찾기)"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-brand-orange"
                  />
                </div>
                {unifiedSearch && (
                  <button
                    onClick={() => setUnifiedSearch("")}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    ✕ 초기화
                  </button>
                )}
                {/* 오른쪽: 유입경로 필터 + 회원 명단 엑셀(구 회원 탭 기능 이관) */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <select
                    value={userSourceFilter}
                    onChange={(e) => setUserSourceFilter(e.target.value)}
                    className="whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:border-brand-orange"
                    title="유입경로(광고 채널)별로 걸러 봅니다"
                  >
                    <option value="all">🌐 전체 유입경로</option>
                    {Object.entries(userSourceCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, cnt]) => (
                        <option key={key} value={key}>
                          {utmBadge(key).label} ({cnt})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={downloadUsersCsv}
                    disabled={users.length === 0}
                    className="whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                    title="회원 명단을 엑셀(CSV)로 내려받습니다 - 이름·연락처·유입경로 포함"
                  >
                    ⬇️ 회원 엑셀
                  </button>
                </div>
              </div>
              {/* 통화상태 필터 - 영업 우선순위: 미접촉만 골라 보기 등 */}
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {([["all", "전체"], ...CALL_STATUS_ORDER.map((s) => [s, CALL_STATUS_META[s].label])] as [
                  "all" | CallStatus,
                  string,
                ][]).map(([key, label]) => {
                  const cnt =
                    key === "all" ? unifiedCustomers.length : unifiedCallCounts[key] || 0;
                  const active = unifiedCall === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setUnifiedCall(key)}
                      className={`rounded-full border px-3 py-1 text-[12px] font-bold transition ${
                        active
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label} {cnt}
                    </button>
                  );
                })}
              </div>
              <p className="mb-3 text-xs text-gray-500">
                한 사람의 <b>진단서 · 결제 · 상담메모 · IP</b>를 카드 하나에. 표시{" "}
                <b>{filteredUnified.length}</b>명 (실제 고객 = 가입 회원 기준).{" "}
                <span className="text-gray-400">
                  결과 열람은 회원가입 필수라, 가입 안 한 진단은 여기서 제외됩니다(‘진단서’ 보기에서 확인).
                </span>
              </p>

              <div className="space-y-3">
                {filteredUnified.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                    표시할 고객이 없습니다.
                  </div>
                )}
                {filteredUnified.map((c) => {
                  const isOpen = openUnified === c.key;
                  const dupCount = c.diagList.length;
                  const sharedIp = c.ips.find((ip) => emailCountByIp(ip) >= 2) || null;
                  const cs = callStatusOf(c);
                  const csMeta = CALL_STATUS_META[cs];
                  const dLeft = daysLeft(c.expiry);
                  return (
                    <div
                      key={c.key}
                      className={`overflow-hidden rounded-2xl border shadow-sm ${
                        c.paidCount > 0
                          ? "border-brand-orange/50 bg-white ring-1 ring-brand-orange/20"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {/* 카드 헤더 - 한 줄 요약 (클릭 시 펼침) */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenUnified(isOpen ? null : c.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenUnified(isOpen ? null : c.key);
                          }
                        }}
                        className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          {/* 1줄: 이름 + 통화상태 + 진단상태 (전원 회원이므로 회원뱃지는 생략) */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[15px] font-extrabold text-brand-dark">
                              {c.realName || c.memberName || "이름없음"}
                            </span>
                            {/* 통화상태 - 영업 핵심(미접촉/통화완료/부재중/계약) */}
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${csMeta.cls}`}>
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${csMeta.dot}`} />
                              {csMeta.short}
                            </span>
                            {c.diagDone ? (
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                진단완료
                              </span>
                            ) : c.diagList.length > 0 ? (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                진단중단
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                                가입만(진단전)
                              </span>
                            )}
                            {dupCount > 1 && (
                              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                                🔁 {dupCount}건
                              </span>
                            )}
                            {c.paidCount > 0 && (
                              <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                                💳 결제
                              </span>
                            )}
                            {c.creditsLeft > 0 && (
                              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-bold text-teal-700">
                                조회권 {c.creditsLeft}
                              </span>
                            )}
                            {/* 열람 기한 D-day (결제 회원만) */}
                            {c.expiry && dLeft !== null && (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                dLeft <= 3 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                              }`}>
                                {dLeft > 0 ? `D-${dLeft}` : "만료"}
                              </span>
                            )}
                          </div>
                          {/* 2줄: 연락처·업종·사업자번호 (상담 시 바로 보는 핵심) */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-gray-600">
                            {c.phone && <span className="font-bold text-gray-800">📞 {c.phone}</span>}
                            {c.bizType && <span>🏢 {c.bizType}</span>}
                            {c.bno && <span>#{c.bno}</span>}
                          </div>
                          {/* 3줄: IP (최대 2개, 공유 IP만 빨강 강조) */}
                          {c.ips.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="text-gray-400">🌐</span>
                              {c.ips.slice(0, 2).map((ip) => {
                                const shared = emailCountByIp(ip) >= 2;
                                return (
                                  <span
                                    key={ip}
                                    className={`rounded px-1.5 py-0.5 font-mono ${
                                      shared
                                        ? "bg-red-100 font-bold text-red-600"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                    title={shared ? `이 IP를 ${emailCountByIp(ip)}개 계정이 공유(어뷰징 의심)` : ""}
                                  >
                                    {ip}
                                    {shared ? ` ⚠️${emailCountByIp(ip)}` : ""}
                                  </span>
                                );
                              })}
                              {c.ips.length > 2 && (
                                <span className="text-gray-400">+{c.ips.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {/* 목록에서 바로 전화(카드 펼치지 않고도) */}
                          {c.phone && (
                            <a
                              href={`tel:${c.phone.replace(/[^0-9]/g, "")}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand-dark px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:opacity-90"
                              title={`${c.phone} 로 전화 걸기`}
                            >
                              📞 전화
                            </a>
                          )}
                          <div className="text-[11px] text-gray-400">
                            {fmtDateTime(c.latestAt)}
                          </div>
                          {c.totalAmount > 0 && (
                            <div className="text-[13px] font-bold text-brand-dark">
                              {c.totalAmount.toLocaleString()}원
                            </div>
                          )}
                          <div className="text-[11px] text-gray-400">
                            {isOpen ? "▲ 접기" : "▼ 상세"}
                          </div>
                        </div>
                      </div>

                      {/* 펼침: 영업 컨트롤 + 진단서 목록 + 결과 열람 버튼 */}
                      {isOpen && (
                        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                          {sharedIp && (
                            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                              ⚠️ 공유 IP({sharedIp}) 감지 - 같은 IP로 여러 계정이 접속했습니다. 무료 남용 의심.
                            </p>
                          )}

                          {/* 연락처 · 이메일 (상담 바로 실행) */}
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone.replace(/[^0-9]/g, "")}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-dark px-3 py-1.5 font-bold text-white hover:opacity-90"
                              >
                                📞 전화걸기
                              </a>
                            )}
                            {c.phone && (
                              <span className="font-mono text-gray-700">{c.phone}</span>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="text-gray-500 underline decoration-dotted hover:text-brand-dark"
                              >
                                ✉️ {c.email}
                              </a>
                            )}
                            {/* 회원 계정 닉네임(실명과 다를 때만 매칭 근거로 참고 표시) */}
                            {c.isMember && c.memberName && c.memberName !== c.realName && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-400">
                                회원계정: {c.memberName}
                              </span>
                            )}
                          </div>

                          {/* 영업 컨트롤: 통화상태 + 상담메모 (noteKey = 대표 진단서 id) */}
                          {c.noteKey ? (
                            <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                <span className="mr-1 text-[11px] font-bold text-gray-400">통화상태</span>
                                {CALL_STATUS_ORDER.map((st) => {
                                  const meta = CALL_STATUS_META[st];
                                  const on = cs === st;
                                  return (
                                    <button
                                      key={st}
                                      onClick={() => setCallStatus(c.noteKey!, st)}
                                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                        on
                                          ? meta.cls
                                          : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                                      }`}
                                    >
                                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${on ? meta.dot : "bg-gray-300"}`} />
                                      {meta.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex items-start gap-2">
                                <textarea
                                  value={unifiedMemoDraft[c.noteKey] ?? leadNotes[c.noteKey]?.memo ?? ""}
                                  onChange={(e) =>
                                    setUnifiedMemoDraft((prev) => ({ ...prev, [c.noteKey!]: e.target.value }))
                                  }
                                  placeholder="💬 상담 메모 (통화 내용, 니즈, 다음 액션 등)"
                                  rows={2}
                                  className="min-w-0 flex-1 resize-y rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-800 outline-none focus:border-brand-orange"
                                />
                                <button
                                  onClick={() => {
                                    const memo = unifiedMemoDraft[c.noteKey!] ?? leadNotes[c.noteKey!]?.memo ?? "";
                                    setLeadNotes(saveLeadNote(c.noteKey!, { memo }));
                                    setMsg("메모를 저장했어요.");
                                    setTimeout(() => setMsg(null), 2000);
                                  }}
                                  className="shrink-0 self-stretch rounded-lg bg-brand-orange px-3 text-[12px] font-bold text-white hover:opacity-90"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mb-3 text-[11px] text-gray-400">
                              진단서가 없어 상담 메모를 저장할 수 없습니다.
                            </p>
                          )}

                          {/* 회원 관리(구 '회원' 탭 기능을 카드로 흡수) - 회원(email)일 때만 */}
                          {c.email && (
                            <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
                              {/* 회원 요약 한 줄: 가입일 · 최근접속 · 유입경로 · 조회권 */}
                              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                <span className="font-bold text-gray-400">회원 관리</span>
                                {(() => {
                                  const b = utmBadge(c.utmSource);
                                  return (
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${b.cls}`}>
                                      {b.label}
                                    </span>
                                  );
                                })()}
                                {c.joinedAt && <span>가입 {fmtDate(c.joinedAt)}</span>}
                                {c.lastSignIn && <span>최근접속 {fmtDate(c.lastSignIn)}</span>}
                                <span>
                                  조회권 {c.creditsUsed}/{c.creditsTotal}
                                </span>
                              </div>
                              {/* 관리 버튼 */}
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  onClick={() => resetDevice(c.email!)}
                                  className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50"
                                >
                                  기기초기화
                                </button>
                                {c.creditsTotal > 0 && c.creditsUsed >= c.creditsTotal ? (
                                  <button
                                    onClick={() => restoreCredits(c.email)}
                                    className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50"
                                  >
                                    ↩️ 조회권 복구
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => refundCredits(c.email)}
                                    className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50"
                                  >
                                    💸 조회권 환불
                                  </button>
                                )}
                                <button
                                  onClick={() => doBlock("email", c.email!)}
                                  className="whitespace-nowrap rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                                >
                                  계정차단
                                </button>
                                <button
                                  onClick={() => deleteUser(c.email)}
                                  className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-red-700"
                                >
                                  🗑️ 삭제
                                </button>
                              </div>
                            </div>
                          )}

                          {c.diagList.length === 0 ? (
                            <p className="text-[12px] text-gray-400">
                              작성한 진단서가 없습니다. (가입만 하고 진단 전)
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {c.diagList.map((d, i) => {
                                const p = (d.profile || {}) as any;
                                const done = (d.status || "completed") === "completed";
                                return (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1 text-[12px]">
                                      <span className="font-bold text-gray-700">
                                        {dupCount > 1 ? `${i + 1}번째 · ` : ""}
                                        {done ? "완료" : "중단"}
                                      </span>
                                      <span className="ml-2 text-gray-500">
                                        {p?.businessType || ""}
                                        {p?.bno ? ` · #${p.bno}` : ""}
                                      </span>
                                      <span className="ml-2 text-gray-400">
                                        {fmtDateTime(d.created_at)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => openResultForDiag(d)}
                                      className="shrink-0 rounded-lg bg-brand-dark px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90"
                                    >
                                      결과 열람
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------- 결제·조회권 관리 ------- */}
          {tab === "payments" && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="whitespace-nowrap border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <tr className="whitespace-nowrap">
                    <th className="px-4 py-3 font-semibold">주문번호</th>
                    <th className="px-4 py-3 font-semibold">이메일</th>
                    <th className="px-4 py-3 font-semibold">상품</th>
                    <th className="px-4 py-3 font-semibold text-right">금액</th>
                    <th className="px-4 py-3 font-semibold text-center">상태</th>
                    <th className="px-4 py-3 font-semibold text-center">조회권</th>
                    <th className="px-4 py-3 font-semibold">결제일</th>
                    <th className="px-4 py-3 font-semibold">열람기한</th>
                    <th className="px-4 py-3 font-semibold text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                        결제 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                  {payments.map((p) => {
                    const dl = daysLeft(p.expires_at);
                    return (
                      <tr key={p.order_id} className="whitespace-nowrap hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {p.order_id}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{p.email}</td>
                        <td className="px-4 py-3 text-gray-700">{tierName(p.tier)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {won(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">
                          {p.credits_used}/{p.credits_total}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDateTime(p.paid_at)}</td>
                        <td className="px-4 py-3">
                          {p.expires_at ? (
                            dl !== null && dl > 0 ? (
                              <span className="text-emerald-600 font-semibold">
                                {fmtDate(p.expires_at)}
                                <span className="ml-1 text-xs text-gray-400">({dl}일)</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                {fmtDate(p.expires_at)} (만료)
                              </span>
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-row justify-center gap-1.5">
                            <button
                              onClick={() => addCredits(p.order_id)}
                              className="whitespace-nowrap rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary hover:bg-brand-primary/20"
                            >
                              조회권+
                            </button>
                            <button
                              onClick={() => extendExpiry(p.order_id)}
                              className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 transition hover:scale-[1.02] hover:bg-gray-50"
                            >
                              기한연장
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ------- 고객 진단서 (질문지 + 결과) ------- */}
          {tab === "customers" && custView === "diags" && (
            <div className="space-y-3">
              {/* ★ 완료 / 미완료(중간이탈) 요약 - 대표님이 전화 돌릴 리드 한눈에 파악 ★ */}
              {diagnoses.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">✅ 진단 완료</p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {diagnoses.filter((d) => d.status !== "partial").length}
                      <span className="ml-1 text-sm font-bold text-gray-500">명</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">
                      ⏳ 미완료(중간이탈) · 전화 추천
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {diagnoses.filter((d) => d.status === "partial").length}
                      <span className="ml-1 text-sm font-bold text-gray-500">명</span>
                    </p>
                  </div>
                </div>
              )}
              {/* 🔍 진단서 검색 - 이름·이메일·연락처·업종·사업자번호로 즉시 검색 */}
              {diagnoses.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      value={diagSearch}
                      onChange={(e) => setDiagSearch(e.target.value)}
                      placeholder="진단서 검색 - 이름 · 이메일 · 연락처 · 업종으로 찾기 (예: 홍길동 / 010 / hong@)"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-brand-orange"
                    />
                  </div>
                  {diagSearch && (
                    <button
                      onClick={() => setDiagSearch("")}
                      className="rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-200"
                    >
                      ✕ 초기화
                    </button>
                  )}
                  <span className="whitespace-nowrap text-xs text-gray-400">
                    {diagSearch
                      ? `검색결과 ${filteredDiagnoses.length}건`
                      : `전체 ${diagnoses.length}건`}
                  </span>
                </div>
              )}
              {/* 다운로드 툴바 - 전체 / 선택 다운로드 + 전체선택 체크 */}
              {diagnoses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedDiag.size === diagnoses.length && diagnoses.length > 0}
                      onChange={toggleSelectAllDiag}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    전체 선택
                  </label>
                  <span className="text-xs text-gray-400">
                    ({selectedDiag.size}건 선택 / 총 {diagnoses.length}건)
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={downloadSelectedDiag}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:scale-[1.02] hover:bg-gray-50"
                    >
                      ⬇️ 선택 진단서 엑셀 다운
                    </button>
                    <button
                      onClick={downloadAllDiag}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:scale-[1.02] hover:bg-gray-50"
                    >
                      ⬇️ 전체 진단서 엑셀 다운
                    </button>
                    <button
                      onClick={deleteSelectedDiag}
                      disabled={selectedDiag.size === 0}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:scale-[1.02] hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      🗑️ 선택 삭제
                    </button>
                  </div>
                </div>
              )}
              {diagnoses.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-gray-400 shadow-sm">
                  아직 접수된 진단서가 없습니다.
                </div>
              )}
              {diagnoses.length > 0 && filteredDiagnoses.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-gray-400 shadow-sm">
                  “{diagSearch}” 검색 결과가 없습니다.
                </div>
              )}
              {filteredDiagnoses.map((d) => {
                const isOpen = openDiag === d.id;
                const p = d.profile || {};
                const dupIdx = dupIndexMap.get(d.id) ?? 1;
                const isDup = dupIdx > 1;
                const checked = selectedDiag.has(d.id);
                return (
                  <div
                    key={d.id}
                    id={`diag-${d.id}`}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 px-4 py-3">
                      {/* 체크박스 (다운로드 선택용) */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectDiag(d.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300"
                      />
                      <button
                        onClick={() => setOpenDiag(isOpen ? null : d.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-gray-800">
                            {(p as any)?.name || d.name || "이름 미입력"}
                          </span>
                          {/* ★ 완료 / 미완료(중간이탈) 상태 뱃지 ★
                              partial = 사업자번호·연락처는 남겼지만 진단을 끝까지 안 함
                              → 이 고객에게 전화해서 진단 이어서 도와주면 계약 확률↑ */}
                          {d.status === "partial" ? (
                            <span className="ml-2 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                              ⏳ 미완료(중간이탈)
                            </span>
                          ) : (
                            <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                              ✅ 완료
                            </span>
                          )}
                          {/* ☎️ 통화 상태 뱃지 - 미접촉이 아닐 때만 표시 (전화 진행상황 한눈에) */}
                          {(() => {
                            const st = leadNotes[d.id]?.status ?? "none";
                            if (st === "none") return null;
                            const m = CALL_STATUS_META[st];
                            return (
                              <span
                                className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${m.cls}`}
                              >
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.dot}`} />
                                {m.label}
                              </span>
                            );
                          })()}
                          <span className="ml-2 text-sm text-gray-500">
                            {(p as any)?.businessType || ""}
                          </span>
                          {/* 중복 신청 뱃지 - 몇 번째 신청인지 (동일 연락처/이메일) */}
                          {isDup && (
                            <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              🔁 {dupIdx}번째 신청
                            </span>
                          )}
                          <span className="ml-2 block truncate text-xs text-gray-400 sm:ml-2 sm:inline">
                            {d.email || (p as any)?.email || "-"}
                            {d.phone || (p as any)?.phone ? ` · ${d.phone || (p as any)?.phone}` : ""}
                            {(p as any)?.bno ? ` · ${(p as any).bno}` : ""}
                          </span>
                          {/* 👤 회원 계정(가입 이메일) - user_id 로 회원과 직접 매칭.
                              진단서에 로그인 회원의 user_id 가 저장돼 있으면 그 회원의 가입 이메일을 표시.
                              연결됨: 초록 뱃지(클릭 시 해당 회원 목록으로 이동). 미연결: 회색 안내. */}
                          {(() => {
                            // ★ 확실히 연결된 회원(user_id 매칭)만 초록 뱃지로 표시.
                            //   과거 데이터는 매칭 키가 없어 억지로 잇지 않고(오연결 방지)
                            //   아무 문구도 표시하지 않는다. 고객 식별은 위의 이름·전화·
                            //   사업자번호로 충분하다. 앞으로 결과를 보는 회원부터
                            //   자동으로 이 초록 뱃지가 붙는다.
                            const memberEmail = memberEmailForDiagnosis(d);
                            if (!memberEmail) return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTab("customers");
                                  setCustView("unified");
                                  setUnifiedCall("all");
                                  setUnifiedSearch(memberEmail);
                                }}
                                title="클릭하면 이 회원 카드(고객 보기)로 이동합니다"
                                className="ml-2 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20"
                              >
                                👤 {memberEmail}
                              </button>
                            );
                          })()}
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">
                          {fmtDateTime(d.created_at)} {isOpen ? "▲" : "▼"}
                        </span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-700 bg-slate-900 px-4 py-4">
                        <p className="mb-2 text-xs font-bold text-slate-300">
                          📝 작성한 질문지 전체
                        </p>
                        {/* ★ 대표님 요청 ★ 진단서 항목을 (1) 실제 질문 순서대로 정렬하고
                            (2) 가로 2줄 유지하되 세로(칼럼) 우선으로 채운다 - 신문 칼럼처럼
                            왼쪽 열을 위→아래로 다 읽고, 이어서 오른쪽 열을 위→아래로 읽는다.
                            CSS grid는 가로 우선이라, 정렬된 항목을 왼/오 두 배열로 나눠 각 열을 세로로 렌더한다. */}
                        {(() => {
                          // 예전 질문지 전용 항목(과세유형·관심 분야) 제외 후, 정식 질문 순서로 정렬
                          const entries = sortKeysByQuestionOrder(
                            Object.keys(p).filter(
                              (k) => !["bnoTaxType", "interests"].includes(k)
                            )
                          ).map((k) => [k, (p as any)[k]] as const);
                          // 세로 우선(칼럼) 채움: 앞 절반 = 왼쪽 열, 뒤 절반 = 오른쪽 열
                          const half = Math.ceil(entries.length / 2);
                          const columns = [entries.slice(0, half), entries.slice(half)];
                          const renderItem = ([k, v]: readonly [string, unknown]) => (
                            <div
                              key={k}
                              className="flex gap-2 border-b border-slate-700/60 py-1 text-sm"
                            >
                              <span className="shrink-0 font-semibold text-slate-400">
                                {labelForKey(k)}
                              </span>
                              <span className="break-all font-semibold text-white">
                                {valueToText(v)}
                              </span>
                            </div>
                          );
                          return (
                            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                              {columns.map((col, ci) => (
                                <div key={ci} className="flex flex-col">
                                  {col.map(renderItem)}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {/* ☎️ 상담 관리 - 통화 상태 + 메모 (localStorage 저장, DB 불필요) */}
                        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                          <p className="mb-2 text-xs font-bold text-slate-300">☎️ 상담 관리</p>
                          {/* 통화 상태 선택 */}
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {CALL_STATUS_ORDER.map((st) => {
                              const m = CALL_STATUS_META[st];
                              const cur = (leadNotes[d.id]?.status ?? "none") === st;
                              return (
                                <button
                                  key={st}
                                  onClick={() => setCallStatus(d.id, st)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                                    cur
                                      ? m.cls + " ring-2 ring-offset-1 ring-offset-slate-800"
                                      : "border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"
                                  }`}
                                >
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.dot}`} />
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                          {/* 상담 메모 */}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <textarea
                              value={memoDraft[d.id] ?? leadNotes[d.id]?.memo ?? ""}
                              onChange={(e) =>
                                setMemoDraft((prev) => ({ ...prev, [d.id]: e.target.value }))
                              }
                              placeholder="상담 메모 - 예: 5천만 필요, 소진공 직접대출 안내함 / 다음 주 재통화"
                              rows={2}
                              className="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-orange"
                            />
                            <button
                              onClick={() => saveMemo(d.id)}
                              className="shrink-0 self-start rounded-lg bg-brand-primary/20 px-3 py-2 text-xs font-bold text-brand-primary hover:bg-brand-primary/30 sm:self-stretch"
                            >
                              💾 저장
                            </button>
                          </div>
                          {leadNotes[d.id]?.updatedAt && (
                            <p className="mt-1.5 text-[10px] text-slate-500">
                              마지막 수정 {fmtDateTime(leadNotes[d.id].updatedAt)}
                            </p>
                          )}
                        </div>

                        {/* 결과보기 + 개별 다운로드 + 삭제 버튼 */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => openResultForDiag(d)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:scale-[1.02] hover:bg-gray-50"
                          >
                            📊 결과보기 (새 창)
                          </button>
                          <button
                            onClick={() => downloadOneDiag(d)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:scale-[1.02] hover:bg-gray-50"
                          >
                            ⬇️ 이 진단서 엑셀 다운
                          </button>
                          <button
                            onClick={() => deleteDiag(d)}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
                          >
                            🗑️ 진단서 삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ------- 일주월 매출 리포트 = 요약표(오늘/주/달/전체) + 일별·월별 상세 ------- */}
          {tab === "revenue" && (
            <div className="space-y-4">
              {/* ===== 요약표: 오늘 · 이번주 · 이번달 · 전체 ===== */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-800">📊 요약 (신규가입 · 진단 · 결제 · 매출)</h3>
                  <span className="text-xs text-gray-400">
                    기준: {new Date().toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">구분</th>
                        <th className="px-3 py-2.5 text-center font-semibold">오늘</th>
                        <th className="px-3 py-2.5 text-center font-semibold">이번 주</th>
                        <th className="px-3 py-2.5 text-center font-semibold">이번 달</th>
                        <th className="px-3 py-2.5 text-center font-semibold">전체</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-gray-700">🙋 신규 가입</td>
                        <td className="px-3 py-2.5 text-center">{reportData.today.users}명</td>
                        <td className="px-3 py-2.5 text-center">{reportData.week.users}명</td>
                        <td className="px-3 py-2.5 text-center">{reportData.month.users}명</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900">{reportData.total.users}명</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-gray-700">📋 진단 접수</td>
                        <td className="px-3 py-2.5 text-center">{reportData.today.diag}건</td>
                        <td className="px-3 py-2.5 text-center">{reportData.week.diag}건</td>
                        <td className="px-3 py-2.5 text-center">{reportData.month.diag}건</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900">{reportData.total.diag}건</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-gray-700">💳 결제</td>
                        <td className="px-3 py-2.5 text-center">{reportData.today.pay}건</td>
                        <td className="px-3 py-2.5 text-center">{reportData.week.pay}건</td>
                        <td className="px-3 py-2.5 text-center">{reportData.month.pay}건</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900">{reportData.total.pay}건</td>
                      </tr>
                      <tr className="bg-brand-orange/5">
                        <td className="px-3 py-2.5 font-bold text-brand-dark">💰 매출</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-brand-primary">{won(reportData.today.revenue)}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-brand-primary">{won(reportData.week.revenue)}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-brand-primary">{won(reportData.month.revenue)}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-extrabold text-brand-primary">{won(reportData.total.revenue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="rounded-xl bg-brand-yellow/10 px-4 py-2.5 text-xs text-gray-500">
                💡 아래 날짜(또는 월)를 <b className="text-gray-700">클릭</b>하면 그날 결제 내역이 1건씩 펼쳐집니다. 각 건의{" "}
                <b className="text-rose-600">🗑️ 삭제</b> 버튼으로 잘못된/테스트 결제를 정리할 수 있어요.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* ===== 일별 매출 ===== */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 font-bold text-gray-800">📅 일별 매출 (최근 30일)</h3>
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="whitespace-nowrap sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2">날짜</th>
                          <th className="px-3 py-2 text-center">건수</th>
                          <th className="px-3 py-2 text-right">매출</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {daily.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-8 text-center text-gray-400">
                              결제 데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                        {daily.map((r) => {
                          const isOpen = openDay === r.day;
                          const rows = isOpen ? paymentsByDay(r.day) : [];
                          return (
                            <Fragment key={r.day}>
                              <tr
                                onClick={() => setOpenDay(isOpen ? null : r.day)}
                                className={`cursor-pointer transition-colors hover:bg-brand-yellow/10 ${
                                  isOpen ? "bg-brand-yellow/10" : ""
                                }`}
                              >
                                <td className="px-3 py-2 font-medium text-gray-700">
                                  <span className="mr-1 inline-block w-3 text-gray-400">
                                    {isOpen ? "▼" : "▶"}
                                  </span>
                                  {fmtDate(r.day)}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">{r.cnt}건</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                  {won(r.revenue)}
                                </td>
                              </tr>
                              {isOpen && (
                                <tr>
                                  <td colSpan={3} className="bg-gray-50/70 px-3 py-2">
                                    <div className="space-y-1.5">
                                      {rows.length === 0 && (
                                        <p className="py-2 text-center text-xs text-gray-400">
                                          표시할 개별 결제 건이 없습니다.
                                        </p>
                                      )}
                                      {rows.map((p) => (
                                        <div
                                          key={p.order_id}
                                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="truncate text-xs font-semibold text-gray-800">
                                              {p.email}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                              {tierName(p.tier)} · {fmtDateTime(p.paid_at)}
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">
                                              {won(p.amount)}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deletePayment(p.order_id);
                                              }}
                                              className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                                            >
                                              🗑️ 삭제
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ===== 월별 매출 ===== */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 font-bold text-gray-800">🗓️ 월별 매출 (최근 12개월)</h3>
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="whitespace-nowrap sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2">월</th>
                          <th className="px-3 py-2 text-center">건수</th>
                          <th className="px-3 py-2 text-right">매출</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {monthly.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-8 text-center text-gray-400">
                              결제 데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                        {monthly.map((r) => {
                          const isOpen = openMonth === r.month;
                          const rows = isOpen ? paymentsByMonth(r.month) : [];
                          return (
                            <Fragment key={r.month}>
                              <tr
                                onClick={() => setOpenMonth(isOpen ? null : r.month)}
                                className={`cursor-pointer transition-colors hover:bg-brand-yellow/10 ${
                                  isOpen ? "bg-brand-yellow/10" : ""
                                }`}
                              >
                                <td className="px-3 py-2 font-medium text-gray-700">
                                  <span className="mr-1 inline-block w-3 text-gray-400">
                                    {isOpen ? "▼" : "▶"}
                                  </span>
                                  {r.month}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">{r.cnt}건</td>
                                <td className="px-3 py-2 text-right font-semibold text-brand-primary">
                                  {won(r.revenue)}
                                </td>
                              </tr>
                              {isOpen && (
                                <tr>
                                  <td colSpan={3} className="bg-gray-50/70 px-3 py-2">
                                    <div className="space-y-1.5">
                                      {rows.length === 0 && (
                                        <p className="py-2 text-center text-xs text-gray-400">
                                          표시할 개별 결제 건이 없습니다.
                                        </p>
                                      )}
                                      {rows.map((p) => (
                                        <div
                                          key={p.order_id}
                                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="truncate text-xs font-semibold text-gray-800">
                                              {p.email}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                              {tierName(p.tier)} · {fmtDateTime(p.paid_at)}
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">
                                              {won(p.amount)}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deletePayment(p.order_id);
                                              }}
                                              className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                                            >
                                              🗑️ 삭제
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------- 접속 · 기기 · 차단 ------- */}
          {tab === "access" && (
            <div className="space-y-4">
              {/* 차단 목록 */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-800">
                  ⛔ 차단 목록 ({blocks.length})
                </h3>
                {blocks.length === 0 ? (
                  <p className="text-sm text-gray-400">차단된 IP·계정이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blocks.map((b) => (
                      <span
                        key={`${b.kind}:${b.value}`}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      >
                        [{b.kind}] {b.value}
                        <button
                          onClick={() => doUnblock(b.kind, b.value)}
                          className="text-rose-400 hover:text-rose-700"
                          title="차단 해제"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* IP 집계 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setIpListOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-gray-50"
                  aria-expanded={ipListOpen}
                >
                  <div>
                    <h3 className="font-bold text-gray-800">
                      🌐 IP별 접속 집계 ({ipSummary.length}개)
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                      <span className="font-semibold text-amber-600">비회원 ⚠️</span> 표시는 회원가입 없이 진단만 여러 번 조회한 IP입니다. 반복 어뷰징이 의심되면 차단하세요.
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gray-400">
                    {ipListOpen ? "▲ 접기" : "▼ 펼치기"}
                  </span>
                </button>
                {ipListOpen && (
                <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="whitespace-nowrap bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2">IP</th>
                      <th className="px-4 py-2 text-center">접속수</th>
                      <th className="px-4 py-2 text-center">진단조회</th>
                      <th className="px-4 py-2 text-center">회원</th>
                      <th className="px-4 py-2 text-center">계정수</th>
                      <th className="px-4 py-2">마지막</th>
                      <th className="px-4 py-2 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ipSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          접속 기록이 없습니다.
                        </td>
                      </tr>
                    )}
                    {ipSummary.map((r) => {
                      // ★대표님 요청★ 데이터센터/클라우드 서버(봇 의심) IP는 뱃지로 "표시만" 한다.
                      //   실제 차단은 대표님이 아래 'IP차단' 버튼으로 직접 판단. (자동 차단 아님)
                      const cls = classifyIp(r.ip);
                      const der = ipDerived.get(r.ip) ?? { diagCount: 0, isMember: false };
                      // 어뷰징 의심: 회원가입 없이(비회원) 진단 페이지를 3번 넘게 연 IP.
                      //  → 컨설턴트/반복 조회 어뷰저를 눈에 띄게 표시(주황 강조).
                      const abuseSuspect = !der.isMember && der.diagCount > 3;
                      return (
                      <tr
                        key={r.ip}
                        className={
                          cls.isDataCenter
                            ? "bg-rose-50/60"
                            : abuseSuspect || r.users > 3 || r.hits > 30
                              ? "bg-amber-50/60"
                              : ""
                        }
                      >
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">
                          <span>{r.ip}</span>
                          {cls.isDataCenter && (
                            <span
                              className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-rose-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-rose-600"
                              title={`${cls.provider ?? "데이터센터"} 서버 대역입니다. 실제 사람이 아니라 자동 봇/스캐너일 가능성이 높습니다.`}
                            >
                              🤖 봇 의심{cls.provider ? ` · ${cls.provider}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-600">{r.hits}</td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={
                              der.diagCount > 3
                                ? "font-bold text-amber-600"
                                : der.diagCount > 0
                                  ? "text-gray-700"
                                  : "text-gray-300"
                            }
                            title="이 IP가 진단 페이지(진단하기/매칭 미리보기)를 연 횟수"
                          >
                            {der.diagCount}회
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {der.isMember ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
                              회원
                            </span>
                          ) : (
                            <span
                              className={
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold " +
                                (abuseSuspect
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-400")
                              }
                              title={
                                abuseSuspect
                                  ? "회원가입 없이 진단을 여러 번 조회한 IP입니다. 반복 어뷰징이 의심되면 차단하세요."
                                  : "이 IP에서 로그인(회원) 접속 기록이 없습니다."
                              }
                            >
                              비회원{abuseSuspect ? " ⚠️" : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-semibold text-gray-800">
                          {r.users}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{fmtDateTime(r.last_seen)}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => doBlock("ip", r.ip)}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:scale-[1.03] hover:bg-rose-100"
                            >
                              IP차단
                            </button>
                            <button
                              onClick={() => deleteAccessByIp(r.ip)}
                              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 transition hover:scale-[1.03] hover:bg-gray-200"
                              title="이 IP의 접속 기록 삭제"
                            >
                              🗑️ 삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                )}
              </div>

              {/* 최근 접속 로그 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setAccessLogOpen((v) => !v)}
                    className="flex flex-1 items-center gap-2 text-left"
                    aria-expanded={accessLogOpen}
                  >
                    <h3 className="font-bold text-gray-800">
                      🕑 최근 접속 로그 ({access.length}건)
                    </h3>
                    <span className="text-sm font-bold text-gray-400">
                      {accessLogOpen ? "▲ 접기" : "▼ 펼치기"}
                    </span>
                  </button>
                  <button
                    onClick={clearAccessLogs}
                    className="shrink-0 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:scale-[1.03] hover:bg-rose-100"
                    title="접속 로그 전체 삭제 (테스트 기록 정리)"
                  >
                    🗑️ 접속 로그 전체 삭제
                  </button>
                </div>
                {accessLogOpen && (
                <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="whitespace-nowrap bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2">시각</th>
                      <th className="px-4 py-2">이메일</th>
                      <th className="px-4 py-2">IP</th>
                      <th className="px-4 py-2 text-center">기기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {access.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          접속 기록이 없습니다.
                        </td>
                      </tr>
                    )}
                    {access.map((a, i) => {
                      const cls = classifyIp(a.ip);
                      return (
                      <tr key={i} className={cls.isDataCenter ? "bg-rose-50/40" : ""}>
                        <td className="px-4 py-2 text-gray-500">{fmtDateTime(a.created_at)}</td>
                        <td className="px-4 py-2 text-gray-800">{a.email || "-"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-600">
                          <span>{a.ip || "-"}</span>
                          {cls.isDataCenter && (
                            <span
                              className="ml-1 inline-block rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-600"
                              title={`${cls.provider ?? "데이터센터"} 서버 대역 · 봇 의심`}
                            >
                              🤖
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {a.device_kind === "mobile" ? "📱 모바일" : "💻 PC"}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
