"use client";

import { useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════
//  쿠팡 파트너스 광고 배너 (공정거래위원회 표기 지침 준수)
//
//  ★ 대표님 안내 ★
//  - 이 배너는 "광고" 라벨 + 대가성(수수료) 문구를 반드시 함께 노출합니다.
//    (공정위 추천·보증 심사지침 위반 방지 — 미표기 시 제재 대상)
//  - 실제 광고는 쿠팡 파트너스(https://partners.coupang.com) 승인 후
//    아래 세 방식 중 하나로 켜집니다. 우선순위: partnersId > iframeSrc > linkUrl
//      (권장) 다이나믹 위젯 → props.partnersId 에 위젯 id(숫자) 넣기
//             (반응형, 방문자 맞춤 상품 자동 노출. width:'100%' 로 가로 꽉 채움)
//      (A) iframe 배너 코드   → props.iframeSrc 에 iframe src URL 넣기
//      (B) 상품/텍스트 링크    → props.linkUrl + props.linkText 넣기
//  - 아무 것도 넣지 않으면(placeholder) "준비 중" 안내만 보여
//    가짜/허위 광고가 나가지 않도록 안전하게 처리합니다. (팩트근거 원칙)
// ════════════════════════════════════════════════════════════════

type Props = {
  /** (권장) 쿠팡 파트너스 "다이나믹 위젯" id (숫자). 승인 후 발급 */
  partnersId?: number;
  /** 다이나믹 위젯 높이(px). 발급 코드의 height 값과 맞추세요. 기본 140 */
  widgetHeight?: number;
  /** 다이나믹 위젯 성과추적용 subId(선택) */
  subId?: string;
  /** (A) 쿠팡 파트너스에서 발급한 iframe 배너 src */
  iframeSrc?: string;
  /** iframe 높이(px). 기본 140 */
  iframeHeight?: number;
  /** (B) 텍스트/상품 링크 URL (예: https://link.coupang.com/a/XXXXXX ) */
  linkUrl?: string;
  /** (B) 링크에 표시할 문구 */
  linkText?: string;
  /** 상단 여백 조정 */
  className?: string;
};

// 공정위 필수 대가성 문구 (변경 금지 성격)
//  · 화면에는 "일환으로," 뒤에서 줄바꿈해 깔끔하게 2줄로 노출한다.
const DISCLOSURE_LINE1 = "이 포스팅은 쿠팡 파트너스 활동의 일환으로,";
const DISCLOSURE_LINE2 = "이에 따른 일정액의 수수료를 제공받습니다.";

const COUPANG_SCRIPT_SRC = "https://ads-partners.coupang.com/g.js";

/** 다이나믹 위젯 렌더러 — 쿠팡 g.js 를 1회만 로드 후 위젯 인스턴스 생성 */
function CoupangDynamicWidget({
  partnersId,
  height,
  subId,
}: {
  partnersId: number;
  height: number;
  subId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    // 쿠팡 g.js 는 "현재 실행 중인 script 태그"의 previous sibling 으로 iframe 을
    // 삽입한다. React 에서 안정적으로 그 위치를 지정하려면, container 안에
    // 쿠팡 공식 태그(<script src=g.js> + <script>new G()</script>) 를 그대로
    // innerHTML 로 주입해, 스크립트가 자기 위치에서 실행되도록 한다.
    const renderWidget = () => {
      if (cancelled || !container) return;
      container.innerHTML = "";

      const opts: Record<string, unknown> = {
        id: partnersId,
        template: "carousel",
        trackingCode: subId || "",
        width: "100%",
        height,
        subId: subId || "",
      };

      // 로더 스크립트 (g.js) — 이미 로드돼 있으면 즉시 실행됨
      const loader = document.createElement("script");
      loader.src = COUPANG_SCRIPT_SRC;
      // 인스턴스 생성 스크립트 — 이 script 태그 자리에 iframe 이 삽입됨
      const runner = document.createElement("script");
      runner.text = `try{new PartnersCoupang.G(${JSON.stringify(opts)});}catch(e){}`;

      container.appendChild(loader);
      container.appendChild(runner);
    };

    if ((window as any).PartnersCoupang?.G) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-coupang-loader="1"]`
      );
      if (existing) {
        existing.addEventListener("load", renderWidget, { once: true });
      } else {
        // 전역 사전 로드 1회 (렌더러가 즉시 실행되도록 준비)
        const s = document.createElement("script");
        s.src = COUPANG_SCRIPT_SRC;
        s.async = true;
        s.setAttribute("data-coupang-loader", "1");
        s.addEventListener("load", renderWidget, { once: true });
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [partnersId, height, subId]);

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center overflow-hidden rounded-lg"
      style={{ minHeight: height }}
    />
  );
}

export default function CoupangPartnersBanner({
  partnersId,
  widgetHeight = 140,
  subId,
  iframeSrc,
  iframeHeight = 140,
  linkUrl,
  linkText,
  className = "",
}: Props) {
  const hasWidget = typeof partnersId === "number" && partnersId > 0;
  const hasIframe = !!iframeSrc;
  const hasLink = !!linkUrl;

  return (
    <aside
      id="coupang-partners-banner"
      aria-label="쿠팡 파트너스 광고"
      className={`mx-auto w-full max-w-3xl rounded-2xl border border-brand-dark/10 bg-white/70 px-4 py-3 ${className}`}
    >
      {/* ── "광고" 라벨 (상단 명시) ── */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-dark/70 px-2 py-0.5 text-[11px] font-bold text-white">
          광고
        </span>
        <span className="text-[11px] font-medium text-brand-gray">Coupang Partners</span>
      </div>

      {/* ── 실제 배너 영역 (우선순위: 다이나믹 위젯 > iframe > 링크 > placeholder) ── */}
      {hasWidget ? (
        <CoupangDynamicWidget
          partnersId={partnersId as number}
          height={widgetHeight}
          subId={subId}
        />
      ) : hasIframe ? (
        <iframe
          src={iframeSrc}
          title="쿠팡 파트너스 광고 배너"
          width={680}
          height={iframeHeight}
          frameBorder={0}
          scrolling="no"
          referrerPolicy="unsafe-url"
          // @ts-expect-error 쿠팡 배너 권장 속성 (Topics API) — 표준 타입에 없음
          browsingtopics=""
          className="mx-auto block max-w-full overflow-hidden rounded-lg"
        />
      ) : hasLink ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="block rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-3 text-center text-sm font-bold text-brand-dark transition hover:bg-brand-orange/10"
        >
          {linkText || "쿠팡에서 확인하기"} <span aria-hidden>↗</span>
        </a>
      ) : (
        // placeholder — 실제 코드 미입력 시 (가짜 광고 방지)
        <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed border-brand-dark/20 bg-brand-dark/[0.03] px-4 py-6 text-center">
          <p className="break-keep text-xs leading-relaxed text-brand-gray">
            쿠팡 파트너스 광고 자리입니다.
            <br className="hidden sm:block" />
            파트너스 승인 후 다이나믹 위젯 id를 넣으면 이 자리에 광고가 표시됩니다.
          </p>
        </div>
      )}

      {/* ── 대가성(수수료) 문구 — 공정위 필수 (2줄 고정 줄바꿈) ── */}
      <p className="mt-2 break-keep text-center text-[11px] leading-relaxed text-brand-gray">
        {DISCLOSURE_LINE1}
        <br />
        {DISCLOSURE_LINE2}
      </p>
    </aside>
  );
}
