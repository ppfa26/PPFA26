"use client";

import Link from "next/link";
import { TIERS, COMMON_NOTES } from "@/lib/products";
import Editable from "./Editable";

export default function PricingCards({ prefix = "home" }: { prefix?: string }) {
  const single = TIERS.length === 1;
  return (
    <div>
      <div
        className={
          single
            ? "mx-auto flex max-w-lg justify-center"
            : "mx-auto grid max-w-3xl gap-4 sm:grid-cols-3"
        }
      >
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative flex flex-col overflow-hidden rounded-2xl border px-6 py-4 shadow-card transition hover:shadow-cardHover ${
              single ? "w-full" : ""
            } ${
              tier.popular
                ? "border-brand-orange bg-brand-grad"
                : "border-gray-200 bg-white"
            }`}
          >
            {tier.popular && (
              <div className="ribbon">🔥 {single ? "런칭 특가" : "가장 인기"}</div>
            )}

            <div className="text-2xl">{tier.icon}</div>
            <Editable
              id={`${prefix}-tier-${tier.id}-name`}
              as="h3"
              className="mt-1 text-lg font-extrabold text-brand-dark"
            >
              {tier.name}
            </Editable>
            <Editable
              id={`${prefix}-tier-${tier.id}-subtitle`}
              as="p"
              className={`text-[13px] font-semibold ${
                tier.popular ? "text-brand-dark/70" : "text-brand-gray"
              }`}
            >
              {tier.subtitle}
            </Editable>

            <div className="mt-2">
              {/* 정가(앵커) + 할인율 */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm line-through ${
                    tier.popular ? "text-brand-dark/50" : "text-brand-gray/70"
                  }`}
                >
                  {tier.originalPriceLabel}
                </span>
                <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-white">
                  {Math.round((1 - tier.price / tier.originalPrice) * 100)}% 할인
                </span>
              </div>
              {/* 판매가 */}
              <div className="mt-0.5 flex items-end gap-1">
                <span className="text-[26px] font-black leading-none text-brand-dark">
                  {tier.priceLabel}
                </span>
                <span className="mb-1 text-sm text-brand-gray">
                  / {tier.period} <span className="text-[11px] text-brand-gray/80">[이용기간]</span>
                </span>
              </div>
              {/* 부가세 포함 표기 */}
              <p className="mt-1 text-[11px] text-brand-gray">
                * 부가가치세(VAT) 포함가
              </p>
            </div>

            <ul className="mt-3 flex-1 space-y-1.5">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-0.5 text-brand-green">✓</span>
                  <Editable
                    id={`${prefix}-tier-${tier.id}-feat-${i}`}
                    as="span"
                    className="break-keep text-brand-dark"
                  >
                    {f}
                  </Editable>
                </li>
              ))}
            </ul>

            <Link
              href={`/signup?tier=${tier.id}`}
              className={`mt-4 block rounded-full py-2.5 text-center text-sm font-bold ${
                tier.popular
                  ? "bg-brand-dark text-white hover:opacity-90"
                  : "btn-brand"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* 공통 안내 */}
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-gray-50 p-5">
        <ul className="space-y-1.5 text-[11px] text-brand-dark sm:text-xs">
          {COMMON_NOTES.map((n, i) => (
            <li key={i} className="break-keep leading-relaxed">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
