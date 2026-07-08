"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
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
      <main className="px-4 py-8">
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
                <div
                  key={r.program.id}
                  className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
                >
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
              );
            })}
          </div>

          {/* 결제 유도 */}
          <div className="mt-8 rounded-3xl bg-brand-grad p-8 text-center">
            <h2 className="text-xl font-black text-brand-dark">
              전체 매칭 결과와 신청 방법이 궁금하신가요?
            </h2>
            <p className="mt-2 text-sm text-brand-dark/70">
              신청 사이트·필요 서류·승인 확률 전략까지, 99,000원으로 모두 확인하세요.
            </p>
            <Link href="/pricing" className="mt-5 inline-block rounded-full bg-brand-dark px-8 py-3 font-bold text-white hover:opacity-90">
              상품 보고 전체 결과 확인하기
            </Link>
            <p className="mt-3 text-xs text-brand-dark/60">
              ⚠️ 자문 서비스 · 승인 보장 없음 · 대행 없음
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
