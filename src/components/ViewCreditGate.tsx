"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchViewStatus,
  consumeViewCredit,
  daysUntil,
  type ViewStatus,
} from "@/lib/viewCredits";
import { registerViewDevice, logAccess, deviceKind } from "@/lib/deviceGuard";

// ============================================================
// 조회권 게이트
//   대시보드(전체 결과) 앞단에서 실행되며:
//     1) 로그인 확인
//     2) 유효(미만료) 결제 확인 → 없으면 결제 유도 / 만료 안내
//     3) 현재 진단 데이터가 "새 사업자"인지 판단
//          · 새 사업자  → 조회권 1개 차감 (2회 제한)
//          · 이미 본 것 → 재열람 (차감 없음, 1개월간 무제한)
//   판정을 통과하면 children(실제 결과)을 렌더한다.
// ============================================================

type Phase =
  | "loading"
  | "need-login"
  | "need-pay"
  | "expired"
  | "no-credit"
  | "device-locked"
  | "blocked"
  | "granted";

// 진단 데이터로 사업장 지문 생성 (같은 사업장 = 같은 지문)
function fingerprint(profile: Record<string, unknown>): string {
  const bno = String(profile?.bno ?? "").replace(/[^0-9]/g, "");
  const name = String(profile?.name ?? "").trim();
  const type = String(profile?.businessType ?? "");
  // 사업자번호가 있으면 그것만으로 식별 (가장 정확)
  if (bno.length === 10) return `bno:${bno}`;
  // 없으면 이름+유형 조합
  return `nm:${name}|${type}`;
}

const CONSUMED_KEY = "mpp_consumed_fingerprints";

function getConsumed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CONSUMED_KEY) || "[]");
  } catch {
    return [];
  }
}
function addConsumed(fp: string) {
  try {
    const list = getConsumed();
    if (!list.includes(fp)) {
      list.push(fp);
      localStorage.setItem(CONSUMED_KEY, JSON.stringify(list));
    }
  } catch {
    /* noop */
  }
}

export default function ViewCreditGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<ViewStatus | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [guardMsg, setGuardMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) 로그인 확인
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session?.user) {
        setPhase("need-login");
        return;
      }

      // 1-2) 접속 기록 + 차단(IP/계정) 확인
      const access = await logAccess("/dashboard");
      if (!mounted) return;
      if (access.blocked) {
        setGuardMsg(access.reason || "접근이 제한되었습니다.");
        setPhase("blocked");
        return;
      }

      // 1-3) 기기 고정 검증 (핸드폰 1대 / PC 1대)
      const dev = await registerViewDevice();
      if (!mounted) return;
      if (!dev.ok) {
        setGuardMsg(dev.message);
        setPhase("device-locked");
        return;
      }

      // 2) 진단 데이터 읽기
      let profile: Record<string, unknown> = {};
      try {
        profile = JSON.parse(sessionStorage.getItem("mpp_diagnosis") || "{}");
      } catch {
        profile = {};
      }
      setBusinessName(String(profile?.name ?? ""));
      const fp = fingerprint(profile);

      // 3) 서버에서 조회권 상태 확인
      const st = await fetchViewStatus();
      if (!mounted) return;
      setStatus(st);

      if (!st || !st.isActive) {
        // 유효 결제 없음 → 만료 or 미결제 구분
        if (st && st.total > 0 && !st.isActive) {
          setPhase("expired"); // 예전에 결제했으나 1개월 지남
        } else {
          setPhase("need-pay");
        }
        return;
      }

      // 4) 이미 조회 확정한 사업장인가?
      const consumed = getConsumed();
      if (consumed.includes(fp)) {
        // 재열람 → 차감 없이 통과 (1개월간 무제한)
        setPhase("granted");
        return;
      }

      // 5) 새 사업장 → 조회권 남았는지 확인
      if (st.remaining <= 0) {
        setPhase("no-credit");
        return;
      }

      // 6) 조회권 1개 차감 (서버)
      const result = await consumeViewCredit(
        String(profile?.name ?? ""),
        profile
      );
      if (!mounted) return;

      if (result.ok) {
        addConsumed(fp);
        // 최신 상태 반영
        const st2 = await fetchViewStatus();
        if (mounted && st2) setStatus(st2);
        setPhase("granted");
      } else {
        setPhase("no-credit");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 렌더 ----------

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-dark" />
        <p className="text-sm text-brand-gray">조회 권한을 확인하고 있습니다…</p>
      </div>
    );
  }

  if (phase === "need-login") {
    return (
      <GateCard
        icon="🔒"
        title="로그인이 필요합니다"
        desc="결과를 확인하시려면 먼저 로그인해 주세요."
      >
        <Link href="/signup" className="btn-brand mt-6 inline-block rounded-full px-8 py-3">
          로그인 / 회원가입
        </Link>
      </GateCard>
    );
  }

  if (phase === "need-pay") {
    return (
      <GateCard
        icon="🎫"
        title="결제 후 이용하실 수 있습니다"
        desc="전체 매칭 결과 조회는 결제 후 이용 가능합니다. 1회 결제로 조회 2회 · 1개월간 열람이 가능합니다."
      >
        <Link href="/pricing" className="btn-brand mt-6 inline-block rounded-full px-8 py-3">
          플랜 보러 가기
        </Link>
      </GateCard>
    );
  }

  if (phase === "expired") {
    return (
      <GateCard
        icon="⌛"
        title="열람 기간이 만료되었습니다"
        desc="결제 후 1개월간 열람이 가능합니다. 계속 이용하시려면 다시 결제해 주세요."
      >
        <Link href="/pricing" className="btn-brand mt-6 inline-block rounded-full px-8 py-3">
          다시 결제하기
        </Link>
      </GateCard>
    );
  }

  if (phase === "blocked") {
    return (
      <GateCard icon="⛔" title="접근이 제한되었습니다" desc={guardMsg}>
        <a
          href="http://pf.kakao.com/_VxfWxan/chat"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand mt-6 inline-block rounded-full px-8 py-3"
        >
          💬 문의하기
        </a>
      </GateCard>
    );
  }

  if (phase === "device-locked") {
    return (
      <GateCard
        icon={deviceKind() === "mobile" ? "📱" : "💻"}
        title="등록된 기기에서만 열람할 수 있습니다"
        desc={
          guardMsg +
          " 결과는 보안을 위해 최초 열람한 휴대폰 1대 · PC 1대에서만 볼 수 있습니다. 기기 변경이 필요하시면 문의해 주세요."
        }
      >
        <a
          href="http://pf.kakao.com/_VxfWxan/chat"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand mt-6 inline-block rounded-full px-8 py-3"
        >
          💬 기기 변경 문의
        </a>
      </GateCard>
    );
  }

  if (phase === "no-credit") {
    return (
      <GateCard
        icon="🚫"
        title="조회 횟수를 모두 사용하셨습니다"
        desc="1회 결제로 새 사업자 조회는 2회까지 가능합니다. (이미 조회하신 결과는 마이페이지에서 계속 열람하실 수 있습니다.)"
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/mypage" className="rounded-full border-2 border-brand-dark bg-white px-7 py-3 font-bold text-brand-dark hover:bg-gray-50">
            마이페이지로
          </Link>
          <a
            href="http://pf.kakao.com/_VxfWxan/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-brand-dark px-7 py-3 font-bold text-white hover:opacity-90"
          >
            💬 1:1 문의하기
          </a>
        </div>
      </GateCard>
    );
  }

  // granted → 실제 결과 + 상단 조회권 안내 배너
  const remaining = status?.remaining ?? 0;
  const dLeft = daysUntil(status?.expiresAt ?? null);

  return (
    <>
      <div className="mx-auto mb-5 max-w-4xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-yellow bg-brand-yellow/20 px-5 py-3 text-sm">
          <span className="break-keep font-semibold text-brand-dark">
            {businessName ? `${businessName} ` : ""}대표님 사업장의 정밀 조회 결과입니다.{" "}
            <span className="font-medium text-brand-dark/60">
              PC버전으로 보시면 더욱 효과적으로 확인 가능합니다.
            </span>
          </span>
          <span className="text-brand-dark/70">
            남은 새 조회 <b className="text-brand-orange">{remaining}회</b>
            {dLeft !== null && (
              <>
                {" · "}열람 기한 <b className="text-brand-dark">{dLeft}일</b> 남음
              </>
            )}
          </span>
        </div>
      </div>
      {children}
    </>
  );
}

function GateCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        {icon}
      </div>
      <h1 className="text-xl font-extrabold text-brand-dark sm:text-2xl">{title}</h1>
      <p className="mt-3 break-keep text-sm leading-relaxed text-brand-gray">{desc}</p>
      {children}
    </div>
  );
}
