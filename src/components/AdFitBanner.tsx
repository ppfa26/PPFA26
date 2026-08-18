"use client";

import { useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════
//  카카오 애드핏(Kakao AdFit) 반응형 광고 배너
//
//  ★ 대표님 안내 ★
//  - 화면 폭에 따라 아래 두 광고 중 하나만 자동 노출됩니다:
//      · PC(≥768px)   → 728x90  가로 긴 배너
//      · 모바일(<768px) → 320x100 가로 채움 배너
//  - 광고단위 ID(DAN-...)는 src/lib/adfitConfig.ts 에서 관리.
//  - 광고가 없을 때(NO-AD)는 자리를 접어 라벨만 덩그러니 남지 않게 처리.
//
//  ※ 애드핏 SDK(ba.min.js)는 "스크립트 로드 시점에 페이지의 <ins> 를
//    스캔"하는 방식이라, React(SPA)에서 페이지 이동 후 새로 마운트된
//    <ins> 는 기존에 이미 로드된 스크립트가 다시 잡지 못한다.
//    → 그래서 매 마운트마다 <ins> 를 만든 뒤 "그 바로 다음 형제로"
//      ba.min.js 스크립트 태그를 새로 주입한다. (공식 검증 방식)
// ════════════════════════════════════════════════════════════════

const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

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
  // NO-AD(광고 없음) 콜백이 오면 자리를 접는다.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setFailed(false);
    container.innerHTML = "";

    // NO-AD 콜백: 광고를 못 채우면 자리를 접는다.
    const cbName = `__adfit_fail_${adUnit.replace(/[^a-zA-Z0-9]/g, "")}`;
    (window as any)[cbName] = () => setFailed(true);

    // 1) <ins> 광고 영역 (공식 권장: width:100% 포함)
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.style.width = "100%";
    ins.setAttribute("data-ad-unit", adUnit);
    ins.setAttribute("data-ad-width", String(width));
    ins.setAttribute("data-ad-height", String(height));
    ins.setAttribute("data-ad-onfail", cbName);
    container.appendChild(ins);

    // 2) ba.min.js 스크립트를 <ins> 바로 다음 형제로 주입
    //    (SDK 는 자기 앞의 <ins> 를 스캔하므로 매 마운트마다 새로 주입)
    const script = document.createElement("script");
    script.src = ADFIT_SCRIPT_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.charset = "utf-8";
    container.appendChild(script);

    return () => {
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
      container.innerHTML = "";
    };
  }, [adUnit, width, height]);

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center overflow-hidden"
      style={{ minHeight: failed ? 0 : height }}
    />
  );
}

type Props = {
  /** PC(≥768px)용 728x90 광고단위 ID. 미입력 시 렌더 안 함 */
  adUnitPc?: string;
  /** 모바일(<768px)용 320x100 광고단위 ID. 미입력 시 렌더 안 함 */
  adUnitMobile?: string;
  /** 상단 여백 등 조정 */
  className?: string;
};

function isValid(id?: string) {
  return typeof id === "string" && id.startsWith("DAN-");
}

export default function AdFitBanner({
  adUnitPc,
  adUnitMobile,
  className = "",
}: Props) {
  const hasPc = isValid(adUnitPc);
  const hasMobile = isValid(adUnitMobile);

  // 유효한 광고단위가 하나도 없으면 아무것도 렌더하지 않는다.
  if (!hasPc && !hasMobile) return null;

  return (
    <aside
      id="adfit-banner"
      aria-label="카카오 애드핏 광고"
      className={`mx-auto w-full max-w-3xl rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm ${className}`}
    >
      {/* ── "광고" 라벨 (상단 명시) ── */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-white">
          광고
        </span>
        <span className="text-[11px] font-medium text-gray-400">Kakao AdFit</span>
      </div>

      {/* ── PC(≥768px) 전용: 728x90 ── */}
      {hasPc && (
        <div className="hidden md:flex md:justify-center">
          <AdFitUnit adUnit={adUnitPc as string} width={728} height={90} />
        </div>
      )}

      {/* ── 모바일(<768px) 전용: 320x100 ── */}
      {hasMobile && (
        <div className="flex justify-center md:hidden">
          <AdFitUnit adUnit={adUnitMobile as string} width={320} height={100} />
        </div>
      )}
    </aside>
  );
}
