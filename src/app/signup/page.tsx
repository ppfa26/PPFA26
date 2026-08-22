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
import { getCapturedUtmSource } from "@/components/UtmCapture";
import { trackConversion } from "@/components/KarrotPixel";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = (params.get("tier") as "basic" | "premier" | "pro" | null) || null;
  const selected = tier ? TIER_MAP[tier] : null;
  // 로그인/가입 후 돌아갈 곳 (예: 진단 결과 페이지 /matching-preview).
  //  안전을 위해 우리 사이트 내부 경로(/로 시작)만 허용한다.
  //  ★ 카카오/구글 소셜 로그인 콜백 대응 ★
  //    Supabase OAuth(PKCE)는 콜백으로 돌아올 때 URL 에 ?code=... 를 붙였다가
  //    detectSessionInUrl 로 처리한 뒤 쿼리스트링을 정리하는데, 이 과정에서
  //    우리가 넣어둔 ?next=... 까지 함께 날아가 버리는 경우가 있다.
  //    → 그 결과 콜백 후 next 를 못 찾아 진단 결과(/matching-preview)가 아니라
  //      기본값(마이페이지/홈)으로 튕겨 "첫 페이지로 돌아가는" 이탈이 발생했다(대표님 신고).
  //    → next 를 URL 뿐 아니라 localStorage 에도 백업해 두고, URL 에서 사라졌으면
  //      localStorage 에서 복원한다. (소셜 로그인 왕복 전 구간에서 안전)
  const NEXT_KEY = "mpp_next_after_auth";
  const rawNext = (() => {
    const fromUrl = params.get("next") || "";
    if (fromUrl.startsWith("/")) return fromUrl;
    // URL 에 없으면(=콜백 후 정리됨) localStorage 백업에서 복원
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(NEXT_KEY) || "";
        if (saved.startsWith("/")) return saved;
      } catch {
        /* noop */
      }
    }
    return "";
  })();
  const nextPath = rawNext.startsWith("/") ? rawNext : "";

  // 가입 방식은 카카오/구글 소셜 로그인만 제공(대표님 요청).
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════
  //  ★ 이메일 로그인 (상시 노출) ★  (대표님 요청)
  //   · 카카오/구글 소셜 로그인과 함께, 이메일+비밀번호 로그인도 항상 제공.
  //   · 심사팀(토스 PG 등)이 별도 링크 없이 일반 로그인 화면에서
  //     이메일·비밀번호로 바로 로그인할 수 있게 한다.
  //   · 계정은 Supabase Authentication 에서 발급한다.
  //   ※ Supabase Authentication > Providers > Email 이 켜져 있어야 동작한다.
  // ══════════════════════════════════════════════════════════════
  const [emailId, setEmailId] = useState("");
  const [emailPw, setEmailPw] = useState("");

  // 이메일/비밀번호 로그인
  const handleEmailLogin = async () => {
    setMsg(null);
    const email = emailId.trim();
    if (!email || !emailPw) {
      setMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    // 심사용 로그인은 필수 동의 4종을 자동 체크 처리(심사자가 매번 체크하지 않도록).
    setAgreeAge(true);
    setAgreeTerms(true);
    setAgreePrivacy(true);
    setAgreeThird(true);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: emailPw,
      });
      if (error) {
        setMsg("로그인 실패: " + error.message);
        setLoading(false);
        return;
      }
      // 성공 시 onAuthStateChange(SIGNED_IN) 가 잡아 자동 이동한다.
    } catch (e) {
      setMsg("로그인 중 오류가 발생했습니다. " + String(e));
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  ★ 이메일 회원가입 (대표님 요청) ★
  //   · '이메일로 로그인' 옆에 '이메일로 회원가입' 버튼을 두어,
  //     이메일+비밀번호로 신규 계정을 만들 수 있게 한다.
  //   · 심사 기간 임시 운영. (필요 시 나중에 버튼만 제거)
  //   ※ Supabase Authentication > Providers > Email 활성화 필요.
  //   ※ '이메일 확인(Confirm email)' 설정이 켜져 있으면 가입 후 인증메일이
  //     발송되고, 인증 완료 전에는 로그인/세션이 안 잡힐 수 있다.
  //     (이 경우 사용자에게 '메일 확인' 안내를 표시한다)
  // ══════════════════════════════════════════════════════════════
  const handleEmailSignup = async () => {
    setMsg(null);
    const email = emailId.trim();
    if (!email || !emailPw) {
      setMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (emailPw.length < 6) {
      setMsg("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }
    // 회원가입도 '가입 절차'이므로 필수 약관 동의를 먼저 확인(미동의 시 차단·강조).
    if (!requireAgreementOrBlock()) return;
    // 동의 근거 기록(소셜과 동일 포맷)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "mpp_consent",
          JSON.stringify({
            age: agreeAge,
            terms: agreeTerms,
            privacy: agreePrivacy,
            third_party: agreeThird,
            marketing: marketingAgree,
            at: new Date().toISOString(),
            method: "email",
          })
        );
      }
    } catch {
      /* noop */
    }
    setLoading(true);
    try {
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/signup${tier ? `?tier=${tier}` : nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`
          : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: emailPw,
        options: {
          emailRedirectTo,
          data: { utm_source: getCapturedUtmSource() },
        },
      });
      if (error) {
        setMsg("회원가입 실패: " + error.message);
        setLoading(false);
        return;
      }
      // 이메일 확인(Confirm email)이 켜진 경우: 세션이 아직 없고 인증메일이 발송됨.
      //  → onAuthStateChange 가 안 잡히므로 사용자에게 메일 확인을 안내한다.
      if (data?.user && !data.session) {
        setMsg("가입 확인 메일을 보냈어요. 메일함에서 인증을 완료한 뒤 로그인해 주세요.");
        setLoading(false);
        return;
      }
      // 세션이 바로 생긴 경우(이메일 확인 OFF)엔 onAuthStateChange(SIGNED_IN)가 자동 이동.
    } catch (e) {
      setMsg("회원가입 중 오류가 발생했습니다. " + String(e));
      setLoading(false);
    }
  };

  // ── 약관 동의 (삼쩜삼式 필수/선택 분리, 대표님 요청) ──
  //  필수 4종 + 선택(마케팅) 1종. '전체 동의' 마스터 체크 제공.
  //  가입/소셜로그인 버튼을 누르면 필수 항목은 자동 체크되어 진행된다.
  const [agreeAge, setAgreeAge] = useState(false);        // [필수] 만 14세 이상
  const [agreeTerms, setAgreeTerms] = useState(false);    // [필수] 이용약관
  const [agreePrivacy, setAgreePrivacy] = useState(false);// [필수] 개인정보 수집·이용
  const [agreeThird, setAgreeThird] = useState(false);    // [필수] 개인정보 제3자 제공
  const [marketingAgree, setMarketingAgree] = useState(false); // [선택] 마케팅·홍보 수신 (개인정보보호법상 선택 동의는 기본 해제)
  // 미동의 상태에서 소셜/가입 버튼을 눌렀을 때 동의 영역을 잠깐 강조(주황 테두리)해 시선을 유도
  const [highlightConsent, setHighlightConsent] = useState(false);

  const allRequiredChecked = agreeAge && agreeTerms && agreePrivacy && agreeThird;
  const allChecked = allRequiredChecked && marketingAgree;

  // 전체 동의 토글
  const setAllAgree = (v: boolean) => {
    setAgreeAge(v);
    setAgreeTerms(v);
    setAgreePrivacy(v);
    setAgreeThird(v);
    setMarketingAgree(v);
  };

  // 가입 시 필수 동의 검사 - 개인정보보호법상 동의는 이용자가 '직접' 체크해야 유효하므로
  // 자동 체크(예전 방식)를 제거하고, 필수 항목 미동의 시 진행을 차단한다.
  //  · 반환 true = 통과 / false = 미동의(차단, 안내 메시지 표시)
  //   ★ 카카오/구글 버튼 UX (대표님 요청) ★
  //   버튼 클릭만으로 필수 동의를 자동 체크하는 것은 개인정보보호법상 '이용자가 직접 동의' 요건
  //   위반이라 불가하다. 대신, 미동의 상태에서 버튼을 누르면 동의 영역으로 부드럽게 스크롤하고
  //   주황 테두리로 잠깐 강조해, 한 번의 '전체 동의' 클릭으로 바로 진행할 수 있게 시선을 유도한다.
  const requireAgreementOrBlock = (): boolean => {
    if (!allRequiredChecked) {
      setMsg("아래 필수 약관에 동의하시면 바로 시작할 수 있어요.");
      // 동의 박스로 스크롤 + 강조
      if (typeof window !== "undefined") {
        // 렌더 반영 후 스크롤되도록 다음 틱에 실행
        setTimeout(() => {
          document
            .getElementById("signup-consent-box")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
      }
      setHighlightConsent(true);
      setTimeout(() => setHighlightConsent(false), 2200);
      return false;
    }
    return true;
  };

  // 이미 로그인된 경우 이동:
  //  · 결제 진행 중(tier 있음) → 결제 페이지
  //  · 그 외(순수 로그인) → 마이페이지(결과를 클릭해서 확인하도록 유도 · 대표님 요청)
  //  ※ 진단 데이터(mpp_diagnosis)는 localStorage에 30일간 보관되므로 로그인/이동해도 유지됨
  //
  //  ★ 카카오/구글 소셜 로그인 콜백 안정화 (대표님 요청 - 가입 이탈 방지) ★
  //   OAuth 로 돌아오면 세션이 URL(#access_token=...)로 넘어오는데, supabase-js 가
  //   이를 파싱해 저장하는 데 아주 잠깐 시간이 걸린다. getSession() 을 딱 한 번만
  //   호출하면 저장 '이전'이라 세션을 못 잡고 가입 화면에 머물러 → 사용자가
  //   "가입이 안 됐네" 하고 이탈할 수 있다.
  //   → onAuthStateChange 리스너를 함께 걸어, 세션이 저장되는 '그 순간' 바로
  //     다음 페이지로 넘어가게 한다. (소셜 로그인 완료가 항상 즉시 반영됨)
  useEffect(() => {
    let done = false;
    // isNewSignup: 이번에 '새로' 로그인/가입이 일어난 경우(SIGNED_IN)만 true.
    //  (이미 로그인 상태로 재진입한 INITIAL_SESSION 은 false)
    const go = (isNewSignup = false) => {
      if (done) return;
      done = true;
      // ★ 자동 무료진단 진입(대표님 요청) ★
      //   결제(tier)도 진단결과(next)도 없이 '순수 회원가입'만 한 신규 가입자는
      //   마이페이지 대신 곧바로 무료진단으로 보낸다. → "가입만 하고 진단 안 함" 방지.
      //   · 기존 회원 재로그인(isNewSignup=false)은 진단을 이미 했을 수 있으니
      //     기존대로 마이페이지로.
      const defaultDest = isNewSignup ? "/diagnosis-chat" : "/mypage";
      const dest = tier ? `/payment?tier=${tier}` : nextPath || defaultDest;
      // 목적지로 이동하는 순간 next 백업은 소임을 다했으니 정리(다음 로그인에 오염 방지)
      try {
        localStorage.removeItem(NEXT_KEY);
      } catch {
        /* noop */
      }
      router.replace(dest);
    };

    // ★ 소셜 로그인(카카오/구글) 유입경로(UTM) 백필 ★
    //   OAuth 는 signInWithOAuth 로 페이지를 떠나므로 가입 시 utm_source 를 넣을 수 없다.
    //   → 콜백으로 돌아와 세션이 생긴 이 시점에, 아직 utm_source 가 비어 있는 유저에게만
    //     방문 때 UtmCapture 가 저장해 둔 채널을 메타데이터에 채워 넣는다.
    //     (이미 값이 있으면 첫 유입 채널 보존을 위해 덮어쓰지 않는다.)
    //   ⚠️ 리다이렉트(go)를 막지 않도록 백그라운드로 실행하되, 값 반영을 위해 먼저 시도한다.
    const backfillUtm = async (session: any) => {
      try {
        const existing = session?.user?.user_metadata?.utm_source;
        if (existing) return; // 이미 채널이 기록됨 → 유지
        const captured = getCapturedUtmSource(); // 없으면 "direct"
        await supabase.auth.updateUser({ data: { utm_source: captured } });
      } catch {
        /* 실패해도 로그인/이동에는 영향 없음 */
      }
    };

    // 1) 진입 즉시 한 번 확인 (이미 로그인 상태였던 경우)
    //    → 이미 로그인돼 있던 재진입이므로 '신규 가입'이 아니다(마이페이지로).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void backfillUtm(data.session);
        go(false);
      }
    });

    // 2) 세션이 새로 생기는 순간(소셜 로그인 콜백 포함) 즉시 이동
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // ★ 전환 추적 ★ 새로 '로그인/가입'이 일어난 순간(SIGNED_IN)에만
        //   회원가입 완료 전환을 1회 전송한다. (이미 로그인 상태로 페이지에
        //   재진입한 경우엔 INITIAL_SESSION 이라 중복 전송되지 않는다.)
        const isNewSignup = event === "SIGNED_IN";
        if (isNewSignup) {
          trackConversion("CompleteRegistration");
        }
        void backfillUtm(session);
        go(isNewSignup);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, tier, nextPath]);

  // 소셜 로그인 (카카오 / 구글) - Supabase OAuth
  const handleOAuth = async (provider: "kakao" | "google", label = "") => {
    setMsg(null);
    // 소셜 로그인도 '가입' 절차이므로 필수 동의를 이용자가 직접 체크했는지 검사 (미동의 시 차단)
    if (!requireAgreementOrBlock()) return;
    // 동의 시각·실제 체크 상태를 기록해 두었다가 콜백 후 가입 완료 시점에 사용 (근거 보관)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "mpp_consent",
          JSON.stringify({
            age: agreeAge,
            terms: agreeTerms,
            privacy: agreePrivacy,
            third_party: agreeThird,
            marketing: marketingAgree,
            at: new Date().toISOString(),
            method: provider,
          })
        );
      }
    } catch {
      /* noop */
    }
    setLoading(true);
    try {
      // ★ 소셜 로그인 왕복 대비: next(진단 결과 경로)를 localStorage 에도 백업 ★
      //   OAuth 콜백에서 URL 의 ?next=... 가 정리돼 사라지더라도 여기 저장분으로 복원한다.
      //   (tier 결제 흐름일 땐 next 대신 tier 를 쓰므로 저장하지 않고, 잔여 백업은 지운다.)
      try {
        if (!tier && nextPath) localStorage.setItem(NEXT_KEY, nextPath);
        else localStorage.removeItem(NEXT_KEY);
      } catch {
        /* noop */
      }
      // 소셜 로그인 후 돌아올 주소 - tier(결제) 또는 next(진단 결과)를 그대로 유지
      const qs = tier
        ? `?tier=${tier}`
        : nextPath
        ? `?next=${encodeURIComponent(nextPath)}`
        : "";
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/signup${qs}`
          : undefined;
      // 카카오싱크: 로그인 시 '모두의사업친구' 채널(_VxfWxan) 추가 동의 화면을 함께 노출
      // (구글 등 다른 provider에는 영향 없음 - 카카오일 때만 queryParams 부여)
      const options =
        provider === "kakao"
          ? {
              redirectTo,
              queryParams: { channel_public_id: "_VxfWxan" },
            }
          : { redirectTo };
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
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

  return (
    <PageShell pageKey="signup">
      <Header />
      {/* 중앙 정렬 · 적당한 폭(max-w-5xl) 좌우 2분할 카드 - 화면 꽉 채우지 않고, 위아래 흰 공백 없이 */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-4 sm:pt-12 sm:pb-6">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 shadow-card lg:grid-cols-2">
        {/* 좌측 브랜드 패널 - 데스크톱 전용(모바일 숨김) · 로고 중복 없음(상단 헤더에 이미 있음) */}
        <aside className="relative hidden overflow-hidden bg-brand-dark lg:flex lg:flex-col lg:justify-center lg:gap-8 lg:px-10 lg:py-12">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-yellow/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="relative">
            <span className="inline-block rounded-full bg-brand-yellow/15 px-3 py-1 text-[11px] font-bold text-brand-yellow">
              정부지원사업 AI 통합 매칭 플랫폼
            </span>
            <h2 className="mt-4 break-keep text-2xl font-extrabold leading-snug text-white xl:text-3xl">
              <span className="text-brand-yellow">AI</span>를 활용해 내 사업장에 알맞은<br />
              <span className="bg-gradient-to-r from-brand-yellow to-brand-orange bg-clip-text text-transparent">
                정부지원사업
              </span>
              을 찾아드립니다.
            </h2>
            <p className="mt-5 break-keep text-sm leading-relaxed text-white/70">
              모든 정부기관 사이트를 <span className="font-bold text-brand-yellow">AI가 정밀 분석</span>해,
              <br />
              대표님 사업장에 <span className="font-bold text-white">딱 맞는 정부지원사업</span>과<br />
              <span className="font-bold text-brand-orange">신청 방법</span>까지 안내해드립니다.
            </p>
          </div>
          <ul className="relative space-y-2.5">
            {[
              <>
                <span className="font-bold text-brand-yellow">AI가 업종·규모를 분석</span>해 맞춤으로 정부지원사업 매칭
              </>,
              <>
                <span className="font-bold text-brand-yellow">지금 바로 신청 가능한</span> 정부지원사업만 큐레이션
              </>,
              <>
                <span className="break-keep">신청 순서·<span className="font-bold text-brand-yellow">필요 서류·콜센터</span>까지 한 번에 안내</span>
              </>,
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-[11px] text-brand-dark shadow-[0_0_12px_rgba(255,193,7,0.4)]">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        {/* 우측 로그인 폼 - 섹션 간 간격을 space-y-4 로 부모에서 일괄 통일(대표님 요청: 균일한 여백) */}
        <main className="mx-auto flex w-full max-w-md flex-col justify-start space-y-4 bg-white px-6 py-12 sm:px-8">
        {/* 선택한 상품 요약 */}
        {selected && (
          <section
            id="signup-selected-tier"
            className="rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 p-4"
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
            로그인 · 회원가입
          </Editable>
          <Editable id="signup-desc" as="p" className="mt-2 text-sm text-brand-gray">
            <>
              클릭 한 번에 간편하게 시작하고
              <br />
              나만의 AI 매칭 리포트를 받아보세요.
            </>
          </Editable>
        </div>

        {/* 소셜 로그인 (간편 가입) - 섹션 간격은 부모 space-y-4 가 관리(대표님 요청: 균일한 여백) */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={loading}
            aria-disabled={!allRequiredChecked}
            onClick={() => handleOAuth("kakao", "카카오")}
            className={`relative flex w-full items-center justify-center rounded-2xl bg-[#FEE500] py-3.5 text-sm font-bold text-[#191600] transition-colors duration-150 hover:brightness-95 disabled:opacity-60 ${!allRequiredChecked ? "opacity-70" : ""}`}
          >
            <svg className="absolute left-4 h-5 w-5" viewBox="0 0 24 24" fill="#191600" aria-hidden="true">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.9 5.33 4.76 6.74-.16.57-.86 3.09-.9 3.29 0 0-.02.15.08.21.1.06.22.01.22.01.28-.04 3.23-2.12 3.74-2.48.68.1 1.38.15 2.1.15 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오톡으로 시작하기
          </button>
          <button
            type="button"
            disabled={loading}
            aria-disabled={!allRequiredChecked}
            onClick={() => handleOAuth("google", "구글")}
            className={`relative flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white py-3.5 text-sm font-bold text-brand-dark transition-colors duration-150 hover:bg-gray-50 disabled:opacity-60 ${!allRequiredChecked ? "opacity-70" : ""}`}
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

        {/* ── 이메일 로그인 폼 (상시 노출) ──
            심사팀(토스 PG 등)이 별도 링크 없이 일반 로그인 화면에서
            이메일·비밀번호로 로그인할 수 있도록 항상 표시한다(대표님 요청).
            계정은 Supabase Authentication 에서 발급. */}
        <div className="rounded-2xl border border-gray-300 bg-white p-4">
          <p className="mb-3 text-center text-xs font-semibold text-brand-dark/70">
            이메일로 로그인 · 회원가입
          </p>
          <div className="space-y-2">
            <input
              type="email"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              placeholder="이메일(아이디)"
              autoComplete="username"
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
            />
            <input
              type="password"
              value={emailPw}
              onChange={(e) => setEmailPw(e.target.value)}
              placeholder="비밀번호 (회원가입 시 6자 이상)"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleEmailLogin();
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
            />
            {/* 로그인 · 회원가입 버튼 나란히 배치 (대표님 요청) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleEmailLogin()}
                className="w-full rounded-2xl bg-brand-dark py-3.5 text-sm font-bold text-white transition-colors duration-150 hover:bg-black disabled:opacity-60"
              >
                {loading ? "처리 중…" : "이메일로 로그인"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleEmailSignup()}
                className="w-full rounded-2xl border border-brand-dark bg-white py-3.5 text-sm font-bold text-brand-dark transition-colors duration-150 hover:bg-gray-50 disabled:opacity-60"
              >
                {loading ? "처리 중…" : "이메일로 회원가입"}
              </button>
            </div>
          </div>
        </div>

        {/* 안내/오류 메시지 (소셜 로그인 공통) - 섹션 간격은 부모 space-y-4 가 관리(대표님 요청: 균일한 여백) */}
        {msg && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-brand-dark">
            {msg}
          </p>
        )}

        {/* ── 약관 동의 영역 (삼쩜삼式) ──
            카카오/구글 소셜 로그인 공통. 필수 항목에 직접 동의하셔야 진행됩니다.
            (대표님 요청) 위 안내문구와 이 박스 사이 여백을 소셜버튼 아래 여백과 동일하게 통일 */}
        <div
            id="signup-consent-box"
            className={`rounded-2xl border bg-gray-50/70 p-4 transition ${
              highlightConsent
                ? "border-brand-orange ring-2 ring-brand-orange/40"
                : "border-gray-200"
            }`}
          >
            {/* 전체 동의 */}
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-gray-200 pb-3">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => setAllAgree(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand-orange"
              />
              <span className="text-sm font-extrabold text-brand-dark">
                아래 약관에 모두 동의합니다
              </span>
            </label>
            {/* 개인정보보호법·정보통신망법 준수 - 선택 동의는 강요 금지, 미동의해도 이용 가능함을 명시 */}
            <p className="mt-2 break-keep text-[11px] leading-relaxed text-brand-gray">
              전체 동의는 선택 항목(마케팅 정보 수신)을 포함하고 있으며,
              선택 항목에 동의하지 않아도 서비스를 이용하실 수 있습니다.
            </p>

            <div className="mt-3 space-y-2.5">
              {/* [필수] 만 14세 이상 */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep text-[13px] leading-relaxed text-brand-dark/80">
                  <b className="text-brand-red">[필수]</b> 만 14세 이상입니다.
                </span>
              </label>

              {/* [필수] 이용약관 */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep text-[13px] leading-relaxed text-brand-dark/80">
                  <b className="text-brand-red">[필수]</b>{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    이용약관
                  </Link>
                  에 동의합니다.
                </span>
              </label>

              {/* [필수] 개인정보 수집·이용 */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep text-[13px] leading-relaxed text-brand-dark/80">
                  <b className="text-brand-red">[필수]</b>{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    개인정보 수집·이용
                  </Link>
                  에 동의합니다.
                </span>
              </label>

              {/* [필수] 개인정보 제3자 제공 */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeThird}
                  onChange={(e) => setAgreeThird(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep text-[13px] leading-relaxed text-brand-dark/80">
                  <b className="text-brand-red">[필수]</b>{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    개인정보 제3자 제공
                  </Link>
                  에 동의합니다.
                </span>
              </label>

              {/* [선택] 마케팅·홍보 수신 */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={marketingAgree}
                  onChange={(e) => setMarketingAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep text-[13px] leading-relaxed text-brand-dark/80">
                  <b className="text-brand-gray">[선택]</b> 마케팅·홍보 정보 수신에 동의합니다.
                </span>
              </label>
            </div>
          </div>

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
