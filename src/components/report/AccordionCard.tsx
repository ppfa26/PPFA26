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
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    // 세련화: 테두리 얇고 은은하게(PC·모바일 동일), 부드러운 그림자로 카드 입체감.
    <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
      {/* 헤더 (토글 버튼) - PC·모바일 동일 스타일 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-brand-orange/5"
      >
        <span className="min-w-0 flex-1">
          {/* 제목 - 16px, 아이콘·글자 세로 중앙 정렬로 깔끔하게 */}
          <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
            {emoji && <span className="shrink-0">{emoji}</span>}
            <span className="min-w-0 break-keep">{title}</span>
          </span>
          {/* 부제 - 짧은 한 줄 안내(모든 카드 통일). PC·모바일 동일 노출 */}
          {subtitle && (
            <span className="mt-0.5 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
              {subtitle}
            </span>
          )}
        </span>
        {/* 닫혀 있을 때만 '클릭 👆' 라벨 노출 (대표님 요청: 결과창 닫힌 아코디언 화살표 옆에 귀엽게). 펼치면 사라짐 */}
        {!open && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-bold text-brand-orange animate-pulse">
            클릭 👆
          </span>
        )}
        {/* 펼침/접힘 화살표 */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* 내용 - PC·모바일 동일 좌우 여백 */}
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}
