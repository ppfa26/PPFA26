"use client";

import { useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════
//  카카오 애드핏(Kakao AdFit) 반응형 광고 배너
//
//  ★ 대표님 안내 ★
//  - 화면 폭에 따라 아래 두 광고 중 하나만 자동 노출됩니다:
//      · PC(≥768px)   → 728x90  가로 긴 배너
//      · 모바일(<768px) → 320x100 가로 채움 배너
//  - 광고단위 ID(DAN-...)는 src/lib/adfitConfig.ts 에서 관리.
//  - ID 가 없으면(placeholder) "광고 준비 중" 안내만 노출 → 빈 광고 방지.
// ════════════════════════════════════════════════════════════════

const ADFIT_SCRIPT_SRC = "//t1.daumcdn.net/kas/static/ba.min.js";

/** 단일 애드핏 광고 슬롯 (지정한 사이즈로 <ins> 생성 + 스크립트 주입) */
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

    // 애드핏 ba.min.js 는 로드 시점에 <ins class="kakao_ad_area"> 를 스캔해
    // 광고를 채운다. React 라우팅(SPA)에서도 안정적으로 렌더되도록,
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

type Props = {
  /** PC(≥768px)용 728x90 광고단위 ID. 미입력 시 PC 자리엔 placeholder */
  adUnitPc?: string;
  /** 모바일(<768px)용 320x100 광고단위 ID. 미입력 시 모바일 자리엔 placeholder */
  adUnitMobile?: string;
  /** 상단 여백 등 조정 */
  className?: string;
};

function isValid(id?: string) {
  return typeof id === "string" && id.startsWith("DAN-");
}

function Placeholder({ minHeight }: { minHeight: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-brand-dark/20 bg-brand-dark/[0.03] px-4 py-6 text-center"
      style={{ minHeight }}
    >
      <p className="break-keep text-xs leading-relaxed text-brand-gray">
        카카오 애드핏 광고 자리입니다.
        <br className="hidden sm:block" />
        광고단위 ID(DAN-...)를 넣으면 이 자리에 광고가 표시됩니다.
      </p>
    </div>
  );
}

export default function AdFitBanner({
  adUnitPc,
  adUnitMobile,
  className = "",
}: Props) {
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

      {/* ── PC(≥768px) 전용: 728x90 ── */}
      <div className="hidden md:flex md:justify-center">
        {isValid(adUnitPc) ? (
          <AdFitUnit adUnit={adUnitPc as string} width={728} height={90} />
        ) : (
          <Placeholder minHeight={90} />
        )}
      </div>

      {/* ── 모바일(<768px) 전용: 320x100 ── */}
      <div className="flex justify-center md:hidden">
        {isValid(adUnitMobile) ? (
          <AdFitUnit adUnit={adUnitMobile as string} width={320} height={100} />
        ) : (
          <Placeholder minHeight={100} />
        )}
      </div>
    </aside>
  );
}
