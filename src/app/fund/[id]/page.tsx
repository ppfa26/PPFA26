"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { PROGRAM_MAP, CATEGORY_META } from "@/lib/programs";
import { OFFICIAL_DOCS } from "@/lib/officialDocs";

export default function FundDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const program = PROGRAM_MAP[id];

  // 존재하지 않는 지원사업
  if (!program) {
    return (
      <PageShell pageKey="fund-detail">
        <Header />
        <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="text-5xl">🔍</div>
          <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
            지원사업을 찾을 수 없습니다
          </h1>
          <p className="mt-3 max-w-md text-brand-gray">
            요청하신 지원사업 정보가 존재하지 않거나 삭제되었습니다.
          </p>
          <Link href="/matching-preview" className="btn-brand mt-8 rounded-full px-8 py-3">
            진단 결과로 돌아가기
          </Link>
        </main>
        <Footer />
      </PageShell>
    );
  }

  const meta = CATEGORY_META[program.category];
  const relatedDocs = (program.relatedDocIds || [])
    .map((docId) => OFFICIAL_DOCS.find((d) => d.id === docId))
    .filter((d): d is (typeof OFFICIAL_DOCS)[number] => Boolean(d));

  return (
    <PageShell pageKey="fund-detail">
      <Header />
      <main className="bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {/* 뒤로가기 */}
          <Link
            href="/matching-preview"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-gray hover:text-brand-dark"
          >
            ‹ 진단 결과로 돌아가기
          </Link>

          {/* 헤더 카드 */}
          <section
            id="fund-header"
            className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8"
          >
            <div className="flex items-start gap-3">
              <span className="text-4xl">{meta.icon}</span>
              <div className="flex-1">
                <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-brand-gray">
                  {meta.label}
                </span>
                <h1 className="mt-2 text-xl font-extrabold leading-snug text-brand-dark sm:text-2xl">
                  {program.name}
                </h1>
                <p className="mt-1 text-sm font-semibold text-brand-gray">
                  {program.organization}
                </p>
              </div>
            </div>
            <p className="mt-4 text-brand-dark">{program.summary}</p>
            <div className="mt-4 rounded-2xl bg-brand-yellow/30 px-4 py-3">
              <p className="text-sm font-bold text-brand-dark">
                💰 지원 규모: {program.amount}
              </p>
            </div>
            <a
              href={program.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand mt-5 inline-flex w-full items-center justify-center rounded-full px-8 py-3.5 text-center font-bold sm:w-auto"
            >
              🔗 {program.applySite} 사이트 바로가기
            </a>
          </section>

          {/* 필요 서류 — 정확히 확정된 경우에만 노출. 아니면 상담 안내로 대체 */}
          <section
            id="fund-docs"
            className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8"
          >
            <h2 className="text-lg font-extrabold text-brand-dark">
              📋 필요 서류
            </h2>
            {program.docs && program.docs.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {program.docs.map((doc, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-brand-dark"
                  >
                    <span className="mt-0.5 text-brand-green">✔</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-4 text-sm leading-relaxed text-brand-dark">
                필요 서류는 <strong>기관·상품·개별 사업장 상황에 따라 달라집니다</strong>.{" "}
                <strong>상담 필요시 1:1 채팅으로 안내</strong>해 드립니다.
              </p>
            )}
          </section>

          {/* 승인 전략 */}
          <section
            id="fund-strategy"
            className="mt-5 rounded-3xl border-2 border-brand-orange/30 bg-white p-6 shadow-card sm:p-8"
          >
            <h2 className="text-lg font-extrabold text-brand-dark">
              🎯 승인 확률을 높이는 전략
            </h2>
            <p className="mt-3 leading-relaxed text-brand-dark">
              {program.strategy}
            </p>
          </section>

          {/* 관련 공식 공문 PDF */}
          {relatedDocs.length > 0 && (
            <section
              id="fund-official-docs"
              className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8"
            >
              <h2 className="text-lg font-extrabold text-brand-dark">
                📎 관련 공식 공문 (원문 PDF)
              </h2>
              <p className="mt-1 text-sm text-brand-gray">
                아래 자료는 안내·추천 답변의 1차 근거가 되는 정부·기관 공식 공문입니다.
              </p>
              <ul className="mt-4 space-y-2">
                {relatedDocs.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-brand-dark transition hover:bg-gray-50"
                    >
                      <span className="text-lg">📄</span>
                      <span className="flex-1">{doc.title}</span>
                      <span className="text-brand-gray">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 상담 유도 */}
          <section
            id="fund-consult"
            className="mt-6 rounded-3xl bg-brand-grad p-7 text-center sm:p-8"
          >
            <h2 className="text-lg font-black text-brand-dark">
              이 사업, 나에게 맞는지 더 궁금하다면?
            </h2>
            <p className="mt-2 text-sm text-brand-dark/70">
              신청 순서·서류 작성까지 1:1로 물어보세요.
            </p>
            <a
              href="http://pf.kakao.com/_VxfWxan/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-full bg-brand-dark px-8 py-3 font-bold text-white hover:opacity-90"
            >
              💬 1:1 채팅 상담 열기
            </a>
            <p className="mt-4 text-xs text-brand-dark/60">
              ⚠️ 안내·추천 서비스 · 승인 보장 없음 · 대행 없음 · 승인 수수료 없음
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
