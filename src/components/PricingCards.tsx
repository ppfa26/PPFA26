"use client";

import Link from "next/link";
import { TIERS, COMMON_NOTES } from "@/lib/products";
import { BETA_FREE } from "@/lib/betaConfig";
import Editable from "./Editable";

export default function PricingCards({ prefix = "home" }: { prefix?: string }) {
  const single = TIERS.length === 1;
  return (
    <div>
      <div
        className={
          single
            ? "mx-auto flex max-w-xl justify-center"
            : "mx-auto grid max-w-3xl gap-4 sm:grid-cols-3"
        }
      >
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`pricing-card relative flex flex-col overflow-hidden rounded-3xl border px-6 py-5 shadow-card transition duration-200 hover:shadow-cardHover ${
              single ? "w-full" : ""
            } ${
              tier.popular
                ? "pricing-card-popular border-brand-orange bg-brand-grad pt-9 sm:pt-10"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* (대표님 요청) 빨간 띠는 남기고 안의 문구만 삭제 → 빈 띠(장식용)만 상단에 유지 */}
            {tier.popular && (
              <div className="ribbon" aria-hidden="true">
                {BETA_FREE ? "" : `🔥 ${single ? "런칭 특가" : "가장 인기"}`}
              </div>
            )}

            {/* (대표님 요청) 🎯 아이콘 + 제목을 한 줄로 왼쪽 상단 배치 */}
            <Editable
              id={`${prefix}-tier-${tier.id}-name`}
              as="h3"
              className="pricing-title flex items-center gap-2 text-2xl font-extrabold text-brand-dark sm:text-[26px]"
            >
              <span aria-hidden="true">{tier.icon}</span>
              <span>{tier.name}</span>
            </Editable>
            <Editable
              id={`${prefix}-tier-${tier.id}-subtitle`}
              as="p"
              className={`pricing-sub text-[13px] font-semibold ${
                tier.popular ? "text-white" : "text-brand-gray"
              }`}
            >
              {tier.subtitle}
            </Editable>

            {/* (대표님 요청) 제목/부제와 0원 박스 사이 하단 여백 조금 확대(mt-2→mt-4) */}
            <div className="mt-4">
              {BETA_FREE ? (
                <>
                  {/* 베타: '오픈 베타 기간 0원' 강조 박스 - 대표님 요청으로 박스 자체를
                      무료 진단으로 넘어가는 CTA 버튼(Link)으로 전환 (문구 동일) */}
                  <Link
                    href="/diagnosis-chat"
                    aria-label="무료 진단 시작하기"
                    className="pricing-beta-box group mt-1 flex flex-col items-center gap-1.5 rounded-2xl px-4 py-4 text-center transition hover:brightness-110 active:scale-[0.99]"
                  >
                    <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[11px] font-bold tracking-tight text-white">
                      오픈 베타 100% 무료
                    </span>
                    <span className="text-[28px] font-black leading-none text-brand-red sm:text-[30px]">
                      오픈 베타 기간 0원
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange">
                      지금 무료로 진단받기
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  {/* 정가(앵커) + 할인율 - 원래 디자인 그대로 */}
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
                </>
              )}
            </div>

            <ul className="mt-3 flex-1 space-y-1.5">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]">
                  <span className="pricing-check mt-0.5 text-brand-green">✓</span>
                  <Editable
                    id={`${prefix}-tier-${tier.id}-feat-${i}`}
                    as="span"
                    className="pricing-feat break-keep text-brand-dark"
                  >
                    {f}
                  </Editable>
                </li>
              ))}
            </ul>

            {/* 버튼 - 사이트 전체 메인 CTA(빨강 배경 + 흰 글씨, .btn-red)와 통일 (대표님 요청) */}
            <Link
              href={BETA_FREE ? "/diagnosis-chat" : `/signup?tier=${tier.id}`}
              className="pricing-cta btn-red mt-4 block rounded-full py-2.5 text-center text-base font-bold"
            >
              {BETA_FREE ? "오픈 베타 기간 무료 진단 시작하기" : tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* 공통 안내 - (대표님 요청) 위 가격 카드와 가로폭 통일(단일 카드 max-w-[44rem]) +
         홈페이지 다크 유리 톤과 어울리도록 아이콘/문구 정렬을 정돈.
         이모지(✅/⚠️)는 앞부분을 아이콘 컬럼으로 분리해 문구를 가지런히,
         마지막 ⚠️ 안내는 상단 구분선으로 시각적으로 떼어 세련되게. */}
      <div className={`mx-auto mt-5 rounded-2xl bg-gray-50 p-5 sm:p-6 ${single ? "max-w-xl" : "max-w-xl"}`}>
        <ul className="space-y-2.5 text-[12px] text-brand-dark sm:text-[13px]">
          {COMMON_NOTES.map((n, i) => {
            const isNotice = n.trimStart().startsWith("⚠️");
            const iconChar = isNotice ? "⚠️" : "✅";
            const body = n.replace(/^\s*(✅|⚠️)\s*/, "");
            const icon = iconChar;
            return (
              <li
                key={i}
                className={`flex items-start gap-2.5 break-keep leading-relaxed ${
                  isNotice
                    ? // ⚠️ 면책 안내: 홈(prefix="home")에서만 글자크기 1단계 축소(줄 수 줄이기, 대표님 요청)
                      `mt-3 border-t border-gray-200/70 pt-3 text-brand-gray ${
                        prefix === "home" ? "text-[11px] sm:text-[12px]" : ""
                      }`
                    : ""
                }`}
              >
                <span className="mt-px shrink-0 text-[13px] leading-none">
                  {icon}
                </span>
                <span className="flex-1">{body}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
