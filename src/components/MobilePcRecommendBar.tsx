"use client";

/**
 * MobilePcRecommendBar
 * ──────────────────────────────────────────────────────────────
 * 모바일(≤768px) 접속자에게만, 페이지 최상단에 얇은 띠로
 * "표가 많아 PC 화면에서 더 편하게 보실 수 있어요" 안내를 노출한다.
 * (대표님 요청: 팝업이 아닌 상단 dismissible 띠 / 결과 페이지에서만 사용)
 *
 * · 모바일에서만 렌더(데스크톱은 애초에 노출 안 함).
 * · [✕ 닫기] 누르면 localStorage에 기억 → 재방문/새로고침해도 다시 안 뜸.
 * · SSR 하이드레이션 불일치를 피하려고 mount 후에만 렌더.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "pcRecommendBarDismissed";

export default function MobilePcRecommendBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 데스크톱이면 노출하지 않음
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;
    // 이미 닫은 적 있으면 노출하지 않음
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* localStorage 접근 불가 시엔 그냥 노출 */
    }
    setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* 무시 */
    }
  };

  if (!show) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-brand-orange/30 bg-brand-orange/10 backdrop-blur-sm sm:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
        <p className="min-w-0 flex-1 break-keep text-[12px] font-semibold leading-snug text-brand-dark">
          📱 모바일에서도 이용 가능하지만, 표가 많아{" "}
          <b className="text-brand-orange">PC 화면</b>에서 더 편하게 보실 수 있어요
        </p>
        <button
          onClick={dismiss}
          aria-label="안내 닫기"
          className="shrink-0 rounded-full bg-brand-dark/10 px-2.5 py-1 text-[12px] font-bold text-brand-dark/70 transition hover:bg-brand-dark/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
