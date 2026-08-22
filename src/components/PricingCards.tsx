"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TIERS, COMMON_NOTES } from "@/lib/products";
import { BETA_FREE } from "@/lib/betaConfig";
import { supabase } from "@/lib/supabaseClient";
import { loadDiagnosis, loadDiagnosisFromServer } from "@/lib/diagnosisStore";
import { fetchViewStatus } from "@/lib/viewCredits";
import Editable from "./Editable";

export default function PricingCards({ prefix = "home" }: { prefix?: string }) {
  const router = useRouter();
  // CTA 클릭 판정 중(세션·진단 조회) 로딩 표시용 - 어느 tier 를 누르는 중인지
  const [busyTier, setBusyTier] = useState<string | null>(null);

  // ★ 가격표 CTA 스마트 분기(대표님 요청) ★
  //   "AI 진단 리포트 받기"를 누르면 상태에 따라 목적지를 다르게 한다.
  //   · 베타(BETA_FREE): 항상 무료진단.
  //   · 비회원                    → 무료진단(/diagnosis-chat). (진단·결과 안 보고 결제 유도하면 이탈)
  //   · 회원 + 이미 결제(조회권)   → 마이페이지(/mypage). ★재결제 방지(대표님 요청)★
  //                                  이미 산 사람을 또 결제창으로 보내면 헛돈다.
  //   · 회원 + 진단 없음          → 무료진단(/diagnosis-chat).
  //   · 회원 + 진단 완료          → 바로 결제창(/payment?tier=...). (이미 결과를 본 사람)
  const handleCtaClick = async (tierId: string) => {
    if (BETA_FREE) {
      router.push("/diagnosis-chat");
      return;
    }
    if (busyTier) return; // 중복 클릭 방지
    setBusyTier(tierId);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      // 비회원 → 무료진단부터
      if (!uid) {
        router.push("/diagnosis-chat");
        return;
      }
      // ★ 재결제 방지(대표님 요청) ★ 이미 유효한 결제(조회권)가 있는 회원이면
      //   결제창으로 보내지 않고 마이페이지로. (서버 기준 판정 → 브라우저 조작 불가)
      try {
        const vs = await fetchViewStatus();
        if (vs?.isActive) {
          router.push("/mypage");
          return;
        }
      } catch {
        /* 조회권 확인 실패는 무시하고 아래 기본 분기로 진행 */
      }
      // 회원 → 진단 완료 여부 판정(로컬 우선, 없으면 서버 조회)
      let hasDiagnosis = !!loadDiagnosis();
      if (!hasDiagnosis) {
        const server = await loadDiagnosisFromServer(uid);
        hasDiagnosis = !!server;
      }
      // 진단 완료 회원만 곧장 결제창, 그 외엔 무료진단부터
      router.push(hasDiagnosis ? `/payment?tier=${tierId}` : "/diagnosis-chat");
    } catch {
      // 판정 실패 시 안전하게 무료진단으로(거부감 최소화 우선)
      router.push("/diagnosis-chat");
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <div>
      {/* ★ 가로 2박스(대표님 요청) ★
          왼쪽 = 🎬 무료 이용(광고 보고 열람) · 오른쪽 = 🎯 광고 제거(29,700원/1개월).
          두 박스의 '유일한 차이 = 결과 조회 전 전면 광고 유무'임을 명확히 보여준다.
          (결과 내용 자체는 100% 동일 — 결제를 강요하지 않고 선택지를 이해시키는 목적) */}
      <div className="mx-auto grid max-w-3xl items-stretch gap-4 sm:grid-cols-2">
        {/* ──────────── 왼쪽: 🎬 무료 이용 박스 ──────────── */}
        {!BETA_FREE && (
          <div className="pricing-card pricing-card-free relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white px-6 py-5 pt-9 shadow-card transition duration-200 hover:shadow-cardHover sm:pt-10">
            {/* 상단 띠(무료 강조) */}
            <div className="ribbon ribbon-free" aria-hidden="true">
              👍 결제 없이 이용
            </div>

            <h3 className="pricing-title flex items-center gap-2 text-2xl font-extrabold text-brand-dark sm:text-[26px]">
              <span aria-hidden="true">🎬</span>
              <span>무료 이용</span>
            </h3>
            <p className="pricing-sub text-[13px] font-semibold text-brand-gray">
              광고 한 번만 보면 결과 전체를 무료로 확인
            </p>

            <div className="mt-4">
              <div className="flex items-end gap-1">
                <span className="pricing-sale-price text-[26px] font-black leading-none text-brand-green">
                  0원
                </span>
                <span className="pricing-sale-period mb-1 text-sm text-brand-gray">
                  / 광고 시청 시
                </span>
              </div>
              <p className="pricing-vat-note mt-1 text-[11px] text-brand-gray">
                * 결제·회원가입 없이 바로 이용
              </p>
            </div>

            <ul className="mt-3 flex-1 space-y-1.5">
              {[
                "AI로 찾은 내 사업장 기준 정부지원사업 리스트",
                "정부지원사업 신청 방법 및 관련 사이트 링크",
                "공식 카카오 채널 톡 상담",
                "결과 조회 전 전면 광고 1회 (건너뛰기 5초)",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]">
                  <span className="pricing-check mt-0.5 text-brand-green">✓</span>
                  <span className="pricing-feat break-keep text-brand-dark">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/diagnosis-chat"
              className="pricing-cta mt-4 block w-full rounded-full border-2 border-brand-dark/25 bg-white py-2.5 text-center text-base font-bold text-brand-dark transition hover:bg-gray-50 active:scale-[0.99]"
            >
              🎬 광고 보고 무료로 이용하기
            </Link>
          </div>
        )}

        {/* ──────────── 오른쪽: 🎯 광고 제거(결제) 박스 = 기존 TIERS ──────────── */}
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`pricing-card relative flex w-full flex-col overflow-hidden rounded-3xl border px-6 py-5 shadow-card transition duration-200 hover:shadow-cardHover ${
              tier.popular
                ? "pricing-card-popular border-brand-orange bg-brand-grad pt-9 sm:pt-10"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* (대표님 요청) 빨간 띠는 남기고 안의 문구만 삭제 → 빈 띠(장식용)만 상단에 유지 */}
            {tier.popular && (
              <div className="ribbon" aria-hidden="true">
                {BETA_FREE ? "" : "🔥 런칭 특가 25%"}
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
                    <span className="pricing-original-price text-sm text-brand-gray/70 line-through">
                      {tier.originalPriceLabel}
                    </span>
                    <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-white">
                      {Math.round((1 - tier.price / tier.originalPrice) * 100)}% 할인
                    </span>
                  </div>
                  {/* 판매가 */}
                  <div className="mt-0.5 flex items-end gap-1">
                    <span className="pricing-sale-price text-[26px] font-black leading-none text-brand-dark">
                      {tier.priceLabel}
                    </span>
                    <span className="pricing-sale-period mb-1 text-sm text-brand-gray">
                      / {tier.period} <span className="text-[11px] text-brand-gray/80">[이용기간]</span>
                    </span>
                  </div>
                  {/* 부가세 포함 표기 */}
                  <p className="pricing-vat-note mt-1 text-[11px] text-brand-gray">
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
            {/* ★ 퍼널 정정(대표님 요청) ★
                예전엔 유료 상태에서 이 버튼이 곧장 /signup?tier=...(→ 결제창)으로 가서
                '진단도 안 하고 결제창 → 이탈'이 발생했다. 이제 BETA_FREE 여부와 무관하게
                항상 무료진단(/diagnosis-chat)으로 보낸다. 결제는 진단 후 결과화면
                (matching-preview)에서 유도한다. → 무료진단 → 로그인 → 로딩 → 결제 전 결과
                → 결제 유도 → 결제 후 결과 순서가 지켜진다. */}
            <button
              type="button"
              onClick={() => handleCtaClick(tier.id)}
              disabled={busyTier === tier.id}
              className="pricing-cta btn-red mt-4 block w-full rounded-full py-2.5 text-center text-base font-bold disabled:opacity-70"
            >
              {busyTier === tier.id
                ? "확인 중…"
                : BETA_FREE
                ? "오픈 베타 기간 무료 진단 시작하기"
                : tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* 공통 안내 - (대표님 요청) 위 가격 카드와 가로폭 통일(단일 카드 max-w-[44rem]) +
         홈페이지 다크 유리 톤과 어울리도록 아이콘/문구 정렬을 정돈.
         이모지(✅/⚠️)는 앞부분을 아이콘 컬럼으로 분리해 문구를 가지런히,
         마지막 ⚠️ 안내는 상단 구분선으로 시각적으로 떼어 세련되게. */}
      {/* ★ 폭 정렬(대표님 요청) ★ 아래 안내 박스를 위 제목 박스(is-wide-pricing 36rem)·
          가격 카드(single=max-w-xl 36rem)와 '같은 가로폭'으로 통일해 좌우 라인을 맞춘다.
          (기존 max-w-2xl=42rem 이라 안내 박스만 넓게 튀어나와 어색했음) */}
      <div className="mx-auto mt-5 max-w-3xl rounded-2xl bg-gray-50 p-5 sm:p-6">
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
