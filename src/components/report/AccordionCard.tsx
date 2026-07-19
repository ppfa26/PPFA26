"use client";

import { useState, type ReactNode } from "react";

/**
 * 진단 결과 리포트용 아코디언 카드.
 * 제목 줄을 누르면 내용이 접혔다/펼쳐졌다 합니다. (대표님 요청: 결과 리포트가 세로로 너무 길어서 접기)
 *
 * - 기존 결과 박스의 겉모양(둥근 테두리 + 흰 배경 + 그림자)을 그대로 유지합니다.
 * - title 영역은 큰 볼드 제목, subtitle은 그 아래 작은 설명(선택).
 * - defaultOpen 으로 처음 열림/닫힘 상태를 지정합니다.
 */
export default function AccordionCard({
  emoji,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  emoji?: string;
  title: string;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-brand-dark/10 bg-white shadow-card">
      {/* 헤더 (토글 버튼) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left transition hover:bg-brand-orange/5 sm:gap-3 sm:px-5 sm:py-4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5 text-[14px] font-extrabold leading-snug text-brand-dark sm:text-lg">
            {emoji && <span className="shrink-0">{emoji}</span>}
            {/* 모바일: 폭이 좁으면 단어 단위로 자연스럽게 줄바꿈(break-keep)해 글자가 잘리지 않게 */}
            <span className="min-w-0 break-keep">{title}</span>
          </span>
          {subtitle && (
            <span className="mt-1 block break-keep text-[11px] leading-relaxed text-brand-dark/60 sm:text-xs">
              {subtitle}
            </span>
          )}
        </span>
        {/* 클릭 유도 라벨 + 펼침/접힘 화살표 */}
        <span className="flex shrink-0 items-center gap-1.5">
          {/* 닫혀 있을 때만 '클릭해서 펼쳐보기' 유도 (열리면 숨김) */}
          {!open && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-extrabold text-brand-orange sm:text-xs">
              👆<span className="hidden sm:inline"> 클릭</span>
            </span>
          )}
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </span>
      </button>

      {/* 내용 */}
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}
