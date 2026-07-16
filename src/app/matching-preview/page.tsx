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
  // 관리자 열람 배너 전용 식별 라벨(이름→연락처→이메일). name이 비어도 '누구 결과'인지 표시.
  const [adminLabel, setAdminLabel] = useState("");
  const [blockReasons, setBlockReasons] = useState<PaymentBlockReason[]>([]);
  // 관리자 열람 모드: /matching-preview?admin=1 로 열면 잠금(previewLock) 없이
  //   전체 결과를 그대로 보여준다. (대표님이 상담 시 고객과 같은 결과창을 보기 위함)
  //   결제·조회권 차감이 없는 이 미리보기 페이지를 재사용하므로 부작용이 없다.
  const [adminView, setAdminView] = useState(false);
  const [counts, setCounts] = useState<{
    total: number;
    institutions: number;
    products: number;
    supports: number;
    benefits: number;
  } | null>(null);

  useEffect(() => {
    try {
      const isAdmin =
        new URLSearchParams(window.location.search).get("admin") === "1";
      setAdminView(isAdmin);
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const profile = raw ? JSON.parse(raw) : {};
      setName(profile.name || "");
      setAdminLabel(
        profile._adminLabel || profile.name || profile.phone || profile.email || ""
      );
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
                💡 위 사유가 <b>해소된 후 다시 진단</b>해 주세요.
                <br />
                그러면 정상적으로 매칭 결과를 확인하실 수 있습니다.
                <br />
                궁금한 점은 언제든 상담으로 도와드립니다.
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
      {/* 하단 여백(pb-40)으로 sticky 결제 박스에 콘텐츠가 가려지지 않게 */}
      <main className={`px-4 pt-8 ${adminView ? "pb-16" : "pb-40"}`}>
        <div className="mx-auto max-w-3xl">
          {/* ── 관리자 열람 모드 안내 배너 (대표님만 보임) ── */}
          {adminView && (
            <div className="mb-6 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 p-4 text-center">
              <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                🔓 관리자 열람 모드 —{" "}
                <span className="text-brand-orange">
                  {adminLabel
                    ? name
                      ? `${adminLabel}\u00A0님`
                      : adminLabel
                    : "이 고객"}
                </span>
                {"\u00A0"}결과 전체 보기
              </p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/70">
                이 화면은 대표님(관리자)만 보는 잠금 해제 결과창입니다. 상담 시 고객과 같은 화면을 보며 안내하세요.
              </p>
            </div>
          )}

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
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-base">
                      💰 <span className="text-brand-dark/70">정책자금 상품</span>
                      <b className="ml-auto text-base text-brand-orange sm:text-lg">{counts.products}종</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-base">
                      🎁 <span className="text-brand-dark/70">정부지원제도</span>
                      <b className="ml-auto text-base text-brand-orange sm:text-lg">{counts.supports}건</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[13px] font-bold text-brand-dark sm:text-base">
                      🎁 <span className="text-brand-dark/70">추가 감면 혜택</span>
                      <b className="ml-auto text-base text-brand-orange sm:text-lg">{counts.benefits}건</b>
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

          {/* ── 무엇을 알려주는지(목차) 선명 공개 — '이런 걸 알려주는구나' 궁금증 유발 ── */}
          <div className="mt-6 rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-card">
            <p className="break-keep text-sm font-extrabold text-brand-dark">
              📋 결제하시면 이런 내용을 알려드립니다
            </p>
            <div className="mt-3 space-y-2.5">
              {[
                {
                  icon: "🎁",
                  t: "신청할 수 있는 정부지원제도",
                  d: "지원금·바우처·인증·교육까지, 대출이 아닌 받을 수 있는 제도 전부",
                },
                {
                  icon: "🏦",
                  t: "이용할 수 있는 정책금융기관",
                  d: "중진공·소진공·신용보증재단 등, 대표님 조건에 맞는 기관과 신청 가능한 정책자금 상품",
                },
                {
                  icon: "🔗",
                  t: "각 항목의 신청 방법",
                  d: "공식 신청 사이트·담당 콜센터·접수 순서까지 하나하나 안내",
                },
                {
                  icon: "📄",
                  t: "필요 서류 & 신청 전략",
                  d: "무엇을 준비하고 어떻게 신청하면 승인 확률이 다소 높아지는지 실전 팁",
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3"
                >
                  <span className="mt-0.5 text-lg">{it.icon}</span>
                  <div className="min-w-0">
                    <p className="break-keep text-sm font-bold text-brand-dark">
                      {it.t}
                    </p>
                    <p className="mt-0.5 break-keep text-xs leading-relaxed text-brand-gray">
                      {it.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 중간 결제 유도 박스 (대표님 요청) ──
               결과를 스크롤하기 전, 화면 중간에서 바로 '어디서 결제하는지' 찾을 수 있게 배치.
               최하단 박스·하단 sticky 바와 함께 3중으로 결제 진입점을 노출 */}
          {!adminView && (
          <div className="mt-6 rounded-2xl border-2 border-brand-orange bg-gradient-to-br from-brand-orange/10 to-white p-4 text-center shadow-[0_8px_28px_rgba(255,140,0,0.18)] sm:p-5">
            <p className="break-keep text-base font-extrabold text-brand-dark sm:text-lg">
              🔓 지금 결제하면 위 <span className="text-brand-orange">{total}개</span> 항목의 상세 내용이 모두 공개됩니다
            </p>
            <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm">
              💳 부담 없는 1회성 결제로 내 사업장에 맞는 모든 정부지원사업을 확인하세요. (VAT 포함)
            </p>
            <a
              href="/pricing"
              className="btn-brand mt-3.5 block rounded-full py-3 text-center text-sm font-bold sm:text-base"
            >
              💳 지금 결제하고 전체 결과 확인하기
            </a>
          </div>
          )}

          {/* ── 실제 결과 전체를 그대로 렌더링 (내용 대부분 공개) ──
               제목·설명·안내는 선명하게 열어 '무엇을 알려주는지' 충분히 이해시키고,
               기관명·상품명·신청 방법(버튼/링크)만 흐리게 + 클릭 차단으로 잠금 표시 */}
          {!adminView && (
          <p className="mt-6 break-keep text-center text-xs text-brand-gray">
            👇 아래는 대표님만을 위해 분석된 <b>실제 결과 화면</b>입니다. 어떤 내용을 알려드리는지 대부분 열어뒀고,
            <b className="text-brand-orange"> 기관명·상품명·신청 방법</b>만 결제 후 공개됩니다.
          </p>
          )}
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {/* 선명한 섹션 목차 바 — '무엇을 알려주는지' 제목만 열어둠 */}
            <div className="border-b border-gray-100 bg-brand-orange/5 px-4 py-3">
              <p className="mb-2 break-keep text-[11px] font-bold text-brand-dark/50">
                📑 아래 결과에는 이런 항목들이 담겨 있어요
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "🏦 이용 가능 정책금융기관",
                  "💰 신청 가능 정책자금 상품",
                  "🎁 받을 수 있는 정부지원제도",
                  "🔗 신청 사이트 · 콜센터",
                  "📄 필요 서류 · 승인 전략",
                ].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-brand-orange/30 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-dark"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 실제 대시보드 결과창 — 내용은 열고 이름/버튼만 부분 잠금(previewLock).
                관리자 열람 모드에서는 previewLock을 꺼서 전체 결과를 그대로 보여준다. */}
            <AdvancedScreeningPanel autoRun previewLock={!adminView} />
          </div>

          {/* ── 결제 유도 박스 (최하단) ── */}
          {!adminView && (
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
              내 사업장에 맞는 모든 정부지원사업을 찾아보세요.
              <br />
              기관·상품·신청 사이트·필요 서류·승인 전략까지 한 번에 확인하실 수 있습니다.
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
              ⚠️ 안내·추천 서비스 · 승인 보장 없음
            </Editable>
          </div>
          )}
        </div>
      </main>

      {/* ── 스크롤을 따라다니는 하단 고정(sticky) 결제 유도 박스 ──
           스크린샷의 오렌지 결제 유도 박스를 그대로 하단에 고정 → 스크롤 내내 결제 유도
           (관리자 열람 모드에서는 숨김) */}
      {!adminView && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-brand-orange bg-white/97 px-4 py-3 shadow-[0_-6px_24px_rgba(255,140,0,0.22)] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Editable
            id="preview-sticky-title"
            as="p"
            className="break-keep text-center text-sm font-extrabold text-brand-dark sm:text-base"
          >
            🔒 결제하면 위 모든 항목의 상세 내용이 공개됩니다
          </Editable>
          <Editable
            id="preview-sticky-sub"
            as="p"
            className="mt-1 hidden break-keep text-center text-[11px] leading-relaxed text-brand-dark/60 sm:block sm:text-xs"
          >
            💳 부담 없는 1회성 결제로 내 사업장에 해당되는 모든 정부지원사업을 확인하세요. (VAT 포함)
          </Editable>
          <Editable
            id="preview-sticky-cta"
            as="a"
            href="/pricing"
            className="btn-brand mt-2 block w-full rounded-full py-3 text-center text-sm font-bold sm:text-base"
          >
            💳 지금 결제하고 전체 결과 확인하기
          </Editable>
        </div>
      </div>
      )}

      <Footer />
    </PageShell>
  );
}
