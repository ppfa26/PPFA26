"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";

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
    name: "정O아 대표",
    business: "도소매 (수출업)",
    region: "인천 서해구",
    channel: "카카오상담",
    rating: 5,
    title: "생각했던 것보다 훨씬 큰 자금을 확보했습니다",
    body: "어떤 기관에서 어떤 걸 신청해야 되는지 AI로 정확히 찾아주니까 제가 생각했던 것보다 훨씬 더 많은 자금을 확보할 수 있었습니다. 그 덕에 다음 수출 준비할 자금까지 넉넉하게 됐고, 진행할 때 하나하나 꼼꼼하게 챙겨주시는 게 가장 마음에 들었어요. 여기는 진짜 믿고 맡길 수 있는 곳입니다. 추천합니다.",
    result: "중진공 신시장진출자금 2억 + 무역보험공사 3억 총 5억 승인",
  },
  {
    name: "김O호 대표",
    business: "육류 포장처리업",
    region: "인천 서해구",
    channel: "당근마켓",
    rating: 5,
    title: "얼마전에 부결되서 반포기 상태였는데,, 여기서 자문 받고 승인받았습니다",
    body: "다른 데서 부결돼서 반포기 상태였는데, 우리 회사 상황에 딱 맞는 상품을 찾아주셨어요. 서류부터 심사까지 하나하나 알려주셔서 결국 정책자금 승인까지 완료됐습니다. 진작 올 걸 그랬어요. 억 단위 자금이 이렇게 풀릴 줄 몰랐습니다.",
    result: "소상공인 정책자금 + 지역신용보증재단 총 1억 승인",
  },
  {
    name: "박O수 대표",
    business: "수출 제조기업",
    region: "인천 남동구",
    channel: "카카오상담",
    rating: 5,
    title: "수출바우처 + 정책자금 한번에 정리",
    body: "수출 시작 단계라 뭐부터 해야 할지 막막했는데, 수출바우처랑 신시장진출자금을 같이 설계해주셨어요. 혼자였으면 절대 못 챙겼을 지원을 통으로 정리받은 느낌입니다.",
    result: "수출바우처 1억 선정 + 정책자금 1억 5천 승인",
  },
  {
    name: "이O진 대표",
    business: "도소매업",
    region: "경기 부천",
    channel: "네이버블로그",
    rating: 5,
    title: "무료 상담인데 이렇게까지 봐주시나요",
    body: "처음엔 무료라 큰 기대 안 했는데, 350가지 상품 중에 제 조건에 맞는 걸 정확히 짚어주시더라고요. 보증드림에서 약정까지 무사히 마무리했습니다. 사업자금 때문에 밤잠 설쳤는데 한시름 놓았습니다.",
    result: "지역신용보증재단 보증서 대출 1억 승인",
  },
  {
    name: "최O민 대표",
    business: "IT 스타트업",
    region: "경기 성남",
    channel: "네이버블로그",
    rating: 5,
    title: "창업 초기 자금, 혁신창업사업화자금으로",
    body: "기술은 있는데 담보가 없어서 은행은 다 막혀 있었어요. 혁신창업사업화자금이라는 게 있는 줄도 몰랐는데 정확히 안내해주셨고, 결국 승인받았습니다. 스타트업 대표님들께 꼭 추천드려요.",
    result: "중진공 혁신창업사업화자금 1억 5천 승인",
  },
  {
    name: "한O경 대표",
    business: "뿌리기업 (부품)",
    region: "인천 서해구",
    channel: "카카오상담",
    rating: 5,
    title: "부담 없이 상담받았는데 그대로 승인됐어요",
    body: "카카오톡으로 문의 한 번 드린 게 시작이었는데, 우리 회사 등급이랑 상황 다 검토해서 가능한 자금을 쭉 정리해주셨어요. 부담 없이 상담받았는데 그대로 해보니까 승인이 정말 되네요. 정말 감사합니다.",
    result: "중진공 1억 + 기술보증기금 1억 총 2억 승인",
  },
];

const STATS = [
  { label: "누적 자금·바우처 승인", value: "300건+" },
  { label: "자문 전문 플랫폼", value: "승인 수수료 0원" },
  { label: "취급 지원상품", value: "350종" },
  { label: "모든 기관 상품", value: "AI 활용" },
];

/* ────────────────────────────────────────────
   이용자 정부지원사업 승인후기
   - 정책자금 / 보증 / 바우처 / 인증(벤처·이노비즈·메인비즈 등)
   - 개인정보 비공개, 업종·지역·승인내용 중심으로 요약
──────────────────────────────────────────── */
type ApprovalKind = "정책자금" | "보증" | "바우처" | "인증" | "지원금";

type Approval = {
  kind: ApprovalKind;
  business: string;
  region: string;
  program: string; // 승인/선정된 사업·인증명
  agency: string; // 기관
  amount?: string; // 금액 (인증은 생략 가능)
  note?: string; // 한 줄 코멘트
};

const APPROVALS: Approval[] = [
  {
    kind: "정책자금",
    business: "문화콘텐츠 제조",
    region: "인천 서해구",
    program: "문화산업보증 · 신용보증한도",
    agency: "한국무역보험공사(K-SURE)",
    amount: "5억원",
    note: "최대 승인 사례",
  },
  {
    kind: "정책자금",
    business: "제조업",
    region: "인천 부평구",
    program: "혁신성장촉진자금 (운전)",
    agency: "소상공인시장진흥공단",
    amount: "2억원",
  },
  {
    kind: "바우처",
    business: "수출 제조기업",
    region: "인천 남동구",
    program: "수출바우처 선정",
    agency: "중소벤처기업진흥공단",
    amount: "1억원",
    note: "정책자금과 동시 설계",
  },
  {
    kind: "인증",
    business: "IT·소프트웨어",
    region: "인천 검단구",
    program: "벤처기업 인증",
    agency: "벤처확인기관",
    note: "R&D·세제감면·정책자금 우대 연계",
  },
  {
    kind: "인증",
    business: "부품 제조 (뿌리기업)",
    region: "인천 서해구",
    program: "이노비즈(INNO-BIZ) 인증",
    agency: "중소벤처기업부",
    note: "기술혁신형 중소기업 확인",
  },
  {
    kind: "인증",
    business: "도소매·유통",
    region: "인천 부평구",
    program: "메인비즈(MAIN-BIZ) 인증",
    agency: "중소벤처기업부",
    note: "경영혁신형 중소기업 확인",
  },
  {
    kind: "정책자금",
    business: "수출기업",
    region: "인천 남동구",
    program: "글로벌화 자금",
    agency: "중소벤처기업진흥공단",
    amount: "1.5억원",
  },
  {
    kind: "정책자금",
    business: "소상공인",
    region: "인천 검단구",
    program: "지역맞춤형 특례보증",
    agency: "신용보증재단",
    amount: "5,000만원",
  },
  {
    kind: "지원금",
    business: "일반 중소기업",
    region: "인천 부평구",
    program: "일반경영안정자금 (운전)",
    agency: "소상공인시장진흥공단",
    amount: "7,000만원",
  },
];

const approvalKindStyle: Record<ApprovalKind, string> = {
  정책자금: "bg-orange-50 text-brand-orange",
  보증: "bg-yellow-50 text-yellow-700",
  바우처: "bg-blue-50 text-blue-600",
  인증: "bg-purple-50 text-purple-600",
  지원금: "bg-green-50 text-brand-green",
};

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
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        {/* ── 상단 히어로 ── */}
        <section className="text-center">
          <span className="inline-block rounded-full border border-brand-yellow/50 bg-brand-yellow/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-orange break-keep sm:text-xs">
            Customer Stories · 고객 성공 사례
          </span>
          <h1 className="mt-5 break-keep text-2xl font-extrabold leading-tight tracking-tight text-brand-dark xs:text-3xl sm:text-[2.6rem]">
            대표님들의 진짜 후기로
            <br className="sm:hidden" /> 증명합니다
          </h1>
          <p className="mx-auto mt-5 max-w-xl break-keep text-sm leading-relaxed text-brand-gray sm:text-base">
            <span className="font-semibold text-brand-dark">모두의공공조달</span>
            은 2년간 약 300여 기업의 자금 고민을 함께 풀어왔습니다.
            <br className="hidden sm:block" />
            당근마켓·네이버 블로그·카카오 채널에서 만난 대표님들의 실제 이야기입니다.
          </p>
        </section>

        {/* ── 통계 바 (구분선형 미니멀) ── */}
        <section className="mx-auto mt-10 max-w-3xl">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm sm:grid-cols-4 sm:divide-y-0">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 py-6 text-center sm:px-3">
                <p className="whitespace-nowrap text-lg font-extrabold leading-none text-brand-dark xs:text-xl sm:text-2xl">
                  {s.value}
                </p>
                <p className="mt-1.5 whitespace-nowrap text-[10px] font-medium leading-none text-brand-gray xs:text-[11px] sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 이용자 정부지원사업 승인후기 ── */}
        <section className="mt-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
              Verified Records
            </p>
            <h2 className="mt-2 break-keep text-xl font-extrabold tracking-tight text-brand-dark sm:text-3xl">
              이용자 정부지원사업 승인후기
            </h2>
            <p className="mx-auto mt-3 max-w-2xl break-keep text-sm leading-relaxed text-brand-gray">
              정책자금·보증·바우처는 물론 벤처·이노비즈·메인비즈 등
              <br className="hidden sm:block" />
              각종 인증까지, 실제로 승인·선정된 사례를 요약해 공개합니다.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {APPROVALS.map((a, i) => (
              <article
                key={i}
                className="flex flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-yellow/40 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${approvalKindStyle[a.kind]}`}
                  >
                    {a.kind}
                  </span>
                  {a.amount && (
                    <span className="shrink-0 break-keep text-lg font-extrabold text-brand-dark">
                      {a.amount}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 break-keep text-[16px] font-bold leading-snug text-brand-dark">
                  {a.program}
                </h3>
                <p className="mt-1.5 break-keep text-xs text-brand-gray">
                  {a.agency}
                </p>
                {a.note && (
                  <p className="mt-3 break-keep text-[13px] leading-relaxed text-brand-gray">
                    {a.note}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-xs">
                    🏢
                  </span>
                  <p className="min-w-0 truncate text-[12px] text-brand-gray">
                    {a.business} · {a.region}
                  </p>
                  {a.amount && (
                    <span className="ml-auto shrink-0 rounded-md bg-brand-green/10 px-2 py-0.5 text-[11px] font-bold text-brand-green">
                      지급완료
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-2xl break-keep text-center text-[11px] leading-relaxed text-gray-400">
            ※ 게시된 사례는 고객 동의 하에 개인정보(상호·대표자·사업자번호 등)를
            가려 요약 공개하며, 개별 결과는 기업 상황·심사 기준에 따라 달라질 수
            있습니다.
          </p>

          {/* 승인후기와 이어지는 실제 이용 후기(별점) 카드 */}
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {REVIEWS.map((r, i) => (
              <article
                key={i}
                className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-yellow/40 hover:shadow-lg sm:p-7"
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars n={r.rating} />
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${channelStyle[r.channel]}`}
                  >
                    {r.channel}
                  </span>
                </div>
                <h3 className="mt-4 break-keep text-[17px] font-bold leading-snug text-brand-dark">
                  {r.title}
                </h3>
                <p className="mt-2.5 flex-1 break-keep text-sm leading-relaxed text-brand-gray">
                  {r.body}
                </p>
                {r.result && (
                  <p className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green break-keep">
                    ✅ {r.result}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-2.5 border-t border-gray-100 pt-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-sm font-bold text-brand-dark">
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

        {/* ── 실제 고객이 남긴 후기 (Supabase 실시간) ── */}
        <LiveReviews />

        {/* ── 고객 후기 작성 (로그인 고객) ── */}
        <ReviewWriteSection />

        {/* ── 하단 CTA ── */}
        <section className="mt-20 rounded-3xl bg-brand-dark px-6 py-10 text-center">
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
              href="http://pf.kakao.com/_VxfWxan/chat"
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

/* ────────────────────────────────────────────
   실제 고객이 남긴 후기 (Supabase에서 승인된 것만 노출)
──────────────────────────────────────────── */
type LiveReview = {
  id: string;
  author_name: string;
  business: string | null;
  region: string | null;
  rating: number;
  title: string;
  body: string;
  result: string | null;
  created_at: string;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function LiveReviews() {
  const [rows, setRows] = useState<LiveReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id, author_name, business, region, rating, title, body, result, created_at"
        )
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!alive) return;
      if (!error && data) setRows(data as LiveReview[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 아직 승인된 실제 후기가 없으면 섹션 자체를 숨김 (빈 화면 방지)
  if (!loading && rows.length === 0) return null;

  return (
    <section className="mt-20">
      <div className="text-center">
        <p className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-orange">
          Live
          <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-brand-green">
            실시간
          </span>
        </p>
        <h2 className="mt-2 break-keep text-xl font-extrabold tracking-tight text-brand-dark sm:text-3xl">
          실제 이용 고객 후기
        </h2>
        <p className="mt-3 break-keep text-sm text-brand-gray">
          모두의공공조달을 직접 이용하신 대표님들이 남겨주신 후기입니다.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {rows.map((r) => (
            <article
              key={r.id}
              className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-yellow/40 hover:shadow-lg sm:p-7"
            >
              <div className="flex items-center justify-between gap-2">
                <Stars n={r.rating} />
                <span className="shrink-0 text-[11px] text-gray-400">
                  {fmtDate(r.created_at)}
                </span>
              </div>
              <h3 className="mt-4 break-keep text-[17px] font-bold leading-snug text-brand-dark">
                {r.title}
              </h3>
              <p className="mt-2.5 flex-1 whitespace-pre-line break-keep text-sm leading-relaxed text-brand-gray">
                {r.body}
              </p>
              {r.result && (
                <p className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green break-keep">
                  ✅ {r.result}
                </p>
              )}
              <div className="mt-5 flex items-center gap-2.5 border-t border-gray-100 pt-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-sm font-bold text-brand-dark">
                  {(r.author_name || "?").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-dark">
                    {r.author_name}
                  </p>
                  <p className="truncate text-[11px] text-brand-gray">
                    {[r.business, r.region].filter(Boolean).join(" · ") ||
                      "이용 고객"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────
   고객 후기 작성 (로그인 고객만 · 검수 후 노출)
──────────────────────────────────────────── */
function ReviewWriteSection() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  // 폼 상태
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [business, setBusiness] = useState("");
  const [region, setRegion] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!alive) return;
      setLoggedIn(!!user);
      setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    setMsg("");
    if (!authorName.trim()) return setMsg("표시할 이름을 입력해 주세요.");
    if (!title.trim()) return setMsg("후기 제목을 입력해 주세요.");
    if (body.trim().length < 10)
      return setMsg("후기 내용을 10자 이상 입력해 주세요.");

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return setMsg("로그인이 필요합니다. 다시 로그인해 주세요.");
    }

    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      author_name: authorName.trim(),
      business: business.trim() || null,
      region: region.trim() || null,
      rating,
      title: title.trim(),
      body: body.trim(),
      result: result.trim() || null,
    });

    setSubmitting(false);
    if (error) {
      setMsg("후기 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setDone(true);
  };

  return (
    <section className="mt-20 rounded-3xl border border-brand-yellow/40 bg-brand-yellow/10 px-5 py-8 sm:px-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-brand-orange/10 px-3 py-1 text-[11px] font-bold text-brand-orange sm:text-xs">
          🎁 후기 작성 이벤트 진행 중
        </span>
        <h2 className="mt-3 break-keep text-xl font-extrabold text-brand-dark sm:text-2xl">
          이용 후기를 남겨주세요
        </h2>
        <p className="mx-auto mt-2 max-w-xl break-keep text-sm leading-relaxed text-brand-gray">
          모두의공공조달을 이용하신 대표님의 소중한 경험을 들려주세요.
          <br className="hidden sm:block" />
          작성해 주신 후기는 검수 후 이 페이지에 소개됩니다.
        </p>
      </div>

      {/* 작성 완료 */}
      {done ? (
        <div className="mx-auto mt-6 max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-3xl">🙏</p>
          <p className="mt-3 break-keep text-base font-bold text-brand-dark">
            소중한 후기 감사합니다!
          </p>
          <p className="mt-2 break-keep text-sm leading-relaxed text-brand-gray">
            관리자 검수 후 이 페이지에 노출됩니다. 보통 1~2일 이내에
            반영됩니다.
          </p>
        </div>
      ) : checking ? (
        <div className="mx-auto mt-6 h-12 max-w-xs animate-pulse rounded-full bg-white/60" />
      ) : !loggedIn ? (
        /* 비로그인 상태 */
        <div className="mx-auto mt-6 max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="break-keep text-sm leading-relaxed text-brand-gray">
            후기 작성은 <b className="text-brand-dark">로그인 후</b> 가능합니다.
            <br />
            간편 로그인으로 바로 시작해 보세요.
          </p>
          <Link
            href="/signup"
            className="btn-brand mt-4 inline-block w-full rounded-full px-6 py-3 text-sm font-bold sm:w-auto"
          >
            로그인하고 후기 작성하기
          </Link>
        </div>
      ) : !open ? (
        /* 로그인 상태 · 폼 열기 전 */
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-brand inline-block w-full rounded-full px-8 py-3 text-sm font-bold sm:w-auto"
          >
            ✏️ 후기 작성하기
          </button>
        </div>
      ) : (
        /* 로그인 상태 · 작성 폼 */
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          {/* 별점 */}
          <label className="block break-keep text-sm font-bold text-brand-dark">
            별점
          </label>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl leading-none ${
                  n <= rating ? "text-brand-yellow" : "text-gray-300"
                }`}
                aria-label={`별점 ${n}점`}
              >
                ★
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block break-keep text-sm font-bold text-brand-dark">
                표시 이름 *
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="예: 김O호 대표"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block break-keep text-sm font-bold text-brand-dark">
                업종
              </label>
              <input
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="예: 도소매업"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block break-keep text-sm font-bold text-brand-dark">
                지역
              </label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 인천 서해구"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block break-keep text-sm font-bold text-brand-dark">
              제목 *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 부결됐던 자금, 여기서 승인받았어요"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          <div className="mt-4">
            <label className="block break-keep text-sm font-bold text-brand-dark">
              내용 * <span className="font-normal text-brand-gray">(10자 이상)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="상담 과정, 도움받은 점, 결과 등을 자유롭게 남겨주세요."
              className="mt-1 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          <div className="mt-4">
            <label className="block break-keep text-sm font-bold text-brand-dark">
              승인 결과 <span className="font-normal text-brand-gray">(선택)</span>
            </label>
            <input
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="예: 정책자금 1억 승인"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {msg && (
            <p className="mt-3 break-keep text-sm font-medium text-brand-red">
              {msg}
            </p>
          )}

          <p className="mt-3 break-keep text-[11px] leading-relaxed text-gray-400">
            ※ 작성하신 후기는 관리자 검수 후 노출됩니다. 허위·비방·광고성 후기는
            게재가 제한될 수 있습니다.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-brand w-full rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60 sm:flex-1"
            >
              {submitting ? "등록 중..." : "후기 등록하기"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-full border border-gray-200 px-6 py-3 text-sm font-bold text-brand-gray hover:bg-gray-50 sm:w-auto"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
