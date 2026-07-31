"use client";

// ════════════════════════════════════════════════════════════════
//  채팅형 무료진단 — 프로토타입
//
//  ★ 핵심 원칙 ★
//   · "겉모습만 채팅형" — 질문/선택지/저장되는 form 값은 기존 폼(diagnosisConfig)과
//     100% 동일하게 유지한다. → matching 입력이 바뀌지 않아 결과 정확도 그대로.
//   · 이 페이지는 프로토타입(질문 3개)으로, 대화형 UX를 먼저 확인하기 위한 것.
//     승인되면 전체 22여 개 질문으로 확장한다.
//
//  ★ 안내 문구 (대표님 요청) ★
//   시작 시 봇이 "모든 질문에 정확히 답해야 정확한 결과를 얻는다"고 안내한다.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { STEP1_FIELDS } from "@/lib/diagnosisConfig";

// ── 채팅 대화 스크립트 (프로토타입: 질문 3개) ────────────────────
//  각 스텝은 실제 폼의 필드(key)·선택지(opts)를 그대로 참조한다.
//  multi=true 이면 복수 선택(칩 여러 개 고르고 '다음' 버튼으로 확정).
type ChatStep = {
  key: string;
  botLines: string[];      // 봇이 순차적으로 말하는 말풍선들
  opts: string[];          // 답변 칩(선택지)
  multi?: boolean;         // 복수 선택 여부
};

const CHAT_STEPS: ChatStep[] = [
  {
    key: "businessType",
    botLines: ["먼저, 사업자 구분을 알려주세요.", STEP1_FIELDS.businessType.label],
    opts: STEP1_FIELDS.businessType.opts,
  },
  {
    key: "industries",
    botLines: ["어떤 업종이신가요?", "해당되는 걸 모두 골라주세요 (복수 선택 가능)"],
    opts: STEP1_FIELDS.industries.opts,
    multi: true,
  },
  {
    key: "age",
    botLines: ["마지막으로, 대표님 연령대를 알려주세요.", "청년 창업·세제감면 판정에 꼭 필요해요."],
    opts: STEP1_FIELDS.age.opts,
  },
];

// 대화에 쌓이는 메시지 한 줄
type Msg =
  | { who: "bot"; text: string }
  | { who: "user"; text: string };

export default function DiagnosisChat() {
  // 실제 폼과 동일한 형태의 답변 저장소 (복수선택 필드는 배열로 초기화)
  const [form, setForm] = useState<any>({ industries: [] });
  // 지금까지 화면에 표시된 대화
  const [messages, setMessages] = useState<Msg[]>([]);
  // 현재 진행 중인 질문 인덱스 (CHAT_STEPS 기준). 끝나면 length 이상.
  const [stepIdx, setStepIdx] = useState(-1); // -1 = 인트로(인사말) 단계
  // 봇이 "입력 중..." 표시하는 중인지
  const [botTyping, setBotTyping] = useState(false);
  // 현재 복수선택 진행 중 임시 선택값
  const [multiTemp, setMultiTemp] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 쌓이면 항상 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, botTyping]);

  // 봇 대사들을 타이핑 연출과 함께 순차 출력한 뒤 콜백 실행
  const pushBotLines = (lines: string[], onDone?: () => void) => {
    let i = 0;
    const showNext = () => {
      if (i >= lines.length) {
        onDone?.();
        return;
      }
      setBotTyping(true);
      const line = lines[i];
      // 대사 길이에 비례한 짧은 딜레이(최소 500ms, 최대 1100ms)
      const delay = Math.min(1100, Math.max(500, line.length * 45));
      setTimeout(() => {
        setBotTyping(false);
        setMessages((m) => [...m, { who: "bot", text: line }]);
        i += 1;
        setTimeout(showNext, 250);
      }, delay);
    };
    showNext();
  };

  // ── 인트로(인사말 + 안내) 자동 시작 ──
  useEffect(() => {
    const total = 22; // 진행률 기준 질문 필드 수(대표님 요청: 개수 안내)
    pushBotLines(
      [
        "안녕하세요, 모두의사업친구예요 😊",
        "정확한 정부지원사업 매칭 결과를 위해서는 모든 질문에 정확히 답변해 주시는 게 중요해요.",
        `총 약 ${total}개의 질문으로 구성되어 있고, 정확히 답하실수록 더 정확한 결과를 받으실 수 있어요.`,
        "그럼 시작해 볼게요! 👇",
      ],
      () => askStep(0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 특정 스텝의 질문을 봇이 말하도록 진행
  const askStep = (idx: number) => {
    if (idx >= CHAT_STEPS.length) {
      // 프로토타입 종료 안내
      pushBotLines([
        "여기까지가 프로토타입 미리보기예요! 🙌",
        "실제로는 이 방식으로 남은 질문들도 이어서 진행됩니다.",
      ]);
      setStepIdx(CHAT_STEPS.length);
      return;
    }
    setStepIdx(idx);
    setMultiTemp([]);
    pushBotLines(CHAT_STEPS[idx].botLines);
  };

  // 단일 선택 답변 처리
  const answerSingle = (opt: string) => {
    const step = CHAT_STEPS[stepIdx];
    setForm((f: any) => ({ ...f, [step.key]: opt }));         // ★ 실제 폼과 동일 저장
    setMessages((m) => [...m, { who: "user", text: opt }]);
    // 짧은 리액션 후 다음 질문
    setTimeout(() => askStep(stepIdx + 1), 400);
  };

  // 복수 선택 칩 토글
  const toggleMulti = (opt: string) => {
    setMultiTemp((arr) =>
      arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]
    );
  };

  // 복수 선택 확정
  const confirmMulti = () => {
    if (multiTemp.length === 0) return;
    const step = CHAT_STEPS[stepIdx];
    setForm((f: any) => ({ ...f, [step.key]: multiTemp }));   // ★ 배열 그대로 저장
    setMessages((m) => [...m, { who: "user", text: multiTemp.join(", ") }]);
    setTimeout(() => askStep(stepIdx + 1), 400);
  };

  const curStep = stepIdx >= 0 && stepIdx < CHAT_STEPS.length ? CHAT_STEPS[stepIdx] : null;
  // 답변 칩을 보여줄 조건: 현재 질문이 있고, 봇이 타이핑 중이 아니고,
  // 아직 이 질문에 답하지 않았을 때(마지막 메시지가 봇 메시지일 때)
  const lastMsg = messages[messages.length - 1];
  const showChips = !!curStep && !botTyping && lastMsg?.who === "bot";

  return (
    <PageShell pageKey="diagnosis">
      <Header />
      <main className="px-4 py-6">
        <div className="mx-auto max-w-lg">
          {/* 상단 프로토타입 안내 배지 */}
          <div className="mb-3 rounded-full bg-brand-orange/10 px-3 py-1 text-center text-[11px] font-bold text-brand-orange">
            채팅형 진단 · 프로토타입 미리보기
          </div>

          {/* 대화 영역 */}
          <div className="min-h-[60vh] rounded-2xl border border-gray-100 bg-gray-50/60 p-4 shadow-card">
            <div className="flex flex-col gap-3">
              {messages.map((m, i) =>
                m.who === "bot" ? (
                  <BotBubble key={i} text={m.text} />
                ) : (
                  <UserBubble key={i} text={m.text} />
                )
              )}
              {botTyping && <TypingBubble />}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* 답변 칩 영역 (하단 고정 느낌) */}
          {showChips && curStep && (
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
              {curStep.multi ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {curStep.opts.map((o) => {
                      const active = multiTemp.includes(o);
                      return (
                        <button
                          key={o}
                          onClick={() => toggleMulti(o)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            active
                              ? "border-brand-orange bg-brand-grad text-brand-dark"
                              : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
                          }`}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={confirmMulti}
                    disabled={multiTemp.length === 0}
                    className="mt-3 w-full rounded-full bg-brand-grad py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    {multiTemp.length > 0 ? `${multiTemp.length}개 선택 완료 →` : "하나 이상 선택해 주세요"}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {curStep.opts.map((o) => (
                    <button
                      key={o}
                      onClick={() => answerSingle(o)}
                      className="rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 디버그: 현재까지 저장된 form (프로토타입 확인용) */}
          <details className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-xs text-brand-gray">
            <summary className="cursor-pointer font-bold">🔧 저장된 답변(form) 확인 — 프로토타입용</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(form, null, 2)}</pre>
          </details>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}

// ── 봇 말풍선 (아바타 = 기존 로고 그대로) ──
function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
        <Image src="/logo-icon.png" alt="모두의사업친구" width={32} height={32} className="h-full w-full object-cover" />
      </div>
      <div className="max-w-[80%] break-keep rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ── 사용자 말풍선 ──
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] break-keep rounded-2xl rounded-br-md bg-brand-grad px-4 py-2.5 text-sm font-semibold leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ── 봇 "입력 중..." 점 3개 애니메이션 ──
function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
        <Image src="/logo-icon.png" alt="모두의사업친구" width={32} height={32} className="h-full w-full object-cover" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray" />
        </div>
      </div>
    </div>
  );
}
