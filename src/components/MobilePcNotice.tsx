"use client";

import { useEffect, useState } from "react";

/**
 * 모바일에서만 보이는 아주 얇고 은은한 상단 안내 띠.
 * - PC(데스크톱) 화면에서는 CSS(sm:hidden)로 아예 렌더되지 않음
 * - 한 번 닫으면 localStorage에 기억하여 다시 뜨지 않음
 * - 눈에 거슬리지 않도록 낮은 채도의 은은한 배경 + 작은 글씨
 */
export default function MobilePcNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("mpp_pc_notice_dismissed");
      if (!dismissed) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="sm:hidden bg-brand-dark/95 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-1.5">
        <p className="text-[11px] leading-snug text-white/85">
          💻 PC 화면에 최적화된 서비스예요. 모바일은 브라우저의{" "}
          <b className="font-semibold text-white">‘데스크톱 버전’</b>으로 보시면 더
          편합니다.
        </p>
        <button
          type="button"
          aria-label="안내 닫기"
          onClick={() => {
            try {
              localStorage.setItem("mpp_pc_notice_dismissed", "1");
            } catch {
              /* noop */
            }
            setShow(false);
          }}
          className="shrink-0 rounded px-1.5 text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
