"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";

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
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const [s, u, p, d, dr, mr, ac, ip, bl] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_list_payments"),
      supabase.rpc("admin_list_diagnoses"),
      supabase.rpc("admin_daily_revenue"),
      supabase.rpc("admin_monthly_revenue"),
      supabase.rpc("admin_list_access", { p_limit: 200 }),
      supabase.rpc("admin_ip_summary"),
      supabase.rpc("admin_list_blocks"),
    ]);
    if (!s.error && s.data?.[0]) setStats(s.data[0] as Stats);
    if (!u.error && u.data) setUsers(u.data as AdminUser[]);
    if (!p.error && p.data) setPayments(p.data as AdminPayment[]);
    if (!d.error && d.data) setDiagnoses(d.data as AdminDiagnosis[]);
    if (!dr.error && dr.data) setDaily(dr.data as DailyRow[]);
    if (!mr.error && mr.data) setMonthly(mr.data as MonthlyRow[]);
    if (!ac.error && ac.data) setAccess(ac.data as AccessRow[]);
    if (!ip.error && ip.data) setIpSummary(ip.data as IpRow[]);
    if (!bl.error && bl.data) setBlocks(bl.data as BlockRow[]);
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
      if (test.data?.[0]) setStats(test.data[0] as Stats);
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
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <tr>
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
                      <tr key={p.order_id} className="hover:bg-gray-50/60">
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
                          <div className="flex flex-col gap-1.5 sm:flex-row">
                            <button
                              onClick={() => addCredits(p.order_id)}
                              className="rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary hover:bg-brand-primary/20"
                            >
                              조회권+
                            </button>
                            <button
                              onClick={() => extendExpiry(p.order_id)}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-100"
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
              {diagnoses.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-gray-400 shadow-sm">
                  아직 접수된 진단서가 없습니다.
                </div>
              )}
              {diagnoses.map((d) => {
                const isOpen = openDiag === d.id;
                const p = d.profile || {};
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <button
                      onClick={() => setOpenDiag(isOpen ? null : d.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-gray-800">
                          {(p as any)?.name || d.name || "이름 미입력"}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {(p as any)?.businessType || ""}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {d.email || (p as any)?.email || "-"}
                          {(p as any)?.bno ? ` · ${(p as any).bno}` : ""}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {fmtDateTime(d.created_at)} {isOpen ? "▲" : "▼"}
                      </span>
                    </button>
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
                                {k}
                              </span>
                              <span className="break-all text-gray-800">
                                {Array.isArray(v)
                                  ? v.join(", ")
                                  : typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v ?? "-")}
                              </span>
                            </div>
                          ))}
                        </div>
                        {d.phone && (
                          <p className="mt-3 text-sm text-gray-600">
                            📞 연락처: <b>{d.phone}</b>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ------- 매출 통계 (일별 / 월별) ------- */}
          {tab === "revenue" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-800">📅 일별 매출 (최근 30일)</h3>
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
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
                      {daily.map((r) => (
                        <tr key={r.day}>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(r.day)}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{r.cnt}건</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">
                            {won(r.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-bold text-gray-800">🗓️ 월별 매출 (최근 12개월)</h3>
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
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
                      {monthly.map((r) => (
                        <tr key={r.month}>
                          <td className="px-3 py-2 text-gray-700">{r.month}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{r.cnt}건</td>
                          <td className="px-3 py-2 text-right font-semibold text-brand-primary">
                            {won(r.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          <button
                            onClick={() => doBlock("ip", r.ip)}
                            className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                          >
                            IP차단
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 최근 접속 로그 */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="font-bold text-gray-800">🕑 최근 접속 로그</h3>
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
