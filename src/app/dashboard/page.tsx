"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { matchPrograms, MatchResult } from "@/lib/matching";
import {
  CATEGORY_META,
  PROGRAMS,
  CategoryGroup,
  CATEGORY_GROUP_ORDER,
  CATEGORY_GROUP_META,
  toCategoryGroup,
} from "@/lib/programs";
import AdvancedScreeningPanel from "@/components/AdvancedScreeningPanel";
import { ADVISORY_DISCLAIMER, REVALIDATION_NOTICE } from "@/lib/advancedScreening";

export default function DashboardPage() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [name, setName] = useState("");
  const [activeCat, setActiveCat] = useState<CategoryGroup | "전체">("전체");
  const [loaded, setLoaded] = useState(false);
  const [advancedApplied, setAdvancedApplied] = useState(false);
  // 결제 여부 — 결제 완료 시 localStorage("mpp_paid")에 표시됨.
  //  미결제: 맨 위 1개만 공개 + 나머지 블러 / 결제: 전체 공개.
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    // 처음 질문지 + (정밀진단 반영분)을 읽어 매칭리스트를 계산.
    //  정밀진단이 완료되면 mpp_diagnosis가 병합 갱신되므로 그 값을 그대로 사용.
    //  → 처음 답과 다르면 정밀진단 값이 우선 반영된다(대표님 기준).
    const recompute = () => {
      try {
        setPaid(localStorage.getItem("mpp_paid") === "true");
      } catch {}
      try {
        const raw = sessionStorage.getItem("mpp_diagnosis");
        const profile = raw ? JSON.parse(raw) : {};
        setName(profile.name || "");
        setAdvancedApplied(Boolean(profile._advancedApplied));
        const matched = matchPrograms(profile);
        setResults(
          matched.length > 0
            ? matched
            : PROGRAMS.map((program) => ({ program, score: 0, reasons: [] }))
        );
      } catch {
        setResults(PROGRAMS.map((program) => ({ program, score: 0, reasons: [] })));
      } finally {
        setLoaded(true);
      }
    };

    recompute();
    // 정밀진단 완료 시 발신되는 이벤트를 받아 즉시 재계산
    window.addEventListener("mpp-advanced-applied", recompute);
    return () => window.removeEventListener("mpp-advanced-applied", recompute);
  }, []);

  // 승인 가능성 "높음" 판정 기준
  //  - 매칭 점수 7점 이상이면 높음 (실무상 조건이 뚜렷하게 맞는 구간)
  //  - 결과가 적을 때를 대비해, 최고점의 70% 이상도 높음으로 인정
  const highBar = useMemo(() => {
    const max = results.reduce((m, r) => Math.max(m, r.score), 0);
    return Math.max(7, Math.round(max * 0.7));
  }, [results]);
  const isHighChance = (score: number) => score >= highBar && score > 0;

  // 결과창에는 매칭된 지원사업을 모두(적합도순) 노출한다.
  //  - 적합도(점수) 높은 순으로 위에서부터 정렬 (대표님 방침: 높은 것 위로)
  //  - "승인 가능성 높음" 배지는 highBar(7점) 이상에만 붙는다(아래 isHighChance)
  //  → 이렇게 하면 카테고리별 개수 표기가 실제 안내한 상품 수와 정확히 일치한다.
  const displayResults = useMemo(() => {
    const sortByScore = (arr: MatchResult[]) => [...arr].sort((a, b) => b.score - a.score);
    return sortByScore(results.filter((r) => r.score > 0));
  }, [results]);

  // 승인 가능성 높은 사업 수 (요약 문구용)
  const highCount = useMemo(
    () => displayResults.filter((r) => isHighChance(r.score)).length,
    [displayResults, highBar]
  );

  const filtered = useMemo(() => {
    if (activeCat === "전체") return displayResults;
    return displayResults.filter((r) => toCategoryGroup(r.program.category) === activeCat);
  }, [displayResults, activeCat]);

  // 카테고리 그룹별 개수 — 실제 노출되는 결과 기준으로 집계(안내 상품 수와 일치)
  const countByCat = useMemo(() => {
    const map: Record<string, number> = {};
    displayResults.forEach((r) => {
      const g = toCategoryGroup(r.program.category);
      map[g] = (map[g] || 0) + 1;
    });
    return map;
  }, [displayResults]);

  return (
    <PageShell pageKey="dashboard">
      <Header />
      <main className="bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* 헤더 */}
          <section id="dashboard-hero" className="text-center">
            <div className="mb-3 inline-block rounded-full bg-brand-yellow px-4 py-1.5 text-xs font-bold text-brand-dark sm:text-sm">
              🎯 나에게 맞는 지원사업 통합 매칭 결과
            </div>
            <h1 className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
              {name ? `${name} 대표님, ` : ""}맞춤 매칭 대시보드
            </h1>
            <p className="mt-2 text-sm text-brand-gray sm:text-base">
              대표님 조건에 맞는 <b className="text-brand-orange">{displayResults.length}개</b> 지원사업을 추려 드렸습니다.
              {highCount > 0 && (
                <> 이 중 <b className="text-brand-green">승인 가능성 높은 사업은 {highCount}개</b>입니다.</>
              )}
            </p>

            {/* 정밀진단 반영 안내 — 정밀진단을 완료하면 그 값이 우선 반영됨 */}
            {advancedApplied && (
              <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-brand-orange/40 bg-brand-yellow/10 px-4 py-2.5">
                <p className="break-keep text-xs font-semibold text-brand-dark sm:text-sm">
                  🎯 <b>정밀 추가진단</b> 결과가 반영되었습니다. 처음 진단과 다른 항목은 <b>정밀진단 값을 기준</b>으로 안내됩니다.
                </p>
              </div>
            )}

            {/* 한눈에 보는 핵심 요약 — 승인 가능성 높은 사업 개수 */}
            {highCount > 0 && (
              <div className="mx-auto mt-5 max-w-2xl rounded-xl border-2 border-brand-green bg-green-50 px-4 py-2">
                <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                  ✅ 이 중 <span className="text-brand-green">승인 가능성 높은 사업 {highCount}개</span>를 먼저 신청해 보세요!
                </p>
              </div>
            )}
          </section>

          {/* 카테고리 필터 탭 — 한 줄 유지(넘치면 좌우 스크롤, 모바일 안전) */}
          <nav
            id="category-filter"
            className="mt-7 -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:justify-center sm:px-0"
          >
            <button
              onClick={() => setActiveCat("전체")}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                activeCat === "전체"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-gray shadow-sm hover:bg-gray-100"
              }`}
            >
              전체 {displayResults.length}
            </button>
            {CATEGORY_GROUP_ORDER.map((cat) => {
              const meta = CATEGORY_GROUP_META[cat];
              const cnt = countByCat[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeCat === cat
                      ? "bg-brand-dark text-white"
                      : "bg-white text-brand-gray shadow-sm hover:bg-gray-100"
                  }`}
                >
                  {meta.icon} {meta.label} {cnt}
                </button>
              );
            })}
          </nav>

          {/* 기관·정부지원사업 안내 — 결제 전 진단값으로 자동 판독(추가 질문 없음) */}
          <AdvancedScreeningPanel autoRun />

          {/* 면책조항 + 재검증 안내 — 결과 목록(주황 박스) 바로 위 */}
          <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="break-keep text-xs leading-relaxed text-brand-dark/60">⚠️ {ADVISORY_DISCLAIMER}</p>
            <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">🗓️ {REVALIDATION_NOTICE}</p>
          </div>

          {/* 결과 리스트 — 정부지원사업 + 정책자금 대출 통합 목록 */}
          <section id="match-results" className="mt-7 space-y-4">
            {filtered.length > 0 && (
              <div className="rounded-2xl border-2 border-brand-orange bg-brand-yellow/10 px-5 py-4">
                <p className="break-keep text-base font-extrabold text-brand-dark sm:text-lg">
                  🎯 지금 바로 신청해볼만한 지원사업{" "}
                  <span className="text-brand-orange">{filtered.length}건</span>
                </p>
                <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">
                  정부지원사업(바우처·보조금)과 정책자금 대출을 한 목록에 모아, 적합도 높은 순으로 정렬했습니다.
                </p>
              </div>
            )}
            {loaded && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-brand-gray">
                해당 카테고리에 매칭된 지원사업이 없습니다.
                <br />
                다른 카테고리를 선택하거나{" "}
                <Link href="/diagnosis" className="font-bold text-brand-orange underline">
                  진단을 다시 받아보세요.
                </Link>
              </div>
            )}
            {filtered.map((r, idx) => {
              const meta = CATEGORY_META[r.program.category];
              // 미결제이면 맨 위 1개만 공개, 나머지는 블러 처리(클릭 불가).
              const locked = !paid && idx >= 1;

              const cardInner = (
                <article className="flex items-start gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-brand-gray">
                        {meta.label}
                      </span>
                      {r.score > 0 && (
                        <span className="inline-block rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                          매칭 적합도 {r.score}점
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-brand-dark">
                      {r.program.name}
                    </h3>
                    <p className="text-sm text-brand-gray">
                      {r.program.organization}
                    </p>
                    <p className="mt-1 text-sm text-brand-dark">
                      {r.program.summary}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-green">
                      💰 {r.program.amount}
                    </p>
                  </div>
                </article>
              );

              // 잠긴 카드: 링크 대신 블러 처리된 div (클릭 불가)
              if (locked) {
                return (
                  <div
                    key={r.program.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
                    aria-hidden="true"
                  >
                    <div className="blur-locked">{cardInner}</div>
                  </div>
                );
              }

              return (
                <Link
                  key={r.program.id}
                  href={`/fund/${r.program.id}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {cardInner}
                </Link>
              );
            })}

            {/* 미결제 결제 유도 배너 — 첫 결과 아래(잠긴 목록 사이)에 노출 */}
            {!paid && filtered.length > 1 && (
              <div className="rounded-2xl border-2 border-brand-orange bg-brand-yellow/20 p-6 text-center">
                <p className="break-keep text-base font-extrabold text-brand-dark sm:text-lg">
                  🔒 나머지 <b className="text-brand-orange">{filtered.length - 1}개</b> 매칭 결과와 신청 방법이 잠겨 있어요
                </p>
                <p className="mt-2 break-keep text-sm text-brand-dark/70">
                  결제하면 전체 매칭 결과 · 신청 사이트 · 필요 서류 · 승인 전략까지 모두 확인할 수 있습니다.
                </p>
                <Link
                  href="/pricing"
                  className="mt-5 inline-block rounded-full bg-brand-dark px-8 py-3 font-bold text-white transition hover:opacity-90"
                >
                  전체 결과 잠금 해제하기
                </Link>
                <p className="mt-3 break-keep text-xs text-brand-dark/60">
                  ⚠️ 자문 서비스 · 승인 보장 없음 · 대행 없음
                </p>
              </div>
            )}

            {/* 승인 가능성 안내 문구 */}
            {filtered.length > 0 && (
              <p className="break-keep px-1 pt-1 text-center text-[11px] leading-relaxed text-brand-gray">
                ✅ 표시는 대표님 진단 정보 기준 승인 가능성이 높다는 표시입니다. 승인을 보장하지는 않으며,
                심사는 각 기관의 기준표를 기준으로 합니다.
              </p>
            )}
          </section>

          {/* 상담 채널 안내 */}
          <section
            id="consult-channels"
            className="mt-10 rounded-3xl bg-brand-grad p-7 text-center sm:p-8"
          >
            <h2 className="text-xl font-black text-brand-dark">
              신청 과정에서 막히셨나요?
            </h2>
            <p className="mt-2 text-sm text-brand-dark/70">
              1:1 상담과 대표님들끼리 정보를 나누는 오픈 단톡방을 함께 운영합니다.
              <br />
              막막할 때 바로 물어보세요. (자문 전용 · 대행 없음)
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-dark px-7 py-3 font-bold text-white hover:opacity-90"
              >
                💬 1:1 채팅 상담 열기
              </a>
              <a
                href="https://open.kakao.com/o/psa7SwDi"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-brand-dark bg-white px-7 py-3 font-bold text-brand-dark hover:bg-gray-50"
              >
                👥 대표님 오픈 단톡방 참여
              </a>
            </div>
            <p className="mt-4 break-keep text-xs leading-relaxed text-brand-dark/60">
              ⚠️ 본 서비스는 신청 가능 상품 안내 및 자문 서비스이며 정부지원사업
              승인을 보장하지 않습니다. 대행 신청을 하지 않으며 승인 수수료를 받지
              않습니다.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
