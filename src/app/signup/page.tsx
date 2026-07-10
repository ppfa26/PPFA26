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

  // 소셜 로그인 (카카오 / 네이버 / 구글) — Supabase OAuth
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

  // 네이버는 Supabase 기본 provider가 아니므로 커스텀 처리(안내)
  const handleNaver = () => {
    setMsg("네이버 로그인은 곧 연결됩니다. 카카오 또는 구글로 시작해 주세요.");
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
      <main className="mx-auto min-h-[70vh] w-full max-w-md px-4 py-10">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-bold text-[#191600] transition hover:brightness-95 disabled:opacity-60"
          >
            <span className="text-base">💬</span> 카카오톡으로 시작하기
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleNaver}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            <span className="text-base font-black">N</span> 네이버로 시작하기
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("google", "구글")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-bold text-brand-dark transition hover:bg-gray-50 disabled:opacity-60"
          >
            <span className="text-base font-black text-[#4285F4]">G</span> 구글로 시작하기
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
