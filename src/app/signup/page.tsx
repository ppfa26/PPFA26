"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import { supabase } from "@/lib/supabaseClient";
import { TIER_MAP } from "@/lib/products";

type Mode = "signup" | "login";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = (params.get("tier") as "basic" | "premier" | "pro" | null) || null;
  const selected = tier ? TIER_MAP[tier] : null;

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 이미 로그인된 경우 바로 결제/대시보드로 이동
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(tier ? `/payment?tier=${tier}` : "/dashboard");
      }
    });
  }, [router, tier]);

  const goNext = () => {
    router.push(tier ? `/payment?tier=${tier}` : "/dashboard");
  };

  // 소셜 로그인 (카카오 / 구글) — Supabase OAuth
  const handleOAuth = async (provider: "kakao" | "google", label = "") => {
    setMsg(null);
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/signup${tier ? `?tier=${tier}` : ""}`
          : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        setMsg(
          `${label || provider} 로그인 연결이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.`
        );
        setLoading(false);
      }
      // 성공 시 소셜 로그인 페이지로 리다이렉트되므로 별도 처리 불필요
    } catch {
      setMsg("잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email || !password) {
      setMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setMsg("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone, tier: tier || "" },
          },
        });
        if (error) {
          const em = error.message.toLowerCase();
          // 이미 가입된 경우 로그인 탭으로 전환
          if (
            em.includes("already") ||
            em.includes("registered") ||
            em.includes("exists")
          ) {
            setMode("login");
            setMsg("이미 가입된 이메일입니다. 아래에 비밀번호를 입력하고 로그인해 주세요.");
            setLoading(false);
            return;
          }
          if (em.includes("password")) {
            setMsg("비밀번호는 6자 이상으로 입력해 주세요.");
            setLoading(false);
            return;
          }
          if (em.includes("email") && (em.includes("invalid") || em.includes("valid"))) {
            setMsg("이메일 형식을 확인해 주세요.");
            setLoading(false);
            return;
          }
          setMsg(`가입 오류: ${error.message}`);
          setLoading(false);
          return;
        }
        // 세션이 바로 생기면 다음 단계로, 이메일 인증이 필요하면 로그인 유도
        if (data.session) {
          goNext();
        } else {
          setMode("login");
          setMsg("가입이 완료되었습니다. 로그인해 주세요.");
          setLoading(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const em = error.message.toLowerCase();
          if (em.includes("invalid") || em.includes("credentials")) {
            setMsg("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
          } else if (em.includes("not confirmed") || em.includes("confirm")) {
            setMsg("이메일 인증이 필요합니다. 메일함을 확인해 주세요.");
          } else {
            setMsg(`로그인 오류: ${error.message}`);
          }
          setLoading(false);
          return;
        }
        goNext();
      }
    } catch {
      setMsg("잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  return (
    <PageShell pageKey="signup">
      <Header />
      {/* 중앙 정렬 · 적당한 폭(max-w-5xl) 좌우 2분할 카드 — 화면 꽉 채우지 않고, 위아래 흰 공백 없이 */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 shadow-card lg:grid-cols-2">
        {/* 좌측 브랜드 패널 — 데스크톱 전용(모바일 숨김) · 로고 중복 없음(상단 헤더에 이미 있음) */}
        <aside className="relative hidden overflow-hidden bg-brand-dark lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-yellow/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl" />
          {/* 상단 여백용 (로고 자리 — 헤더에 이미 있어 중복 표기하지 않음) */}
          <div className="relative h-4" />
          <div className="relative">
            <h2 className="break-keep text-2xl font-extrabold leading-snug text-white xl:text-3xl">
              내게 맞는 정책자금,<br />
              <span className="text-brand-yellow">신청 순서까지</span> 알려드립니다.
            </h2>
            <p className="mt-5 break-keep text-sm leading-relaxed text-white/70">
              89개 정부 사이트를 분석해, 신보·기보·재단·중진공·소진공까지<br />
              대표님 조건에 맞는 기관과 신청 로드맵을 한 번에 안내합니다.
            </p>
          </div>
          <ul className="relative space-y-2.5">
            {[
              "업종·규모 맞춤 기관 매칭",
              "대출·보증 신청 순서·콜센터 안내",
              "지금 신청할 지원사업만 큐레이션",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-[11px] text-brand-dark">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        {/* 우측 로그인 폼 */}
        <main className="mx-auto flex w-full max-w-md flex-col justify-center bg-white px-6 py-10 sm:px-8">
        {/* 선택한 상품 요약 */}
        {selected && (
          <section
            id="signup-selected-tier"
            className="mb-6 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 p-4"
          >
            <p className="text-xs font-semibold text-brand-gray">선택하신 플랜</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-lg font-extrabold text-brand-dark">
                {selected.icon} {selected.name}
              </span>
              <span className="text-lg font-extrabold text-brand-dark">
                {selected.priceLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-brand-gray">{selected.subtitle} · {selected.period}</p>
          </section>
        )}

        <div className="mb-6 text-center">
          <Editable id="signup-title" as="h1" className="text-2xl font-extrabold text-brand-dark">
            {mode === "signup" ? "회원가입" : "로그인"}
          </Editable>
          <Editable id="signup-desc" as="p" className="mt-2 text-sm text-brand-gray">
            {mode === "signup"
              ? "이메일로 간편하게 가입하고 나만의 매칭 리포트를 받아보세요."
              : "가입하신 이메일로 로그인해 주세요."}
          </Editable>
        </div>

        {/* 소셜 로그인 (간편 가입) */}
        <div className="mb-5 space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("kakao", "카카오")}
            className="relative flex w-full items-center justify-center rounded-xl bg-[#FEE500] py-3 text-sm font-bold text-[#191600] transition hover:brightness-95 disabled:opacity-60"
          >
            <svg className="absolute left-4 h-5 w-5" viewBox="0 0 24 24" fill="#191600" aria-hidden="true">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.9 5.33 4.76 6.74-.16.57-.86 3.09-.9 3.29 0 0-.02.15.08.21.1.06.22.01.22.01.28-.04 3.23-2.12 3.74-2.48.68.1 1.38.15 2.1.15 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오톡으로 시작하기
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("google", "구글")}
            className="relative flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-bold text-brand-dark transition hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="absolute left-4 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
              <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-brand-gray">또는 이메일로 가입</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* 모드 전환 탭 */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setMode("signup"); setMsg(null); }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === "signup" ? "bg-white text-brand-dark shadow" : "text-brand-gray"
            }`}
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={() => { setMode("login"); setMsg(null); }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === "login" ? "bg-white text-brand-dark shadow" : "text-brand-gray"
            }`}
          >
            로그인
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-dark">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-dark"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-dark">연락처</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-dark"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-dark"
            />
          </div>

          {msg && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-brand-dark">
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-dark py-3.5 text-base font-extrabold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? "처리 중..."
              : mode === "signup"
              ? selected
                ? "가입하고 결제 진행하기"
                : "가입하고 시작하기"
              : selected
              ? "로그인하고 결제 진행하기"
              : "로그인"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-brand-gray">
          가입 시{" "}
          <Link href="/terms" className="underline">이용약관</Link> 및{" "}
          <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하게 됩니다.
        </p>
        <p className="mt-3 break-keep text-center text-[11px] leading-relaxed text-brand-gray">
          ⚠️ 본 서비스는 신청 가능 상품 안내 및 자문 서비스이며 정부지원사업 승인을
          보장하지 않습니다.
        </p>
        </main>
        </div>
      </div>
      <Footer />
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-brand-gray">불러오는 중...</div>}>
      <SignupInner />
    </Suspense>
  );
}
