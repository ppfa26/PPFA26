"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";

// ── 대시보드 → 진단 결과 화면 통일 (대표님 요청) ──
//   진단 완료 화면(/matching-preview)과 마이페이지 진단결과 화면을 하나로 합치기 위해,
//   기존 /dashboard 로 들어오는 모든 진입(북마크·상세페이지 복귀 등)을
//   결과 화면(/matching-preview)으로 즉시 넘겨준다.
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/matching-preview");
  }, [router]);

  return (
    <PageShell pageKey="dashboard">
      <Header />
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-20">
        <p className="text-sm font-semibold text-brand-gray">결과 화면으로 이동 중...</p>
      </main>
      <Footer />
    </PageShell>
  );
}
