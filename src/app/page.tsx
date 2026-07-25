"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import Editable from "@/components/Editable";
import PricingCards from "@/components/PricingCards";
import ScrollReveal from "@/components/ScrollReveal";
import KakaoFloatingButton from "@/components/KakaoFloatingButton";
import InstallAppButton from "@/components/InstallAppButton";
import TrustBadges from "@/components/home/TrustBadges";
import { BETA_FREE, OFFICIAL_PRICE_LABEL } from "@/lib/betaConfig";

const TRUST_BADGES = [
  { icon: "🏛️", text: "공식 정부 사이트 매일 새벽 크롤링" },
  { icon: "📚", text: "정부 부처 공문 팩트체크" },
  { icon: "🎯", text: "내 사업장에 가능한 것만 매칭" },
  { icon: "🗂️", text: "정책자금·지원금·바우처·인증" },
  { icon: "📝", text: "신청 방법·필요 서류·순서까지 안내" },
  { icon: "🚫", text: "안내 및 추천 · 행정 대행 없음" },
  { icon: "💳", text: "부담 없는 1회성 결제" },
];

const VALUES = [
  "어떤 자금·지원사업이 나에게 맞는지",
  "어디서 어떻게 신청하는지",
  "서류는 뭐가 필요한지",
  "지원사업을 신청하는 순서까지",
];

const FAQS = [
  {
    q: "Q1. 자동결제인가요?",
    a: (
      <>
        아닙니다. 1회성 결제입니다.
        <br />
        자동으로 재결제되지 않습니다.
      </>
    ),
  },
  {
    q: "Q2. 행정대행 신청해주시나요?",
    a: (
      <>
        아닙니다. 저희는 매칭 플랫폼입니다.
        <br />
        서류 발급과 신청은 이용자님이 직접 하십니다.
        <br />
        저희는 신청 가능한 사업을 추천·안내해 드립니다.
      </>
    ),
  },
  {
    q: "Q3. 승인을 보장하나요?",
    a: (
      <>
        아닙니다. 저희는 추천·안내 서비스입니다.
        <br />
        승인 여부는 정부 기관 심사로 결정됩니다.
        <br />
        승인을 보장하지 않습니다.
      </>
    ),
  },
  {
    q: "Q4. 승인후 추가 수수료가 있나요?",
    a: (
      <>
        없습니다.
        <br />
        서비스 이용료 외 추가 수수료는 없습니다.
      </>
    ),
  },
  {
    q: "Q5. 환불되나요?",
    a: (
      <>
        열람 전에는 7일 이내 100% 환불됩니다.
        <br />
        전자상거래법을 따릅니다.
        <br />
        단, 열람 후에는 관련 법령에 따라 환불이 불가합니다.
      </>
    ),
  },
  {
    q: "Q6. 어떤 지원사업까지 안내되나요?",
    a: (
      <>
        정부 지원금·바우처·정책자금·감면제도를 안내합니다.
        <br />
        K-Startup, 창업패키지, 지자체 사업도 포함합니다.
        <br />
        국내 모든 정부지원사업 안내를 목표로 합니다.
      </>
    ),
  },
  {
    q: "Q7. 정보는 얼마나 최신인가요?",
    a: (
      <>
        매일 정부 공식 사이트를 자동으로 확인합니다.
        <br />
        최신 공고 및 공고를 팩트체크 후 반영합니다.
      </>
    ),
  },
];

export default function Home() {
  return (
    <PageShell pageKey="home">
      <ScrollReveal />
      <Header />
      <main>
        {/* 히어로 */}
        <section
          id="hero-section"
          className="relative overflow-hidden px-4 pb-5 pt-6 sm:pb-9 sm:pt-12"
        >
          <div className="hero-glass mx-auto max-w-3xl rounded-3xl px-5 py-8 text-center animate-fadeUp sm:px-10 sm:py-12">
            {/* 상단 배지 (노란색 서비스 소개 배지) */}
            <div className="mb-5 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <Editable
                id="hero-badge"
                as="div"
                className="inline-block rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-dark sm:text-base"
              >
                정부지원사업 AI 통합 매칭 플랫폼
              </Editable>
            </div>
            <Editable
              id="hero-headline-v2"
              as="h1"
              className="whitespace-nowrap text-[19px] font-black leading-[1.4] text-brand-dark xs:text-[23px] sm:whitespace-normal sm:text-[38px] sm:leading-tight"
            >
              AI를 활용해 내 사업장에 알맞은
              <br />
              <span className="text-brand-red">정부지원사업</span>을 찾아드립니다.
            </Editable>

            <Editable
              id="hero-sub"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-[13px] leading-relaxed text-brand-gray sm:text-base sm:leading-relaxed"
            >
              복잡한 정부지원사업, 이제 직접 찾지 마세요.
              <br />
              AI가 찾아서 신청까지 안내해 드립니다.
            </Editable>

            {/* 오픈 베타 무료 앵커링 — 오픈 베타 기간 전부 0원으로 통일 (대표님 요청: '원래 9,900원' 삭제) */}
            {BETA_FREE && (
              <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border-2 border-brand-red/30 bg-brand-red/5 px-5 py-3">
                <span className="text-base font-black text-brand-red sm:text-lg">
                  오픈 베타 기간 전부 0원
                </span>
              </div>
            )}

            {/* 핵심 혜택 — 가로 컴팩트 배지 */}
            <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
              {["맞춤 AI 매칭", "신청 가능 사업만", "서류·신청까지 안내"].map(
                (t, i) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm sm:text-sm"
                  >
                    <span className="text-brand-orange">✓</span>
                    <Editable id={`hero-check-${i}`} as="span">
                      {t}
                    </Editable>
                  </li>
                )
              )}
            </ul>

            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Editable
                id="hero-cta-primary"
                as="a"
                href="/diagnosis"
                className="btn-brand w-full rounded-full px-8 py-3.5 text-base animate-pulseGlow sm:w-auto sm:py-4 sm:text-lg"
              >
                {BETA_FREE ? "지금 무료로 진단 시작하기" : "무료 진단 시작하기"}
              </Editable>
              <Editable
                id="hero-cta-secondary"
                as="a"
                href={BETA_FREE ? "#result-sample-section" : "/pricing"}
                className="btn-outline w-full rounded-full px-8 py-3.5 text-base sm:w-auto sm:py-4 sm:text-lg"
              >
                {BETA_FREE ? "무엇을 알려주나요?" : "상품 자세히 보기"}
              </Editable>
            </div>

            {/* 면책 고지 — 광고 심사/표시광고법 대응 (대표님 요청) */}
            <Editable
              id="hero-disclaimer"
              as="p"
              className="mx-auto mt-5 max-w-xl break-keep text-[11px] leading-relaxed text-brand-gray/70 sm:text-xs"
            >
              본 서비스는 정부지원사업을 안내·매칭하는 플랫폼이며, 지원사업의 승인·선정·수령을 보장하지 않습니다.
            </Editable>
          </div>
        </section>

        {/* 신뢰 배지 + 핵심 강점 (7칸 통합) */}
        {/* 가치 제안 4단계 — (대표님 요청) 7네모칸 섹션보다 위로 배치 */}
        {/* 구간 구분 — 얇은 회색 가로줄 */}
        <div className="section-divider" aria-hidden="true" />
        <section className="bg-gray-50 px-4 py-7 sm:py-11">
          <div className="reveal mx-auto max-w-4xl text-center">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                🎯 서비스 안내
              </span>
              <Editable
                id="home-value-title-v2"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                {BETA_FREE ? (
                  <>오픈 베타 기간 전부 무료로 알려드립니다.</>
                ) : (
                  <>
                    <span className="text-brand-red">{OFFICIAL_PRICE_LABEL}</span>으로 이 모든 걸 알려드립니다.
                  </>
                )}
              </Editable>
              <Editable
                id="home-value-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                {BETA_FREE ? (
                  <>
                    복잡한 정부지원사업을 정리해 드립니다.
                    <br />
                    오픈 베타 기간 동안 무엇을·어디서·어떻게까지 <b className="text-brand-dark">한 푼도 안 받고</b> 전부 알려드립니다.
                  </>
                ) : (
                  <>
                    복잡한 정부지원사업을 정리해 드립니다.
                    <br />
                    무엇을·어디서·어떻게까지 한 번에 알려드립니다.
                  </>
                )}
              </Editable>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="hover-lift flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-card"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                    ✓
                  </span>
                  <Editable
                    id={`home-value-${i}`}
                    as="span"
                    className="break-keep text-sm font-semibold text-brand-dark sm:text-base"
                  >
                    {v}
                  </Editable>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 신뢰 배지 7칸 — (대표님 요청) 서비스 안내 섹션보다 아래로 배치 */}
        <section className="border-y border-gray-100 bg-gray-50 px-4 py-7 sm:py-10">
          <div className="reveal mx-auto max-w-4xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <Editable
                id="home-compare-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                아직 몰라서 못 받고 있는 정부지원사업
              </Editable>
              <Editable
                id="home-compare-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm leading-relaxed text-brand-gray"
              >
                내 사업장이 받을 수 있는 <b className="text-brand-dark">모든 정부지원사업</b>을 AI가 한 번에 찾아드립니다.
              </Editable>
            </div>
            <TrustBadges badges={TRUST_BADGES} />
          </div>
        </section>

        {/* AI 매칭 결과 예시본 — 실제 결과 화면(대시보드)과 동일한 구조로 재현 */}
        <section id="result-sample-section" className="scroll-mt-20 border-y border-gray-100 bg-white px-4 py-7 sm:scroll-mt-24 sm:py-11">
          <div className="reveal mx-auto max-w-3xl">
            {/* (대표님 요청) 상단 '실제 결과 화면 예시 / 진단 한 번으로… / 절감 4칸' 통합 박스 삭제 */}

            {/* 상단 안내 블록 — 하단과 문구·구성 완전 통일 (대표님 요청: 상단이 너무 짧아 하단처럼 길게)
                🔒 안내 → CTA → 오픈베타 안내 → * 예시 주석 순서 */}
            <div className="mb-6 flex flex-col items-center px-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-2xl text-white shadow-xl animate-pulseGlow">
                🔒
              </span>
              <p className="mt-3 break-keep text-center text-base font-extrabold text-brand-dark sm:text-lg">
                신청 사이트·필요 서류·승인 전략은 결과 페이지에서 전부 열립니다
              </p>
              <p className="mt-1.5 break-keep text-center text-[13px] font-semibold leading-relaxed text-brand-gray">
                위 목록은 <b className="text-brand-dark">맛보기</b>입니다.
                진단을 마치면 <b className="text-brand-orange">내 사업장에 맞는 기관·제도·감면 전체와
                신청 방법</b>을 한 번에 확인할 수 있습니다.
              </p>
            </div>
            {/* 상단 CTA — 예시를 보기 '전'에도 바로 진단으로 유도 (상·하단 문구·스타일 통일: 투명 박스 + 주황 테두리, 대표님 요청) */}
            <Editable
              id="home-sample-cta-top"
              as="a"
              href="/diagnosis"
              className="mx-auto block w-full rounded-full border-2 border-brand-orange cta-glass py-4 text-center text-base font-bold text-brand-orange transition hover:bg-brand-orange/10 sm:text-lg animate-pulseGlow"
            >
              {BETA_FREE
                ? "🎁 지금 무료로 내 결과 전부 확인하기"
                : "내 결과 전체 확인하기"}
            </Editable>
            <p className="mx-auto mt-2.5 max-w-md break-keep text-center text-[12px] font-semibold text-brand-dark">
              {BETA_FREE ? (
                <>
                  🔓 오픈 베타 기간 <b className="text-brand-red">전부 무료</b>로 모든 정보를 확인할 수 있습니다.
                </>
              ) : (
                <>
                  🔓 결제 시 <b className="text-brand-red">모든 정보(신청 사이트·서류·전략)</b>를 확인할 수 있습니다.
                </>
              )}
            </p>
            <p className="mb-6 mt-2 text-center text-xs text-brand-gray/70">
              * 위 화면은 실제 결과 화면을 재구성한 예시입니다.
              실제 결과는 사업장 정보에 따라 달라집니다.
            </p>

            {/* 실제 대시보드 목업(그대로 재현) — 노트북 프레임 안에 담아 '화면'처럼 */}
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                {/* 브라우저 상단 바 */}
                <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 truncate text-[11px] text-gray-400">
                    모두의사업친구 · 내 사업장 진단 결과
                  </span>
                </div>

                {/* 진단 완료 배너 — 실제 결과창 상단 히어로와 동일한 구조·문구·순서로 재현.
                    ★ 배지 4종·순서(🏅정부지원제도 → 💳정책금융상품 → 💎추가 감면 혜택 → 📢그 외 지원사업)를
                      실제 matching-preview 히어로와 100% 일치시킴 · 합계 24 = 5+6+8+5 */}
                <div className="p-4 pb-0 sm:p-6 sm:pb-0">
                  <div className="rounded-3xl border-2 border-brand-orange/60 bg-gradient-to-r from-brand-orange/10 to-white p-3.5 shadow-[0_10px_30px_rgba(255,140,0,0.15)] sm:p-4">
                    <p className="break-keep text-center text-[12px] font-bold leading-snug text-brand-dark/80 sm:text-sm">
                      🎉 진단 완료! <b className="font-black text-brand-orange">지금 신청해볼 수 있는 것들</b>이에요.
                    </p>
                    {/* 가로형: 왼쪽 큰 숫자 + 오른쪽 세로 요약 (실제 결과창 히어로와 동일 구조) */}
                    <div className="mt-2.5 flex flex-row items-stretch gap-2.5 sm:gap-4">
                      {/* 왼쪽: 총 개수 큰 숫자 */}
                      <div className="flex shrink-0 flex-col items-center justify-center border-r border-brand-orange/25 pr-2.5 sm:pr-4">
                        <span className="break-keep text-[10px] font-bold leading-tight text-brand-dark/70 sm:text-xs">
                          받을 수 있는
                          <br />
                          지원사업
                        </span>
                        <span className="mt-0.5 flex items-end gap-0.5">
                          <b className="text-4xl font-black leading-none text-brand-orange sm:text-5xl">24</b>
                          <b className="pb-0.5 text-lg font-extrabold text-brand-orange sm:text-xl">개</b>
                        </span>
                        <span className="mt-0.5 break-keep text-[9px] font-bold text-brand-dark/50 sm:text-[10px]">
                          매칭 완료 🎉
                        </span>
                      </div>
                      {/* 오른쪽: 세로 요약 배지 4종 — 실제 결과창 순서와 동일 */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        {[
                          { icon: "🏅", l: "정부지원제도", n: "5건" },
                          { icon: "💳", l: "정책금융상품", n: "6건" },
                          { icon: "💎", l: "추가 감면 혜택", n: "8건" },
                          { icon: "📢", l: "그 외 지원사업", n: "5건" },
                        ].map((s) => (
                          <span
                            key={s.l}
                            className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-[11px] font-bold text-brand-dark sm:text-sm"
                          >
                            {s.icon}{" "}
                            <span className="whitespace-nowrap text-brand-dark/70">{s.l}</span>
                            <b className="ml-auto text-[13px] text-brand-orange sm:text-base">{s.n}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 결과 본문 — 실제 결과창 AccordionCard(흰 배경·얇은 테두리·검정 제목·부제·우측 원형 화살표)와
                    동일한 겉모양으로 재현. 순서도 실제와 100% 일치: 🏅정부지원제도 → 💳정책금융상품 → 💎추가 감면 혜택.
                    (홈은 정적 목업이라 details/summary로 접기 구현 — 겉보기만 실제 카드와 동일하게 맞춤) */}
                <div className="space-y-3 p-4 text-left sm:p-6">

                  {/* ① 🏅 신청 가능한 정부지원제도 (실제 결과창 최상단 카드) — 기본 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">🏅</span>
                          <span className="min-w-0 break-keep">신청 가능한 정부지원제도</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          지금 신청할 수 있는 제도예요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    {/* ✅ 신청 3스텝 미니 가이드 — 실제 결과창과 동일 */}
                    <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
                      <p className="mb-1.5 break-keep text-[11px] font-extrabold text-brand-green">
                        ✅ 표시된 곳, 이렇게 신청하시면 됩니다
                      </p>
                      <ol className="space-y-1.5">
                        {[
                          "✅ 신청 대상인 제도의 카드를 눌러 상세 페이지로 들어가세요.",
                          "상세 페이지의 필요서류·소요기간을 확인하고 서류를 준비하세요.",
                          "공식 신청 사이트/연락처로 접수하시면 됩니다.",
                        ].map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5 break-keep text-[11px] leading-relaxed text-brand-dark/80">
                            <span className="mt-px shrink-0 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {/* 개별 제도 카드 — 실제 결과창 카드(흰 배경·얇은 테두리·제목+뱃지→안내→설명→회색 신청방법→버튼 2종) */}
                    <div className={`mt-4 space-y-3 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { icon: "💳", t: "소상공인 경영안정 바우처", d: "사업체당 25만원. 공과금·4대보험료·연료비 등 9개 항목에 사용 가능.", hook: "연매출 약 1억400만원 미만이면 온라인 신청만으로 지급됩니다." },
                        { icon: "💳", t: "소상공인 부담경감 크레딧", d: "50만원 상당. 공공요금(전기·가스·수도)과 4대보험료 납부에 사용.", hook: "연매출 3억원 이하면 카드 연동으로 간편 신청됩니다." },
                        { icon: "🧑‍💼", t: "두루누리 사회보험료 지원", d: "신규 채용 근로자·사업주의 국민연금·고용보험료 최대 80% 지원.", hook: "근로자 10명 미만 사업장은 4대보험 신고 시 함께 신청돼 사실상 자동입니다." },
                      ].map((g, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="text-base">{g.icon}</span>
                            <span className="text-[14px] font-extrabold text-brand-dark">{g.t}</span>
                            <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">신청 가능</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[12px] font-semibold leading-relaxed text-brand-green">
                            💡 {g.hook}
                          </p>
                          <p className="mt-1 break-keep text-[12px] leading-relaxed text-brand-gray">{g.d}</p>
                          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
                            <p className="break-keep text-[12px] leading-relaxed text-brand-dark/80">
                              <span className="font-bold text-brand-dark">📝 신청방법 </span>
                              <span className="align-middle">🔒 ●●●●●●● 결과 페이지에서 공개</span>
                            </p>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg bg-brand-dark px-3 py-2 text-[11px] font-bold text-white">🔒 이 상품 신청하러 가기 →</span>
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[11px] font-bold text-brand-orange">상세 · 소요기간 · 연락처 →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </details>

                  {/* ② 💳 이용 가능한 정책금융상품 (실제 결과창 두 번째 카드) — 예시라 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">💳</span>
                          <span className="min-w-0 break-keep">이용 가능한 정책금융상품</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          낮은 금리로 받을 수 있는 자금이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    <div className={`mt-4 space-y-3 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { inst: "중소벤처기업진흥공단", cat: "정책자금", catCls: "bg-blue-100 text-blue-700", prod: "신성장기반자금 · 신시장진출자금", hook: "직접대출 최대 60억, 금리 2%대 · 시설/운전자금 모두 가능" },
                        { inst: "소상공인시장진흥공단", cat: "정책자금", catCls: "bg-blue-100 text-blue-700", prod: "혁신성장촉진자금 · 강한소상공인 · 대환대출", hook: "저금리 정책자금으로 고금리 대출 갈아타기(대환) 대상" },
                        { inst: "신용보증기금 / 기술보증기금 / 무역보험공사 / 신용보증재단", cat: "보증서", catCls: "bg-indigo-100 text-indigo-700", prod: "보증서 발급 → 은행 대리대출", hook: "담보 없이 보증서로 은행 대출 실행 가능" },
                      ].map((m, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-brand-dark">{m.inst}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.catCls}`}>{m.cat}</span>
                            <span className="shrink-0 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">✅ 신청 가능</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] text-brand-gray">{m.prod}</p>
                          <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">💡 {m.hook}</p>
                          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                            <p className="break-keep text-[11px] leading-relaxed text-brand-dark/80">
                              <span className="font-bold text-brand-dark">신청방법 </span>
                              <span className="align-middle">🔒 ●●●●●●● 결과 페이지에서 공개</span>
                            </p>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg bg-brand-dark px-3 py-2 text-[11px] font-bold text-white">🔒 이 상품 신청하러 가기 →</span>
                            <span className="inline-flex w-fit items-center gap-1.5 break-keep rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[11px] font-bold text-brand-orange">🔒 상세 · 승인 소요기간 · 연락처 →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </details>

                  {/* ③ 💎 챙기면 좋은 추가 감면 혜택 (실제 결과창 세 번째 카드) — 예시라 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">💎</span>
                          <span className="min-w-0 break-keep">챙기면 좋은 추가 감면 혜택</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          세금을 아낄 수 있는 혜택이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    <div className={`mt-4 space-y-2.5 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { t: "노란우산공제 소득공제", c: "소득공제", d: "납입액을 연 최대 600만원까지 소득공제. 폐업 시 퇴직금처럼 목돈 회수.", hook: "가입만 하면 자동 적용돼 심사 탈락이 없습니다. 자영업자 필수." },
                        { t: "창업중소기업 세액감면", c: "세액감면", d: "창업 후 5년간 소득세·법인세를 50~100% 감면(청년·수도권 외 100%).", hook: "요건만 맞으면 세무신고 때 자동 적용, 별도 경쟁이 없습니다." },
                        { t: "중소기업 특별세액감면", c: "세액감면", d: "업종·지역·규모별로 소득세·법인세를 5~30% 감면하는 상시형 감면.", hook: "창업감면 기간이 끝난 사업자도 계속 받을 수 있습니다." },
                        { t: "카드수수료 우대·감면", c: "수수료", d: "연매출 30억원 이하 영세·중소가맹점 우대수수료율 적용.", hook: "매출 구간만 맞으면 별도 신청 없이 자동 적용됩니다." },
                      ].map((b, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="break-keep text-sm font-extrabold text-brand-dark">💰 {b.t}</span>
                            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{b.c}</span>
                          </div>
                          <p className="mt-1.5 break-keep text-[11px] text-brand-gray">{b.d}</p>
                          <p className="mt-1 break-keep text-[11px] font-semibold text-brand-orange">💡 {b.hook}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 break-keep rounded-xl bg-brand-yellow/40 px-3 py-2 text-center text-[12px] font-bold text-brand-dark">
                      ✨ 요건에 맞게 챙기면 첫 해 연 최대 700만원 절감 가능
                    </p>
                    </div>
                  </details>

                  {/* ④ 📢 추가적인 그 외 정부지원사업 (실제 결과창 네 번째 카드 · 기업마당 실공고) — 예시라 펼침 */}
                  <details open className="result-accordion group overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
                          <span className="shrink-0">📢</span>
                          <span className="min-w-0 break-keep">추가적인 그 외 정부지원사업</span>
                        </span>
                        <span className="mt-1 block break-keep text-[12px] leading-relaxed text-brand-dark/50">
                          그 외 정부지원사업이에요
                        </span>
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-200 group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                    {/* 실제 결과창 공고 카드(제목+지원규모 태그 → 🗓️신청기간 배지 → 🏛️기관·대상 + 원문 버튼)와 동일 */}
                    <div className={`mt-4 space-y-3 ${BETA_FREE ? "" : "preview-film"}`} aria-hidden={BETA_FREE ? undefined : true}>
                      {[
                        { title: "2026년 스마트 제조혁신 지원사업(스마트공장 구축)", scale: "최대 6천만원", deadline: "2026년 통합공고 진행", org: "중소벤처기업부", target: "제조 중소기업" },
                        { title: "2026년 인천 소상공인 경영환경개선 지원사업", scale: "항목별 최대 250만원", deadline: "예산 소진 시 마감", org: "인천광역시", target: "인천 소상공인" },
                        { title: "2026년 수출바우처 사업(수출지원기반활용)", scale: "최대 1억원", deadline: "연중 차수별 모집", org: "산업통상자원부", target: "수출 희망 중소기업" },
                      ].map((it, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="break-keep text-[14px] font-extrabold leading-snug text-brand-dark">{it.title}</span>
                            <span className="shrink-0 break-keep rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">{it.scale}</span>
                          </div>
                          <span className="mt-2 inline-block shrink-0 break-keep rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-dark">🗓️ {it.deadline}</span>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-[12px] leading-relaxed text-brand-gray">
                              🏛️ {it.org}<span className="mx-1.5 text-brand-dark/25">·</span>
                              <span className="font-bold text-brand-dark/70">대상 </span>{it.target}
                            </p>
                            <span className="shrink-0 break-keep rounded-lg bg-brand-orange px-3 py-2 text-[11px] font-bold text-white">공고 원문 보러 가기 →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </details>
                </div>

                {/* 🔖 대표님들이 알아두면 좋은 정부 사이트 배너 — 목업 카드 안 최하단(실제 결과창과 동일, 대표님 요청) */}
                <a
                  href="/sites"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark bg-brand-dark px-5 py-3.5 shadow-card transition hover:opacity-90"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 break-keep text-[16px] font-extrabold leading-snug text-white">
                      🔖 대표님들이 알아두면 좋은 정부 사이트
                    </span>
                    <span className="mt-1 block break-keep text-[12px] leading-relaxed text-white/60">
                      알아두면 좋은 정부 기관 공식 사이트예요
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-yellow px-4 py-2 text-sm font-extrabold text-brand-dark">
                    사이트 바로가기
                  </span>
                </a>

              </div>

              {/* 하단 안내 — '핵심 상세는 결과 페이지에서 전부' 유도 (4개 모두 펼침이라 잠금 페이드는 제거) */}
              <div className="mt-6 flex flex-col items-center px-4 pb-2">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-2xl text-white shadow-xl animate-pulseGlow">
                  🔒
                </span>
                <p className="mt-3 break-keep text-center text-base font-extrabold text-brand-dark sm:text-lg">
                  신청 사이트·필요 서류·승인 전략은 결과 페이지에서 전부 열립니다
                </p>
                <p className="mt-1.5 break-keep text-center text-[13px] font-semibold leading-relaxed text-brand-gray">
                  위 목록은 <b className="text-brand-dark">맛보기</b>입니다.
                  진단을 마치면 <b className="text-brand-orange">내 사업장에 맞는 기관·제도·감면 전체와
                  신청 방법</b>을 한 번에 확인할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 하단 CTA (상단 CTA와 쌍 · 투명 박스 + 주황 테두리로 통일) */}
            <Editable
              id="home-sample-cta"
              as="a"
              href="/diagnosis"
              className="mx-auto mt-5 block w-full rounded-full border-2 border-brand-orange cta-glass py-4 text-center text-base font-bold text-brand-orange transition hover:bg-brand-orange/10 sm:text-lg animate-pulseGlow"
            >
              {BETA_FREE
                ? "🎁 지금 무료로 내 결과 전부 확인하기"
                : "내 결과 전체 확인하기"}
            </Editable>
            {/* 결제 유도 안내 — 대표님 요청: '결제 시 모든 정보를 확인할 수 있습니다' */}
            <p className="mx-auto mt-2.5 max-w-md break-keep text-center text-[12px] font-semibold text-brand-dark">
              {BETA_FREE ? (
                <>
                  🔓 오픈 베타 기간 <b className="text-brand-red">전부 무료</b>로 모든 정보를 확인할 수 있습니다.
                </>
              ) : (
                <>
                  🔓 결제 시 <b className="text-brand-red">모든 정보(신청 사이트·서류·전략)</b>를 확인할 수 있습니다.
                </>
              )}
            </p>
            <p className="mt-2 text-center text-xs text-brand-gray/70">
              * 위 화면은 실제 결과 화면을 재구성한 예시입니다.
              실제 결과는 사업장 정보에 따라 달라집니다.
            </p>
          </div>
        </section>

        {/* 가격표 */}
        <section
          id="pricing-section"
          className="scroll-mt-20 px-4 py-7 sm:scroll-mt-24 sm:py-11"
        >
          <div className="reveal mx-auto max-w-5xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-dark/5 px-4 py-1.5 text-xs font-bold text-brand-dark sm:text-sm">
                💳 서비스 이용료
              </span>
              <Editable
                id="home-pricing-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                AI 진단 리포트
              </Editable>
              <Editable
                id="home-pricing-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                {BETA_FREE ? (
                  <>오픈 베타 기간 전부 무료로 이용하실 수 있습니다.</>
                ) : (
                  <>1회성 결제이며 월 구독 결제가 아닙니다.</>
                )}
              </Editable>
            </div>
            <div className="mt-6">
              <PricingCards prefix="home" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        {/* 구간 구분 — 얇은 회색 가로줄 */}
        <div className="section-divider" aria-hidden="true" />
        {/* 섹션 상하 여백 — 하단 여백 축소(대표님 요청) */}
        <section className="bg-gray-50 px-4 py-6 sm:py-8">
          <div className="reveal mx-auto max-w-3xl">
            <div className="section-title-glass mx-auto flex flex-col items-center text-center">
              <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold text-brand-orange sm:text-sm">
                💬 자주 묻는 질문
              </span>
              <Editable
                id="home-faq-title"
                as="h2"
                className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl"
              >
                궁금한 점, 미리 확인하세요
              </Editable>
              <Editable
                id="home-faq-sub"
                as="p"
                className="mx-auto mt-3 max-w-xl break-keep text-sm text-brand-gray"
              >
                결제 전 가장 많이 묻는 질문들을 모았습니다.
              </Editable>
            </div>
            <div className="mt-6 space-y-3">
              {FAQS.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition open:border-brand-orange/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <Editable
                      id={`home-faq-q-${i}`}
                      as="span"
                      className="break-keep text-sm font-bold text-brand-dark sm:text-base"
                    >
                      {f.q}
                    </Editable>
                    <span className="shrink-0 text-brand-orange transition group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <Editable
                    id={`home-faq-a-${i}`}
                    as="p"
                    className="mt-3 break-keep text-sm leading-relaxed text-brand-gray"
                  >
                    {f.a}
                  </Editable>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 하단 CTA — 후기란 하단과 동일한 어두운 카드 디자인으로 통일 (대표님 요청) */}
        <section className="px-4 py-6 sm:py-8">
          <div className="reveal hover-lift mx-auto max-w-2xl rounded-3xl bg-brand-dark p-6 text-center shadow-card sm:p-8">
            <Editable
              id="home-cta-title"
              as="h2"
              className="break-keep text-xl font-black text-white sm:text-2xl"
            >
              {BETA_FREE
                ? "오픈 베타 기간, 지금은 전부 무료입니다"
                : "지금 무료로 진단받아 보세요"}
            </Editable>
            <Editable
              id="home-cta-sub"
              as="p"
              className="mx-auto mt-3 max-w-md break-keep text-sm leading-relaxed text-gray-300"
            >
              {BETA_FREE ? (
                <>
                  1분이면 내 사업장에 알맞은 정부지원사업을 전부 확인할 수 있습니다.
                </>
              ) : (
                <>1분이면 내 사업장에 알맞은 정부지원사업을 찾을 수 있습니다.</>
              )}
            </Editable>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* 왼쪽 — 무료 진단 시작하기 (주 버튼, 빨간색) */}
              <a
                id="home-cta-button"
                href="/diagnosis"
                className="btn-red w-full rounded-full px-8 py-3.5 text-base font-bold sm:w-auto"
              >
                {BETA_FREE ? "무료로 진단 시작하기" : "무료 진단 시작하기"}
              </a>
              {/* 오른쪽 — 1:1 채널톡 상담하기 (보조 버튼, 흰색 아웃라인) */}
              <a
                id="home-cta-kakao"
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full border-2 border-white bg-transparent px-8 py-3.5 text-base font-bold text-white transition hover:bg-white/10 sm:w-auto"
              >
                💬 1:1 채널톡 상담하기
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {/* 오른쪽 하단 고정 — 앱 설치 버튼(위) + 카카오톡 1:1 상담 버튼(아래) */}
      <InstallAppButton />
      <KakaoFloatingButton />
    </PageShell>
  );
}
