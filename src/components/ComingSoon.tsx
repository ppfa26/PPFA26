"use client";

import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import PageShell from "./PageShell";
import Editable from "./Editable";

export default function ComingSoon({
  pageKey,
  title,
  desc,
}: {
  pageKey: string;
  title: string;
  desc: string;
}) {
  return (
    <PageShell pageKey={pageKey}>
      <Header />
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="text-5xl">🛠️</div>
        <Editable
          id={`${pageKey}-title`}
          as="h1"
          className="mt-4 text-2xl font-extrabold text-brand-dark"
        >
          {title}
        </Editable>
        <Editable
          id={`${pageKey}-desc`}
          as="p"
          className="mt-3 max-w-md text-brand-gray"
        >
          {desc}
        </Editable>
        <Link
          href="/"
          className="btn-brand mt-8 rounded-full px-8 py-3"
        >
          홈으로 돌아가기
        </Link>
      </main>
      <Footer />
    </PageShell>
  );
}
