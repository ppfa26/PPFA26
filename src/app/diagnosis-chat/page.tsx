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
import { STEP1_FIELDS, STEP3_FIELDS, CONTACT_TEXT, BNO_TEXT } from "@/lib/diagnosisConfig";

// ── 채팅 대화 스크립트 ───────────────────────────────────────────
//  ★ 질문 순서는 기존 폼(/diagnosis)과 100% 동일하게 유지한다(대표님 요청). ★
//  각 스텝은 실제 폼의 필드(key)·선택지(opts)를 그대로 참조한다.
//  type:
//   · "single" = 단일 선택(칩 하나)
//   · "multi"  = 복수 선택(칩 여러 개 + '완료' 버튼)
//   · "text"   = 텍스트 입력(성함 등) — 채팅 입력창
//   · "phone"  = 연락처 입력(숫자)
//   · "bno"    = 사업자등록번호 입력(국세청 조회) — 프로토타입에서는 입력만 시연
type ChatStep = {
  key: string;
  type: "single" | "multi" | "text" | "phone" | "bno";
  botLines: string[];        // 봇이 순차적으로 말하는 말풍선들
  opts?: string[];           // 답변 칩(선택지) - single/multi 전용
  placeholder?: string;      // 입력창 placeholder - text/phone/bno 전용
};

// ★ 기존 폼 1단계 앞부분 순서 그대로 ★
//  사업자번호 → 성함 → 연락처 → 결격사유(회생·파산 / 세금) → 사업자구분 → 업종 → 연령
//  (프로토타입: 여기까지만. 승인되면 매출·업력·지역·2·3단계까지 확장)
const CHAT_STEPS: ChatStep[] = [
  {
    key: "bno",
    type: "bno",
    botLines: [
      "먼저 사업자등록번호를 알려주세요.",
      "국세청에 등록된 정상 사업자만 정부지원 신청이 가능해서, 처음에 꼭 확인하고 있어요.",
    ],
    placeholder: BNO_TEXT.placeholder, // "예: 123-45-67890"
  },
  {
    key: "name",
    type: "text",
    botLines: ["대표님 성함을 알려주세요."],
    placeholder: CONTACT_TEXT.namePlaceholder, // "예: 홍길동"
  },
  {
    key: "phone",
    type: "phone",
    botLines: ["연락 가능한 전화번호를 입력해 주세요.", "진단 결과와 맞춤 상담 안내에 사용돼요."],
    placeholder: CONTACT_TEXT.phonePlaceholder, // "예: 010-1234-5678"
  },
  {
    key: "bankruptcy",
    type: "single",
    botLines: [
      "혹시 현재 회생·파산 절차가 진행 중이신가요?",
      "진행 중이면 신청 자체가 어려워서, 미리 확인하는 항목이에요.",
    ],
    opts: STEP3_FIELDS.bankruptcy.opts,
  },
  {
    key: "taxDelinquent",
    type: "single",
    botLines: ["국세·지방세는 완납 상태이신가요?"],
    opts: STEP3_FIELDS.taxDelinquent.opts,
  },
  {
    key: "businessType",
    type: "single",
    botLines: ["사업자 구분을 선택해 주세요."],
    opts: STEP1_FIELDS.businessType.opts,
  },
  {
    key: "industries",
    type: "multi",
    botLines: ["어떤 업종이신가요?", "해당되는 걸 모두 골라주세요. (복수 선택 가능)"],
    opts: STEP1_FIELDS.industries.opts,
  },
  {
    key: "age",
    type: "single",
    botLines: ["대표님 연령대를 알려주세요.", "청년 창업·세제감면 판정에 필요해요."],
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
  // 텍스트/전화/사업자번호 입력창 임시 값
  const [textTemp, setTextTemp] = useState("");

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
    setTextTemp("");
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

  // 텍스트/전화/사업자번호 입력 확정
  //  ※ 프로토타입: 사업자번호는 국세청 조회 없이 입력만 받아 흐름을 시연한다.
  //    (실제 확장 시 기존 /api/business-status 조회 로직을 그대로 연결)
  const confirmText = () => {
    const step = CHAT_STEPS[stepIdx];
    const raw = textTemp.trim();
    if (!raw) return;
    let value = raw;
    let display = raw;
    if (step.type === "phone") {
      // 숫자만 저장(기존 폼과 동일하게 하이픈 표기는 표시용)
      value = raw;
    }
    if (step.type === "bno") {
      const digits = raw.replace(/[^0-9]/g, "");
      if (digits.length !== 10) return; // 10자리 아니면 대기
      value = digits;      // 기존 폼과 동일하게 숫자 10자리 저장
      display = raw;
    }
    setForm((f: any) => ({ ...f, [step.key]: value }));
    setMessages((m) => [...m, { who: "user", text: display }]);
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

          {/* 답변 영역 (질문 유형별 분기) */}
          {showChips && curStep && (
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
              {/* ── 복수 선택 ── */}
              {curStep.type === "multi" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {(curStep.opts || []).map((o) => {
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
              )}

              {/* ── 단일 선택 ── */}
              {curStep.type === "single" && (
                <div className="flex flex-col gap-2">
                  {(curStep.opts || []).map((o) => (
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

              {/* ── 텍스트 / 전화 / 사업자번호 입력 ── */}
              {(curStep.type === "text" || curStep.type === "phone" || curStep.type === "bno") && (
                <div className="flex items-center gap-2">
                  <input
                    type={curStep.type === "text" ? "text" : "tel"}
                    inputMode={curStep.type === "text" ? "text" : "numeric"}
                    value={textTemp}
                    onChange={(e) => setTextTemp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmText()}
                    placeholder={curStep.placeholder}
                    autoFocus
                    className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
                  />
                  <button
                    onClick={confirmText}
                    disabled={!textTemp.trim()}
                    className="shrink-0 rounded-full bg-brand-grad px-5 py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    입력 →
                  </button>
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

// ── 봇 아바타 (기존 로고 그대로 · 둥근 사각형에 꽉 차게) ──
//  로고 자체가 둥근 사각형이므로 원(rounded-full)으로 자르면 모서리가 어색하게 잘린다.
//  → rounded-xl(둥근 사각형) + object-contain 으로 로고가 프레임에 딱 맞게 보이도록 한다.
function BotAvatar() {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
      <Image
        src="/logo-icon.png"
        alt="모두의사업친구"
        width={36}
        height={36}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

// ── 봇 말풍선 ──
function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="max-w-[85%] break-keep rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ── 사용자 말풍선 ──
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] break-keep rounded-2xl rounded-br-md bg-brand-grad px-4 py-3 text-sm font-semibold leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ── 봇 "입력 중..." 점 3개 애니메이션 ──
function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
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
