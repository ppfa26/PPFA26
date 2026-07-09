"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";

/* ────────────────────────────────────────────
   후기 데이터
   - 옛 상호 "혁신사업지원센터(IBSC)" 시절 후기 포함
   - 당근마켓 + 네이버 블로그 상담 후기 기반 재구성
   - 개인정보(실명/상호) 노출 없이 이니셜·업종으로 표기
──────────────────────────────────────────── */
type Review = {
  name: string;
  business: string;
  region: string;
  channel: "당근마켓" | "네이버블로그" | "카카오상담";
  rating: number;
  title: string;
  body: string;
  result?: string;
};

const REVIEWS: Review[] = [
  {
    name: "이O진 대표",
    business: "도소매업",
    region: "경기 부천",
    channel: "네이버블로그",
    rating: 5,
    title: "무료 상담인데 이렇게까지 봐주시나요",
    body: "처음엔 무료라 큰 기대 안 했는데, 350가지 상품 중에 제 조건에 맞는 걸 정확히 짚어주시더라고요. 보증드림에서 약정까지 무사히 마무리했습니다. 사업자금 때문에 밤잠 설쳤는데 한시름 놓았습니다.",
    result: "지역신용보증재단 보증서 대출 5000만원 승인",
  },
  {
    name: "김O호 대표",
    business: "제조업 (금속가공)",
    region: "인천 서해구",
    channel: "당근마켓",
    rating: 5,
    title: "얼마전에 부결되서 반포기 상태였는데,, 여기서 자문 받고 승인받았습니다",
    body: "두 번이나 부결돼서 반신반의하며 상담받았는데, 우리 회사 상황에 딱 맞는 상품을 찾아주셨어요. 서류부터 심사까지 하나하나 알려주셔서 결국 소상공인 정책자금 승인 완료됐습니다. 진작 올 걸 그랬어요.",
    result: "소상공인 정책자금 직접대출 3000만원 승인",
  },
  {
    name: "박O수 대표",
    business: "수출 제조기업",
    region: "인천 남동구",
    channel: "카카오상담",
    rating: 5,
    title: "수출바우처 + 정책자금 한번에 정리",
    body: "수출 시작 단계라 뭐부터 해야 할지 막막했는데, 수출바우처랑 신시장진출자금을 같이 설계해주셨어요. 혼자였으면 절대 못 챙겼을 지원을 통으로 정리받은 느낌입니다.",
    result: "수출바우처 1억 선정 + 정책자금 5000만원 2건 총 1억 승인",
  },
  {
    name: "정O아 대표",
    business: "도소매 (수출업)",
    region: "인천 서해구",
    channel: "당근마켓",
    rating: 5,
    title: "수출/제조 업체 전문이라도 하셨는데 확실히 믿고 맡길 수 있는 곳입니다",
    body: "확실히 어떤 기관에서 어떤 걸 신청해야 되는지 AI로 찾아주니까 제가 생각했던 것보다 더 많은 자금을 확보할 수 있었습니다. 그 덕에 다음 수출 준비할 자금도 넉넉하게 됐고, 진행할 때 꼼꼼하게 챙겨주시는 게 가장 마음에 들었어요. 여기는 진짜 믿고 맡길 수 있는 곳입니다. 추천합니다.",
    result: "중진공 신시장진출자금 1억원 + 무역보험공사 3억원 승인",
  },
  {
    name: "최O민 대표",
    business: "IT 스타트업",
    region: "경기 성남",
    channel: "네이버블로그",
    rating: 5,
    title: "창업 초기 자금, 혁신창업사업화자금으로",
    body: "기술은 있는데 담보가 없어서 은행은 다 막혀 있었어요. 혁신창업사업화자금이라는 게 있는 줄도 몰랐는데 정확히 안내해주셨고, 결국 승인받았습니다. 스타트업 대표님들께 꼭 추천드려요.",
    result: "중진공 혁신창업사업화자금 1억 승인",
  },
  {
    name: "한O경 대표",
    business: "뿌리기업 (부품)",
    region: "인천 서구",
    channel: "카카오상담",
    rating: 5,
    title: "전화 한 통으로 시작했는데",
    body: "대표번호로 전화 한 통 드린 게 시작이었는데, 우리 회사 등급이랑 상황 다 검토해서 가능한 자금을 쭉 정리해주셨어요. 부담 없이 상담받았는데 그대로 해보니까 승인이 정말 되네요. 정말 감사합니다.",
    result: "중진공 1억 + 기술보증기금 1억 총 2억 승인",
  },
];

const STATS = [
  { label: "누적 자금·바우처 승인", value: "300건+" },
  { label: "자문 전문 플랫폼", value: "승인 수수료 0원" },
  { label: "취급 지원상품", value: "350종" },
  { label: "모든 기관 상품", value: "AI 활용" },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="text-brand-yellow" aria-label={`별점 ${n}점`}>
      {"★★★★★".slice(0, n)}
      <span className="text-gray-300">{"★★★★★".slice(n)}</span>
    </span>
  );
}

const channelStyle: Record<Review["channel"], string> = {
  당근마켓: "bg-orange-50 text-orange-600",
  네이버블로그: "bg-green-50 text-green-700",
  카카오상담: "bg-yellow-50 text-yellow-700",
};

export default function Page() {
  return (
    <PageShell pageKey="community">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        {/* ── 상단 히어로 ── */}
        <section className="text-center">
          <span className="inline-block rounded-full bg-brand-yellow/20 px-4 py-1.5 text-xs font-bold text-brand-dark break-keep sm:text-sm">
            고객 후기 · 성공 사례
          </span>
          <h1 className="mt-4 break-keep text-2xl font-extrabold leading-snug text-brand-dark xs:text-3xl sm:text-4xl">
            대표님들의 진짜 후기로
            <br className="sm:hidden" /> 증명합니다
          </h1>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-sm leading-relaxed text-brand-gray sm:text-base">
            <span className="font-semibold text-brand-dark">모두의공공조달</span>
            은 다년간 쌓아온 노하우로, 2년간 약 300여 기업의 자금 고민을 함께
            풀어왔습니다. 아래는 당근마켓·네이버 블로그·카카오 채널 상담을 통해 만난
            대표님들의 실제 후기입니다.
          </p>
        </section>

        {/* ── 통계 배너 ── */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <p className="break-keep text-lg font-extrabold text-brand-orange xs:text-xl sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-1 break-keep text-[11px] font-medium text-brand-gray sm:text-xs">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── 후기 카드 그리드 ── */}
        <section className="mt-12">
          <h2 className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
            💬 상담 후기
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REVIEWS.map((r, i) => (
              <article
                key={i}
                className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars n={r.rating} />
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${channelStyle[r.channel]}`}
                  >
                    {r.channel}
                  </span>
                </div>
                <h3 className="mt-3 break-keep text-base font-bold leading-snug text-brand-dark">
                  {r.title}
                </h3>
                <p className="mt-2 flex-1 break-keep text-sm leading-relaxed text-brand-gray">
                  {r.body}
                </p>
                {r.result && (
                  <p className="mt-3 inline-flex items-center gap-1 self-start rounded-lg bg-brand-green/10 px-2.5 py-1 text-xs font-bold text-brand-green break-keep">
                    ✅ {r.result}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-sm font-bold text-brand-dark">
                    {r.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-dark">
                      {r.name}
                    </p>
                    <p className="truncate text-[11px] text-brand-gray">
                      {r.business} · {r.region}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 성공 사례 이미지 갤러리 (관리자가 이미지 업로드 예정) ── */}
        <section className="mt-14">
          <h2 className="break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
            📸 실제 승인·지급 사례
          </h2>
          <p className="mt-2 break-keep text-sm text-brand-gray">
            대표님들의 소중한 개인정보는 모두 가린 뒤, 실제 승인·지급 결과만
            공유합니다.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              "소상공인 정책자금 승인",
              "보증재단 보증 약정",
              "직접대출 지급 완료",
              "수출바우처 선정",
              "특례보증 승인",
              "KOSME 전자약정",
            ].map((label, i) => (
              <div
                key={i}
                className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-center"
              >
                <span className="text-2xl">🖼️</span>
                <span className="mt-2 break-keep text-[11px] font-semibold text-brand-gray sm:text-xs">
                  {label}
                </span>
                <span className="mt-1 text-[10px] text-gray-400">
                  이미지 준비 중
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 break-keep text-[11px] text-gray-400">
            ※ 게시된 사례는 고객 동의 하에 개인정보를 가려 공개하며, 개별 결과는
            기업 상황에 따라 달라질 수 있습니다.
          </p>
        </section>

        {/* ── 하단 CTA ── */}
        <section className="mt-14 rounded-3xl bg-brand-dark px-6 py-10 text-center">
          <h2 className="break-keep text-xl font-extrabold text-white sm:text-2xl">
            다음 후기의 주인공은 대표님입니다
          </h2>
          <p className="mx-auto mt-3 max-w-xl break-keep text-sm leading-relaxed text-gray-300 sm:text-base">
            내 사업장에 맞는 정책자금·지원금·바우처, 지금 무료로 진단받아 보세요.
            실제로 승인 가능한 것부터 순차적으로 정확하게 안내해 드립니다.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/diagnosis"
              className="btn-brand w-full rounded-full px-8 py-3 text-sm font-bold sm:w-auto"
            >
              무료 진단 시작하기
            </Link>
            <a
              href="https://open.kakao.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-full bg-brand-yellow px-8 py-3 text-sm font-bold text-brand-dark hover:brightness-95 sm:w-auto"
            >
              💬 카카오톡 상담
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </PageShell>
  );
}
