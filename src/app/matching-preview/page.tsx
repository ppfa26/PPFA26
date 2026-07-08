"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import { matchPrograms, MatchResult } from "@/lib/matching";
import { CATEGORY_META } from "@/lib/programs";

export default function MatchingPreview() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mpp_diagnosis");
      const profile = raw ? JSON.parse(raw) : {};
      setName(profile.name || "");
      setResults(matchPrograms(profile));
    } catch {
      setResults(matchPrograms({}));
    }
  }, []);

  return (
    <PageShell pageKey="matching-preview">
      <Header />
      {/* 하단 여백(pb-28)으로 sticky 바에 콘텐츠가 가려지지 않게 */}
      <main className="px-4 pb-28 pt-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
              {name ? `${name} 대표님, ` : ""}매칭 결과 미리보기
            </h1>
            <p className="mt-2 text-brand-gray">
              총 <b className="text-brand-orange">{results.length}개</b>의 지원사업이 매칭되었습니다. (6개 카테고리 통합 검토)
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {results.map((r, i) => {
              const meta = CATEGORY_META[r.program.category];
              const locked = i >= 1; // 첫 결과만 공개, 나머지는 블러
              return (
                <div key={r.program.id}>
                  <div className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div className={locked ? "blur-locked flex-1" : "flex-1"}>
                        <div className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-brand-gray">
                          {meta.label}
                        </div>
                        <h3 className="font-extrabold text-brand-dark">{r.program.name}</h3>
                        <p className="text-sm text-brand-gray">{r.program.organization}</p>
                        <p className="mt-1 text-sm text-brand-dark">{r.program.summary}</p>
                        <p className="mt-1 text-sm font-semibold text-brand-green">💰 {r.program.amount}</p>
                      </div>
                    </div>
                  </div>

                  {/* 첫 번째 자금 바로 밑에 결제 유도 인라인 배너 */}
                  {i === 0 && (
                    <div className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-yellow/20 p-5">
                      <Editable
                        id="preview-inline-title"
                        as="p"
                        className="text-center text-base font-extrabold text-brand-dark"
                      >
                        🔒 나머지 매칭 결과와 신청 방법은 잠겨 있어요
                      </Editable>
                      <Editable
                        id="preview-inline-sub"
                        as="p"
                        className="mt-1 text-center text-sm text-brand-dark/70"
                      >
                        단돈 99,000원으로 전체 결과·신청 사이트·필요 서류·승인 전략까지 지금 바로 확인하세요.
                      </Editable>
                      <Editable
                        id="preview-inline-cta"
                        as="a"
                        href="/pricing"
                        className="mt-4 block rounded-full bg-brand-dark py-3 text-center font-bold text-white transition hover:opacity-90"
                      >
                        지금 전체 결과 잠금 해제하기
                      </Editable>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 결제 유도 (하단 큰 배너 · 인라인 수정 가능) */}
          <div className="mt-8 rounded-3xl bg-brand-grad p-8 text-center">
            <Editable id="preview-cta-title" as="h2" className="text-xl font-black text-brand-dark">
              전체 매칭 결과와 신청 방법이 궁금하신가요?
            </Editable>
            <Editable id="preview-cta-sub" as="p" className="mt-2 text-sm text-brand-dark/70">
              신청 사이트·필요 서류·승인 확률 전략까지, 99,000원으로 모두 확인하세요.
            </Editable>
            <Editable
              id="preview-cta-button"
              as="a"
              href="/pricing"
              className="mt-5 inline-block rounded-full bg-brand-dark px-8 py-3 font-bold text-white hover:opacity-90"
            >
              상품 보고 전체 결과 확인하기
            </Editable>
            <Editable id="preview-cta-note" as="p" className="mt-3 text-xs text-brand-dark/60">
              ⚠️ 자문 서비스 · 승인 보장 없음 · 대행 없음
            </Editable>
          </div>
        </div>
      </main>

      {/* 스크롤을 따라다니는 하단 고정(sticky) 결제 유도 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-orange/40 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <Editable id="preview-sticky-title" as="p" className="truncate text-sm font-extrabold text-brand-dark">
              전체 결과 잠금 해제
            </Editable>
            <Editable id="preview-sticky-sub" as="p" className="truncate text-xs text-brand-gray">
              99,000원 · 신청 방법·서류·승인 전략 전체 공개
            </Editable>
          </div>
          <Editable
            id="preview-sticky-cta"
            as="a"
            href="/pricing"
            className="shrink-0 whitespace-nowrap rounded-full bg-brand-dark px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            지금 확인하기
          </Editable>
        </div>
      </div>

      <Footer />
    </PageShell>
  );
}
