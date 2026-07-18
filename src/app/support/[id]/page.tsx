import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { SUPPORT_PROGRAMS, findSupportProgram } from "@/lib/supportPrograms";

export function generateStaticParams() {
  return SUPPORT_PROGRAMS.map((p) => ({ id: p.id }));
}

export default function SupportDetailPage({ params }: { params: { id: string } }) {
  const prog = findSupportProgram(params.id);
  if (!prog) notFound();

  return (
    <PageShell pageKey={`support-${prog.id}`}>
      <Header />
      <main className="bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {/* 뒤로 가기 */}
          <Link
            href="/matching-preview"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-gray hover:text-brand-dark"
          >
            ← 기관·상품 안내로 돌아가기
          </Link>

          {/* 헤더 카드 */}
          <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-start gap-3">
              <span className="text-3xl sm:text-4xl">{prog.icon}</span>
              <div className="flex-1">
                <h1 className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
                  {prog.title}
                </h1>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-brand-gray">
                  {prog.desc}
                </p>
              </div>
            </div>

            <a
              href={prog.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-extrabold text-white hover:opacity-90 sm:w-auto"
            >
              🔗 {prog.site} 바로가기
            </a>
          </section>

          {/* 승인 소요기간 & 절차 */}
          <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="break-keep text-lg font-extrabold text-brand-dark">
              💡 승인 소요기간 & 신청 절차
            </h2>
            <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
              {prog.detailIntro}
            </p>

            <div className="mt-4 divide-y divide-gray-200">
              {prog.sections.map((sec) => (
                <div key={sec.heading} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="break-keep text-sm font-extrabold text-brand-dark sm:text-base">
                    {sec.heading}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {sec.items.map((it, i) => (
                      <li key={i} className="flex gap-1.5 break-keep text-xs leading-relaxed text-brand-dark/80 sm:text-sm">
                        <span className="shrink-0 text-brand-orange">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 담당 부처 연락처 */}
          <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="break-keep text-lg font-extrabold text-brand-dark">
              📞 담당 부처 & 연락처
            </h2>
            <div className="mt-4 divide-y divide-gray-200">
              {prog.contacts.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <span className="break-keep text-sm font-bold text-brand-dark">{c.label}</span>
                  {c.href ? (
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="break-all rounded-lg bg-brand-green/10 px-3 py-1.5 text-sm font-bold text-brand-green hover:bg-brand-green/20"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span className="break-keep text-right text-sm text-brand-dark/70">{c.value}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 면책 */}
          <p className="mt-5 break-keep text-center text-xs leading-relaxed text-brand-dark/40">
            ※ 위 소요기간·일정은 연도·공고별로 달라질 수 있습니다. 정확한 사항은 각 기관 공고와 콜센터로 확인해 주세요.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/matching-preview"
              className="inline-flex items-center gap-1 rounded-xl border-2 border-brand-dark px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-brand-dark hover:text-white"
            >
              ← 기관·상품 안내로 돌아가기
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
