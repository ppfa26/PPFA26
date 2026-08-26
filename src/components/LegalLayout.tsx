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
  bottomSlot,
}: {
  pageKey: string;
  title: string;
  updatedAt?: string; // 시행일 표기는 노출하지 않음(호환용 · 선택)
  children: ReactNode;
  /** 카드(article) 밖, 전체 폭 영역에 렌더링할 하단 슬롯(예: 광고 배너).
   *  카드 안(max-w-3xl)에 넣으면 728px 광고가 잘리므로 전체폭에서 렌더링한다. */
  bottomSlot?: ReactNode;
}) {
  return (
    <PageShell pageKey={pageKey}>
      <Header />
      <main className="bg-gray-50 px-4 py-10">
        <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-card transition-shadow duration-300 hover:shadow-cardHover sm:p-10">
          <Editable
            id={`${pageKey}-title`}
            as="h1"
            className="text-2xl font-extrabold text-brand-dark sm:text-3xl"
          >
            {title}
          </Editable>
          <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-brand-orange to-brand-yellow" />
          <div className="legal-body mt-8 space-y-7 text-[15px] leading-relaxed text-brand-dark">
            {children}
          </div>
        </article>

        {/* 카드 밖 하단 슬롯(광고 등) · 위아래 여백/가로폭은 슬롯 내부에서 제어(대칭) */}
        {bottomSlot && <div className="w-full">{bottomSlot}</div>}
      </main>
      <Footer />
    </PageShell>
  );
}
