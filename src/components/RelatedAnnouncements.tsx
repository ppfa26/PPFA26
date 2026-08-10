"use client";

import { useEffect, useState } from "react";
import AccordionCard from "@/components/report/AccordionCard";
import CollapsibleItem from "@/components/report/CollapsibleItem";

// ────────────────────────────────────────────────────────────────
// 진단 결과 화면에 "지금 열려있는 관련 정부지원사업" 실제 공고를 보여준다.
//   · 출처: crawled_announcements(기업마당 · K-Startup · 중소벤처24) - 매일 자동 수집되는 실공고
//   · 매칭: 프로필의 지역·업종·직원수·매출규모·관심분야 (서버 /api/announcements/match)
//   · AI 해설 없음. 공고명·신청기간·소관기관만 노출하고 원문으로 링크.
//
//  ★ 성격별 분류(대표님 요청 2026-07): 서버가 공고를 창업/융자/그외로 나눠 준다.
//     - bucket="etc"     : 📢 '그 외 놓치기 쉬운 지원사업' 독립 아코디언 카드 (기본값)
//     - bucket="startup" : 🌱 창업 아코디언 '안'에 인라인으로 붙이는 실시간 공고 목록
//     - bucket="loan"    : 💳 정책금융상품 아코디언 '안'에 인라인으로 붙이는 실시간 공고 목록
//     variant="inline"이면 자체 아코디언 없이 소제목 + 목록만 렌더(중첩 아코디언 방지).
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

type Bucket = "startup" | "loan" | "etc";

// 버킷별 표시 설정(아코디언 제목/색/안내문). etc만 독립 카드라 카드 제목을 씀.
const BUCKET_META: Record<
  Bucket,
  {
    emoji: string;
    title: string;
    subtitle: string;
    inlineTitle: string; // 인라인(창업/융자 아코디언 안)일 때 소제목
    accent: string; // 안내 박스 테두리/배경 톤 클래스
  }
> = {
  startup: {
    emoji: "🌱",
    title: "그 외 창업 지원사업",
    subtitle: "지금 열려 있는 창업 관련 공고예요",
    inlineTitle: "지금 열려 있는 창업 지원 공고",
    accent: "border-brand-green/30 bg-brand-green/5",
  },
  loan: {
    emoji: "💳",
    title: "그 외 정책자금·융자 공고",
    subtitle: "지금 열려 있는 자금·융자 관련 공고예요",
    inlineTitle: "지금 열려 있는 정책자금·융자 공고",
    accent: "border-blue-200 bg-blue-50",
  },
  etc: {
    emoji: "📢",
    title: "그 외 추가 지원사업",
    subtitle: "그 외 지원사업도 챙겨보세요",
    inlineTitle: "지금 열려 있는 관련 공고",
    accent: "border-brand-orange/30 bg-brand-orange/5",
  },
};

export default function RelatedAnnouncements({
  profile,
  onCount,
  bucket = "etc",
  variant = "card",
}: {
  profile: Record<string, unknown> | null;
  // ★ 실제 매칭돼 화면에 표시된 공고 '실측 갯수'를 부모(요약 배너)로 올려 숫자 100% 일치 (대표님 요청) ★
  //   ※ 요약 배너의 '그 외 정부지원사업' 숫자는 bucket="etc"(📢)만 반영한다.
  onCount?: (n: number) => void;
  // 표시할 공고 성격 버킷
  bucket?: Bucket;
  // "card"=자체 아코디언 카드(그 외/📢) · "inline"=상위 아코디언 안에 소제목+목록만
  variant?: "card" | "inline";
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  // fallback=true → 프로필과 딱 맞는 공고가 부족해 '최근 열린 공고 참고용'으로 보여주는 상태
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  // ★ 대표님 요청(2026-07 변경): 상위 3개만 먼저 보여주고 나머지는 '더 보기'로 접는다.
  const PREVIEW_COUNT = 3;
  const [showAll, setShowAll] = useState(false);

  const meta = BUCKET_META[bucket];

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
        if (alive) {
          // 서버가 성격별 배열(startup/loan/etc)을 준다. 없으면 items(하위호환)로 폴백.
          const arr = Array.isArray(j?.[bucket])
            ? j[bucket]
            : Array.isArray(j?.items)
            ? j.items
            : [];
          setItems(arr);
          const fb =
            j?.fallback_by && typeof j.fallback_by[bucket] === "boolean"
              ? j.fallback_by[bucket]
              : Boolean(j?.fallback);
          setFallback(fb);
        }
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile, bucket]);

  // ★ 로딩이 끝나 실제 표시할 공고 수가 확정되면 부모(요약 배너)로 갯수 전달 ★
  useEffect(() => {
    if (items) onCount?.(items.length);
  }, [items, onCount]);

  // 표시할 공고가 없으면(로딩 완료 후 0건) 섹션 자체를 숨겨 빈 카드 방지
  if (!loading && (!items || items.length === 0)) return null;

  const list = (
    <>
      {loading ? (
        <p className="mt-4 text-sm text-brand-dark/50">{meta.emoji} 관련 공고를 불러오는 중…</p>
      ) : (
        <>
          <div className={`rounded-xl border px-4 py-3 ${meta.accent}`}>
            <p className="break-keep text-xs leading-relaxed text-brand-dark/80">
              {fallback ? (
                <>
                  <b>지금 열려 있는 최근 공고</b>를 참고용으로 보여드려요. 신청기간·자격은 원문에서 꼭 확인하세요.
                </>
              ) : bucket === "etc" ? (
                <>
                  대표님 지역·업종으로 <b>지금 열려 있는 공고</b>예요. 신청기간·자격은 원문에서 꼭 확인하세요.
                </>
              ) : (
                <>
                  지금 실제로 열려 있는 <b>{bucket === "loan" ? "정책자금·융자" : "창업"} 공고</b>예요. 신청기간·자격은 원문에서 꼭 확인하세요.
                </>
              )}
            </p>
          </div>
          <div className="mt-3 space-y-3">
            {(showAll ? (items || []) : (items || []).slice(0, PREVIEW_COUNT)).map((it, i) => {
              // 헤더(항상 보임): 제목 + 지원분야 태그 + 신청기간 배지
              const header = (
                <>
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
                  {it.deadline && (
                    <span className="mt-2 inline-block shrink-0 break-keep rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                      🗓️ {it.deadline}
                    </span>
                  )}
                </>
              );
              // 상세(펼쳤을 때만): 소관기관 · 대상 · 공고 원문 버튼
              const detail = (
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-brand-gray">
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
                    <a
                      href={it.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 break-keep rounded-lg bg-brand-orange px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-90"
                    >
                      공고 원문 보러 가기 →
                    </a>
                  )}
                </div>
              );
              return (
                <CollapsibleItem
                  key={i}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                  header={header}
                >
                  {detail}
                </CollapsibleItem>
              );
            })}
          </div>

          {/* ★ 상위 3개 초과 시에만 더 보기 / 접기 토글 (대표님 요청) */}
          {(items?.length || 0) > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-bold text-brand-dark/70 transition hover:bg-gray-50"
            >
              {showAll
                ? "접기 ▲"
                : `다른 지원사업 ${(items?.length || 0) - PREVIEW_COUNT}개 더 보기 ▼`}
            </button>
          )}
        </>
      )}
    </>
  );

  // 인라인(창업/융자 아코디언 안): 자체 아코디언 없이 구분선 + 소제목 + 목록만.
  if (variant === "inline") {
    // 로딩 중이거나 0건이면 위에서 이미 null 반환됨(단, 로딩 중엔 표시)
    return (
      <div className="mt-2 border-t border-brand-dark/5 pt-3">
        <p className="mb-2 flex items-center gap-1.5 break-keep text-[13px] font-extrabold text-brand-dark/80">
          <span aria-hidden>{meta.emoji}</span>
          {meta.inlineTitle}
        </p>
        {list}
      </div>
    );
  }

  // 기본(그 외/📢): 독립 아코디언 카드
  return (
    <AccordionCard emoji={meta.emoji} title={meta.title} subtitle={meta.subtitle}>
      {list}
    </AccordionCard>
  );
}
