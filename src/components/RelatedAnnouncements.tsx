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
      title="추가적인 그 외 정부지원사업"
      subtitle="그 외 정부지원사업이에요"
    >
      {loading ? (
        <p className="mt-4 text-sm text-brand-dark/50">📢 관련 공고를 불러오는 중…</p>
      ) : (
        <>
          {/* 감면 카드와 동일한 투명(흰) 박스 목록 스타일 */}
          <div className="mt-4 space-y-3">
            {(items || []).map((it, i) => {
              const inner = (
                <>
                  {/* 제목 + 카테고리 태그만 한 줄에 — 기간 배지는 아래로 내려 통일 */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="break-keep text-[14px] font-extrabold leading-snug text-brand-dark">
                      {it.title}
                    </span>
                    {it.support_scale && (
                      <span className="shrink-0 break-keep rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {it.support_scale}
                      </span>
                    )}
                  </div>
                  {/* 신청기간 — 공고명 길이와 무관하게 항상 제목 아래 별도 줄로 통일 */}
                  {it.deadline && (
                    <span className="mt-2 inline-block shrink-0 break-keep rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                      🗓️ {it.deadline}
                    </span>
                  )}
                  {/* 지역 · 대상 · 버튼 — 한 줄로 압축 (왼쪽 정보 / 오른쪽 버튼) */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12px] leading-relaxed text-brand-gray">
                      {it.site_name && <span>🏛️ {it.site_name}</span>}
                      {it.site_name && it.target && <span className="mx-1.5 text-brand-dark/25">·</span>}
                      {it.target && (
                        <>
                          <span className="font-bold text-brand-dark/70">대상 </span>
                          {it.target}
                        </>
                      )}
                    </p>
                    {it.detail_url && (
                      <span className="shrink-0 break-keep rounded-lg bg-brand-orange px-3 py-2 text-[11px] font-bold text-white transition group-hover:opacity-90">
                        공고 원문 보러 가기 →
                      </span>
                    )}
                  </div>
                </>
              );
              return (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  {it.detail_url ? (
                    <a
                      href={it.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block origin-left transition-transform duration-150 hover:scale-[1.01]"
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
