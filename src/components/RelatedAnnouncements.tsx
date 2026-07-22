"use client";

import { useEffect, useState } from "react";
import AccordionCard from "@/components/report/AccordionCard";

// ────────────────────────────────────────────────────────────────
// 진단 결과 화면에 "지금 열려있는 관련 정부지원사업" 실제 공고를 보여준다.
//   · 출처: 기업마당(crawled_announcements) — 매일 자동 수집되는 실공고
//   · 매칭: 프로필의 지역·업종·직원수·매출규모·관심분야 (서버 /api/announcements/match)
//   · AI 해설 없음. 공고명·신청기간·소관기관만 노출하고 원문(기업마당)으로 링크.
//   · 디자인: 다른 결과 카드(정책금융기관 등)와 동일한 아코디언 + divide-y 목록.
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
      subtitle={
        <>
          지역·업종·규모에 맞춰 ·
          <b className="text-brand-orange"> 🟢 공고 중인 실제 사업</b>을 가능성 높은 순으로 안내합니다.
        </>
      }
    >
      {loading ? (
        <p className="mt-4 text-sm text-brand-dark/50">📢 관련 공고를 불러오는 중…</p>
      ) : (
        <>
          {/* 정책금융기관 카드와 동일한 divide-y 목록 스타일 */}
          <div className="mt-4 divide-y divide-gray-200">
            {(items || []).map((it, i) => {
              const inner = (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="break-keep text-sm font-extrabold text-brand-dark">
                      {it.title}
                    </span>
                    {it.support_scale && (
                      <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {it.support_scale}
                      </span>
                    )}
                    {it.deadline && (
                      <span className="shrink-0 rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                        🗓️ {it.deadline}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
                    {it.site_name && <>🏛️ {it.site_name}</>}
                    {it.target && <>{it.site_name ? " · " : ""}대상: {it.target}</>}
                  </p>
                  {it.detail_url && (
                    <p className="mt-1.5 text-[11px] font-bold text-brand-orange">
                      공고 원문 보기 →
                    </p>
                  )}
                </>
              );
              return (
                <div
                  key={i}
                  className="border-t border-brand-dark/10 py-4 first:border-t-0 first:pt-0"
                >
                  {it.detail_url ? (
                    <a
                      href={it.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition hover:opacity-80"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </div>
              );
            })}
          </div>

          {/* 출처 표시 — 공공데이터 라이선스(제3유형: 출처표시) 준수 */}
          <p className="mt-4 break-keep text-[11px] leading-relaxed text-brand-dark/45">
            출처: 기업마당(bizinfo.go.kr) · 공공데이터포털 · 실시간 수집 공고 · 안내 목적이며 승인·선정을 보장하지 않습니다.
          </p>
        </>
      )}
    </AccordionCard>
  );
}
