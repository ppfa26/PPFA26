"use client";

import { useEffect, useState } from "react";
import AccordionCard from "@/components/report/AccordionCard";

// ────────────────────────────────────────────────────────────────
// 진단 결과 화면에 "지금 열려있는 관련 정부지원사업" 실제 공고를 보여준다.
//   · 출처: 기업마당(crawled_announcements) — 매일 자동 수집되는 실공고
//   · 매칭: 프로필의 지역·업종·관심분야 키워드 (서버 /api/announcements/match)
//   · AI 해설 없음. 공고명·신청기간·소관기관만 노출하고 원문(기업마당)으로 링크.
//   · 다른 결과 카드와 통일된 아코디언(AccordionCard)로 표시.
// ────────────────────────────────────────────────────────────────

type Item = {
  title: string;
  site_name: string | null;
  deadline: string | null;
  target: string | null;
  support_scale: string | null;
  detail_url: string | null;
  source: string | null;
};

export default function RelatedAnnouncements({
  profile,
}: {
  profile: Record<string, unknown> | null;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/announcements/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile || {}),
        });
        const j = await res.json();
        if (alive) setItems(Array.isArray(j?.items) ? j.items : []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile]);

  // 표시할 공고가 없으면(로딩 완료 후 0건) 섹션 자체를 숨겨 빈 카드 방지
  if (!loading && (!items || items.length === 0)) return null;

  return (
    <AccordionCard
      emoji="📢"
      title="지금 열려있는 관련 정부지원사업"
      subtitle="진단 정보(지역·업종·관심분야)를 바탕으로 현재 공고 중인 실제 사업을 추렸습니다."
    >
      {loading ? (
        <p className="mt-4 text-sm text-brand-dark/50">📢 관련 공고를 불러오는 중…</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {(items || []).map((it, i) => {
              const inner = (
                <div className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 transition hover:border-brand-primary/50 hover:bg-brand-primary/5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">
                      {it.title}
                    </p>
                    {it.detail_url && (
                      <span className="mt-0.5 shrink-0 text-xs font-bold text-brand-primary">
                        원문 보기 →
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-dark/60 sm:text-xs">
                    {it.site_name && (
                      <span className="inline-flex items-center gap-1">🏛️ {it.site_name}</span>
                    )}
                    {it.deadline && (
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-dark/75">
                        🗓️ {it.deadline}
                      </span>
                    )}
                    {it.support_scale && (
                      <span className="inline-flex items-center gap-1">🏷️ {it.support_scale}</span>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={i}>
                  {it.detail_url ? (
                    <a href={it.detail_url} target="_blank" rel="noopener noreferrer" className="block">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>

          {/* 출처 표시 — 공공데이터 라이선스(제3유형: 출처표시) 준수 */}
          <p className="mt-4 break-keep text-[11px] leading-relaxed text-brand-dark/45">
            출처: 기업마당(bizinfo.go.kr) · 공공데이터포털 · 실시간 수집 공고 · 안내 목적이며 승인·선정을 보장하지 않습니다.
          </p>
        </>
      )}
    </AccordionCard>
  );
}
