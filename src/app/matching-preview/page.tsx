"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import AdvancedScreeningPanel from "@/components/AdvancedScreeningPanel";
import { countMatchedItems } from "@/lib/supportPrograms";
import {
  getPaymentBlockReasons,
  PAYMENT_BLOCK_TEXT,
  type PaymentBlockReason,
} from "@/lib/diagnosisConfig";

export default function MatchingPreview() {
  const [name, setName] = useState("");
  const [blockReasons, setBlockReasons] = useState<PaymentBlockReason[]>([]);
  const [counts, setCounts] = useState<{
    total: number;
    institutions: number;
    products: number;
    supports: number;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const profile = raw ? JSON.parse(raw) : {};
      setName(profile.name || "");
      setBlockReasons(getPaymentBlockReasons(profile));
      setCounts(countMatchedItems(profile));
    } catch {
      setCounts(null);
    }
  }, []);

  const total = counts?.total ?? 0;
  const isBlocked = blockReasons.length > 0;

  // ── 결제 차단 화면 (파산·회생 진행 중 / 세금 체납 / 자본잠식) ──
  //  안 되는데 결제받으면 환불 요청이 뻔하므로, 결제 유도 대신 정직하게 안내한다.
  if (isBlocked) {
    return (
      <PageShell pageKey="matching-preview">
        <Header />
        <main className="px-4 py-10">
          <div className="mx-auto max-w-xl">
            <div className="rounded-3xl border-2 border-brand-red/40 bg-white p-7 text-center shadow-card">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/10 text-3xl">
                ⚠️
              </div>
              <h1 className="mt-4 break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
                {name ? `${name} 대표님, ` : ""}지금은 신청이 어려운 상태입니다
              </h1>
              <p className="mt-3 break-keep text-sm leading-relaxed text-brand-dark/70">
                아래 사유로 현재는 정책자금·정부지원사업 승인이 어려워{" "}
                <b className="text-brand-red">결제를 진행하지 않습니다.</b> 솔직하게 먼저 안내드리는 것이
                대표님께 도움이 된다고 판단했습니다.
              </p>

              <div className="mt-5 space-y-3 text-left">
                {blockReasons.map((r) => (
                  <div
                    key={r}
                    className="break-keep rounded-2xl border border-brand-red/30 bg-brand-red/5 px-4 py-3"
                  >
                    <p className="text-sm font-extrabold text-brand-red">
                      🚫 {PAYMENT_BLOCK_TEXT[r].title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-dark/70">
                      {PAYMENT_BLOCK_TEXT[r].detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 break-keep rounded-2xl bg-brand-yellow/10 px-4 py-3 text-left text-xs leading-relaxed text-brand-dark/80">
                💡 위 사유가 <b>해소된 후 다시 진단</b>하시면 정상적으로 매칭 결과를
                확인하실 수 있습니다. 궁금한 점은 언제든 상담으로 도와드리겠습니다.
              </div>

              <a
                href="/diagnosis"
                className="btn-brand mt-6 block rounded-full py-3.5 text-center text-base font-bold"
              >
                진단 다시 하기
              </a>
              <a
                href="/"
                className="mt-3 block text-center text-sm text-brand-gray underline"
              >
                홈으로 돌아가기
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </PageShell>
    );
  }

  return (
    <PageShell pageKey="matching-preview">
      <Header />
      {/* 하단 여백(pb-28)으로 sticky 바에 콘텐츠가 가려지지 않게 */}
      <main className="px-4 pb-28 pt-8">
        <div className="mx-auto max-w-3xl">
          {/* 상단 — 진짜 매칭 개수로 궁금증 유발 */}
          <div className="text-center">
            <h1 className="break-keep text-2xl font-extrabold text-brand-dark sm:text-3xl">
              {name ? `${name} 대표님, ` : ""}매칭 결과 미리보기
            </h1>
            <p className="mt-3 break-keep text-lg font-bold text-brand-dark sm:text-xl">
              대표님 사업장에 딱 맞는 지원사업{" "}
              <b className="text-brand-orange">{total}개</b>가 매칭되었습니다.
            </p>
            {counts && total > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-brand-dark/5 px-3 py-1 text-xs font-bold text-brand-dark">
                  🏦 신청 가능 기관 {counts.institutions}곳
                </span>
                <span className="rounded-full bg-brand-dark/5 px-3 py-1 text-xs font-bold text-brand-dark">
                  📑 기관별 상품 {counts.products}종
                </span>
                <span className="rounded-full bg-brand-dark/5 px-3 py-1 text-xs font-bold text-brand-dark">
                  🎁 정부 지원제도 {counts.supports}건
                </span>
              </div>
            )}
            <p className="mt-3 break-keep text-sm text-brand-gray">
              아래는 대표님만을 위해 분석된 <b>실제 결과 화면</b>입니다.
              결제하시면 아래 내용이 <b className="text-brand-orange">모두 선명하게 공개</b>됩니다.
            </p>
          </div>

          {/* 실제 결과창 전체를 블러 처리 + 결제 유도 오버레이 (A안) */}
          <div className="relative mt-8">
            {/* 실제 대시보드 결과창(블러) — 개발자도구 노출 방지를 위해 하단 절반은 페이드로 가림 */}
            <div className="pointer-events-none select-none blur-locked" aria-hidden="true">
              <AdvancedScreeningPanel autoRun />
            </div>

            {/* 아래로 갈수록 화면을 흰색으로 서서히 가려, 잠긴 느낌 + 정보 완전 노출 방지 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white via-white/90 to-transparent" />

            {/* 결제 유도 오버레이 — 블러 위 중앙 */}
            <div className="absolute inset-x-0 top-1/3 flex justify-center px-2">
              <div className="w-full max-w-md rounded-3xl border-2 border-brand-orange bg-white p-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow/30 text-3xl">
                  🔒
                </div>
                <Editable
                  id="preview-lock-title"
                  as="p"
                  className="mt-4 break-keep text-lg font-extrabold text-brand-dark"
                >
                  결제하면 모든 정보가 공개됩니다
                </Editable>
                <Editable
                  id="preview-lock-sub"
                  as="p"
                  className="mt-2 break-keep text-sm leading-relaxed text-brand-dark/70"
                >
                  대표님이 신청할 수 있는 기관·상품·정부지원제도와
                  신청 사이트·필요 서류·승인 전략까지 전부 확인하세요. (VAT 포함)
                </Editable>
                <Editable
                  id="preview-lock-cta"
                  as="a"
                  href="/pricing"
                  className="btn-brand mt-5 block rounded-full py-3.5 text-center text-base font-bold"
                >
                  지금 결제하고 전체 결과 확인하기
                </Editable>
                <Editable
                  id="preview-lock-note"
                  as="p"
                  className="mt-3 break-keep text-xs text-brand-dark/50"
                >
                  ⚠️ 자문 서비스 · 승인 보장 없음 · 대행 없음
                </Editable>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 스크롤을 따라다니는 하단 고정(sticky) 결제 유도 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-orange/40 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <Editable
              id="preview-sticky-title"
              as="p"
              className="truncate text-sm font-extrabold text-brand-dark"
            >
              🔒 전체 결과 잠금 해제
            </Editable>
            <Editable
              id="preview-sticky-sub"
              as="p"
              className="truncate text-xs text-brand-gray"
            >
              결제하면 기관·상품·지원제도·신청 방법 전부 공개
            </Editable>
          </div>
          <Editable
            id="preview-sticky-cta"
            as="a"
            href="/pricing"
            className="shrink-0 whitespace-nowrap rounded-full bg-brand-dark px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            지금 확인하기
          </Editable>
        </div>
      </div>

      <Footer />
    </PageShell>
  );
}
