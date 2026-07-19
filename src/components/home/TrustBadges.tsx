"use client";

import { useState } from "react";
import Editable from "@/components/Editable";

type Badge = { icon: string; text: string };

/**
 * 신뢰 배지 7칸.
 *  - PC(sm 이상): 기존과 100% 동일하게 7칸을 모두 한 번에 보여줍니다.
 *  - 모바일: 정보 과부하를 줄이기 위해 핵심 4칸만 먼저 보여주고,
 *            나머지는 '더보기'를 눌러야 펼쳐집니다. (토스·당근식 정보 압축)
 *
 *  ※ 디자인/카드 스타일은 그대로 유지하고, '몇 개를 보여줄지'만 모바일에서 조절합니다.
 */
export default function TrustBadges({ badges }: { badges: Badge[] }) {
  const [expanded, setExpanded] = useState(false);

  // 모바일에서 접힘 상태일 때 먼저 노출할 핵심 개수
  const MOBILE_VISIBLE = 4;

  return (
    <>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {badges.map((b, i) => {
          // 모바일에서 접힘 상태이고, 핵심 개수를 넘어가는 배지는 숨김.
          // (PC=sm 이상에서는 항상 보이도록 sm:flex 로 되돌림)
          const hideOnMobile = !expanded && i >= MOBILE_VISIBLE;
          return (
            <div
              key={i}
              className={`hover-lift w-[calc(50%-0.375rem)] flex-col items-center justify-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-card sm:flex sm:w-[calc(25%-0.6rem)] ${
                hideOnMobile ? "hidden" : "flex"
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xl">
                {b.icon}
              </span>
              <Editable
                id={`home-trust-${i}`}
                as="span"
                className="flex min-h-[2.4rem] items-center break-keep text-[13px] font-semibold leading-tight text-brand-dark"
              >
                {b.text}
              </Editable>
            </div>
          );
        })}
      </div>

      {/* 더보기/접기 버튼 — 모바일에서만 노출(sm:hidden). PC엔 영향 없음. */}
      {badges.length > MOBILE_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-brand-dark shadow-sm sm:hidden"
        >
          {expanded ? (
            <>접기 <span className="text-brand-orange">▲</span></>
          ) : (
            <>
              나머지 {badges.length - MOBILE_VISIBLE}개 더보기{" "}
              <span className="text-brand-orange">▼</span>
            </>
          )}
        </button>
      )}
    </>
  );
}
