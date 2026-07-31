"use client";

// ════════════════════════════════════════════════════════════════
//  채팅형 무료진단 (전체 버전)
//
//  ★ 핵심 원칙 (절대 불변) ★
//   · "겉모습만 채팅형" — 질문/선택지/순서/저장되는 form 값·검증·제출 로직은
//     기존 폼(/diagnosis, diagnosisConfig)과 100% 동일하게 유지한다.
//     → matching 입력이 바뀌지 않아 결과 정확도가 기존과 완전히 같다.
//   · 사업자번호는 기존 /api/business-status 국세청 조회를 그대로 연결.
//   · 제출은 기존 saveDiagnosis / saveCompletedDiagnosis / savePartialLead 로직 재사용.
//
//  ★ 안내 문구 (대표님 요청) ★
//   시작 시 봇이 "모든 질문에 정확히 답해야 정확한 결과를 얻는다"고 안내한다.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { trackConversion } from "@/components/KarrotPixel";
import { supabase } from "@/lib/supabaseClient";
import { isStatsExcludedEmail } from "@/lib/admin";
import {
  saveDiagnosis,
  clearDiagnosisDraft,
  savePartialLead,
  saveCompletedDiagnosis,
} from "@/lib/diagnosisStore";
import {
  STEP1_FIELDS,
  STEP2_FIELDS,
  STEP3_FIELDS,
  STEP3_CONDITIONAL_FIELDS,
  CONTACT_TEXT,
  BNO_TEXT,
  PHONE_CONSULT_FIELD,
} from "@/lib/diagnosisConfig";

// ── 채팅 대화 스크립트 ───────────────────────────────────────────
//  질문 순서는 기존 폼(/diagnosis)과 100% 동일.
//  type:
//   · "single" = 단일 선택
//   · "multi"  = 복수 선택(+ '완료' 버튼)
//   · "text"   = 텍스트 입력(성함)
//   · "phone"  = 연락처 입력(숫자)
//   · "bno"    = 사업자등록번호(국세청 조회 + 예비창업자 버튼)
//   · "region" = 지역(서울·경기·인천 칩 + '기타' 직접 입력)
//  onlyIf: 특정 조건일 때만 물어보는 스텝(법인만 자본잠식 등). 아니면 건너뜀.
type StepType =
  | "single"
  | "multi"
  | "text"
  | "phone"
  | "bno"
  | "region"
  | "contact" // 성함 + 연락처를 한 스텝에서 입력
  | "yesnoGroup" // 예/아니요 문항 여러 개를 한 스텝에서(각각 라디오)
  | "checkGroup"; // 해당되는 것만 체크 → 체크=예, 나머지=아니요
// yes/no 묶음 문항 하나
type SubQ = { key: string; label: string; opts?: string[]; desc?: string };
type ChatStep = {
  key: string;
  type: StepType;
  botLines: string[];
  opts?: string[];
  placeholder?: string;
  onlyIf?: (form: any) => boolean;
  // group 타입에서 사용하는 하위 문항들
  subs?: SubQ[];
  // checkGroup 전용: 체크 시 저장할 값 / 미체크 시 저장할 값
  checkYes?: string;
  checkNo?: string;
  // 화면 표기만 다르게(저장/매칭 값은 opts 그대로). 예: 소진공→소상공인시장진흥공단
  labelFull?: Record<string, string>;
  // 선택지 열 수 강제(미지정 시 글자 길이로 자동 계산). 예: age → 3열 1줄
  cols?: 1 | 2 | 3;
  // multi 타입이지만 '하나만' 고르게(라디오식). 저장은 여전히 배열([선택값]) → 매칭 값 구조 불변.
  // 예: innovation(혁신성장) — 예/아니요 중 하나만 선택. (대표님 요청)
  singleSelect?: boolean;
};

const CHAT_STEPS: ChatStep[] = [
  // ── 1단계 · 기본 정보 ──
  {
    key: "bno",
    type: "bno",
    botLines: [
      "먼저 사업자등록번호를 알려주세요.",
      "국세청에 등록된 정상 사업자인지\n확인 하는 절차에요.",
    ],
    placeholder: BNO_TEXT.placeholder,
  },
  // 성함 + 연락처를 한 질문으로 합침
  {
    key: "contact",
    type: "contact",
    botLines: ["대표님 성함과 연락처를 알려주세요.", "진단 결과 리포트와 맞춤 안내에 사용돼요."],
  },
  // 결격사유(회생·파산 + 세금완납)를 한 질문으로 합침
  {
    key: "eligibility",
    type: "yesnoGroup",
    botLines: ["신청 자격을 먼저 확인할게요.", "아래 두 가지만 체크해 주세요."],
    subs: [
      { key: "bankruptcy", label: "현재 회생·파산 절차가 진행 중이신가요?", opts: STEP3_FIELDS.bankruptcy.opts },
      { key: "taxDelinquent", label: "국세·지방세는 완납 상태이신가요?", opts: STEP3_FIELDS.taxDelinquent.opts },
    ],
  },
  // ★ businessType을 자본잠식보다 먼저 물어본다 ★
  //   원본 폼은 단일 페이지라 순서 의존성이 없지만, 채팅은 순차이므로
  //   법인 여부(businessType)를 먼저 확정해야 자본잠식(법인 전용) 스텝을 띄울 수 있다.
  //   저장 form 값·매칭 결과는 순서와 무관하게 동일하다.
  {
    key: "businessType",
    type: "single",
    botLines: ["사업자 구분을 선택해 주세요."],
    opts: STEP1_FIELDS.businessType.opts,
    // 예비창업자 버튼으로 이미 businessType='예비'가 세팅되면 다시 묻지 않는다.
    onlyIf: (f) => f.businessType !== "예비",
  },
  // 자본잠식은 법인사업자만
  {
    key: "capitalImpairment",
    type: "single",
    botLines: ["법인 자본잠식 상태인가요?", STEP3_FIELDS.capitalImpairment.hint],
    opts: STEP3_FIELDS.capitalImpairment.opts,
    onlyIf: (f) => f.businessType === "법인사업자",
  },
  {
    key: "industries",
    type: "multi",
    botLines: ["어떤 업종이신가요?", "해당되는 걸 모두 골라주세요. (복수 선택 가능)"],
    opts: STEP1_FIELDS.industries.opts,
  },
  { key: "years", type: "single", botLines: ["사업자등록증상 업력은 어느 정도이신가요?"], opts: STEP1_FIELDS.years.opts },
  { key: "revenue", type: "single", botLines: ["연매출 규모를 알려주세요."], opts: STEP1_FIELDS.revenue.opts },
  {
    key: "age",
    type: "single",
    botLines: ["대표님 연령대를 알려주세요.", "청년 창업·세제감면 판정에 필요해요."],
    opts: STEP1_FIELDS.age.opts,
    cols: 3, // 3개를 한 줄에 가로로(대표님 요청)
  },
  { key: "region", type: "region", botLines: ["사업장 지역은 어디신가요?"], opts: STEP1_FIELDS.region.opts },

  // ── 2단계 · 회사 정보 ──
  { key: "credit", type: "single", botLines: ["대표자 개인 신용점수는 어느 정도인가요?", STEP3_FIELDS.credit.hint], opts: STEP3_FIELDS.credit.opts },
  { key: "employees", type: "single", botLines: ["직원 수는 몇 명이신가요?", STEP2_FIELDS.employees.hint], opts: STEP2_FIELDS.employees.opts },
  {
    key: "currentInstitutions",
    type: "multi",
    botLines: ["현재 이용 중인 정책기관이 있나요?", STEP2_FIELDS.currentInstitutions.hint],
    opts: STEP2_FIELDS.currentInstitutions.opts,
    labelFull: (STEP2_FIELDS.currentInstitutions as any).labelFull,
  },
  {
    key: "purposes",
    type: "multi",
    botLines: ["어떤 정부지원사업이 필요하세요?", STEP2_FIELDS.purposes.hint],
    opts: STEP2_FIELDS.purposes.opts,
  },
  {
    key: "innovation",
    type: "multi",
    singleSelect: true, // 예/아니요 중 하나만(라디오) — 둘 다 선택 불가. 저장은 [선택값] 배열 유지.
    botLines: ["혁신성장 분야에 해당되나요?", STEP3_FIELDS.innovation.hint],
    opts: STEP3_FIELDS.innovation.opts,
  },
  {
    key: "certifications",
    type: "multi",
    botLines: ["특허·인증을 보유하고 계신가요?", STEP3_FIELDS.certifications.hint],
    opts: STEP3_FIELDS.certifications.opts,
  },

  // ── 3단계 · 맞춤 심층 질문 (6개를 '해당되는 것만 체크'로 한 질문에 통합) ──
  //   체크한 항목만 "예", 체크 안 한 항목은 "아니요"로 저장 → 기존 폼의
  //   '미응답=아니요' 로직과 100% 동일. matching 결과 불변.
  {
    key: "deepChecks",
    type: "checkGroup",
    botLines: ["마지막으로, 혹시 해당되는 게 있나요?", "해당되는 항목만 골라주세요. (없으면 '해당 없음')"],
    checkYes: "예",
    checkNo: "아니요",
    subs: [
      { key: "revenueGrowth2y", label: "📈 최근 2년 연매출이 매년 10% 이상 늘었어요", desc: "예: 2년 연속 10%↑ 성장" },
      { key: "smartDevice", label: "🖥️ 매장에 스마트기기를 쓰고 있어요", desc: "예: 키오스크·테이블오더·매출관리 프로그램·무인기기·조리 및 서빙 로봇" },
      { key: "wantsRefinance", label: "🔄 고금리 대출을 저금리로 갈아타고 싶어요", desc: "예: 카드론·2금융 7%↑" },
      { key: "reFounder", label: "🔁 폐업 경험이 있고 다시 창업 중이에요", desc: "예: 재창업 7년 이내" },
      { key: "govSelected", label: "🏆 정부 선정 프로그램에 뽑힌 적 있어요", desc: "예: 백년가게·TIPS" },
      { key: "privateInvestment", label: "💵 엔젤·VC 등 민간 투자를 받았거나 진행 중이에요", desc: "예: 투자유치 실적 보유" },
    ],
  },
  {
    key: "phoneConsult",
    type: "single",
    botLines: [PHONE_CONSULT_FIELD.label, PHONE_CONSULT_FIELD.hint],
    opts: PHONE_CONSULT_FIELD.opts,
  },
];

// 진행률·안내에 쓰는 '실제로 답하는' 스텝 수
//  (조건부 스텝은 대부분 안 나오므로 제외해서 대략치를 계산)
const TOTAL_ROUGH = CHAT_STEPS.filter((s) => !s.onlyIf).length;

// ── 선택지 가로 배치용 열 수 자동 계산 (C안) ──
//  · 옵션 글자 길이에 맞춰 질문마다 2열/3열을 다르게 자동 결정.
//  · 짧은 답(예/아니요, 서울·경기 등) → 3열로 촘촘하게(세로 길이↓)
//  · 긴 답(신용보증재단·무역보험공사 등) → 2열(글자 잘림 방지)
//  · 아주 긴 답 → 1열
function autoCols(opts: string[]): 1 | 2 | 3 {
  if (!opts || opts.length === 0) return 1;
  const maxLen = Math.max(...opts.map((o) => o.length));
  // 옵션이 2개뿐이면 항상 한 줄에 2개(예/아니요 형태)
  if (opts.length === 2) return maxLen <= 12 ? 2 : 1;
  if (maxLen <= 6) return 3; // "1년 미만", "서울" 처럼 짧으면 3열
  if (maxLen <= 14) return 2; // 보통 길이는 2열
  return 1; // 아주 길면 1열(줄바꿈/잘림 방지)
}
const COLS_CLASS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

type Msg = { who: "bot"; text: string } | { who: "user"; text: string };

export default function DiagnosisChat() {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    purposes: [], industries: [], certifications: [], innovation: [], currentInstitutions: [],
  });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [stepIdx, setStepIdx] = useState(-1); // -1 = 인트로
  const [botTyping, setBotTyping] = useState(false);
  const [multiTemp, setMultiTemp] = useState<string[]>([]);
  const [textTemp, setTextTemp] = useState("");
  const [regionEtc, setRegionEtc] = useState(false);
  // 성함+연락처(contact) 입력용
  const [nameTemp, setNameTemp] = useState("");
  const [phoneTemp, setPhoneTemp] = useState("");
  // yes/no 묶음(yesnoGroup)에서 각 하위 문항 선택값
  const [groupTemp, setGroupTemp] = useState<Record<string, string>>({});
  // 체크리스트(checkGroup)에서 체크된 하위 문항 key들
  const [checkTemp, setCheckTemp] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  // 이전 질문으로 되돌아가기용 히스토리 스택
  //  · 각 스텝을 물어보기 직전의 상태(스텝 인덱스 / 그 시점 form / 그 시점 메시지 개수)를 기록.
  //  · '이전 질문 수정'을 누르면 마지막 기록으로 되감아 답을 다시 받을 수 있다.
  const [history, setHistory] = useState<{ idx: number; formBefore: any; msgLen: number }[]>([]);
  // 지난 대화 접기(펼치기 토글)
  const [showAll, setShowAll] = useState(false);

  // 사업자번호 조회 상태
  const [bnoLoading, setBnoLoading] = useState(false);
  const [bnoMsg, setBnoMsg] = useState<{ tone: "ok" | "err" | "info"; text: string } | null>(null);
  const [bnoServerDown, setBnoServerDown] = useState(false);

  // 현재 질문(마지막 봇 말풍선)을 화면 '가운데쯤'으로 스크롤하기 위한 앵커
  const focusRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // 새 질문/답변영역이 뜨면 → 현재 질문(마지막 봇 말풍선)을 화면 가운데쯤으로 이동.
  //  · 답변 영역은 sticky로 화면 하단에 붙어 있으므로, 스크롤 기준은 '마지막 봇 말풍선'.
  //    (답변영역을 center로 맞추면 sticky와 겹쳐 화면이 튀므로 focusRef 우선)
  //  · 모바일에서 좌우로 치우치지 않도록 inline: "nearest" (가로 스크롤 억제).
  useEffect(() => {
    const t = setTimeout(() => {
      const el = focusRef.current || answerRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 80);
    return () => clearTimeout(t);
  }, [messages, botTyping, bnoMsg]);

  // 봇 대사 순차 출력
  const pushBotLines = (lines: string[], onDone?: () => void) => {
    let i = 0;
    const showNext = () => {
      if (i >= lines.length) { onDone?.(); return; }
      setBotTyping(true);
      const line = lines[i];
      const delay = Math.min(1100, Math.max(450, line.length * 40));
      setTimeout(() => {
        setBotTyping(false);
        setMessages((m) => [...m, { who: "bot", text: line }]);
        i += 1;
        setTimeout(showNext, 220);
      }, delay);
    };
    showNext();
  };

  // 인트로 자동 시작
  useEffect(() => {
    pushBotLines(
      [
        "안녕하세요, 모두의사업친구예요 😊",
        // 의미 단위로 직접 줄바꿈(\n) → 화면 폭과 무관하게 항상 깔끔하게 끊김
        `총 ${TOTAL_ROUGH}개 정도의 질문이에요.\n정확히 답하실수록 더 정확한 결과를\n받을 수 있으니 꼼꼼히 답변 부탁드려요!`,
        "그럼 시작해 볼게요! 👇",
      ],
      () => askStep(0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onlyIf 조건을 만족하는 다음 스텝 인덱스 찾기(조건 불충족은 건너뜀)
  //  ★ fState를 명시적으로 받아 stale closure 문제를 피한다 ★
  //   (예: businessType 선택 직후 자본잠식(법인 전용) 판정에 최신 값이 필요)
  const nextValidIdx = (from: number, fState: any): number => {
    let i = from;
    while (i < CHAT_STEPS.length) {
      const s = CHAT_STEPS[i];
      if (!s.onlyIf || s.onlyIf(fState)) return i;
      i += 1;
    }
    return CHAT_STEPS.length;
  };

  const askStep = (idx: number, fState?: any) => {
    const cur = fState ?? form;
    const vi = nextValidIdx(idx, cur);
    if (vi >= CHAT_STEPS.length) { finish(cur); return; }
    // 이 스텝을 물어보기 직전 상태를 히스토리에 기록(되돌아가기용).
    //  msgLen은 '질문 말풍선이 붙기 전' 메시지 개수 → 되감을 때 여기까지 잘라낸다.
    setMessages((m) => {
      setHistory((h) => [...h, { idx: vi, formBefore: cur, msgLen: m.length }]);
      return m;
    });
    setStepIdx(vi);
    setShowAll(false);
    setMultiTemp([]);
    setTextTemp("");
    setRegionEtc(false);
    setNameTemp("");
    setPhoneTemp("");
    setGroupTemp({});
    setCheckTemp([]);
    setBnoMsg(null);
    setBnoServerDown(false);
    // ★ 대표님 요청 ★ 질문+힌트가 2줄로 나뉘던 것을 '한 말풍선'으로 묶어서 표시(모든 곳).
    //   여러 줄(botLines)을 \n으로 이어 하나의 말풍선으로 렌더한다. (BotBubble이 whitespace-pre-line)
    pushBotLines([CHAT_STEPS[vi].botLines.filter(Boolean).join("\n")]);
  };

  // ── 이전 질문으로 되돌아가기(답변 수정) ──
  //  마지막으로 기록된 히스토리(=현재 질문)를 버리고, 그 이전 질문을 다시 물어본다.
  const goBack = () => {
    if (botTyping || submitting) return;
    if (history.length < 2) return; // 첫 질문이면 되돌릴 곳이 없음
    // 현재 질문 기록 제거 → 이전 질문 기록이 목표
    const prev = history[history.length - 2];
    // prev.idx보다 뒤의 히스토리는 모두 제거(그 지점부터 다시 진행)
    setHistory((h) => h.slice(0, h.length - 2));
    // 메시지를 이전 질문 직전까지 잘라냄
    setMessages((m) => m.slice(0, prev.msgLen));
    // form을 이전 질문 직전 상태로 복원
    setForm(prev.formBefore);
    setStepIdx(-2); // 재질문 준비(임시). askStep이 다시 세팅.
    setShowAll(false);
    setBnoMsg(null);
    setBnoServerDown(false);
    // 이전 질문을 다시 물어본다.
    setTimeout(() => askStep(prev.idx, prev.formBefore), 60);
  };

  // 단일 선택
  const answerSingle = (opt: string) => {
    const step = CHAT_STEPS[stepIdx];
    // 결격사유(회생·파산/세금/자본잠식) 선택 시 안내만 추가하고 계속 진행(기존 폼도 진행은 시킴)
    const next = { ...form, [step.key]: opt };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: opt }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  const toggleMulti = (opt: string) =>
    setMultiTemp((arr) => (arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]));

  // singleSelect(라디오식) multi: 하나만 골라 즉시 저장·다음으로. 저장 값은 [opt] 배열 → 매칭 구조 불변.
  const answerMultiSingle = (opt: string) => {
    const step = CHAT_STEPS[stepIdx];
    const next = { ...form, [step.key]: [opt] };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: step.labelFull?.[opt] || opt }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  const confirmMulti = () => {
    if (multiTemp.length === 0) return;
    const step = CHAT_STEPS[stepIdx];
    const next = { ...form, [step.key]: multiTemp };
    setForm(next);
    // 화면 표기는 풀네임(labelFull)으로, 저장 값은 원본(multiTemp) 그대로.
    const shown = multiTemp.map((v) => step.labelFull?.[v] || v).join(", ");
    setMessages((m) => [...m, { who: "user", text: shown }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 성함 + 연락처(한 스텝) 확정
  const confirmContact = () => {
    const name = nameTemp.trim();
    const phone = phoneTemp.trim();
    const digits = phone.replace(/[^0-9]/g, "");
    if (!name || digits.length < 10) return;
    const next = { ...form, name, phone };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: `${name} · ${phone}` }]);
    savePartial(next); // 성함·연락처 확보 시 부분 리드 저장(기존 폼과 동일 전략)
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 예/아니요 묶음(yesnoGroup) — 하위 문항 선택
  const pickGroup = (subKey: string, opt: string) =>
    setGroupTemp((g) => ({ ...g, [subKey]: opt }));

  const confirmYesnoGroup = () => {
    const step = CHAT_STEPS[stepIdx];
    const subs = step.subs || [];
    if (subs.some((s) => !groupTemp[s.key])) return; // 전부 답해야 진행
    const next = { ...form };
    subs.forEach((s) => { next[s.key] = groupTemp[s.key]; });
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: subs.map((s) => groupTemp[s.key]).join(" / ") }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 체크리스트(checkGroup) — 체크=예, 미체크=아니요
  const toggleCheck = (subKey: string) =>
    setCheckTemp((arr) => (arr.includes(subKey) ? arr.filter((x) => x !== subKey) : [...arr, subKey]));

  const confirmCheckGroup = () => {
    const step = CHAT_STEPS[stepIdx];
    const subs = step.subs || [];
    const yes = step.checkYes ?? "예";
    const no = step.checkNo ?? "아니요";
    const next = { ...form };
    subs.forEach((s) => { next[s.key] = checkTemp.includes(s.key) ? yes : no; });
    setForm(next);
    const picked = subs.filter((s) => checkTemp.includes(s.key)).map((s) => s.label.replace(/^[^가-힣a-zA-Z]+/, "").trim());
    setMessages((m) => [...m, { who: "user", text: picked.length ? picked.join(", ") : "해당 없음" }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 텍스트/전화 입력
  const confirmText = () => {
    const step = CHAT_STEPS[stepIdx];
    const raw = textTemp.trim();
    if (!raw) return;
    if (step.type === "phone") {
      const digits = raw.replace(/[^0-9]/g, "");
      if (digits.length < 10) return;
    }
    const next = { ...form, [step.key]: raw };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: raw }]);
    // 1단계 성함·연락처까지 마쳤으면 부분 리드 저장(기존 폼과 동일 전략)
    if (step.key === "phone") savePartial(next);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 지역 선택(칩) / 기타 직접입력
  const answerRegion = (opt: string) => {
    if (opt === "기타") { setRegionEtc(true); setTextTemp(""); return; }
    const next = { ...form, region: opt };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: opt }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };
  const confirmRegionEtc = () => {
    const raw = textTemp.trim();
    if (!raw) return;
    const next = { ...form, region: raw };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: raw }]);
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // ── 사업자번호 국세청 조회 (기존 /api/business-status 그대로) ──
  const tryFetchBno = async (digits: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch("/api/business-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bno: digits }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.ok && data.found) return { kind: "found" as const, data };
      if (data.serverError) return { kind: "serverDown" as const, data };
      return { kind: "answered" as const, data };
    } catch {
      return { kind: "serverDown" as const, data: { ok: false, serverError: true, message: BNO_TEXT.errorServer } };
    } finally {
      clearTimeout(timer);
    }
  };

  const checkBno = async () => {
    const digits = textTemp.replace(/[^0-9]/g, "");
    setBnoMsg(null);
    setBnoServerDown(false);
    if (digits.length !== 10) return; // 10자리 아니면 조용히 대기(기존 폼과 동일)
    setBnoLoading(true);
    try {
      let r = await tryFetchBno(digits);
      if (r.kind === "serverDown") {
        await new Promise((res) => setTimeout(res, 1200));
        r = await tryFetchBno(digits);
      }
      if (r.kind === "found") {
        // 저장값은 기존 폼과 동일
        const next = { ...form, bno: digits, bnoStatus: r.data.status, bnoTaxType: r.data.taxType, bnoVerified: true };
        setForm(next);
        setMessages((m) => [...m, { who: "user", text: textTemp.trim() }]);
        const okIcon = r.data.statusCode === "01" ? "✅" : "⚠️";
        pushBotLines([`${okIcon} 국세청 확인 완료 - 사업자 상태 : ${r.data.status}${r.data.taxType ? ` (${r.data.taxType})` : ""}`], () =>
          askStep(stepIdx + 1, next)
        );
        return;
      }
      if (r.kind === "serverDown") {
        setBnoServerDown(true);
        setBnoMsg({ tone: "info", text: "지금은 국세청 조회 서버 점검 시간이에요. 아래 '직접 입력하고 계속하기'로 진행하실 수 있어요." });
        return;
      }
      // 미등록/형식오류
      setBnoMsg({ tone: "err", text: r.data.message || BNO_TEXT.errorNotFound });
    } finally {
      setBnoLoading(false);
    }
  };

  // 국세청 장애 시 수동 접수(기존 confirmManualBno과 동일 저장)
  const confirmManualBno = () => {
    const digits = textTemp.replace(/[^0-9]/g, "");
    if (digits.length !== 10) return;
    const next = { ...form, bno: digits, bnoStatus: "국세청 점검으로 자동확인 없이 접수", bnoTaxType: "", bnoVerified: false };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: textTemp.trim() }]);
    pushBotLines(["✅ 사업자등록번호가 접수되었어요. 자동확인은 추후 처리됩니다."], () => askStep(stepIdx + 1, next));
  };

  // 예비창업자(사업자번호 없이 진행) — businessType='예비'로 세팅 후 bno 스텝 건너뜀
  const choosePreStartup = () => {
    const next = { ...form, businessType: "예비" };
    setForm(next);
    setMessages((m) => [...m, { who: "user", text: "예비창업자예요 (사업자등록 전)" }]);
    // bno 스텝 다음(name)으로 진행. businessType='예비'가 세팅되므로
    // businessType 질문 스텝은 onlyIf 가드로 자동 스킵되고,
    // 법인 전용 자본잠식 스텝도 onlyIf(법인)로 자동 스킵된다. (기존 폼과 동일 값 "예비")
    pushBotLines(["예비창업자로 진행할게요! 창업 준비 단계에 맞는 지원도 함께 찾아드려요."], () => askStep(stepIdx + 1, next));
  };

  // 부분 리드 저장(관리자 계정 제외)
  const savePartial = async (f: any) => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      const uemail = data.session?.user?.email ?? null;
      if (!isStatsExcludedEmail(uemail)) await savePartialLead(f, uid);
    } catch { /* noop */ }
  };

  // ── 제출(결과로 이동) — 기존 submit 로직 그대로 ──
  const finish = (fState?: any) => {
    if (submitting) return;
    setSubmitting(true);
    setFinished(true);
    // 최신 form(마지막 답변 반영)을 기준으로 제출. stale closure 방지.
    const payload: any = { ...(fState ?? form) };
    // 담보 자동세팅 + 심층질문 미응답 기본값(기존 폼과 100% 동일)
    if (!payload.collateral) payload.collateral = "없음";
    ["revenueGrowth2y", "smartDevice", "wantsRefinance", "reFounder", "govSelected", "privateInvestment"].forEach((k) => {
      if (!payload[k]) payload[k] = "아니요";
    });
    pushBotLines(["입력해 주신 내용으로 딱 맞는 정부지원사업을 찾고 있어요… 🔎"]);
    (async () => {
      const RESULT_URL = "/matching-preview?analyze=1";
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;
        saveDiagnosis(payload, user?.id ?? null);
        clearDiagnosisDraft();
        trackConversion("SubmitApplication");
        if (!isStatsExcludedEmail(user?.email)) await saveCompletedDiagnosis(payload, user?.id ?? null);
        if (user) { router.push(RESULT_URL); return; }
        router.push(`/signup?next=${encodeURIComponent(RESULT_URL)}`);
      } catch {
        router.push(RESULT_URL);
      }
    })();
  };

  // 진행률(%) — 답한 스텝 수 기준(대략)
  const answered = messages.filter((m) => m.who === "user").length;
  const progress = Math.min(100, Math.round((answered / TOTAL_ROUGH) * 100));

  // 현재 form 기준으로 실제 노출되는(onlyIf 통과) 스텝만 세어 "N번째 / 전체 M개" 계산
  const visibleSteps = CHAT_STEPS.filter((s) => !s.onlyIf || s.onlyIf(form));
  const totalSteps = visibleSteps.length;
  // 현재 stepIdx가 노출 스텝 중 몇 번째인지(1-base). 인트로(-1 등)면 0.
  const curStepNo =
    stepIdx >= 0 && stepIdx < CHAT_STEPS.length
      ? visibleSteps.findIndex((s) => s.key === CHAT_STEPS[stepIdx].key) + 1
      : 0;

  const curStep = stepIdx >= 0 && stepIdx < CHAT_STEPS.length ? CHAT_STEPS[stepIdx] : null;
  const lastMsg = messages[messages.length - 1];
  const showInput = !!curStep && !botTyping && lastMsg?.who === "bot" && !finished;

  return (
    <PageShell pageKey="diagnosis">
      <Header />
      {/* ★ 하단 흔들림 방지(대표님 요청) ★
          질문마다 콘텐츠 높이가 달라 푸터가 위아래로 움직이던 문제를 해결.
          본문에 '화면 높이 - 헤더'만큼의 최소 높이를 줘, 콘텐츠가 짧아도 항상
          화면을 꽉 채우게 한다 → 푸터는 늘 화면 밖(스크롤해야 보이는 하단)에 고정. */}
      <main className="min-h-[calc(100vh-72px)] px-4 pb-16 pt-6">
        <div className="mx-auto max-w-2xl">
          {/* 진행률 바 */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-gray">
              <span>
                무료진단
                {curStepNo > 0 && !finished && (
                  <span className="ml-1.5 text-brand-orange">
                    {curStepNo}번째 질문 <span className="text-brand-gray/70">/ 전체 {totalSteps}개</span>
                  </span>
                )}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-brand-grad transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* 대화 영역 — 지난 질문은 자동으로 접고 현재 질문 위주로 보여준다.
              ★ 하단 흔들림 방지(대표님 요청): 질문마다 옵션/입력 개수가 달라
              박스 높이가 튀던 문제를 막기 위해 대화 영역에 '최소 높이'를 준다.
              콘텐츠가 짧아도 이 높이만큼은 항상 확보돼, 아래 답변영역·푸터가
              위아래로 흔들리지 않는다. 콘텐츠가 길면 자연스럽게 늘어난다. */}
          <div className="flex min-h-[46vh] flex-col justify-end rounded-2xl border border-gray-100 bg-gray-50/60 p-4 shadow-card">
            <div className="flex flex-col gap-3">
              {(() => {
                // 최근 N개만 노출(=현재 질문 위주). 나머지는 접어서 위로 올린다.
                const KEEP = 4;
                const hiddenCount = showAll ? 0 : Math.max(0, messages.length - KEEP);
                const visible = showAll ? messages : messages.slice(hiddenCount);
                return (
                  <>
                    {hiddenCount > 0 && (
                      <button
                        onClick={() => setShowAll(true)}
                        className="mx-auto rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        ▲ 지난 대화 {hiddenCount}개 펼쳐보기
                      </button>
                    )}
                    {showAll && messages.length > KEEP && (
                      <button
                        onClick={() => setShowAll(false)}
                        className="mx-auto rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        ▼ 지난 대화 접기
                      </button>
                    )}
                    {visible.map((m, i) => {
                      const realIdx = (showAll ? 0 : hiddenCount) + i;
                      const isLastBot = realIdx === messages.length - 1 && m.who === "bot";
                      return m.who === "bot" ? (
                        <div key={realIdx} ref={isLastBot ? focusRef : undefined}>
                          <BotBubble text={m.text} />
                        </div>
                      ) : (
                        <UserBubble key={realIdx} text={m.text} />
                      );
                    })}
                  </>
                );
              })()}
              {botTyping && <TypingBubble />}
            </div>
          </div>

          {/* 답변 영역 — 화면 하단에 고정(sticky). 모바일에서 질문·보기·입력이 항상
              화면 아래쪽 보기 좋은 위치에 오고, 키보드가 떠도 가려지지 않게 함(대표님 요청). */}
          {showInput && curStep && (
            <div ref={answerRef} className="sticky bottom-3 z-20 mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)]">
              {/* 이전 질문으로 되돌아가 답변을 고칠 수 있는 버튼 */}
              {history.length >= 2 && (
                <button
                  onClick={goBack}
                  className="mb-2.5 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                >
                  ← 이전 질문 수정
                </button>
              )}
              {/* 복수 선택 */}
              {curStep.type === "multi" && (
                <>
                  <div className={`grid gap-2 ${COLS_CLASS[autoCols((curStep.opts || []).map((o) => curStep.labelFull?.[o] || o))]}`}>
                    {(curStep.opts || []).map((o) => {
                      const active = multiTemp.includes(o);
                      return (
                        <button
                          key={o}
                          // singleSelect면 하나만 즉시 선택·다음으로(라디오), 아니면 복수 토글.
                          onClick={() => (curStep.singleSelect ? answerMultiSingle(o) : toggleMulti(o))}
                          className={`break-keep rounded-full border px-3 py-2.5 text-[13px] font-semibold transition ${
                            active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
                          }`}
                        >
                          {curStep.labelFull?.[o] || o}
                        </button>
                      );
                    })}
                  </div>
                  {/* singleSelect(라디오)는 '완료' 버튼 없이 클릭 즉시 진행 → 완료 버튼 숨김 */}
                  {!curStep.singleSelect && (
                    <button
                      onClick={confirmMulti}
                      disabled={multiTemp.length === 0}
                      className="mt-3 w-full rounded-full bg-brand-grad py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40"
                    >
                      {multiTemp.length > 0 ? `${multiTemp.length}개 선택 완료 →` : "하나 이상 선택해 주세요"}
                    </button>
                  )}
                </>
              )}

              {/* 단일 선택 — cols 지정 시 우선, 없으면 글자 길이 자동 배치(C안) */}
              {curStep.type === "single" && (
                <div className={`grid gap-2 ${COLS_CLASS[curStep.cols ?? autoCols(curStep.opts || [])]}`}>
                  {(curStep.opts || []).map((o) => (
                    <button
                      key={o}
                      onClick={() => answerSingle(o)}
                      className="break-keep rounded-full border border-gray-300 bg-white px-2 py-2.5 text-[13px] font-semibold text-brand-dark transition hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}

              {/* 성함 + 연락처 (한 스텝) — 세로가 아니라 가로 2칸(대표님 요청) */}
              {curStep.type === "contact" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameTemp}
                      onChange={(e) => setNameTemp(e.target.value)}
                      placeholder={CONTACT_TEXT.namePlaceholder}
                      autoFocus
                      className="min-w-0 flex-[2] rounded-full border border-gray-300 bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phoneTemp}
                      onChange={(e) => setPhoneTemp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && confirmContact()}
                      placeholder={CONTACT_TEXT.phonePlaceholder}
                      className="min-w-0 flex-[3] rounded-full border border-gray-300 bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                    />
                  </div>
                  <button
                    onClick={confirmContact}
                    disabled={!nameTemp.trim() || phoneTemp.replace(/[^0-9]/g, "").length < 10}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    입력 완료 →
                  </button>
                </div>
              )}

              {/* 예/아니요 묶음(yesnoGroup) — 하위 문항마다 예/아니요 */}
              {curStep.type === "yesnoGroup" && (
                <div className="flex flex-col gap-3">
                  {(curStep.subs || []).map((sub) => (
                    <div key={sub.key}>
                      <p className="mb-1.5 break-keep px-1 text-sm font-semibold text-brand-dark">{sub.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(sub.opts || ["예", "아니요"]).map((o) => {
                          const active = groupTemp[sub.key] === o;
                          return (
                            <button
                              key={o}
                              onClick={() => pickGroup(sub.key, o)}
                              className={`break-keep rounded-full border px-2 py-2.5 text-[13px] font-semibold transition ${
                                active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
                              }`}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={confirmYesnoGroup}
                    disabled={(curStep.subs || []).some((s) => !groupTemp[s.key])}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    다음 →
                  </button>
                </div>
              )}

              {/* 체크리스트(checkGroup) — 해당되는 것만 체크 */}
              {curStep.type === "checkGroup" && (
                <div className="flex flex-col gap-2">
                  {(curStep.subs || []).map((sub) => {
                    const active = checkTemp.includes(sub.key);
                    return (
                      <button
                        key={sub.key}
                        onClick={() => toggleCheck(sub.key)}
                        className={`flex items-center gap-3 break-keep rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          active ? "border-brand-orange bg-brand-orange/10 text-brand-dark" : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                            active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-gray-300 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{sub.label}</span>
                          {sub.desc && (
                            <span className="mt-0.5 block text-[11px] font-medium leading-tight text-brand-gray">{sub.desc}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    onClick={confirmCheckGroup}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-sm font-extrabold text-brand-dark"
                  >
                    {checkTemp.length > 0 ? `${checkTemp.length}개 선택 완료 →` : "해당 없음 →"}
                  </button>
                </div>
              )}

              {/* 지역: 칩 + 기타 직접입력 */}
              {curStep.type === "region" && (
                <>
                  {!regionEtc ? (
                    <div className="grid grid-cols-4 gap-2">
                      {(curStep.opts || []).map((o) => (
                        <button
                          key={o}
                          onClick={() => answerRegion(o)}
                          className="rounded-full border border-gray-300 bg-white px-1 py-2.5 text-[13px] font-semibold text-brand-dark transition hover:border-brand-orange"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={textTemp}
                        onChange={(e) => setTextTemp(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmRegionEtc()}
                        placeholder="지역을 직접 입력해 주세요 (예: 00도 00시)"
                        autoFocus
                        className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                      />
                      <button onClick={confirmRegionEtc} disabled={!textTemp.trim()} className="shrink-0 rounded-full bg-brand-grad px-5 py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40">
                        입력 →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* 성함 / 연락처 입력 */}
              {(curStep.type === "text" || curStep.type === "phone") && (
                <div className="flex items-center gap-2">
                  <input
                    type={curStep.type === "text" ? "text" : "tel"}
                    inputMode={curStep.type === "text" ? "text" : "numeric"}
                    value={textTemp}
                    onChange={(e) => setTextTemp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmText()}
                    placeholder={curStep.placeholder}
                    autoFocus
                    className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                  />
                  <button onClick={confirmText} disabled={!textTemp.trim()} className="shrink-0 rounded-full bg-brand-grad px-5 py-3 text-sm font-extrabold text-brand-dark disabled:opacity-40">
                    입력 →
                  </button>
                </div>
              )}

              {/* 사업자번호: 입력 + 조회 + 예비창업자 + 상태메시지 */}
              {curStep.type === "bno" && (() => {
                // 숫자만 추린 자리수 → 10자리여야 조회 버튼 활성화(성함·연락처 입력칸과 동일 UX)
                const bnoDigits = textTemp.replace(/[^0-9]/g, "").length;
                const bnoReady = bnoDigits === 10;
                return (
                <>
                  {/* 입력칸은 살짝 줄이고(flex-[3]) 조회 버튼은 넓게(flex-[2]) — 대표님 요청 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={12}
                      value={textTemp}
                      onChange={(e) => setTextTemp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && bnoReady && checkBno()}
                      placeholder={curStep.placeholder}
                      autoFocus
                      className="min-w-0 flex-[3] rounded-full border border-gray-300 bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                    />
                    <button
                      onClick={checkBno}
                      disabled={bnoLoading || !bnoReady}
                      className={`flex-[2] shrink-0 whitespace-nowrap rounded-full px-4 py-3 text-sm font-extrabold text-brand-dark transition-all duration-300 disabled:cursor-not-allowed ${
                        bnoReady
                          ? "bg-brand-grad shadow-sm"
                          : "bg-brand-orange/25 text-brand-dark/40"
                      }`}
                    >
                      {bnoLoading ? "조회 중…" : "사업자등록번호 조회 →"}
                    </button>
                  </div>
                  <button onClick={choosePreStartup} className="mt-2 w-full rounded-full border border-brand-orange bg-white py-2.5 text-sm font-bold text-brand-orange transition hover:bg-brand-orange/5">
                    아직 사업자등록 전이에요 (예비창업자)
                  </button>
                  {bnoMsg && (
                    <div className={`mt-2 rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      bnoMsg.tone === "err" ? "bg-brand-red/10 text-brand-red" : bnoMsg.tone === "ok" ? "bg-brand-green/10 text-brand-dark" : "bg-brand-orange/10 text-brand-dark"
                    }`}>
                      {bnoMsg.text}
                      {bnoServerDown && (
                        <button onClick={confirmManualBno} className="mt-2 block w-full rounded-full bg-brand-grad py-2 text-xs font-extrabold text-brand-dark">
                          직접 입력하고 계속하기 →
                        </button>
                      )}
                    </div>
                  )}
                </>
                );
              })()}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}

// ── 봇 아바타 (로고 그대로 · 둥근 사각형) ──
function BotAvatar() {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
      <Image src="/logo-icon.png" alt="모두의사업친구" width={36} height={36} className="h-full w-full object-cover" />
    </div>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="max-w-[88%] whitespace-pre-line break-keep rounded-2xl rounded-bl-md border border-white bg-white px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] whitespace-pre-line break-keep rounded-2xl rounded-br-md border border-white bg-brand-grad px-4 py-3 text-sm font-semibold leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="rounded-2xl rounded-bl-md border border-white bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-gray" />
        </div>
      </div>
    </div>
  );
}
