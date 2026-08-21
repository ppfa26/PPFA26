"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import {
  UPLOAD_GUIDES,
  UPLOAD_ORDER,
  THUMBNAIL_GUIDE,
  type SnsChannel,
  type SnsBlock,
} from "@/lib/snsTemplates";

type Phase = "loading" | "denied" | "ready";

/* 복사 버튼 (블록 단위) */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
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

/* 채널 전체(제목+본문+태그 등 모든 블록)를 한 번에 복사하는 버튼.
   블록 사이에 라벨을 [대괄호]로 넣어, 붙여넣은 뒤 제목/본문/태그를 쉽게 구분할 수 있게 한다. */
function CopyAllButton({ blocks }: { blocks: SnsBlock[] }) {
  const [done, setDone] = useState(false);
  // 라벨에서 "채널명 - " 접두어(예: "블로그 - 제목")를 떼어 "제목"만 남긴다.
  const shortLabel = (label: string) => {
    const idx = label.indexOf(" - ");
    return idx >= 0 ? label.slice(idx + 3) : label;
  };
  const buildAllText = () =>
    blocks
      .map((b) => `[${shortLabel(b.label)}]\n${b.text}`)
      .join("\n\n──────────\n\n");
  const onCopy = async () => {
    const text = buildAllText();
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      window.prompt("아래 내용을 직접 복사하세요 (Ctrl+C)", text);
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
        done
          ? "bg-emerald-500 text-white"
          : "bg-brand-dark text-white hover:opacity-90"
      }`}
    >
      {done ? "전체 복사됨 ✓" : "📋 제목+본문+태그 한번에 복사"}
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
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-relaxed text-gray-700">
        {block.text}
      </pre>
    </div>
  );
}

export default function SnsHubPage() {
  const [phase, setPhase] = useState<Phase>("loading");

  // 입력
  const [source, setSource] = useState("");
  const [region, setRegion] = useState("");
  const [amount, setAmount] = useState("");
  const [emphasis, setEmphasis] = useState("");

  // 결과
  const [loading, setLoading] = useState(false);
  const [justDone, setJustDone] = useState(false); // 완성 직후 "✅ 글 완성!" 잠깐 표시
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [mode, setMode] = useState<"ai" | "fallback" | null>(null);
  const [channels, setChannels] = useState<SnsChannel[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [restored, setRestored] = useState(false); // 저장분 복원 완료 여부

  // 뒤로가기/탭 닫기 후 돌아와도 기존 생성글이 유지되도록 로컬에 저장/복원.
  // localStorage = "다음 글 만들기"를 새로 성공하기 전까지 영구 보존(탭 닫아도 안 사라짐).
  const STORAGE_KEY = "sns-hub-draft";

  // 1) 최초 진입 시 저장분 복원 (다음 글 만들기 전까지 유지)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.channels) && s.channels.length > 0) {
          setChannels(s.channels);
          setMode(s.mode ?? null);
          setNote(s.note ?? null);
          setActiveTab(typeof s.activeTab === "number" ? s.activeTab : 0);
        }
        if (typeof s.source === "string") setSource(s.source);
        if (typeof s.region === "string") setRegion(s.region);
        if (typeof s.amount === "string") setAmount(s.amount);
        if (typeof s.emphasis === "string") setEmphasis(s.emphasis);
      }
    } catch {
      /* 저장분이 손상돼도 무시 */
    } finally {
      setRestored(true);
    }
  }, []);

  // 2) 결과가 바뀌면(생성/탭 이동) 세션에 저장 — 복원 완료 후에만
  useEffect(() => {
    if (!restored) return;
    try {
      if (channels.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ channels, mode, note, activeTab, source, region, amount, emphasis })
        );
      }
    } catch {
      /* 저장 실패 무시 */
    }
  }, [restored, channels, mode, note, activeTab, source, region, amount, emphasis]);

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

  const generate = async () => {
    if (!source.trim()) {
      setErrMsg("공고 링크나 내용을 입력해주세요.");
      return;
    }
    setLoading(true);
    setJustDone(false);
    setErrMsg(null);
    setNote(null);
    setChannels([]);
    // "다음 글 만들기"를 새로 누른 시점 = 이전 결과를 버리는 시점.
    // 저장분을 여기서 지워, 생성 도중 뒤로가기해도 옛 글이 되살아나지 않게 함.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 무시 */
    }
    try {
      const res = await fetch("/api/sns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, region, amount, emphasis }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data?.error || "글 생성에 실패했습니다.");
        return;
      }
      setChannels(data.channels || []);
      setMode(data.mode || null);
      setNote(data.note || null);
      setActiveTab(0);
      // 완성 직후 버튼에 "✅ 글 완성!" 2초간 표시
      setJustDone(true);
      setTimeout(() => setJustDone(false), 2000);
    } catch {
      setErrMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

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
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:scale-[1.02] hover:bg-gray-50"
              >
                ← 관리자 홈
              </Link>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              공고 <b>링크</b>나 <b>내용</b>을 붙여넣고 버튼만 누르면, AI가{" "}
              <b>네이버 블로그</b> 글을 자동으로 써줍니다. 각 블록의{" "}
              <b>복사</b> 버튼으로 그대로 붙여넣으면 끝.
            </p>
          </header>

          {/* 1) 입력 */}
          <section
            id="sns-input"
            className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
          >
            <label className="mb-1 block text-sm font-bold text-gray-900">
              1. 공고 링크 또는 내용 붙여넣기
            </label>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={
                "예1) https://www.bizinfo.go.kr/... (링크 붙여넣기)\n예2) 공고 본문을 그대로 긁어서 붙여넣기"
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              링크를 넣으면 자동으로 읽어옵니다. 안 읽히는 사이트면 공고 내용을
              직접 붙여넣어 주세요.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  지역 (선택)
                </label>
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="예: 인천"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  지원 한도 (선택)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="예: 최대 5천만원"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  강조할 점 (선택)
                </label>
                <input
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value)}
                  placeholder="예: 마감 임박, 무담보"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* 버튼 뒤 반투명 박스 - 버튼 크기에 딱 맞게 감싸 시선 집중 */}
            <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-primary/10 p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-90 ${
                  justDone
                    ? "bg-emerald-600"
                    : "bg-brand-primary hover:opacity-90"
                }`}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ✨ 작성중
                  </>
                ) : justDone ? (
                  <>✨ 글 완성</>
                ) : (
                  <>✨ 블로그 글 만들기</>
                )}
              </button>
            </div>

            {errMsg && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                {errMsg}
              </p>
            )}
            {note && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                ⚠️ {note}
              </p>
            )}
          </section>

          {/* 2) 결과: 채널 탭 */}
          {channels.length > 0 && (
            <section id="sns-channels" className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  2. 완성된 글 (복사해서 붙여넣기)
                </h2>
                {mode === "ai" && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                    AI 생성
                  </span>
                )}
                {mode === "fallback" && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                    기본 템플릿
                  </span>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {channels.map((ch, idx) => (
                  <button
                    key={ch.channel + idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      idx === activeTab
                        ? "bg-brand-dark text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {ch.emoji} {ch.channel}
                  </button>
                ))}
              </div>

              {active && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 rounded-xl bg-gray-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      <b>
                        {active.emoji} {active.channel}
                      </b>{" "}
                      - 아래 블록을 위에서부터 순서대로 올리시면 됩니다.
                    </p>
                    {/* 제목+본문+태그(=이 채널의 모든 블록)를 한 번에 복사 (대표님 요청) */}
                    <CopyAllButton blocks={active.blocks} />
                  </div>
                  {active.blocks.map((b, i) => (
                    <BlockCard key={b.key + i} block={b} />
                  ))}
                </div>
              )}
            </section>
          )}

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

          {/* 4) 채널별 업로드 설명서 + 썸네일 규칙 */}
          <section id="sns-upload-guide" className="mb-10">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              4. 블로그 올리는 방법 &amp; 썸네일 (처음이면 꼭 읽어주세요)
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

              {/* 썸네일 규칙 - 당근 카드 옆, 같은 흰색 배경으로 통일 */}
              <div
                id="sns-thumbnail-guide"
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <p className="mb-2 text-sm font-bold text-gray-900">
                  🖼️ 썸네일 스타일 (다크 네이비 + 골드 고정)
                </p>
                <ul className="space-y-1.5">
                  {THUMBNAIL_GUIDE.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-600"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
