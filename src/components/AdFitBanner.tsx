"use client";

import { useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════
//  카카오 애드핏(Kakao AdFit) 광고 배너
//
//  ★ 대표님 안내 ★
//  - 애드핏에서 발급한 "광고단위 ID(DAN-xxxxxxxxxxxx)" 를 adUnit prop 으로
//    넣으면 그 자리에 실제 광고가 표시됩니다.
//  - ID 가 없으면(placeholder) "광고 준비 중" 안내만 노출 → 가짜/빈 광고 방지.
//  - 기본 사이즈는 300x250 (PC·모바일 겸용). 다른 사이즈를 쓰려면
//    width/height 를 애드핏 광고단위와 동일하게 맞추세요.
// ════════════════════════════════════════════════════════════════

const ADFIT_SCRIPT_SRC = "//t1.daumcdn.net/kas/static/ba.min.js";

type Props = {
  /** 애드핏 광고단위 ID (예: "DAN-xxxxxxxxxxxx"). 미입력 시 placeholder */
  adUnit?: string;
  /** 광고 가로(px). 애드핏 광고단위와 동일하게. 기본 300 */
  width?: number;
  /** 광고 세로(px). 애드핏 광고단위와 동일하게. 기본 250 */
  height?: number;
  /** 상단 여백 등 조정 */
  className?: string;
};

function AdFitUnit({
  adUnit,
  width,
  height,
}: {
  adUnit: string;
  width: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 애드핏 ba.min.js 는 로드 시점에 페이지의 <ins class="kakao_ad_area"> 를
    // 스캔해 광고를 채운다. React 라우팅(SPA)에서도 안정적으로 렌더되도록,
    // 컨테이너 안에 <ins> 를 직접 생성한 뒤 스크립트를 (재)주입한다.
    container.innerHTML = "";

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", adUnit);
    ins.setAttribute("data-ad-width", String(width));
    ins.setAttribute("data-ad-height", String(height));
    container.appendChild(ins);

    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [adUnit, width, height]);

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center overflow-hidden"
      style={{ minHeight: height }}
    />
  );
}

export default function AdFitBanner({
  adUnit,
  width = 300,
  height = 250,
  className = "",
}: Props) {
  const hasUnit = typeof adUnit === "string" && adUnit.startsWith("DAN-");

  return (
    <aside
      id="adfit-banner"
      aria-label="카카오 애드핏 광고"
      className={`mx-auto w-full max-w-3xl rounded-2xl border border-brand-dark/10 bg-white/70 px-4 py-3 ${className}`}
    >
      {/* ── "광고" 라벨 (상단 명시) ── */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-dark/70 px-2 py-0.5 text-[11px] font-bold text-white">
          광고
        </span>
        <span className="text-[11px] font-medium text-brand-gray">Kakao AdFit</span>
      </div>

      {/* ── 실제 광고 영역 (ID 있으면 광고, 없으면 placeholder) ── */}
      {hasUnit ? (
        <AdFitUnit adUnit={adUnit as string} width={width} height={height} />
      ) : (
        <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed border-brand-dark/20 bg-brand-dark/[0.03] px-4 py-6 text-center">
          <p className="break-keep text-xs leading-relaxed text-brand-gray">
            카카오 애드핏 광고 자리입니다.
            <br className="hidden sm:block" />
            광고단위 ID(DAN-...)를 넣으면 이 자리에 광고가 표시됩니다.
          </p>
        </div>
      )}
    </aside>
  );
}
