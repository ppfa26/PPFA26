"use client";

import { useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────
//  CollapsibleItem - 결과창 '개별 카드' 2단 접이식 래퍼 (대표님 요청)
//   문제: 아코디언을 열면 안쪽 카드들이 전부 상세까지 펼쳐져 결과창이 너무 길다.
//   해결: 카드마다 [제목+요약+배지=항상 보임] + [상세=접힘/펼침] 2단 구조로 통일.
//        섹션별 '추천 1순위' 카드만 defaultOpen(펼침)으로 열어두고 나머지는 접는다.
//   ⚠️ 표시(펼침/접힘)만 담당한다. 매칭 판정·순서·개수·카운트는 일절 건드리지 않는다.
//      header는 항상 DOM에 렌더되므로 검색·카운트에 영향 없음.
// ─────────────────────────────────────────────────────────────────────────
export default function CollapsibleItem({
  header,
  defaultOpen = false,
  className = "",
  children,
}: {
  header: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      {/* 헤더(제목+요약+배지) - 누르면 상세가 접혔다/펼쳐졌다 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="min-w-0 flex-1">{header}</span>
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {/* 상세 - 펼쳤을 때만 보임(접힘은 숨김) */}
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
