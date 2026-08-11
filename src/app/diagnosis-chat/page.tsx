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

import { useState, useEffect, useRef, memo, type ReactNode } from "react";
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
  getPaymentBlockReasons,
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
  | "bizEligibility" // ★ 사업자 구분 + 자격확인(회생·파산/세금완납)을 한 화면에서(대표님 요청)
  | "bnoContact" // 사업자번호 + 성함 + 연락처를 한 화면에서(맨 마지막·결과 직전)
  | "region"
  | "contact" // 성함 + 연락처를 한 스텝에서 입력
  | "yesnoGroup" // 예/아니요 문항 여러 개를 한 스텝에서(각각 라디오)
  | "singleGroup" // 단일선택 문항 여러 개를 한 스텝에서(각 문항 = 보기 중 하나 선택)
  | "multiGroup" // 복수선택 문항 여러 개를 한 스텝에서(각 문항 = 여러 개 선택 or 라디오)
  | "checkGroup"; // 해당되는 것만 체크 → 체크=예, 나머지=아니요
// yes/no 묶음 문항 하나
type SubQ = {
  key: string;
  label: string;
  opts?: string[];
  desc?: string;
  hint?: string;
  cols?: 1 | 2 | 3;
  // multiGroup 전용: 이 하위문항을 '하나만' 고르게(라디오식). 저장은 [선택값] 배열 유지.
  singleSelect?: boolean;
  // multiGroup 전용: 저장을 배열이 아니라 '단일 문자열'로(예: businessType). 자동으로 라디오식.
  //  · 매칭 로직이 스칼라를 기대하는 필드(businessType 등)를 묶음 화면에 넣을 때 사용.
  scalar?: boolean;
  // 이 하위문항을 조건부로만 노출(예: 예비창업자면 사업자 구분은 숨김).
  subOnlyIf?: (form: any) => boolean;
  // 화면 표기만 풀네임으로(저장/매칭 값은 opts 원본). 예: 소진공→소상공인시장진흥공단
  labelFull?: Record<string, string>;
};
type ChatStep = {
  key: string;
  type: StepType;
  botLines: string[];
  // 답변영역 상단 'Q.' 제목을 botLines[0] 대신 별도로 지정할 때 사용(대표님 요청).
  //   예: bno 단계 말풍선 첫 줄은 '그럼 시작해 볼게요! 👇'지만, Q. 제목은 '사업자등록번호 및 사업자 구분 👇'.
  questionHead?: string;
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
  // ★ 순서 변경 (대표님 요청) ★ 애초에 '안 될 사람'(회생·파산 중/세금 체납)은 자격확인에서
  //   먼저 걸러내고, 통과한 분에게만 성함·연락처를 받는다.
  //   → (1) 사업자번호·구분 → (2) 자격확인 → (3) 성함·연락처(신설) 순.
  //   이렇게 하면 탈락자에게는 개인정보를 요구하지 않아 이탈·컴플레인이 줄어든다.
  {
    // ★ 화면 통합 (대표님 요청) ★ '사업자 구분' + '신청 자격 확인(회생·파산/세금완납)'을 한 화면에서.
    //   (사업자번호·성함·연락처는 진단을 다 마친 '맨 뒤'로 이동 → 초반 이탈 방지)
    //   사업자 구분(businessType)은 뒤 자본잠식(법인 전용) 판정에 필요하므로 앞에 남긴다.
    //   ★ 대표님 요청 ★ 자격확인에서 '파산·회생 중' 또는 '세금 미납/체납'이면 탈락 → 종료 화면으로.
    //     (confirmBizEligibility에서 getPaymentBlockReasons로 판정)
    key: "bizEligibility",
    type: "bizEligibility",
    botLines: [
      "그럼 시작해 볼게요! 👇",
      "",
      "사업자 구분과\n신청 자격을 먼저 확인할게요.",
    ],
    questionHead: "사업자 구분을 선택해 주세요 👇",
    subs: [
      { key: "bankruptcy", label: "현재 회생·파산 절차가 진행 중이신가요?", opts: STEP3_FIELDS.bankruptcy.opts },
      { key: "taxDelinquent", label: "국세·지방세는 완납 상태이신가요?", opts: STEP3_FIELDS.taxDelinquent.opts },
    ],
  },
  // ★ 순서 개편 (대표님 요청) ★ 사업자번호·성함·연락처는 맨 마지막(deepChecks 다음)으로 이동.
  //   → 아래 CHAT_STEPS 끝의 'bnoContact' 스텝 참고.
  // ★ Q3 대표님 정보(대표님 요청: 자격확인 바로 다음으로 이동) ★
  //   연령대·신용점수를 한 스텝으로 묶는다. 저장 값(age/credit) 동일 → 매칭 결과 불변.
  {
    key: "ownerGroup",
    type: "singleGroup",
    botLines: ["대표님에 대해 알려주세요.", "연령대와 신용점수를 골라주세요."],
    subs: [
      // 연령대는 라벨이 길어("만 34세 이하") 3열에선 줄바꿈이 어색 → 아래 신용점수와 동일하게 2열로 두어 한 줄로 시원하게 표시(매칭값 그대로 유지).
      { key: "age", label: "대표님 연령대", hint: "청년 창업·세제감면 판정에 필요해요.", opts: STEP1_FIELDS.age.opts, cols: 2 },
      // ★ 안심 문구(대표님 요청) ★ 신용점수는 이탈 방어 지점 → "낮아도 가능"을 명시.
      { key: "credit", label: "대표자 개인 신용점수", hint: "점수가 낮아도 신청 가능한 상품이 있으니 편하게 골라주세요. " + STEP3_FIELDS.credit.hint, opts: STEP3_FIELDS.credit.opts },
    ],
  },
  // ★ Q4 사업장 업종 및 지역(대표님 요청) ★
  //   사업자 구분(businessType)은 Q1(bno) 화면으로 이동했으므로 여기선 업종+지역만.
  //   · industries(복수) + region(단일·스칼라) 2문항.
  //   · 지역(region)은 단일값이라 scalar 저장. '기타' 선택 시 인라인 직접입력창 노출(2열 2줄).
  //   저장 form 값(industries 배열 / region 스칼라)은 개별 스텝과 100% 동일 → 매칭 결과 불변.
  {
    key: "bizGroup",
    type: "multiGroup",
    botLines: ["사업자 업종 및 지역을 알려주세요."],
    subs: [
      {
        key: "industries",
        label: "업종 (복수 선택 가능)",
        opts: STEP1_FIELDS.industries.opts,
      },
      {
        key: "region",
        label: "사업장 지역",
        opts: STEP1_FIELDS.region.opts,
        scalar: true, // 단일 문자열 저장. '기타' 선택 시 인라인 입력창 노출.
        cols: 2, // ★ 대표님 요청 ★ 2열 2줄(서울 경기 / 인천 기타) 고정
      },
    ],
  },
  // 자본잠식은 법인사업자만 (businessType은 Q1 bno 화면에서 확정됨 → 여기서 판정)
  {
    key: "capitalImpairment",
    type: "single",
    botLines: ["법인 자본잠식 상태인가요?", STEP3_FIELDS.capitalImpairment.hint],
    opts: STEP3_FIELDS.capitalImpairment.opts,
    onlyIf: (f) => f.businessType === "법인사업자",
  },
  // ★ 사업 규모 묶음(대표님 요청: 같은 카테고리는 한 화면에서 쭉 답변) ★
  //   업력·연매출·직원수를 한 스텝(singleGroup)으로 묶는다.
  //   저장 값(years/revenue/employees)은 개별 질문일 때와 100% 동일 → 매칭 결과 불변.
  {
    key: "sizeGroup",
    type: "singleGroup",
    botLines: ["사업 규모를 한 번에 알려주세요.", "아래 세 가지만 골라주세요."],
    subs: [
      { key: "years", label: "사업자등록증상 업력", opts: STEP1_FIELDS.years.opts, cols: 3 },
      { key: "revenue", label: "연매출 규모", opts: STEP1_FIELDS.revenue.opts, cols: 3 },
      { key: "employees", label: "직원 수", hint: STEP2_FIELDS.employees.hint, opts: STEP2_FIELDS.employees.opts, cols: 3 },
    ],
  },
  // ── 2단계 · 회사 정보 ──
  //  ★ 대표님 요청 ★ 지역(region)은 앞의 bizGroup(구분·업종·지역)으로 이동.
  //    → 여기 companyGroupA는 현재기관 + 필요사업 2문항만 남김. (화면당 최대 3문항 원칙 유지)
  //    · 화면A(≤2): 현재기관 + 필요사업
  //    · 화면B(≤2): 혁신성장 + 특허인증
  //  각 문항의 저장값 구조는 개별 스텝과 동일 → 매칭 결과 불변.
  {
    key: "companyGroupA",
    type: "multiGroup",
    botLines: ["회사 상황을 알려주세요. (1/2)", "해당되는 걸 골라주세요."],
    subs: [
      // ★ 순서 변경 (대표님 요청) ★ '대표님이 필요한 정부지원사업'을 '현재 이용 중인 정책기관' 위로.
      {
        key: "purposes",
        label: "대표님이 필요한 정부지원사업",
        hint: STEP2_FIELDS.purposes.hint,
        opts: STEP2_FIELDS.purposes.opts,
      },
      {
        key: "currentInstitutions",
        label: "현재 이용 중인 정책기관",
        hint: STEP2_FIELDS.currentInstitutions.hint,
        opts: STEP2_FIELDS.currentInstitutions.opts,
        labelFull: (STEP2_FIELDS.currentInstitutions as any).labelFull,
      },
    ],
  },
  {
    key: "companyGroupB",
    type: "multiGroup",
    botLines: ["회사 상황을 알려주세요. (2/2)", "해당되는 걸 골라주세요."],
    subs: [
      // ★ 순서 변경 (대표님 요청) ★ '보유 특허·인증'을 '혁신성장 분야 해당 여부' 위로.
      {
        key: "certifications",
        label: "보유 특허·인증",
        hint: STEP3_FIELDS.certifications.hint,
        opts: STEP3_FIELDS.certifications.opts,
      },
      {
        key: "innovation",
        label: "혁신성장 분야 해당 여부",
        hint: STEP3_FIELDS.innovation.hint,
        opts: STEP3_FIELDS.innovation.opts,
        singleSelect: true, // 예/아니요 중 하나만(라디오). 저장은 [선택값] 배열 유지.
      },
    ],
  },

  // ── 3단계 · 맞춤 심층 질문 (6개를 '해당되는 것만 체크'로 한 질문에 통합) ──
  //   체크한 항목만 "예", 체크 안 한 항목은 "아니요"로 저장 → 기존 폼의
  //   '미응답=아니요' 로직과 100% 동일. matching 결과 불변.
  {
    key: "deepChecks",
    type: "checkGroup",
    botLines: ["사업장에 해당되는 게 있나요?", "해당되는 항목만 골라주세요."],
    checkYes: "예",
    checkNo: "아니요",
    subs: [
      // ★ 순서 재배열 (대표님 요청) ★ key/저장값·매칭 로직은 그대로, 노출 순서만 변경.
      { key: "reFounder", label: "🔁 폐업 경험이 있고 다시 창업 중이에요", desc: "예: 재창업 7년 이내인 사업자인 경우" },
      { key: "wantsRefinance", label: "🔄 고금리 대출을 저금리로 갈아타고 싶어요", desc: "예: 카드론·2금융 7%↑사용중인 경우" },
      { key: "revenueGrowth2y", label: "📈 최근 2년 연매출이 매년 10% 이상 늘었어요", desc: "예: 2년 연속 10%↑연매출 상승 기업인 경우" },
      { key: "smartDevice", label: "🖥️ 매장에 스마트기기를 쓰고 있어요", desc: "예: 키오스크·테이블오더·무인기기·조리 및 서빙 로봇" },
      { key: "privateInvestment", label: "💵 엔젤·VC 등 민간 투자를 받았거나 진행 중이에요", desc: "예: 투자유치 실적 보유중인 기업인 경우" },
      { key: "govSelected", label: "🏆 정부 선정 프로그램에 뽑힌 적 있어요", desc: "예: 백년가게·TIPS등 선정 된 경우" },
    ],
  },
  // ★ 순서 개편 (대표님 요청) ★ 진단을 다 마친 '맨 마지막'에 사업자번호·성함·연락처를 한 화면에서 받는다.
  //   이미 모든 질문에 답한 상태(매몰비용)라 이탈이 크게 줄고, 국세청 조회가 실패해도(A안)
  //   결과는 그대로 보여주고 연락처는 저장한다. 여기서 savePartial로 리드가 확보된다.
  {
    key: "bnoContact",
    type: "bnoContact",
    botLines: [
      "거의 다 됐어요! 🎉",
      "진단 결과를 정리하고 있어요.",
      "",
      "결과 안내를 위해 마지막으로\n사업자등록번호와 대표자님\n성함·연락처만 알려주세요.",
    ],
    questionHead: "사업자등록번호 · 성함 · 연락처 👇",
    placeholder: BNO_TEXT.placeholder,
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
  if (opts.length === 2) return maxLen <= 11 ? 2 : 1;
  if (maxLen <= 5) return 3; // "1년 미만", "서울" 처럼 짧으면 3열
  if (maxLen <= 12) return 2; // 보통 길이는 2열
  return 1; // 아주 길면 1열(줄바꿈/잘림 방지)
}
const COLS_CLASS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

// ── 옵션 라벨 "본문 [상태]" 2줄 분리 표시 (diagnosis-form 방식과 동일) ──
//  예) "해당 없음 [신청 가능]" → 모바일: '해당 없음' / '[신청 가능]' 2줄 · PC(sm↑): 한 줄 그대로.
//  · 대괄호가 없는 옵션은 원문 그대로 표시.
//  · 반환은 표시(JSX)만 바꿀 뿐, 원본 문자열 값(onClick·판정)은 그대로 유지된다.
function renderOptLabel(label: string): ReactNode {
  const m = label.match(/^(.*?)\s*(\[[^\]]*\])\s*$/);
  if (!m) return label;
  return (
    <>
      {m[1]}
      {/* 모바일: 줄바꿈 · PC(sm 이상): 공백 한 칸으로 한 줄 유지 */}
      <br className="sm:hidden" />
      <span className="hidden sm:inline"> </span>
      {m[2]}
    </>
  );
}

type Msg = { who: "bot"; text: string; wide?: boolean } | { who: "user"; text: string };

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
  // 복수선택 묶음(multiGroup)에서 각 하위 문항의 선택 배열
  const [groupMultiTemp, setGroupMultiTemp] = useState<Record<string, string[]>>({});
  // multiGroup 안의 지역(region) '기타' 직접입력값
  const [groupRegionEtc, setGroupRegionEtc] = useState("");
  // 체크리스트(checkGroup)에서 체크된 하위 문항 key들
  const [checkTemp, setCheckTemp] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  // ★ 대표님 요청 ★ 자격확인 탈락(회생·파산 중/세금 체납) 시 표시하는 종료 상태.
  //   탈락 시엔 성함·연락처를 받지 않고 여기서 깔끔하게 종료한다.
  const [blocked, setBlocked] = useState<null | { reasons: string[] }>(null);
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
  // ★ bno + 성함·연락처를 '한 화면'에서 함께 받는다(대표님 요청) ★
  //  사업자등록번호 · 성함 · 연락처 입력칸을 처음부터 동시에 노출하고, '입력 완료 →' 하나로
  //  (조회했으면 조회값 포함) 전부 저장 후 다음 스텝(eligibility)으로 진행한다.

  // 현재 질문(마지막 봇 말풍선)을 화면 '가운데쯤'으로 스크롤하기 위한 앵커
  const focusRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // ★ 스크롤 모션 최소화(대표님 요청: 질문↔답변 왔다갔다 해서 눈 아픔) ★
  //  기존엔 messages·botTyping·bnoMsg 가 바뀔 때마다(=봇 타이핑 시작/끝, 줄마다)
  //  화면을 center 로 다시 맞춰, 질문지↔답변지로 화면이 위아래로 튀었다.
  //  개선:
  //   1) 의존성에서 botTyping 제거 → 타이핑 점3개가 떴다 사라질 때 스크롤 안 함.
  //   2) 기준을 '답변영역(answerRef) 하단'으로 통일하고 block:"nearest" 사용
  //      → 이미 보이면 아예 안 움직이고, 벗어났을 때만 최소 거리로 살짝 이동.
  //   3) messages 길이가 실제로 늘었을 때만(=새 질문/답변 확정) 스크롤.
  const prevMsgLen = useRef(0);
  useEffect(() => {
    const grew = messages.length > prevMsgLen.current;
    prevMsgLen.current = messages.length;
    if (!grew && !bnoMsg) return; // 타이핑 등 자잘한 변화엔 스크롤하지 않음
    const t = setTimeout(() => {
      const el = answerRef.current || focusRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 120);
    return () => clearTimeout(t);
  }, [messages.length, bnoMsg]);

  // 봇 대사 순차 출력
  //  ★ wide=true면 해당 말풍선들을 '동일 고정 폭'으로 렌더(인트로 안내처럼 폭을 맞추고 싶을 때).
  const pushBotLines = (lines: string[], onDone?: () => void, wide = false) => {
    let i = 0;
    const showNext = () => {
      if (i >= lines.length) { onDone?.(); return; }
      setBotTyping(true);
      const line = lines[i];
      const delay = Math.min(1100, Math.max(450, line.length * 40));
      setTimeout(() => {
        setBotTyping(false);
        setMessages((m) => [...m, { who: "bot", text: line, wide }]);
        i += 1;
        setTimeout(showNext, 220);
      }, delay);
    };
    showNext();
  };

  // 인트로 자동 시작
  useEffect(() => {
    // ★ 대표님 요청 ★ 인트로 안내를 '한 말풍선'으로(줄바꿈은 의미 단위로 직접 \n).
    //   이어지는 bno 안내(말풍선 2)와 함께 가로 폭을 동일(wide)하게 맞춘다.
    pushBotLines(
      [
        `안녕하세요 대표님,\n모두의사업친구예요 😊\n\n대표님 사업장이 받을 수 있는\n정부지원사업을 찾아드릴게요.\n\n진단을 위한 질문은 총 ${TOTAL_ROUGH}개에요.\n정확히 답할수록 정확한 결과를\n받을 수 있으니 답변 잘부탁드려요!`,
      ],
      () => askStep(0),
      true
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
    setGroupMultiTemp({});
    setGroupRegionEtc("");
    setCheckTemp([]);
    setBnoMsg(null);
    setBnoServerDown(false);
    setBlocked(null); // 새 질문으로 넘어가면 탈락 종료 상태 해제
    // ★ 대표님 요청 ★ 질문+힌트가 2줄로 나뉘던 것을 '한 말풍선'으로 묶어서 표시(모든 곳).
    //   여러 줄(botLines)을 \n으로 이어 하나의 말풍선으로 렌더한다. (BotBubble이 whitespace-pre-line)
    //   ※ botLines 안에 빈 문자열("")이 있으면 '문단 사이 빈 줄'을 의도한 것이므로 filter로 지우지 않고
    //     그대로 이어붙여 빈 줄이 살아있게 한다(예: bno 단계 3블록 구분).
    const rawLines = CHAT_STEPS[vi].botLines;
    const bubbleText = rawLines.some((l) => l === "")
      ? rawLines.join("\n") // 빈 줄 의도 → 그대로 유지
      : rawLines.filter(Boolean).join("\n");
    // ★ bizEligibility(첫 스텝)·bnoContact(마지막) 안내는 인트로 말풍선과 가로 폭을 동일(wide)하게 맞춘다.
    pushBotLines([bubbleText], undefined, CHAT_STEPS[vi].type === "bizEligibility" || CHAT_STEPS[vi].type === "bnoContact");
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

  // ★ 화면 통합 (대표님 요청) ★ 사업자 구분 + 자격확인(회생·파산/세금완납)을 한 화면에서 확정.
  //   · businessType(칩) + 하위 자격문항(groupTemp) 모두 선택돼야 진행.
  //   · '파산·회생 중' 또는 '세금 미납/체납'이면 종료 화면으로 차단(getPaymentBlockReasons).
  //   · 사업자번호·성함·연락처는 맨 마지막(bnoContact)에서 받는다.
  const confirmBizEligibility = () => {
    const step = CHAT_STEPS[stepIdx];
    const subs = step.subs || [];
    if (!form.businessType) return; // 구분(개인/법인/예비) 미선택 시 차단
    if (subs.some((s) => !groupTemp[s.key])) return; // 자격 문항 전부 답해야 진행
    const next: any = { ...form };
    subs.forEach((s) => { next[s.key] = groupTemp[s.key]; });
    setForm(next);
    const bizLabel = next.businessType === "예비" ? "예비창업자" : next.businessType;
    const eligLabel = subs.map((s) => groupTemp[s.key]).join(" / ");
    setMessages((m) => [...m, { who: "user", text: `${bizLabel} / ${eligLabel}` }]);
    // ★ 대표님 요청 ★ '파산·회생 중' 또는 '세금 미납/체납'이면 더 진행하지 않고 종료 화면으로.
    const reasons = getPaymentBlockReasons(next);
    const blockingNow = reasons.filter((r) => r === "bankruptcy" || r === "tax");
    if (blockingNow.length > 0) {
      setTimeout(() => setBlocked({ reasons: blockingNow }), 380);
      return;
    }
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // ★ 대표님 확정(2026) ★ 국세청 조회 버튼을 없애고, '진단 결과 확인하기 →' 버튼 하나로
  //   국세청 조회 + 접수 + 진단 결과 진행을 한 번에 처리한다.
  //   핵심: 국세청 조회는 '있으면 좋은' 부가정보일 뿐, 조회가 성공하든/실패하든/느리든
  //   절대 화면을 멈추지 않고 무조건 다음 스텝으로 진행한다(3.5초 타임아웃 tryFetchBno 사용).
  const confirmBnoContact = async () => {
    if (bnoLoading) return; // 중복 클릭 방지
    const isPre = form.businessType === "예비";
    const name = nameTemp.trim();
    const phone = phoneTemp.trim();
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (!name || phoneDigits.length < 10) return; // 성함·연락처는 필수
    const bnoDigits = textTemp.replace(/[^0-9]/g, "");
    // 예비창업자가 아니면 사업자번호가 (이미 저장됨 or 10자리 입력) 준비돼야 진행
    if (!isPre && !form.bno && bnoDigits.length !== 10) return;

    const next: any = { ...form, name, phone };

    // 사업자번호가 새로 입력됐고 아직 검증 전이면 → 국세청 조회를 '한 번' 시도(3.5초 제한).
    // 성공하면 검증정보 저장, 실패/타임아웃이면 '미조회(입력만)'으로 그대로 접수. 어느 경우든 진행은 계속.
    if (!isPre && !form.bno && bnoDigits.length === 10) {
      next.bno = bnoDigits;
      setBnoLoading(true);
      try {
        const r = await tryFetchBno(bnoDigits);
        if (r.kind === "found") {
          next.bnoStatus = r.data.status;
          next.bnoTaxType = r.data.taxType;
          next.bnoVerified = true;
        } else {
          next.bnoStatus = "미조회(입력만)";
          next.bnoTaxType = "";
          next.bnoVerified = false;
        }
      } catch {
        // tryFetchBno는 내부에서 예외를 흡수하지만, 만약을 대비해 여기서도 안전하게 접수 처리
        next.bnoStatus = "미조회(입력만)";
        next.bnoTaxType = "";
        next.bnoVerified = false;
      } finally {
        setBnoLoading(false);
      }
    }

    setForm(next);
    const bnoLabel = next.bno ? `사업자번호 ${next.bno} · ` : isPre ? "예비창업자 · " : "";
    setMessages((m) => [...m, { who: "user", text: `${bnoLabel}${name} · ${phone}` }]);
    savePartial(next); // 성함·연락처 확보 시 부분 리드 저장(영업 명단)
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
    // ★ 대표님 요청 ★ 자격확인(eligibility)에서 '파산·회생 중' 또는 '세금 미납/체납'이면
    //   더 진행하지 않고(성함·연락처도 받지 않고) 종료 화면으로. 잘못 눌렀을 수 있으니 뒤로가기 제공.
    if (step.key === "eligibility") {
      const reasons = getPaymentBlockReasons(next);
      const blockingNow = reasons.filter((r) => r === "bankruptcy" || r === "tax");
      if (blockingNow.length > 0) {
        setTimeout(() => setBlocked({ reasons: blockingNow }), 380);
        return;
      }
    }
    setTimeout(() => askStep(stepIdx + 1, next), 380);
  };

  // 복수선택 묶음(multiGroup) — 하위 문항별 다중 토글 / 라디오
  const toggleGroupMulti = (subKey: string, opt: string) =>
    setGroupMultiTemp((g) => {
      const arr = g[subKey] || [];
      return { ...g, [subKey]: arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt] };
    });
  // singleSelect 하위문항: 하나만(라디오). 같은 걸 다시 누르면 해제.
  const pickGroupMultiSingle = (subKey: string, opt: string) =>
    setGroupMultiTemp((g) => ({ ...g, [subKey]: g[subKey]?.[0] === opt ? [] : [opt] }));

  const confirmMultiGroup = () => {
    const step = CHAT_STEPS[stepIdx];
    // 조건부(subOnlyIf) 하위문항은 조건 불충족 시 제외
    const subs = (step.subs || []).filter((s) => !s.subOnlyIf || s.subOnlyIf(form));
    // 필수 검증: scalar(단일 저장) 하위문항은 반드시 하나 선택해야 진행(예: 사업자 구분).
    if (subs.some((s) => s.scalar && !(groupMultiTemp[s.key] && groupMultiTemp[s.key][0]))) return;
    // 지역 '기타' 선택인데 직접입력이 비어 있으면 진행 불가
    const regionSub = subs.find((s) => s.key === "region");
    if (regionSub && groupMultiTemp["region"]?.[0] === "기타" && !groupRegionEtc.trim()) return;
    const next = { ...form };
    subs.forEach((s) => {
      const picked = groupMultiTemp[s.key] || [];
      if (s.key === "region") {
        // 지역: '기타'면 직접입력값, 아니면 선택 칩
        next.region = picked[0] === "기타" ? groupRegionEtc.trim() : (picked[0] ?? form.region);
      } else {
        next[s.key] = s.scalar ? (picked[0] ?? form[s.key]) : picked; // scalar=단일 문자열, 그 외=배열
      }
    });
    setForm(next);
    // 사용자 말풍선: 각 문항의 선택값(풀네임 표기)을 " / "로 이어 요약. 비어있으면 생략.
    const summary = subs
      .map((s) => {
        if (s.key === "region") {
          const r = groupMultiTemp["region"]?.[0];
          if (!r) return null;
          return r === "기타" ? groupRegionEtc.trim() : r;
        }
        const picked = (groupMultiTemp[s.key] || []).map((v) => s.labelFull?.[v] || v);
        return picked.length ? picked.join(", ") : null;
      })
      .filter(Boolean)
      .join(" / ");
    setMessages((m) => [...m, { who: "user", text: summary || "해당 없음" }]);
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
    // ★ 대표님 요청 ★ 정상 조회는 보통 1~2초. 점검 중이면 오래 기다리게 하지 말고
    //   3.5초만 시도한 뒤 곧바로 '직접 입력하고 계속하기' 폴백을 연다(자동 재시도 없음).
    const timer = setTimeout(() => controller.abort(), 3500);
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

  // ★ 대표님 확정(2026) ★ 기존 '국세청 조회' 버튼용 checkBno / 장애 시 수동접수 confirmManualBno는
  //   버튼 통합으로 제거됨. 국세청 조회는 confirmBnoContact 안에서 3.5초 단발로만 시도한다.

  // ★ 순서 개편(대표님 요청) ★ 예비창업자 선택은 맨 앞 bizType 화면의 '예비창업자' 칩으로 대체됨.
  //   (기존 choosePreStartup 인라인 버튼은 제거)

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
      // ★★ [멈춤 버그 수정] 결과 이동을 서버 저장과 '분리'한다 ★★
      //  기존엔 saveCompletedDiagnosis(Supabase RPC)를 await 로 기다린 뒤에야 router.push 를
      //  실행했다. 그 RPC 가 느리거나(콜드스타트) 응답이 지연되면 "…찾고 있어요" 화면에서
      //  영영 멈춰(사용자 체감: '조회 후 화면 정지') 결과로 못 넘어갔다.
      //  → 세션 확인에는 3초 타임아웃을 걸고, 서버 저장은 '백그라운드(fire-and-forget)'로
      //    던진 뒤 즉시 결과로 이동한다. 결과 화면(matching-preview)이 자체적으로 서버
      //    동기화를 다시 하므로 여기서 저장 완료를 기다릴 필요가 전혀 없다.
      let user: any = null;
      try {
        // getSession 이 멈추는 극단적 케이스까지 방어(3초 타임아웃)
        const sessionRes: any = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000)),
        ]);
        user = sessionRes?.data?.session?.user ?? null;
      } catch {
        user = null;
      }
      try {
        saveDiagnosis(payload, user?.id ?? null);
        clearDiagnosisDraft();
        trackConversion("SubmitApplication");
      } catch { /* 로컬 저장 실패해도 이동은 계속 */ }
      // 서버 저장은 기다리지 않고 백그라운드로만 시도(실패해도 결과엔 영향 없음)
      try {
        if (!isStatsExcludedEmail(user?.email)) {
          void saveCompletedDiagnosis(payload, user?.id ?? null);
        }
      } catch { /* noop */ }
      // 즉시 결과(또는 회원가입)로 이동 → 더 이상 멈추지 않는다
      if (user) { router.push(RESULT_URL); }
      else { router.push(`/signup?next=${encodeURIComponent(RESULT_URL)}`); }
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
  const showInput = !!curStep && !botTyping && lastMsg?.who === "bot" && !finished && !blocked;

  // ★ 자격 탈락 종료 화면에서 '뒤로가기'(대표님 요청) ★
  //   잘못 눌렀을 수 있으니 종료 상태를 풀고 자격확인 질문으로 되돌린다.
  const undoBlocked = () => {
    setBlocked(null);
    goBack();
  };

  return (
    <PageShell pageKey="diagnosis" stickyFooter>
      <Header />
      {/* ★ 레이아웃(대표님 요청) ★
          - 질문은 위→아래로 쌓이고 오래된 건 접힌다(대화 영역 로직).
          - 답변/입력 영역은 대화창 '안'에 포함되어 함께 늘었다 줄었다 한다.
            (화면 고정 없음 → 흔들림/빈 공백 없음) */}
      {/* ★ 푸터 고정(sticky footer, 대표님 요청) ★
          PageShell 이 화면 전체 높이(flex 세로)를 잡고, main 에 flex-1 을 줘서
          대화가 짧아도 main 이 남는 공간을 채운다 → Footer 가 항상 화면 맨 아래에 붙어
          단계마다 푸터 위치가 오르락내리락하지 않는다. */}
      <main className="flex flex-1 flex-col px-4 pb-4 pt-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {/* 진행률 바 */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-gray">
              <span>
                맞춤 진단
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

          {/* 대화 영역 — 질문은 위에서부터 순서대로(오래된 것 위 → 새 질문 아래)
              쌓이고, 오래된 질문은 자동으로 접어 위로 올린다(대표님 요청).
              ★ 답변/입력 영역을 이 대화창 '안'에 포함시킨다(대표님 제안) ★
              → 대화창이 보기·답변 길이에 따라 세로로 늘었다 줄었다 하고, 답변창이
                따로 화면에 고정되지 않으므로 흔들림/빈 공백이 사라진다. */}
          {/* ★ 카드 최소 높이 ★ 카드 '안'에서 대화영역(위) ↔ 입력영역(아래) 사이에
              flex 스페이서를 넣어 봇 질문은 위, 입력창은 아래에 자연 배치한다(카톡식 레이아웃).
              ※ 예전에는 min-h 를 100dvh-680px(화면 높이 비례)로 줬는데, PC/데스크톱 등
                 큰 화면에서 카드가 과도하게 길어져 카드 아래(푸터 밑)에 빈 공간이 생겼다.
                 → 화면 크기와 무관한 '고정 최소 높이(420px)'로 바꿔 큰 화면에서도
                   카드가 필요 이상 늘어나지 않게 하고 하단 빈 공간을 없앤다.
                 (대화가 길어지면 콘텐츠가 이 최소값을 넘겨 자연스럽게 늘어난다.) */}
          <div className="flex min-h-[420px] flex-col rounded-2xl border border-gray-100 bg-gray-50/60 p-4 shadow-card">
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
                        className="mx-auto rounded-full border border-white bg-white px-3 py-1 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        ▲ 지난 대화 {hiddenCount}개 펼쳐보기
                      </button>
                    )}
                    {showAll && messages.length > KEEP && (
                      <button
                        onClick={() => setShowAll(false)}
                        className="mx-auto rounded-full border border-white bg-white px-3 py-1 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        ▼ 지난 대화 접기
                      </button>
                    )}
                    {visible.map((m, i) => {
                      const realIdx = (showAll ? 0 : hiddenCount) + i;
                      const isLastBot = realIdx === messages.length - 1 && m.who === "bot";
                      return m.who === "bot" ? (
                        <div key={realIdx} ref={isLastBot ? focusRef : undefined}>
                          <BotBubble text={m.text} wide={m.wide} />
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

          {/* ★ 스페이서 ★ 대화영역과 입력영역 사이 빈 공간을 flex-1 로 밀어
              입력창을 카드 하단으로 내린다 → 카드 안이 휑하지 않고 꽉 차 보인다.
              (대화가 많아 카드가 min-h 를 넘기면 이 스페이서는 0 이 되어 영향 없음) */}
          <div className="flex-1" aria-hidden="true" />

          {/* 답변 영역 — 대화창 '안'에 포함(대표님 제안).
              봇의 마지막 질문 바로 아래에 흰 카드로 붙어, 보기/입력 길이에 따라
              대화창이 함께 늘었다 줄었다 한다. 화면 고정(fixed)이 아니므로
              스크롤·질문 전환 때 따로 흔들리거나 빈 공백이 생기지 않는다. */}
          {showInput && curStep && (
            <div ref={answerRef} className="mt-3 rounded-xl border border-white bg-white p-3 shadow-sm">
              {/* ★ 답변영역 헤더(대표님 요청) ★
                  '이전 질문 수정' 버튼 옆에 현재 질문 문구를 항상 함께 보여준다.
                  → 화면을 확대해 위쪽 채팅 말풍선이 안 보여도, 답변영역만 보고
                    지금 무슨 질문에 답하는지 바로 알 수 있어 작성이 편하다.
                  · botLines[0] = 그 질문의 핵심 한 줄. */}
              <div className="mb-2.5 flex items-center gap-2">
                {history.length >= 2 && (
                  <button
                    onClick={goBack}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
                  >
                    ← 이전
                  </button>
                )}
                {(() => {
                  // questionHead가 있으면 그걸 우선(예: bno). 없으면 botLines 첫 줄.
                  const headQ = curStep.questionHead || curStep.botLines?.[0];
                  return headQ ? (
                    <p className="min-w-0 flex-1 break-keep text-[13.5px] font-extrabold leading-snug text-brand-dark">
                      <span className="mr-1 text-brand-orange">Q.</span>
                      {headQ}
                    </p>
                  ) : null;
                })()}
              </div>
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
                          className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                            active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-white bg-white text-brand-dark hover:border-brand-orange"
                          }`}
                        >
                          {renderOptLabel(curStep.labelFull?.[o] || o)}
                        </button>
                      );
                    })}
                  </div>
                  {/* singleSelect(라디오)는 '완료' 버튼 없이 클릭 즉시 진행 → 완료 버튼 숨김 */}
                  {!curStep.singleSelect && (
                    <button
                      onClick={confirmMulti}
                      disabled={multiTemp.length === 0}
                      className="mt-3 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
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
                      className="break-keep rounded-full border border-white bg-white px-3 py-2.5 text-center text-[13px] font-semibold text-brand-dark transition hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      {renderOptLabel(o)}
                    </button>
                  ))}
                </div>
              )}

              {/* 성함 + 연락처 (한 스텝) — 세로가 아니라 가로 2칸(대표님 요청) */}
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
                              className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                                active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-white bg-white text-brand-dark hover:border-brand-orange"
                              }`}
                            >
                              {renderOptLabel(o)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={confirmYesnoGroup}
                    disabled={(curStep.subs || []).some((s) => !groupTemp[s.key])}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    다음 →
                  </button>
                </div>
              )}

              {/* ★ 단일선택 묶음(singleGroup) — 여러 질문을 한 화면에서 쭉 답변(대표님 요청) ★
                  각 하위 문항마다 label(+hint)과 보기 버튼들을 세로로 나열하고,
                  맨 아래 '다음 →' 로 한 번에 제출한다. groupTemp/pickGroup/
                  confirmYesnoGroup 을 그대로 재사용(전부 선택해야 다음 활성화). */}
              {curStep.type === "singleGroup" && (
                <div className="flex flex-col gap-4">
                  {(curStep.subs || []).map((sub) => (
                    <div key={sub.key}>
                      <p className="mb-1 break-keep px-1 text-[15px] font-bold text-brand-dark">{sub.label}</p>
                      {sub.hint && <p className="mb-1.5 break-keep px-1 text-xs text-brand-gray">{sub.hint}</p>}
                      <div className={`grid gap-2 ${COLS_CLASS[sub.cols ?? autoCols(sub.opts || [])]}`}>
                        {(sub.opts || []).map((o) => {
                          const active = groupTemp[sub.key] === o;
                          return (
                            <button
                              key={o}
                              onClick={() => pickGroup(sub.key, o)}
                              className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                                active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-white bg-white text-brand-dark hover:border-brand-orange hover:bg-brand-orange/5"
                              }`}
                            >
                              {renderOptLabel(o)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={confirmYesnoGroup}
                    disabled={(curStep.subs || []).some((s) => !groupTemp[s.key])}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
                  >
                    다음 →
                  </button>
                </div>
              )}

              {/* ★ 복수선택 묶음(multiGroup) — 짧은 복수선택 질문 여러 개를 한 화면에서(대표님 요청) ★
                  각 하위 문항마다 label(+hint)과 보기 버튼들을 세로로 나열.
                  · 일반 하위문항: 여러 개 토글(복수 선택)
                  · singleSelect 하위문항(예: 혁신성장): 하나만(라디오)
                  맨 아래 '다음 →' 하나로 제출. 저장값 구조는 개별 스텝과 동일(배열). */}
              {curStep.type === "multiGroup" && (
                <div className="flex flex-col gap-4">
                  {(curStep.subs || [])
                    .filter((sub) => !sub.subOnlyIf || sub.subOnlyIf(form))
                    .map((sub) => {
                    const picked = groupMultiTemp[sub.key] || [];
                    // scalar(단일 저장)·singleSelect 는 라디오식(하나만) 동작
                    const radio = sub.scalar || sub.singleSelect;
                    return (
                      <div key={sub.key}>
                        <p className="mb-1 break-keep px-1 text-[15px] font-bold text-brand-dark">{sub.label}</p>
                        {sub.hint && <p className="mb-1.5 break-keep px-1 text-xs text-brand-gray">{sub.hint}</p>}
                        <div className={`grid gap-2 ${COLS_CLASS[sub.cols ?? autoCols((sub.opts || []).map((o) => sub.labelFull?.[o] || o))]}`}>
                          {(sub.opts || []).map((o) => {
                            const active = picked.includes(o);
                            return (
                              <button
                                key={o}
                                onClick={() => (radio ? pickGroupMultiSingle(sub.key, o) : toggleGroupMulti(sub.key, o))}
                                className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                                  active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-white bg-white text-brand-dark hover:border-brand-orange hover:bg-brand-orange/5"
                                }`}
                              >
                                {renderOptLabel(sub.labelFull?.[o] || o)}
                              </button>
                            );
                          })}
                        </div>
                        {/* 지역 '기타' → 인라인 직접입력 (scalar sub 전용) */}
                        {sub.key === "region" && picked[0] === "기타" && (
                          <input
                            type="text"
                            value={groupRegionEtc}
                            onChange={(e) => setGroupRegionEtc(e.target.value)}
                            placeholder="지역을 직접 입력해 주세요 (예: 부산 해운대구)"
                            className="mt-2 w-full rounded-xl border border-white bg-white px-3.5 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                          />
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={confirmMultiGroup}
                    disabled={
                      (curStep.subs || [])
                        .filter((s) => (!s.subOnlyIf || s.subOnlyIf(form)) && s.scalar)
                        .some((s) => !(groupMultiTemp[s.key] && groupMultiTemp[s.key][0])) ||
                      (groupMultiTemp["region"]?.[0] === "기타" && !groupRegionEtc.trim())
                    }
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
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
                          active ? "border-brand-orange bg-brand-orange/10 text-brand-dark" : "border-white bg-white text-brand-dark hover:border-brand-orange"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                            active ? "border-brand-orange bg-brand-grad text-brand-dark" : "border-white bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] leading-snug">{sub.label}</span>
                          {sub.desc && (
                            <span className="mt-0.5 block text-[11px] font-medium leading-tight text-brand-gray">{sub.desc}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    onClick={confirmCheckGroup}
                    className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark"
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
                          className="break-keep rounded-full border border-white bg-white px-3 py-2.5 text-center text-[13px] font-semibold text-brand-dark transition hover:border-brand-orange hover:bg-brand-orange/5"
                        >
                          {renderOptLabel(o)}
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
                        className="min-w-0 flex-1 rounded-full border border-white bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                      />
                      <button onClick={confirmRegionEtc} disabled={!textTemp.trim()} className="shrink-0 rounded-full bg-brand-grad px-5 py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40">
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
                    className="min-w-0 flex-1 rounded-full border border-white bg-white px-4 py-3 text-base text-brand-dark outline-none focus:border-brand-orange"
                  />
                  <button onClick={confirmText} disabled={!textTemp.trim()} className="shrink-0 rounded-full bg-brand-grad px-5 py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40">
                    입력 →
                  </button>
                </div>
              )}

              {/* ★ 화면 통합 (대표님 요청) ★ 맨 앞: '사업자 구분' + '신청 자격 확인'을 한 화면에서.
                  · 사업자 구분(예비/개인/법인) 칩 + 자격확인(회생·파산/세금완납) 라디오 2개.
                  · 사업자번호·성함·연락처는 진단을 다 마친 뒤 맨 마지막(bnoContact)에서 받는다.
                  · businessType은 뒤 자본잠식(법인 전용) 판정에 필요하므로 여기서 확정한다.
                  · '파산·회생 중' 또는 '세금 미납/체납'이면 confirmBizEligibility에서 종료 화면으로. */}
              {curStep.type === "bizEligibility" && (() => {
                const subs = curStep.subs || [];
                const canNext = !!form.businessType && subs.every((s) => !!groupTemp[s.key]);
                return (
                  <div className="flex flex-col gap-4">
                    {/* 1) 사업자 구분 (예비창업자 → 개인사업자 → 법인사업자) */}
                    <div>
                      <p className="mb-1.5 break-keep px-1 text-sm font-semibold text-brand-dark">
                        사업자 구분
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {["개인사업자", "법인사업자", "예비"].map((t) => {
                          const active = form.businessType === t;
                          const label = t === "예비" ? "예비창업자" : t;
                          return (
                            <button
                              key={t}
                              onClick={() => setForm((f: any) => ({ ...f, businessType: t }))}
                              className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                                active
                                  ? "border-brand-orange bg-brand-grad text-brand-dark"
                                  : "border-white bg-white text-brand-dark hover:border-brand-orange"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {form.businessType === "예비" && (
                        <p className="mt-2 break-keep rounded-xl bg-brand-orange/10 px-4 py-2.5 text-xs leading-relaxed text-brand-dark">
                          ✅ 예비창업자로 진행할게요. 창업 준비 단계에 맞는 지원도 함께 찾아드려요.
                        </p>
                      )}
                    </div>
                    {/* 2) 신청 자격 확인 (회생·파산 / 세금 완납) */}
                    {subs.map((sub) => (
                      <div key={sub.key}>
                        <p className="mb-1.5 break-keep px-1 text-sm font-semibold text-brand-dark">{sub.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(sub.opts || ["예", "아니요"]).map((o) => {
                            const active = groupTemp[sub.key] === o;
                            return (
                              <button
                                key={o}
                                onClick={() => pickGroup(sub.key, o)}
                                className={`break-keep rounded-full border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                                  active
                                    ? "border-brand-orange bg-brand-grad text-brand-dark"
                                    : "border-white bg-white text-brand-dark hover:border-brand-orange"
                                }`}
                              >
                                {renderOptLabel(o)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={confirmBizEligibility}
                      disabled={!canNext}
                      className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
                    >
                      다음 →
                    </button>
                  </div>
                );
              })()}

              {/* ★ 순서 개편 (대표님 요청) ★ 맨 마지막: 사업자번호 + 성함 + 연락처를 한 화면에서.
                  예비창업자는 사업자번호 입력을 건너뛴다. 국세청 조회가 실패해도(A안) 진단은 계속 진행하고
                  연락처를 저장한다. 여기서 confirmBnoContact가 savePartial(리드 저장)까지 처리한다. */}
              {curStep.type === "bnoContact" && (() => {
                const isPre = form.businessType === "예비"; // 예비창업자면 사업자번호 입력칸 숨김
                const bnoReady = textTemp.replace(/[^0-9]/g, "").length === 10;
                const contactReady =
                  nameTemp.trim().length > 0 && phoneTemp.replace(/[^0-9]/g, "").length >= 10;
                // 진행 가능: (예비 or 사업자번호 준비됨) AND 성함·연락처 준비됨
                const bnoOk = isPre || form.bnoVerified || form.bno || bnoReady;
                const canSubmit = bnoOk && contactReady;
                return (
                  <div className="flex flex-col gap-3">
                    {/* 1) 사업자등록번호 (예비창업자는 생략) */}
                    {!isPre && (
                      <div>
                        <p className="mb-1.5 break-keep px-1 text-xs font-bold text-brand-dark/70">
                          사업자등록번호
                        </p>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={12}
                          value={textTemp}
                          onChange={(e) => setTextTemp(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && canSubmit && confirmBnoContact()}
                          placeholder={curStep.placeholder}
                          className="w-full rounded-full border border-white bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
                        />
                      </div>
                    )}

                    {/* 2) 성함 · 연락처 */}
                    <div>
                      <p className="mb-1.5 break-keep px-1 text-xs font-bold text-brand-dark/70">
                        성함 · 연락처
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nameTemp}
                          onChange={(e) => setNameTemp(e.target.value)}
                          placeholder={CONTACT_TEXT.namePlaceholder}
                          className="min-w-0 flex-1 rounded-full border border-white bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
                        />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={phoneTemp}
                          onChange={(e) => setPhoneTemp(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && canSubmit && confirmBnoContact()}
                          // chat 화면은 성함·연락처가 반칸씩 나뉘어 좁으므로 짧은 placeholder 사용(잘림 방지). config는 diagnosis-form과 공유되어 미변경.
                          placeholder="연락처 (010…)"
                          className="min-w-0 flex-1 rounded-full border border-white bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-orange"
                        />
                      </div>
                      {/* ★ 개인정보 안심 한 줄(대표님 요청) ★ */}
                      <p className="mt-2 break-keep px-1 text-[11px] leading-relaxed text-brand-gray">
                        🔒 입력하신 정보는 진단 결과 안내·매칭 용도로만 사용됩니다.
                      </p>
                    </div>
                    <button
                      onClick={confirmBnoContact}
                      disabled={!canSubmit || bnoLoading}
                      className="mt-1 w-full rounded-full bg-brand-grad py-3 text-[15px] font-extrabold text-brand-dark disabled:opacity-40"
                    >
                      {bnoLoading ? "확인 중…" : "진단 결과 확인하기 →"}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ★ 자격 탈락 종료 화면(대표님 요청) ★ 회생·파산 중/세금 체납이면 여기서 종료.
              성함·연락처는 받지 않는다. 잘못 눌렀을 수 있으니 '뒤로 가기' 제공. */}
          {blocked && (
            <div ref={answerRef} className="mt-3 rounded-xl border border-white bg-white p-5 shadow-sm">
              <p className="mb-2 text-center text-3xl">😥</p>
              <p className="mb-2 break-keep text-center text-[16px] font-extrabold leading-snug text-brand-dark">
                아쉽지만 지금은 정부지원사업<br /> 신청이 어려운 상태예요.
              </p>
              <p className="mx-auto max-w-md break-keep text-center text-[13.5px] leading-relaxed text-brand-gray">
                {blocked.reasons.includes("bankruptcy") && "회생·파산 절차 종료 후"}
                {blocked.reasons.includes("bankruptcy") && blocked.reasons.includes("tax") && " · "}
                {blocked.reasons.includes("tax") && "세금 완납 후"}
                {" "}다시<br /> 진단 받으시면 훨씬 많은 지원을 받으실 수 있어요.
              </p>
              <button
                onClick={undoBlocked}
                className="mx-auto mt-4 block rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-gray transition hover:border-brand-orange hover:text-brand-orange"
              >
                ← 뒤로 가기 (잘못 선택하셨다면)
              </button>
            </div>
          )}
          </div>
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

// ★ 성능(대표님 요청) ★ 말풍선은 text(문자열)만 바뀔 때만 다시 그리도록 memo 처리.
//   입력창 타이핑·타이머 등으로 부모(챗봇)가 리렌더돼도 기존 말풍선들은 재렌더를 건너뛴다.
//   → 타이핑 렉·롱태스크 감소. 표시 결과는 100% 동일.
const BotBubble = memo(function BotBubble({ text, wide }: { text: string; wide?: boolean }) {
  // wide=true → 인트로/첫 안내 말풍선을 '동일 고정 폭'으로(가로 길이 통일). 아바타 폭만큼 빼서 정렬.
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div
        className={`chat-bot-bubble whitespace-pre-line break-keep rounded-2xl rounded-bl-md border border-white bg-white px-4 py-3 text-[15px] leading-relaxed text-brand-dark shadow-sm ${
          wide ? "w-fit max-w-[280px]" : "max-w-[88%]"
        }`}
      >
        {text}
      </div>
    </div>
  );
});

const UserBubble = memo(function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] whitespace-pre-line break-keep rounded-2xl rounded-br-md border border-white bg-brand-grad px-4 py-3 text-[15px] font-semibold leading-relaxed text-brand-dark shadow-sm">
        {text}
      </div>
    </div>
  );
});

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
