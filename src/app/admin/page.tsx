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

type Phase = "loading" | "denied" | "ready";

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
  const [tab, setTab] = useState<"users" | "payments">("users");

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const [s, u, p] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_list_payments"),
    ]);
    if (!s.error && s.data?.[0]) setStats(s.data[0] as Stats);
    if (!u.error && u.data) setUsers(u.data as AdminUser[]);
    if (!p.error && p.data) setPayments(p.data as AdminPayment[]);
    setRefreshing(false);
  }, []);

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
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTab("users")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "users"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              👥 회원 목록 ({users.length})
            </button>
            <button
              onClick={() => setTab("payments")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "payments"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              💳 결제·조회권 관리 ({payments.length})
            </button>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
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

          <p className="mt-6 text-center text-xs text-gray-400">
            🔒 이 페이지는 관리자 계정(대표님)만 접근할 수 있습니다.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
