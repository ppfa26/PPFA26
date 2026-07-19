"use client";

import LegalLayout from "@/components/LegalLayout";
import { USEFUL_SITE_CATEGORIES } from "@/lib/usefulSites";

export default function SitesPage() {
  return (
    <LegalLayout
      pageKey="sites"
      title="정부지원사업 관련 공식 사이트 모음"
      updatedAt="2026년 7월 8일"
    >
      <p className="text-sm leading-relaxed text-brand-gray">
        창업·지원금·정책자금·인증·감면제도 등 실제 업무에 자주 쓰이는 공식
        사이트를 분야별로 모았습니다. 모든 링크는 새 창에서 열리며, 사용이
        어려우시다면 <strong className="text-brand-dark">카카오톡</strong>으로
        문의주시기 바랍니다.
      </p>

      {USEFUL_SITE_CATEGORIES.map((cat) => (
        <section key={cat.key} id={`sites-${cat.key}`} className="mt-2">
          <h2 className="text-lg font-extrabold text-brand-dark">
            {cat.emoji} {cat.label}{" "}
            <span className="text-sm font-medium text-brand-gray">
              ({cat.sites.length}개)
            </span>
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full table-fixed text-left text-sm">
              <tbody className="divide-y divide-gray-100">
                {cat.sites.map((site, i) => (
                  <tr key={i} className="align-top hover:bg-gray-50">
                    <td className="w-9 bg-gray-50 px-2 py-3 text-center font-semibold text-brand-gray sm:w-10 sm:px-3">
                      {i + 1}
                    </td>
                    <td className="break-words px-3 py-3 sm:px-4">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words font-semibold text-brand-dark underline decoration-brand-yellow decoration-2 underline-offset-2 hover:text-brand-orange"
                      >
                        {site.name}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section id="sites-notice" className="mt-2">
        <p className="rounded-2xl bg-gray-50 px-4 py-4 text-xs leading-relaxed text-brand-gray">
          ※ 각 기관 사정에 따라 URL이 변경될 수 있습니다.
          <br />
          링크가 열리지 않는 경우 문의해주시기 바랍니다.
        </p>
      </section>
    </LegalLayout>
  );
}
