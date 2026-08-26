"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getFavorites,
  removeFavorite,
  clearFavorites,
  type FavoriteItem,
} from "@/lib/favorites";

// ─────────────────────────────────────────────────────────────────────────
//  FavoritesSection - 마이페이지 '⭐ 관심 지원사업' 목록 (미니앱 → 홈페이지 이식)
//   · 결과 화면에서 ⭐ 로 저장한 항목들을 이 기기(브라우저) 기준으로 보여준다.
//   · localStorage 기반이라 SSR 안전하게 마운트 후에만 목록을 그린다.
//   · 항목 X 로 개별 삭제, '전체 비우기'로 모두 삭제.
// ─────────────────────────────────────────────────────────────────────────
export default function FavoritesSection() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setItems(getFavorites());
    refresh();
    // 결과 화면 등 다른 곳에서 토글되면 즉시 반영
    window.addEventListener("mpp:favorites-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mpp:favorites-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // SSR/첫 렌더에서는 아무것도 안 그림(hydration 안전)
  if (!mounted) return null;

  return (
    <section
      id="mypage-favorites"
      className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-brand-dark sm:text-lg">
          ⭐ 관심 지원사업{" "}
          {items.length > 0 && (
            <span className="align-middle text-sm font-bold text-brand-orange">
              {items.length}개
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearFavorites();
              setItems([]);
            }}
            className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-brand-gray transition hover:bg-gray-50"
          >
            전체 비우기
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-brand-gray">
          아직 저장한 관심 지원사업이 없습니다.
          <br />
          <span className="mt-1 inline-block text-[13px] text-brand-dark/50">
            진단 결과에서 지원사업 옆 <b className="text-brand-orange">☆</b> 를 누르면
            여기에 모아볼 수 있어요.
          </span>
          <br />
          <Link
            href="/matching-preview?analyze=1"
            className="mt-2 inline-block font-bold text-brand-orange underline"
          >
            진단 결과 보러 가기
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((f) => (
            <li
              key={f.title}
              className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 py-3"
            >
              <span className="shrink-0 text-lg">{f.icon || "⭐"}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-bold text-brand-dark">
                  {f.title}
                </span>
                {f.kind && (
                  <span className="text-[11px] font-semibold text-brand-gray">
                    {f.kind}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  removeFavorite(f.title);
                  setItems(getFavorites());
                }}
                aria-label="관심 목록에서 삭제"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-dark/30 transition hover:bg-brand-red/10 hover:text-brand-red"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-gray">
        ※ 관심 지원사업은 이 기기(브라우저)에 저장됩니다. 다른 기기에서는 보이지 않을 수
        있어요.
      </p>
    </section>
  );
}
