"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { matchPrograms, MatchResult } from "@/lib/matching";
import { CATEGORY_META, MatchCategory, PROGRAMS } from "@/lib/programs";
import AdvancedScreeningPanel from "@/components/AdvancedScreeningPanel";

const CATEGORY_ORDER: MatchCategory[] = [
  "정책자금",
  "정부지원금",
  "창업지원",
  "바우처인증",
  "교육컨설팅",
  "재기재도전",
];

export default function DashboardPage() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [name, setName] = useState("");
  const [activeCat, setActiveCat] = useState<MatchCategory | "전체">("전체");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const profile = raw ? JSON.parse(raw) : {};
      setName(profile.name || "");
      const matched = matchPrograms(profile);
      // 매칭 결과가 없으면 전체 프로그램을 기본 노출 (구독자는 전체 열람 가능)
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
  }, []);

  // 카테고리별 개수
  const countByCat = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach((r) => {
      map[r.program.category] = (map[r.program.category] || 0) + 1;
    });
    return map;
  }, [results]);

  const filtered = useMemo(() => {
    if (activeCat === "전체") return results;
    return results.filter((r) => r.program.category === activeCat);
  }, [results, activeCat]);

  // 승인 가능성 "높음" 판정 기준
  //  - 매칭 점수 7점 이상이면 높음 (실무상 조건이 뚜렷하게 맞는 구간)
  //  - 결과가 적을 때를 대비해, 최고점의 70% 이상도 높음으로 인정
  const highBar = useMemo(() => {
    const max = results.reduce((m, r) => Math.max(m, r.score), 0);
    return Math.max(7, Math.round(max * 0.7));
  }, [results]);
  const isHighChance = (score: number) => score >= highBar && score > 0;
  const highCount = useMemo(
    () => results.filter((r) => isHighChance(r.score)).length,
    [results, highBar]
  );

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
              총 <b className="text-brand-orange">{results.length}개</b> 지원사업을
              <b> 6개 카테고리</b>로 통합 검토했습니다.
              <br className="hidden sm:block" />
              각 사업을 눌러 신청 방법·필요 서류·승인 전략을 확인하세요.
            </p>

            {/* 한눈에 보는 핵심 요약 — 승인 가능성 높은 사업 개수 */}
            {highCount > 0 && (
              <div className="mx-auto mt-5 max-w-2xl rounded-2xl border-2 border-brand-green bg-green-50 px-5 py-4">
                <p className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                  ✅ 이 중 <span className="text-brand-green">승인 가능성 높은 사업 {highCount}개</span>를
                  먼저 신청해 보세요!
                </p>
                <p className="mt-1 break-keep text-xs text-brand-dark/60">
                  아래 <b>✅ 승인 가능성 높음</b> 표시가 붙은 사업부터 확인하시면 됩니다.
                </p>
              </div>
            )}
          </section>

          {/* 카테고리 필터 탭 */}
          <nav
            id="category-filter"
            className="mt-7 flex flex-wrap justify-center gap-2"
          >
            <button
              onClick={() => setActiveCat("전체")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeCat === "전체"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-gray shadow-sm hover:bg-gray-100"
              }`}
            >
              전체 {results.length}
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const cnt = countByCat[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
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

          {/* 정밀 추가진단 — 결과창 최상단 (정확한 판독을 위해 필수 안내) */}
          <AdvancedScreeningPanel />

          {/* 결과 리스트 */}
          <section id="match-results" className="mt-7 space-y-4">
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
            {filtered.map((r) => {
              const meta = CATEGORY_META[r.program.category];
              const high = isHighChance(r.score);
              return (
                <Link
                  key={r.program.id}
                  href={`/fund/${r.program.id}`}
                  className={`block rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
                    high ? "border-2 border-brand-green" : "border-gray-200"
                  }`}
                >
                  <article className="flex items-start gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {high && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-0.5 text-[11px] font-bold text-white">
                            ✅ 승인 가능성 높음
                          </span>
                        )}
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
                      {r.reasons.length > 0 && (
                        <p className="mt-2 text-xs text-brand-orange">
                          👉 {r.reasons.join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="self-center text-lg text-brand-gray">›</span>
                  </article>
                </Link>
              );
            })}

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
                href="https://open.kakao.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-dark px-7 py-3 font-bold text-white hover:opacity-90"
              >
                💬 1:1 채팅 상담 열기
              </a>
              <a
                href="https://open.kakao.com/"
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
