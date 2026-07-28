"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import {
  buildAllChannels,
  DEFAULT_INPUT,
  UPLOAD_GUIDES,
  UPLOAD_ORDER,
  THUMBNAIL_GUIDE,
  parseHashtags,
  type SnsInput,
  type SnsBlock,
} from "@/lib/snsTemplates";

type Phase = "loading" | "denied" | "ready";

/* 입력 폼 필드 메타(라벨 + 도움말 + 여러줄 여부) */
const FIELD_META: {
  key: keyof SnsInput;
  label: string;
  hint: string;
  multiline?: boolean;
}[] = [
  { key: "region", label: "지역", hint: "예: 인천 / 인천 서구" },
  { key: "title", label: "사업명", hint: "예: 2026 하반기 소진공 정책자금 융자" },
  { key: "target", label: "지원 대상", hint: "예: 인천 관내 소상공인" },
  {
    key: "targetExtra",
    label: "대상 추가조건",
    hint: "없으면 비워두세요",
    multiline: true,
  },
  { key: "usage", label: "자금 용도", hint: "예: 점포 시설 개선 또는 운영자금" },
  { key: "amount", label: "지원 한도", hint: "예: 최대 5천만원" },
  {
    key: "amountExtra",
    label: "한도 추가조건",
    hint: "없으면 비워두세요",
    multiline: true,
  },
  {
    key: "caution",
    label: "주의사항",
    hint: "예: 금리, 신청기간, 문의처는 공고문에 별도 안내",
    multiline: true,
  },
  {
    key: "linkInpock",
    label: "인포크 링크 (인스타/스레드용)",
    hint: "예: https://link.inpock.co.kr/ppfa25",
  },
  {
    key: "linkHome",
    label: "자사 도메인 (블로그/카카오/당근용)",
    hint: "예: https://모두의사업친구.kr",
  },
  {
    key: "hashtags",
    label: "해시태그 (공백/쉼표 구분, 인스타는 앞 5개만 사용)",
    hint: "예: 인천소상공인 소상공인정책자금 소진공융자 인천창업 모두의사업친구",
    multiline: true,
  },
];

/* 복사 버튼 (블록 단위) */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      // 클립보드 권한 실패 시 폴백: 선택 안내
      window.prompt("아래 내용을 직접 복사하세요 (Ctrl+C)", text);
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        done
          ? "bg-emerald-500 text-white"
          : "bg-brand-primary text-white hover:opacity-90"
      }`}
    >
      {done ? "복사됨 ✓" : "복사"}
    </button>
  );
}

function BlockCard({ block }: { block: SnsBlock }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {block.label}
          </p>
          {block.hint && (
            <p className="mt-0.5 truncate text-[11px] text-gray-400">
              {block.hint}
            </p>
          )}
        </div>
        <CopyButton text={block.text} />
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-relaxed text-gray-700">
        {block.text}
      </pre>
    </div>
  );
}

export default function SnsHubPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [input, setInput] = useState<SnsInput>(DEFAULT_INPUT);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setPhase("denied");
        return;
      }
      const test = await supabase.rpc("admin_stats");
      if (test.error) {
        setPhase("denied");
        return;
      }
      setPhase("ready");
    })();
  }, []);

  const channels = useMemo(() => buildAllChannels(input), [input]);
  const tagPreview = useMemo(
    () => parseHashtags(input.hashtags),
    [input.hashtags]
  );

  const setField = (key: keyof SnsInput, value: string) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const resetInput = () => setInput(DEFAULT_INPUT);

  /* ---------- 렌더 ---------- */
  if (phase === "loading") {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-gray-50">
          <p className="animate-pulse text-gray-400">불러오는 중…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (phase === "denied") {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl">
              🔒
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">
              관리자 전용 페이지
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              대표님 관리자 계정으로 로그인해야 접근할 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/signup"
                className="rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90"
              >
                관리자 로그인
              </Link>
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const active = channels[activeTab];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* 상단 헤더 */}
          <header className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-extrabold text-gray-900">
                📣 SNS 글쓰기 허브
              </h1>
              <Link
                href="/admin"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                ← 관리자 홈
              </Link>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              아래 정보만 채우면 5개 채널 글이 자동으로 만들어집니다. 각 블록의{" "}
              <b>복사</b> 버튼을 누르면 바로 붙여넣을 수 있어요. (AI 없이 검증된
              템플릿으로 생성 - 글에서 가운뎃점 자동 제거, 복붙 가능 평문)
            </p>
          </header>

          {/* 1) 입력 폼 */}
          <section
            id="sns-input-form"
            className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                1. 이번에 홍보할 사업 정보 입력
              </h2>
              <button
                type="button"
                onClick={resetInput}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
              >
                기본값으로 초기화
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELD_META.map((f) => (
                <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    {f.label}
                  </label>
                  {f.multiline ? (
                    <textarea
                      value={input[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.hint}
                      rows={2}
                      className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      value={input[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.hint}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
                    />
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">{f.hint}</p>
                </div>
              ))}
            </div>
            {tagPreview.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500">
                  해시태그 미리보기:
                </span>
                {tagPreview.map((t, idx) => (
                  <span
                    key={t}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      idx < 5
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    #{t}
                    {idx === 4 && (
                      <span className="ml-1 text-[10px]">(인스타 여기까지)</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 2) 채널 탭 */}
          <section id="sns-channels" className="mb-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              2. 채널별 완성된 글 (복사해서 붙여넣기)
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {channels.map((ch, idx) => (
                <button
                  key={ch.channel}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    idx === activeTab
                      ? "bg-brand-dark text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {ch.emoji} {ch.channel}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                      idx === activeTab
                        ? "bg-white/20 text-white"
                        : ch.depth === "심층"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {ch.depth}
                  </span>
                </button>
              ))}
            </div>

            {active && (
              <div className="space-y-3">
                <div className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-600">
                  <b>
                    {active.emoji} {active.channel}
                  </b>{" "}
                  - {active.depth} 채널. 아래 블록들을 위에서부터 순서대로
                  올리시면 됩니다.
                </div>
                {active.blocks.map((b) => (
                  <BlockCard key={b.key} block={b} />
                ))}
              </div>
            )}
          </section>

          {/* 3) 업로드 순서 */}
          <section
            id="sns-upload-order"
            className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 className="mb-3 text-base font-bold text-gray-900">
              3. 하루 업로드 추천 순서
            </h2>
            <ol className="space-y-2">
              {UPLOAD_ORDER.map((line, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 4) 채널별 업로드 설명서 */}
          <section id="sns-upload-guide" className="mb-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              4. 채널별 올리는 방법 (처음이면 꼭 읽어주세요)
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {UPLOAD_GUIDES.map((g) => (
                <div
                  key={g.channel}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <p className="mb-2 text-sm font-bold text-gray-900">
                    {g.emoji} {g.channel}
                  </p>
                  <ol className="space-y-1.5">
                    {g.steps.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-600"
                      >
                        <span className="mt-0.5 shrink-0 text-brand-primary">
                          {i + 1}.
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>

          {/* 5) 썸네일 규칙 */}
          <section
            id="sns-thumbnail-guide"
            className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-6"
          >
            <h2 className="mb-3 text-base font-bold text-gray-900">
              5. 썸네일 만들 때 지켜야 할 스타일 (다크 네이비 + 골드 고정)
            </h2>
            <ul className="space-y-1.5">
              {THUMBNAIL_GUIDE.map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-700"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
