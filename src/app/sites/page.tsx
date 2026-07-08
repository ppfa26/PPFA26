"use client";

import LegalLayout from "@/components/LegalLayout";
import { USEFUL_SITE_CATEGORIES } from "@/lib/usefulSites";

export default function SitesPage() {
  return (
    <LegalLayout
      pageKey="sites"
      title="자주 쓰는 공식 사이트 모음"
      updatedAt="2026년 7월 8일"
    >
      <p className="text-sm leading-relaxed text-brand-gray">
        정책자금·보증·창업·인증 업무에 자주 쓰이는 공식 사이트를 분야별로 모았습니다.
        모든 링크는 새 창에서 열리며, 정확한 신청 방법과 전략은{" "}
        <strong className="text-brand-dark">1:1 상담</strong>으로 안내해 드립니다.
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
                      {site.note && (
                        <span className="mt-0.5 block break-words text-xs text-brand-gray">
                          {site.note}
                        </span>
                      )}
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
          ※ 각 기관 사정에 따라 URL이 변경될 수 있습니다. 링크가 열리지 않는 경우
          해당 기관명을 포털에서 검색해 주세요. 링크는 주기적으로 점검하여
          최신 상태를 유지합니다.
        </p>
      </section>
    </LegalLayout>
  );
}
