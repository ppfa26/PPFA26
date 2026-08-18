"use client";

import { useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════
//  카카오 애드핏(Kakao AdFit) 광고 배너 — PC 728x90 단일 노출
//
//  ★ 대표님 안내 ★
//  - 우리 사이트는 "한 번에 많은 정보를 보여주려" 모바일에서도 PC 화면을
//    축소해 그대로 보여주는 설계(viewport width:820 고정)입니다.
//  - 따라서 모바일 전용 광고(320x100)는 쓰지 않고, 어느 화면에서든
//    728x90 PC 배너 하나만 노출합니다. (모바일 광고단위 제거 → 애드핏
//    "모바일 최적화" 보류 사유도 함께 해소)
//  - 광고단위 ID(DAN-...)는 src/lib/adfitConfig.ts 에서 관리.
//  - 광고가 없을 때(NO-AD)는 자리를 접어 라벨만 남지 않게 처리.
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
  onFail,
}: {
  adUnit: string;
  width: number;
  height: number;
  onFail: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    // NO-AD 콜백: 광고를 못 채우면 부모에게 알려 자리를 접는다.
    const cbName = `__adfit_fail_${adUnit.replace(/[^a-zA-Z0-9]/g, "")}`;
    (window as any)[cbName] = () => onFail();

    // 1) <ins> 광고 영역 (공식 표준: 지정 크기 그대로 · width:100% 강제 금지)
    //    ★ 애드핏 심사 보류 대응 ★
    //    - width:100% 를 주면 부모 폭에 맞춰 축소되어 728x90 광고가 좌/우 잘림.
    //    - 그래서 data-ad-width/height 와 동일한 '고정 px' 로 <ins> 를 그린다.
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.style.width = `${width}px`;
    ins.style.height = `${height}px`;
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
  }, [adUnit, width, height, onFail]);

  // 지정 크기(728x90)를 정확히 확보해 좌우 잘림을 방지한다.
  return (
    <div
      ref={containerRef}
      className="mx-auto flex items-center justify-center"
      style={{ width, height }}
    />
  );
}

type Props = {
  /** PC 728x90 광고단위 ID. 미입력 시 렌더 안 함 */
  adUnitPc?: string;
  /**
   * (호환용) 모바일 광고단위 ID — 더 이상 사용하지 않습니다.
   * 기존 호출부와의 호환을 위해 prop 만 남겨두고 렌더에는 쓰지 않습니다.
   */
  adUnitMobile?: string;
  /** 상단 여백/배경 등 조정 */
  className?: string;
};

function isValid(id?: string) {
  return typeof id === "string" && id.startsWith("DAN-");
}

export default function AdFitBanner({ adUnitPc, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const hasPc = isValid(adUnitPc);

  // 유효한 PC 광고단위가 없거나, NO-AD 이면 아무것도 렌더하지 않는다.
  if (!hasPc || failed) return null;

  return (
    <aside
      id="adfit-banner"
      aria-label="카카오 애드핏 광고"
      // 광고(728px) 가로폭에 딱 맞춰 카드를 감싼다(w-fit). 좌우 패딩은
      // 광고가 온전히 들어가도록 최소화. 본문(max-w-3xl≈768px)에 자연스럽게 정렬.
      className={`mx-auto w-fit max-w-full rounded-2xl border border-black/5 bg-white px-3 py-3 shadow-sm ${className}`}
    >
      {/* ── "광고" 라벨 (상단 명시) ── */}
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-white">
          광고
        </span>
        <span className="text-[11px] font-medium text-gray-400">Kakao AdFit</span>
      </div>

      {/* ── 728x90 (고정 크기 · 잘림 방지 · 전 화면 공통) ── */}
      <AdFitUnit
        adUnit={adUnitPc as string}
        width={728}
        height={90}
        onFail={() => setFailed(true)}
      />
    </aside>
  );
}
