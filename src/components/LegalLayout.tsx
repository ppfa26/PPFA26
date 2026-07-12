"use client";

import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import PageShell from "./PageShell";
import Editable from "./Editable";

// 이용약관·개인정보·환불·사업자정보 등 법적 고지 페이지 공통 레이아웃
export default function LegalLayout({
  pageKey,
  title,
  children,
}: {
  pageKey: string;
  title: string;
  updatedAt?: string; // 시행일 표기는 노출하지 않음(호환용 · 선택)
  children: ReactNode;
}) {
  return (
    <PageShell pageKey={pageKey}>
      <Header />
      <main className="bg-gray-50 px-4 py-10">
        <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-10">
          <Editable
            id={`${pageKey}-title`}
            as="h1"
            className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
          >
            {title}
          </Editable>
          <div className="legal-body mt-8 space-y-7 text-[15px] leading-relaxed text-brand-dark">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </PageShell>
  );
}
