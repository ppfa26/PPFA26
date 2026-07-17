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
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-brand-orange/5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold leading-tight text-brand-dark sm:text-lg">
            {emoji && <span className="shrink-0">{emoji}</span>}
            {/* 모바일에서 제목이 2줄로 안 넘어가고 1줄로 깔끔하게 보이도록 nowrap 유지 */}
            <span className="min-w-0 whitespace-nowrap">{title}</span>
          </span>
          {subtitle && (
            <span className="mt-1 block break-keep text-xs text-brand-dark/60">
              {subtitle}
            </span>
          )}
        </span>
        {/* 펼침/접힘 화살표 */}
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
      </button>

      {/* 내용 */}
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}
