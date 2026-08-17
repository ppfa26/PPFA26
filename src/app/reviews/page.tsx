"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import ScrollReveal from "@/components/ScrollReveal";
import SuccessCases from "@/components/SuccessCases";

export default function ReviewsPage() {
  return (
    <PageShell pageKey="reviews" stickyFooter>
      <ScrollReveal />
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <SuccessCases variant="page" />
      </main>

      <Footer />
    </PageShell>
  );
}
