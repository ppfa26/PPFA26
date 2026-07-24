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
    <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card sm:border-2">
      {/* 헤더 (토글 버튼) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition hover:bg-brand-orange/5 sm:gap-3 sm:px-5 sm:py-3.5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5 text-[15px] font-extrabold leading-snug text-brand-dark sm:text-lg">
            {emoji && <span className="shrink-0">{emoji}</span>}
            {/* 모바일: 폭이 좁으면 단어 단위로 자연스럽게 줄바꿈(break-keep)해 글자가 잘리지 않게 */}
            <span className="min-w-0 break-keep">{title}</span>
          </span>
          {/* 부제(예: "✅ 신청 대상 …")는 모바일에서 제목과 겹쳐 지저분해 보여 숨김.
              PC(sm 이상)에서만 노출 (대표님 요청). */}
          {subtitle && (
            <span className="mt-1 hidden break-keep text-[11px] leading-relaxed text-brand-dark/55 sm:mt-0.5 sm:block sm:leading-snug sm:text-xs">
              {subtitle}
            </span>
          )}
        </span>
        {/* 펼침/접힘 화살표 (모바일: 👆 이모지 제거해 노이즈 감소 · '클릭' 라벨은 PC에서만) */}
        <span className="flex shrink-0 items-center gap-1.5">
          {/* 닫혀 있을 때만 '클릭' 유도 — PC에서만 노출(모바일은 화살표만으로 충분히 인지) */}
          {!open && (
            <span className="hidden shrink-0 whitespace-nowrap rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-extrabold text-brand-orange sm:inline">
              👆 클릭
            </span>
          )}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 sm:h-7 sm:w-7 ${
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
      {open && <div className="px-4 pb-4 pt-0 sm:px-5">{children}</div>}
    </div>
  );
}
