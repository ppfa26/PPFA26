"use client";

import { useEffect, useRef, useState } from "react";
import { ADFIT_UNIT_RESULT_GATE_300x250 } from "@/lib/adfitConfig";
import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";

// 결과 게이트 모달에 함께 노출하는 쿠팡 파트너스 다이나믹 배너(ID 1012210).
//  · 애드핏(클릭·노출 수익)은 그대로 유지하고, 그 아래에 쿠팡(구매 수익)을 추가한다.
//  · diagnosis-form 과 동일한 iframe 방식(발급 코드). trackingCode=AF6135516.
const COUPANG_GATE_IFRAME_SRC =
  "https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=300&height=140&tsource=";

// 쿠팡 골드박스 고정 링크(대표님 발급 · 간편 링크).
//  · 자동 추천 배너가 가끔 만료 상품으로 "사용권한 없음" 에러가 날 때를 대비한
//    "항상 열리는" 안전한 대안 버튼. 골드박스는 매일 특가 상품이 갱신된다.
const COUPANG_GOLDBOX_LINK = "https://link.coupang.com/a/gJy0X7anUy";

// ════════════════════════════════════════════════════════════════
//  결과 조회 "전면 광고" 게이트 모달 (카카오 애드핏 300x250)
//
//  ★ 동작(대표님 확정 방식) ★
//   1) 결과 블러 상태에서 "🎬 광고 보고 무료로 결과 보기" 버튼 → 이 모달이 뜬다.
//   2) 모달 안에 애드핏 300x250 배너를 노출한다. ("광고" 라벨 명시)
//   3) 고객이 광고를 클릭 → 광고주 사이트로 이동(탭 이탈).
//   4) 다시 우리 사이트로 복귀(visibilitychange)하면 "결과 보기" 버튼이 활성화되고,
//      누르면 onUnlock() 으로 그 진단 결과의 블러가 해제된다.
//   · 강제 클릭 유도가 아니라, 최소 시청 시간(카운트다운) 뒤에도 열 수 있게 해
//     애드핏 정책(클릭 강요 금지)에 안전하게 맞춘다.
//
//  ※ 애드핏 SDK(ba.min.js)는 로드 시점에 앞의 <ins> 를 스캔하므로,
//    모달이 열릴 때마다 <ins> 를 새로 만들고 스크립트를 새로 주입한다.
//    (AdFitBanner.tsx 와 동일한 검증 방식)
// ════════════════════════════════════════════════════════════════

const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

// 광고를 클릭하지 않아도 이 시간이 지나면 "결과 보기"를 열 수 있게 한다.
//  (클릭 강요 방지 · 정책 안전). 광고를 클릭하고 복귀하면 즉시 활성화.
//  대기 20초(대표님 요청) — 기다리기보다 광고 클릭을 자연 유도해 수익↑.
//  ※ "클릭하면 즉시 열림" 을 강조해 정책(클릭 강요 금지)에 안전하게 맞춘다.
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
  const adBoxRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(MIN_WATCH_SEC);
  const [canView, setCanView] = useState(false);
  // 광고를 클릭해 탭을 이탈했다가 돌아왔는지(=광고 시청 신호)
  const clickedAwayRef = useRef(false);

  // ── 광고 <ins> + 스크립트 주입 ──
  useEffect(() => {
    if (!open) return;
    const box = adBoxRef.current;
    if (!box) return;

    box.innerHTML = "";
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.style.width = "300px";
    ins.style.height = "250px";
    ins.setAttribute("data-ad-unit", ADFIT_UNIT_RESULT_GATE_300x250);
    ins.setAttribute("data-ad-width", "300");
    ins.setAttribute("data-ad-height", "250");
    box.appendChild(ins);

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.charset = "utf-8";
    box.appendChild(script);

    return () => {
      box.innerHTML = "";
    };
  }, [open]);

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

  // ── 광고 클릭 후 복귀 감지 ──
  //   광고를 클릭하면 브라우저가 광고주 페이지로 이동(탭이 백그라운드로 감).
  //   다시 우리 탭으로 돌아오면 hidden→visible 전환 → 광고를 봤다고 간주하고 즉시 활성화.
  useEffect(() => {
    if (!open) return;

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // 탭을 떠남 = 광고(또는 새 탭)로 이동한 것으로 표시
        clickedAwayRef.current = true;
      } else if (document.visibilityState === "visible" && clickedAwayRef.current) {
        // 광고 갔다가 복귀 → 즉시 결과 열람 가능
        setCanView(true);
        setCountdown(0);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open]);

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
          <span className="text-[11px] font-medium text-gray-400">Kakao AdFit</span>
        </div>

        {/* 안내 문구 */}
        <div className="px-5 pt-4 text-center">
          <p className="break-keep text-[15px] font-extrabold leading-snug text-brand-dark">
            잠시 광고를 보시면
            <br />
            결과를 <span className="text-brand-orange">무료</span>로 확인할 수 있어요
          </p>
          <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-brand-gray">
            광고를 확인하고 돌아오시면 결과가 열려요.
            <br />
            잠시 기다리셔도 20초 후 자동으로 열립니다.
          </p>
        </div>

        {/* 애드핏 300x250 광고 */}
        <div className="flex justify-center px-5 pt-4">
          <div
            ref={adBoxRef}
            className="flex items-center justify-center overflow-hidden rounded-xl bg-gray-50"
            style={{ width: 300, height: 250, maxWidth: "100%" }}
          />
        </div>

        {/* 쿠팡 파트너스 다이나믹 배너 (애드핏 아래 · 구매 수익 추가) */}
        <div className="px-5 pb-1 pt-3">
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
