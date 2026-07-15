"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";
import { isAdminEmail } from "@/lib/admin";
import {
  labelForKey,
  valueToText,
  diagnosesToCsv,
  downloadCsv,
  computeDuplicateIndex,
  type DiagnosisRecord,
} from "@/lib/diagnosisExport";

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
  joined_at: string;
  last_sign_in: string | null;
  paid_count: number;
  total_amount: number;
  credits_total: number;
  credits_used: number;
  latest_expiry: string | null;
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
  email: string | null;
  name: string | null;
  phone: string | null;
  profile: Record<string, unknown>;
  matched_programs: unknown;
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
type BlockRow = {
  kind: string;
  value: string;
  reason: string | null;
  created_at: string;
};

type Phase = "loading" | "denied" | "ready";
type Tab = "users" | "payments" | "diagnoses" | "revenue" | "access";

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
      <p className="text-xs font-semibold text-gray-500 sm:text-sm">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold sm:text-3xl ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  메인                                                               */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [tab, setTab] = useState<Tab>("users");

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

  // 진단서 → 다운로드용 레코드로 변환 (중복 순번 포함)
  const toRecords = (list: AdminDiagnosis[]): DiagnosisRecord[] =>
    list.map((d) => ({
      id: d.id,
      email: d.email,
      name: d.name,
      phone: d.phone,
      profile: (d.profile || {}) as Record<string, unknown>,
      created_at: d.created_at,
      dupIndex: dupIndexMap.get(d.id),
    }));

  // 엑셀(CSV) 다운로드 — 전체 / 선택 / 개별
  const downloadAllDiag = () => {
    if (diagnoses.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`고객진단서_전체_${stamp}`, diagnosesToCsv(toRecords(diagnoses)));
  };
  const downloadSelectedDiag = () => {
    const list = diagnoses.filter((d) => selectedDiag.has(d.id));
    if (list.length === 0) {
      setMsg("먼저 다운로드할 진단서를 체크해 주세요.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`고객진단서_선택${list.length}건_${stamp}`, diagnosesToCsv(toRecords(list)));
  };
  const downloadOneDiag = (d: AdminDiagnosis) => {
    const applicant = d.name || (d.profile as any)?.name || "고객";
    const stamp = new Date(d.created_at).toISOString().slice(0, 10);
    downloadCsv(`고객진단서_${applicant}_${stamp}`, diagnosesToCsv(toRecords([d])));
  };

  // 진단서 삭제 (관리자) — 관리자 전용 RPC 사용
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

  // 진단서 선택 삭제 (여러 건 한 번에) — 관리자 전용 RPC 사용
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
    // ★ 관리자(운영자) 계정 데이터는 화면·통계에서 제외 (대표님 요청) ★
    //   기존에 쌓인 관리자 테스트 데이터도 여기서 걸러내고, 매출·건수를 다시 계산합니다.
    const payList = (!p.error && p.data ? (p.data as AdminPayment[]) : []).filter(
      (row) => !isAdminEmail(row.email)
    );
    const userList = (!u.error && u.data ? (u.data as AdminUser[]) : []).filter(
      (row) => !isAdminEmail(row.email)
    );
    const diagList = (!d.error && d.data ? (d.data as AdminDiagnosis[]) : []).filter(
      (row) => !isAdminEmail(row.email)
    );

    if (!u.error && u.data) setUsers(userList);
    if (!p.error && p.data) setPayments(payList);
    if (!d.error && d.data) setDiagnoses(diagList);
    if (!ac.error && ac.data) setAccess(ac.data as AccessRow[]);
    if (!ip.error && ip.data) setIpSummary(ip.data as IpRow[]);
    if (!bl.error && bl.data) setBlocks(bl.data as BlockRow[]);

    // ★ 매출 통계(일별/월별)도 관리자 결제를 제외하고 프론트에서 직접 재계산 (대표님 요청) ★
    //   서버 RPC(admin_daily/monthly_revenue)는 관리자 테스트 결제까지 포함하므로,
    //   관리자 이메일을 이미 걸러낸 payList(paid)로 다시 집계한다.
    const paidRows = payList.filter((r) => r.status === "paid" && r.paid_at);

    // 일별 매출 (최근 30일) — YYYY-MM-DD 로 묶어 집계
    const dailyMap = new Map<string, { revenue: number; cnt: number }>();
    // 월별 매출 (최근 12개월) — YYYY-MM 로 묶어 집계
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
        <div className="mx-auto max-w-6xl">
          {/* 상단 헤더 */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                🛠️ 관리자 대시보드
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                회원 · 결제 · 조회권 · 매출을 한 곳에서 관리하세요.
              </p>
            </div>
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing ? "새로고침 중…" : "🔄 새로고침"}
            </button>
          </div>

          {msg && (
            <div className="mb-4 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-sm font-semibold text-brand-dark">
              {msg}
            </div>
          )}

          {/* 통계 카드 */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="전체 회원"
              value={`${stats?.total_users ?? 0}명`}
              accent="text-gray-900"
            />
            <StatCard
              label="유효 회원"
              value={`${stats?.active_members ?? 0}명`}
              sub="열람 기한 내"
              accent="text-emerald-600"
            />
            <StatCard
              label="누적 결제"
              value={`${stats?.total_paid ?? 0}건`}
              accent="text-gray-900"
            />
            <StatCard
              label="총 매출"
              value={won(stats?.total_revenue ?? 0)}
              accent="text-brand-primary"
            />
            <StatCard
              label="이번 달 매출"
              value={won(stats?.month_revenue ?? 0)}
              sub={`${new Date().getMonth() + 1}월`}
              accent="text-brand-primary"
            />
          </section>

          {/* 탭 */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["users", `👥 회원 목록 (${users.length})`],
                ["payments", `💳 결제·조회권 (${payments.length})`],
                ["diagnoses", `📋 고객 진단서 (${diagnoses.length})`],
                ["revenue", "📈 매출 통계"],
                ["access", `🛡️ 접속·기기·차단`],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  tab === key
                    ? "bg-brand-dark text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ------- 회원 목록 ------- */}
          {tab === "users" && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">이메일</th>
                    <th className="px-4 py-3 font-semibold">가입일</th>
                    <th className="px-4 py-3 font-semibold">최근접속</th>
                    <th className="px-4 py-3 font-semibold text-center">결제</th>
                    <th className="px-4 py-3 font-semibold text-right">누적금액</th>
                    <th className="px-4 py-3 font-semibold text-center">조회권</th>
                    <th className="px-4 py-3 font-semibold">열람기한</th>
                    <th className="px-4 py-3 font-semibold text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        회원이 없습니다.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const dl = daysLeft(u.latest_expiry);
                    const active = dl !== null && dl > 0;
                    return (
                      <tr key={u.user_id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">{u.email}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(u.joined_at)}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(u.last_sign_in)}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{u.paid_count}건</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {won(u.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-700">
                            {u.credits_used}/{u.credits_total}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.latest_expiry ? (
                            active ? (
                              <span className="text-emerald-600 font-semibold">
                                {dl}일 남음
                              </span>
                            ) : (
                              <span className="text-gray-400">만료됨</span>
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5 sm:flex-row">
                            <button
                              onClick={() => u.email && resetDevice(u.email)}
                              className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                            >
                              기기초기화
                            </button>
                            <button
                              onClick={() => u.email && doBlock("email", u.email)}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                            >
                              계정차단
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

          {/* ------- 결제·조회권 관리 ------- */}
          {tab === "payments" && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
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
                              className="whitespace-nowrap rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-100"
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
          {tab === "diagnoses" && (
            <div className="space-y-3">
              {/* 다운로드 툴바 — 전체 / 선택 다운로드 + 전체선택 체크 */}
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
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      ⬇️ 선택 진단서 엑셀 다운
                    </button>
                    <button
                      onClick={downloadAllDiag}
                      className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/20"
                    >
                      ⬇️ 전체 진단서 엑셀 다운
                    </button>
                    <button
                      onClick={deleteSelectedDiag}
                      disabled={selectedDiag.size === 0}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
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
              {diagnoses.map((d) => {
                const isOpen = openDiag === d.id;
                const p = d.profile || {};
                const dupIdx = dupIndexMap.get(d.id) ?? 1;
                const isDup = dupIdx > 1;
                const checked = selectedDiag.has(d.id);
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm"
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
                          <span className="ml-2 text-sm text-gray-500">
                            {(p as any)?.businessType || ""}
                          </span>
                          {/* 중복 신청 뱃지 — 몇 번째 신청인지 (동일 연락처/이메일) */}
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
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">
                          {fmtDateTime(d.created_at)} {isOpen ? "▲" : "▼"}
                        </span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
                        <p className="mb-2 text-xs font-bold text-gray-500">
                          📝 작성한 질문지 전체
                        </p>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                          {Object.entries(p).map(([k, v]) => (
                            <div
                              key={k}
                              className="flex gap-2 border-b border-gray-100 py-1 text-sm"
                            >
                              <span className="shrink-0 font-semibold text-gray-500">
                                {labelForKey(k)}
                              </span>
                              <span className="break-all text-gray-800">
                                {valueToText(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {d.phone && (
                          <p className="mt-3 text-sm text-gray-600">
                            📞 연락처: <b>{d.phone}</b>
                          </p>
                        )}
                        {/* 개별 다운로드 + 삭제 버튼 */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => downloadOneDiag(d)}
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
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

          {/* ------- 매출 통계 (일별 / 월별) — 행 클릭 시 개별 결제 건 펼침 + 삭제 ------- */}
          {tab === "revenue" && (
            <div className="space-y-4">
              <p className="rounded-xl bg-brand-yellow/10 px-4 py-2.5 text-xs text-gray-500">
                💡 날짜(또는 월)를 <b className="text-gray-700">클릭</b>하면 그날 결제 내역이 1건씩 펼쳐집니다. 각 건의{" "}
                <b className="text-rose-600">🗑️ 삭제</b> 버튼으로 잘못된/테스트 결제를 정리할 수 있어요.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* ===== 일별 매출 ===== */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 font-bold text-gray-800">📅 일별 매출 (최근 30일)</h3>
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
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
                      <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
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
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="font-bold text-gray-800">
                    🌐 IP별 접속 집계 (어뷰징 의심 파악)
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    접속수가 유난히 많거나, 한 IP에 여러 계정이 붙으면 의심해 보세요.
                  </p>
                </div>
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2">IP</th>
                      <th className="px-4 py-2 text-center">접속수</th>
                      <th className="px-4 py-2 text-center">계정수</th>
                      <th className="px-4 py-2">마지막</th>
                      <th className="px-4 py-2 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ipSummary.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          접속 기록이 없습니다.
                        </td>
                      </tr>
                    )}
                    {ipSummary.map((r) => (
                      <tr
                        key={r.ip}
                        className={r.users > 3 || r.hits > 30 ? "bg-amber-50/60" : ""}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">{r.ip}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{r.hits}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 최근 접속 로그 */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                  <h3 className="font-bold text-gray-800">🕑 최근 접속 로그</h3>
                  <button
                    onClick={clearAccessLogs}
                    className="shrink-0 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:scale-[1.03] hover:bg-rose-100"
                    title="접속 로그 전체 삭제 (테스트 기록 정리)"
                  >
                    🗑️ 접속 로그 전체 삭제
                  </button>
                </div>
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
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
                    {access.map((a, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-500">{fmtDateTime(a.created_at)}</td>
                        <td className="px-4 py-2 text-gray-800">{a.email || "-"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-600">
                          {a.ip || "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {a.device_kind === "mobile" ? "📱 모바일" : "💻 PC"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            🔒 이 페이지는 관리자 계정(대표님)만 접근할 수 있습니다.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
