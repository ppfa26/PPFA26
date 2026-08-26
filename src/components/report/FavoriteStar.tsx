"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

// ─────────────────────────────────────────────────────────────────────────
//  FavoriteStar - 관심 지원사업 즐겨찾기 ⭐ 버튼 (미니앱 → 홈페이지 이식)
//   · 결과 카드 제목 옆에 붙여, 이 기기(브라우저)에 관심 항목을 저장/해제.
//   · localStorage 기반이라 SSR(서버)에선 '빈 별'로 그리고, 마운트 후 실제 상태 반영
//     → hydration 불일치 방지.
//   · 클릭은 부모(카드 펼침/접힘)로 전파되지 않도록 stopPropagation.
// ─────────────────────────────────────────────────────────────────────────
export default function FavoriteStar({
  title,
  kind,
  icon,
  className = "",
}: {
  title: string;
  kind?: string;
  icon?: string;
  className?: string;
}) {
  // 서버/첫 렌더에선 항상 false로 그려 hydration 안전. 마운트 후 실제 값으로 교체.
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOn(isFavorite(title));
    // 다른 카드/마이페이지에서 같은 항목을 토글하면 여기도 동기화
    const sync = () => setOn(isFavorite(title));
    window.addEventListener("mpp:favorites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mpp:favorites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [title]);

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!title) return;
    const next = toggleFavorite(title, { kind, icon });
    setOn(next);
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={on}
      aria-label={on ? "관심 지원사업에서 빼기" : "관심 지원사업으로 저장"}
      title={on ? "관심 해제" : "관심 지원사업 저장"}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-base leading-none transition active:scale-90 ${
        mounted && on
          ? "bg-brand-yellow/20 text-brand-orange"
          : "bg-gray-100 text-brand-dark/30 hover:bg-brand-yellow/10 hover:text-brand-orange/70"
      } ${className}`}
    >
      {mounted && on ? "★" : "☆"}
    </button>
  );
}
