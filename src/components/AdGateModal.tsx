"use client";

import { useEffect, useRef, useState } from "react";
import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";

// 결과 게이트 모달에 노출하는 쿠팡 파트너스 다이나믹 배너(ID 1012210).
//  · (대표님 요청) 카카오 애드핏은 제거하고 쿠팡 파트너스만 노출한다.
//  · diagnosis-form 과 동일한 iframe 방식(발급 코드). trackingCode=AF6135516.
const COUPANG_GATE_IFRAME_SRC =
  "https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=300&height=140&tsource=";

// 쿠팡 골드박스 고정 링크(대표님 발급 · 간편 링크).
//  · 자동 추천 배너가 가끔 만료 상품으로 "사용권한 없음" 에러가 날 때를 대비한
//    "항상 열리는" 안전한 대안 버튼. 골드박스는 매일 특가 상품이 갱신된다.
const COUPANG_GOLDBOX_LINK = "https://link.coupang.com/a/gJy0X7anUy";

// ════════════════════════════════════════════════════════════════
//  결과 조회 "전면 광고" 게이트 모달 (쿠팡 파트너스 · 대표님 요청으로 애드핏 제거)
//
//  ★ 동작 ★
//   1) 결과 블러 상태에서 "🎬 광고 보고 무료로 결과 보기" 버튼 → 이 모달이 뜬다.
//   2) 모달 안에 쿠팡 파트너스 배너(+ 골드박스 버튼)를 노출한다.
//   3) 광고를 확인하고(클릭 후 복귀) 돌아오면 자동으로 결과가 열리고,
//      기다리기만 해도 20초 후 "결과 보기" 버튼이 활성화된다.
// ════════════════════════════════════════════════════════════════

// 이 시간이 지나면 "결과 보기"를 열 수 있게 한다(대기 20초). 광고 클릭 후 복귀하면 즉시 활성화.
const MIN_WATCH_SEC = 20;

export default function AdGateModal({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const [countdown, setCountdown] = useState(MIN_WATCH_SEC);
  const [canView, setCanView] = useState(false);
  // 광고를 클릭해 탭을 이탈했다가 돌아왔는지(=광고 시청 신호)
  const clickedAwayRef = useRef(false);

  // ── 카운트다운(최소 시청) ──
  useEffect(() => {
    if (!open) return;
    setCountdown(MIN_WATCH_SEC);
    setCanView(false);
    clickedAwayRef.current = false;

    const timer = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(timer);
          setCanView(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  // ── 광고 클릭 후 복귀 감지 (대표님 요청: 복귀하면 '바로' 결과 열림) ──
  //   광고를 클릭하면 브라우저가 광고주 페이지로 이동(탭이 백그라운드로 감).
  //   다시 우리 탭으로 돌아오면 hidden→visible 전환 → 광고를 봤다고 간주하고
  //   ★ 버튼을 누를 필요 없이 자동으로 onUnlock() 실행 + 모달을 닫는다. ★
  //   (단, 광고를 '클릭해서 실제로 갔다 온 경우'에만 자동 오픈. 20초 대기 자동활성화는
  //    사용자가 버튼을 눌러 여는 기존 방식 유지 → 광고 안 본 사람에게 모달이 저절로
  //    사라지는 혼란 방지.)
  useEffect(() => {
    if (!open) return;

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // 탭을 떠남 = 광고(또는 새 탭)로 이동한 것으로 표시
        clickedAwayRef.current = true;
      } else if (document.visibilityState === "visible" && clickedAwayRef.current) {
        // 광고 갔다가 복귀 → 즉시 결과 열람 + 모달 자동 닫힘 (버튼 클릭 불필요)
        setCanView(true);
        setCountdown(0);
        // 복귀 직후 살짝 지연을 줘서(탭 전환 애니메이션과 겹침 방지) 자연스럽게 연다.
        window.setTimeout(() => {
          onUnlock();
        }, 250);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open, onUnlock]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="결과 조회 전 광고"
    >
      <div className="w-full max-w-[400px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-white">
            광고
          </span>
          <span className="text-[11px] font-medium text-gray-400">쿠팡 파트너스</span>
        </div>

        {/* 안내 문구 */}
        <div className="px-5 pt-4 text-center">
          <p className="break-keep text-[15px] font-extrabold leading-snug text-brand-dark">
            잠시 광고를 보시면
            <br />
            결과를 <span className="text-brand-orange">무료</span>로 확인할 수 있어요
          </p>
          <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-brand-gray">
            광고를 확인하고 돌아오시면 <b className="text-brand-dark">바로 결과가 열려요.</b>
            <br />
            잠시 기다리셔도 20초 후 확인하실 수 있습니다.
          </p>
        </div>

        {/* 쿠팡 파트너스 다이나믹 배너 (대표님 요청: 애드핏 제거, 쿠팡만 노출) */}
        <div className="px-5 pb-1 pt-4">
          <CoupangPartnersBanner
            iframeSrc={COUPANG_GATE_IFRAME_SRC}
            iframeHeight={140}
            className="!max-w-none !px-3 !py-2"
          />
        </div>

        {/* 쿠팡 골드박스 고정 버튼 (항상 열리는 안전 대안 · 위 배너 에러 대비) */}
        <div className="px-5 pb-3 pt-2">
          <a
            href={COUPANG_GOLDBOX_LINK}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-orange/40 bg-brand-orange/[0.06] px-4 py-2.5 text-center text-[13px] font-bold text-brand-dark transition hover:bg-brand-orange/10"
          >
            🎁 쿠팡 골드박스 오늘의 특가 보러가기 <span aria-hidden>↗</span>
          </a>
        </div>

        {/* 결과 보기 / 대기 버튼 */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => {
              if (!canView) return;
              onUnlock();
            }}
            disabled={!canView}
            className={
              canView
                ? "btn-red block w-full rounded-full py-3.5 text-center text-[16px] font-bold"
                : "block w-full rounded-full bg-gray-200 py-3.5 text-center text-[16px] font-bold text-gray-500"
            }
          >
            {canView ? "✅ PRO AI 진단 리포트 결과 확인하기" : `PRO AI 진단 리포트 결과 확인하기 (${countdown}초)`}
          </button>

          {/* 광고 없이 보기 = 결제 안내 */}
          <a
            href="/payment?tier=basic"
            className="mt-2.5 block break-keep text-center text-[12px] font-semibold text-brand-gray underline decoration-gray-300 underline-offset-2"
          >
            💳 광고 없이 1개월 자유 조회 (29,700원)
          </a>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 block w-full py-1.5 text-center text-[12px] font-medium text-gray-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
