"use client";

import { useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────
//  CollapsibleItem - 결과창 '개별 카드' 2단 접이식 래퍼 (대표님 요청)
//   문제: 아코디언을 열면 안쪽 카드들이 전부 상세까지 펼쳐져 결과창이 너무 길다.
//   해결: 카드마다 [제목+요약+배지=항상 보임] + [상세=접힘/펼침] 2단 구조로 통일.
//        (대표님 요청 2026-07) 모든 카드를 '닫힘'으로 시작하고, 상위 아코디언처럼
//        닫혀 있을 때 우측에 'クリック 👆' 배지를 보여줘 스스로 눌러 보게 유도한다.
//   ⚠️ 표시(펼침/접힘)만 담당한다. 매칭 판정·순서·개수·카운트는 일절 건드리지 않는다.
//      header는 항상 DOM에 렌더되므로 검색·카운트에 영향 없음.
//
//   ★ action prop (즐겨찾기 ⭐ 이식용) ★
//     header는 <button> 안에 들어가므로 그 안에 또 클릭요소(⭐)를 넣으면
//     펼침/접힘과 클릭이 섞인다(중첩 button 문제도 있음).
//     → action 은 접힘 토글 button '바깥(오른쪽)'에 렌더해, ⭐ 클릭이
//       카드 펼침/접힘과 완전히 분리되게 한다.
// ─────────────────────────────────────────────────────────────────────────
export default function CollapsibleItem({
  header,
  action,
  defaultOpen = false,
  className = "",
  children,
}: {
  header: ReactNode;
  action?: ReactNode; // 오른쪽 상단 액션(예: 즐겨찾기 ⭐) — 토글과 분리됨
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      {/* 헤더 줄: [접힘 토글 button] + [액션(⭐)] 을 나란히 둔다. */}
      <div className="flex w-full items-start gap-1.5">
        {/* 헤더(제목+요약+배지) - 누르면 상세가 접혔다/펼쳐졌다 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="min-w-0 flex-1">{header}</span>
          {/* ★ 다이어트(대표님 요청) ★ 안쪽 개별 항목마다 깜빡이던 '클릭 👆' 배지(animate-pulse)를
              제거해 화면 소음을 줄인다. 펼침 여부는 조용한 화살표만으로 충분히 전달된다.
              (상위 큰 아코디언 카드는 유도가 필요해 '클릭 👆'를 그대로 유지) */}
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
        {/* 액션(즐겨찾기 ⭐ 등) - 토글 button 바깥이라 클릭이 섞이지 않음 */}
        {action && <span className="mt-0.5 shrink-0">{action}</span>}
      </div>
      {/* 상세 - 펼쳤을 때만 보임(접힘은 숨김) */}
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
