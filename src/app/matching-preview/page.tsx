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
          {/* ── 상단 히어로: 가로형으로 개수를 크게 강조해 '와, 이렇게 많아?' 느낌 ── */}
          <div className="text-center">
            <p className="break-keep text-sm font-bold text-brand-gray">
              {name ? `${name} 대표님 사업장의 ` : "대표님 사업장의 "}분석이 완료되었습니다.
            </p>

            {/* 가로형 카드: 왼쪽=큰 숫자, 오른쪽=매칭 요약 배지 (모바일에서도 한 줄 유지) */}
            <div className="mt-3 flex flex-row items-stretch gap-3 rounded-3xl border-2 border-brand-orange/60 bg-gradient-to-r from-brand-orange/10 to-white p-4 shadow-[0_10px_30px_rgba(255,140,0,0.15)] sm:gap-5 sm:p-6">
              {/* 왼쪽: 큰 숫자 */}
              <div className="flex shrink-0 flex-col items-center justify-center border-r border-brand-orange/25 pr-3 sm:pr-5">
                <span className="break-keep text-[11px] font-bold leading-tight text-brand-dark/80 sm:text-sm">
                  받을 수 있는
                  <br />
                  지원사업
                </span>
                <span className="mt-0.5 flex items-end gap-0.5">
                  <b className="text-5xl font-black leading-none text-brand-orange sm:text-6xl">
                    {total}
                  </b>
                  <b className="pb-1 text-xl font-extrabold text-brand-orange sm:text-2xl">
                    개
                  </b>
                </span>
                <span className="mt-1 break-keep text-[10px] font-bold text-brand-dark/60 sm:text-xs">
                  매칭 완료 🎉
                </span>
              </div>

              {/* 오른쪽: 매칭 요약 (세로로 쌓아 가로 공간 절약 → 모바일에서도 안 짤림) */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 text-left">
                {counts && total > 0 ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-sm">
                      🏦 <span className="text-brand-dark/70">기관</span>
                      <b className="ml-auto text-brand-orange">{counts.institutions}곳</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-sm">
                      💰 <span className="text-brand-dark/70">정책자금 상품</span>
                      <b className="ml-auto text-brand-orange">{counts.products}종</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-sm">
                      🎁 <span className="text-brand-dark/70">정부지원제도</span>
                      <b className="ml-auto text-brand-orange">{counts.supports}건</b>
                    </span>
                  </>
                ) : (
                  <span className="break-keep text-sm font-bold text-brand-dark/70">
                    대표님 조건으로 매칭된 지원사업을 정리했어요.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── 실제 결과 전체를 그대로 렌더링 + 사생활 보호 필름 블러 ──
               높이 제한 없이 전부 보여줘 '내용이 이렇게 많구나' 체감시키되,
               필름 블러로 글자는 못 읽게 하고 자물쇠 오버레이로 잠금 표시 */}
          <p className="mt-6 break-keep text-center text-xs text-brand-gray">
            👇 아래는 대표님만을 위해 분석된 <b>실제 결과 화면 전체</b>입니다. (결제 후 선명하게 공개)
          </p>
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {/* 실제 대시보드 결과창 — 전체 렌더링 + 필름 블러 */}
            <div className="preview-film" aria-hidden="true">
              <AdvancedScreeningPanel autoRun />
            </div>

            {/* 살짝 어둡게 덮는 반투명 레이어 (잠김 강조) */}
            <div className="pointer-events-none absolute inset-0 bg-white/10" />

            {/* 중앙 자물쇠 오버레이 — 스크롤해도 화면 중앙에 고정 */}
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
              <div className="sticky top-1/3 mx-4 max-w-sm rounded-3xl border border-brand-orange/40 bg-white/95 px-6 py-7 text-center shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/15 text-3xl">
                  🔒
                </div>
                <p className="mt-3 break-keep text-base font-extrabold text-brand-dark">
                  결제 후 결과 공개
                </p>
                <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70">
                  아래 화면 전체가 대표님 진단 기준으로 이미 분석되어 있습니다.
                  결제하시면 <b className="text-brand-orange">필름이 걷히고</b> 모든 내용을 선명하게 보실 수 있습니다.
                </p>
                <a
                  href="/pricing"
                  className="btn-brand pointer-events-auto mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-bold"
                >
                  전체 결과 잠금 해제하기 →
                </a>
              </div>
            </div>
          </div>

          {/* ── 결제 유도 박스 (최하단) ── */}
          <div className="mt-8 rounded-2xl border-2 border-brand-orange bg-white p-4 text-center shadow-[0_8px_28px_rgba(0,0,0,0.12)] sm:p-5">
            <Editable
              id="preview-lock-title"
              as="p"
              className="break-keep text-base font-extrabold text-brand-dark sm:text-lg"
            >
              🔒 결제하면 위 모든 항목의 상세 내용이 공개됩니다
            </Editable>
            <Editable
              id="preview-lock-sub"
              as="p"
              className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm"
            >
              신청 가능한 기관·상품·정부지원제도와 신청 사이트·필요 서류·승인 전략까지 한 번에 확인하실 수 있습니다. (VAT 포함)
            </Editable>
            <Editable
              id="preview-lock-cta"
              as="a"
              href="/pricing"
              className="btn-brand mt-3.5 block rounded-full py-3 text-center text-sm font-bold sm:text-base"
            >
              지금 결제하고 전체 결과 확인하기
            </Editable>
            <Editable
              id="preview-lock-note"
              as="p"
              className="mt-2.5 break-keep text-[11px] text-brand-dark/50"
            >
              ⚠️ 자문 서비스 · 승인 보장 없음 · 대행 없음
            </Editable>
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
              {total > 0
                ? `매칭된 ${total}개 항목의 신청 방법·서류·전략 전부 공개`
                : "결제하면 기관·상품·지원제도·신청 방법 전부 공개"}
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
