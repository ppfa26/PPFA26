"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { trackConversion } from "@/components/KarrotPixel";
import { supabase } from "@/lib/supabaseClient";
import { isStatsExcludedEmail } from "@/lib/admin";
import {
  saveDiagnosis,
  saveDiagnosisDraft,
  loadDiagnosisDraft,
  clearDiagnosisDraft,
  savePartialLead,
  saveCompletedDiagnosis,
} from "@/lib/diagnosisStore";
import {
  DIAGNOSIS_TEXT,
  BNO_TEXT,
  STEP1_TITLE,
  STEP1_SUBTITLE,
  STEP1_GROUP,
  STEP1_FIELDS,
  CONTACT_TEXT,
  STEP2_TITLE,
  STEP2_SUBTITLE,
  STEP2_GROUP_NEED,
  STEP2_GROUP_FINANCE,
  STEP2_GROUP_STRENGTH,
  STEP2_FIELDS,
  STEP3_TITLE,
  STEP3_SUBTITLE,
  STEP3_FIELDS,
  STEP3_CONDITIONAL_FIELDS,
  PHONE_CONSULT_FIELD,
} from "@/lib/diagnosisConfig";

// ── 순수 레이아웃 컴포넌트(모듈 레벨) ──
//  ★중요★ 이 컴포넌트들을 Diagnosis() 함수 "안"에 두면, 타이핑할 때마다
//  부모가 리렌더되면서 매번 '새로운 컴포넌트 타입'으로 인식돼 내부 input이
//  통째로 리마운트됩니다. 그러면 텍스트 입력창(성함·연락처)이 포커스를 잃어
//  한 글자도 안 써지는 버그가 생깁니다. 그래서 밖으로 빼서 고정시킵니다.

// 라벨 괄호 안 부가설명(예: "(복수 선택 · 없으면 넘어가기)")이 모바일에서
// "넘어가기)"만 다음 줄로 떨어지는 어색한 줄바꿈을 막습니다.
// 괄호 안의 일반 공백을 줄바꿈 안 되는 공백(\u00A0)으로 바꿔 괄호를 통째로 유지합니다.
function keepBrackets(text: string): string {
  return text.replace(/\(([^)]*)\)/g, (_m, inner) => `(${inner.replace(/ /g, "\u00A0")})`);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0 sm:mb-6">
      {label && <p className="mb-1 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">{keepBrackets(label)}</p>}
      {hint && <p className="mb-2 break-keep text-xs leading-snug text-brand-gray">{hint}</p>}
      {children}
    </div>
  );
}

function GroupBox({
  title,
  children,
  tone = "gray",
  // matchBno=true 이면 제목 글자크기·굵기를 '국세청 자동 조회' 제목과 동일하게 맞춘다.
  matchBno = false,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "gray" | "orange" | "green" | "red";
  matchBno?: boolean;
}) {
  const toneCls =
    tone === "orange"
      ? "border-brand-orange/30 bg-brand-orange/5"
      : tone === "green"
      ? "border-brand-green/30 bg-brand-green/5"
      : tone === "red"
      ? "border-brand-red/20 bg-brand-red/5"
      : "border-gray-200 bg-gray-50/70";
  // 제목 안의 "(필수)"·"(선택)" 등 괄호 표기는 포인트색 + 살짝 작은 글씨로 분리해
  // 강조하되 크기는 줄인다. (대표님 요청) 나머지 제목은 그대로 굵게 표시.
  const m = title.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  const mainTitle = m ? m[1] : title;
  const badge = m ? m[2] : "";
  // 톤별 포인트색 (박스 색과 맞춤)
  const badgeColor =
    tone === "orange"
      ? "text-brand-orange"
      : tone === "green"
      ? "text-brand-green"
      : "text-brand-red";
  return (
    <div className={`mb-4 rounded-2xl border p-3.5 sm:p-5 ${toneCls}`}>
      <p
        className={`mb-3 break-keep text-brand-dark sm:mb-4 ${
          matchBno
            ? "text-[13px] font-bold xs:text-sm sm:text-base"
            : "text-sm font-extrabold"
        }`}
      >
        {mainTitle}
        {badge && (
          <span className={`ml-1 whitespace-nowrap align-middle text-xs font-bold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </p>
      <div className="[&>*:last-child]:mb-0">{children}</div>
    </div>
  );
}

export default function Diagnosis() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({ purposes: [], interests: [], industries: [], certifications: [], innovation: [], currentInstitutions: [] });
  // 지역 '기타'(직접 입력) 모드 여부 — true면 아래에 직접 입력창을 띄웁니다.
  const [regionEtc, setRegionEtc] = useState(false);
  // ── 진단 시작 전 로그인(회원가입) 게이트 (대표님 요청) ──
  //   "checking" = 세션 확인 중 · "guest" = 비로그인(진단 시작 차단) · "ready" = 로그인 완료
  //   블덱스처럼, 로그인하지 않으면 진단 자체를 시작할 수 없게 막는다.
  const [gate, setGate] = useState<"checking" | "guest" | "ready">("checking");
  // 대표자 연락 정보(성함·연락처) 필수 검증 에러 메시지
  const [contactErr, setContactErr] = useState("");

  // 사업자번호 조회 상태
  const [bno, setBno] = useState("");
  const [bnoLoading, setBnoLoading] = useState(false);
  const [bnoResult, setBnoResult] = useState<any>(null);
  // ★ 국세청 서버 오류 시에만 수동입력을 허용하기 위한 상태 ★
  const [bnoServerDown, setBnoServerDown] = useState(false); // 국세청 서버 오류 감지 여부
  const [bnoManual, setBnoManual] = useState(false); // 사용자가 수동입력을 택했는지

  const checkBno = async () => {
    setBnoResult(null);
    setBnoServerDown(false);
    setBnoManual(false);
    const digits = bno.replace(/[^0-9]/g, "");
    if (digits.length !== 10) {
      setBnoResult({ ok: false, message: BNO_TEXT.errorLength });
      return;
    }
    setBnoLoading(true);

    // ★ 대표님 요청 ★ 고객은 오래 못 기다린다.
    //   조회는 '한 번'만 시도하고, 6초 안에 응답이 없거나(느림) 서버 오류면
    //   바로 수동입력 우회를 열어준다. (재시도로 시간 끌지 않음)
    const TIMEOUT_MS = 6000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch("/api/business-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bno: digits }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.ok && data.found) {
        // 정상 조회 성공 → 진단 데이터에 저장
        setBnoResult(data);
        set("bno", digits);
        set("bnoStatus", data.status);
        set("bnoTaxType", data.taxType);
        set("bnoVerified", true); // 국세청 검증됨
        return;
      }

      if (data.serverError) {
        // 국세청 서버 오류 → 즉시 수동입력 우회 열기
        setBnoResult(data);
        setBnoServerDown(true);
        return;
      }

      // 정상 응답이지만 미등록/형식오류 → 그대로 안내(수동입력 안 열림)
      setBnoResult(data);
    } catch {
      // 타임아웃(6초 초과) 또는 네트워크 오류 → 느린 것으로 보고 즉시 수동입력 열기
      setBnoResult({ ok: false, serverError: true, message: BNO_TEXT.errorServer });
      setBnoServerDown(true);
    } finally {
      clearTimeout(timer);
      setBnoLoading(false);
    }
  };

  // ★ 국세청 서버 장애 시 수동입력 확정 — 검증 없이 사업자번호를 접수한다(신청 누락 방지) ★
  const confirmManualBno = () => {
    const digits = bno.replace(/[^0-9]/g, "");
    if (digits.length !== 10) {
      setBnoResult({ ok: false, message: BNO_TEXT.errorLength });
      return;
    }
    set("bno", digits);
    set("bnoStatus", "국세청 점검으로 자동확인 없이 접수");
    set("bnoTaxType", "");
    set("bnoVerified", false); // 국세청 검증 안 됨(수동 접수)
    setBnoManual(true);
  };

  // ★ 대표님 요청 ★ 단계가 바뀌면 화면을 맨 위로 올려줘서,
  //   고객이 스크롤을 직접 올리지 않아도 새 질문 상단부터 시작되게 한다.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // ── 진단 시작 (게이트 제거 · 대표님 요청 변경) ──
  //   [변경 전] 진단 시작 '전'에 로그인을 강제 → 처음 온 방문자가 경험도 하기 전에
  //            개인정보를 요구받아 대부분 이탈(당근 유입 대비 진단 0명의 주원인).
  //   [변경 후] 로그인 없이 '바로' 진단을 시작할 수 있게 열어준다.
  //            로그인은 진단을 다 마치고 '결과를 볼 때' 자연스럽게 유도한다.
  //            (진단을 먼저 경험 → 결과가 궁금해서 가입 → 전환율 상승. 삼쩜삼·아정당 방식)
  //
  //   ★ 초안 복구 ★ 로그인 왕복 등으로 페이지를 떠났다 돌아와도 하던 진단을 이어가도록,
  //     저장해 둔 초안(폼 + 단계)이 있으면 복구한다. (예전 '처음으로 튕김' 버그 해결)
  useEffect(() => {
    setGate("ready"); // 게이트 없이 항상 진단 가능
    const draft = loadDiagnosisDraft<any>();
    if (draft && draft.form) {
      setForm(draft.form);
      if (draft.step >= 1 && draft.step <= 3) setStep(draft.step);
    }
  }, []);

  // ── 진단 초안 자동 저장 ──
  //   폼/단계가 바뀔 때마다 초안을 저장해 둔다. → 로그인하러 떠나도 복구 가능.
  useEffect(() => {
    // 초기 렌더(빈 폼)엔 굳이 저장하지 않도록 최소 조건만 둔다.
    saveDiagnosisDraft(form, step);
  }, [form, step]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) =>
    setForm((f: any) => {
      const arr = f[k] || [];
      return { ...f, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] };
    });

  // 다음 단계로 이동 — 1단계에서는 사업자등록번호(필수)·성함·연락처를 검증한다.
  const goNext = () => {
    if (step === 1) {
      // ★ 대표님 요청 ★ 사업자등록번호 필수 — 없는 사업자는 신청 불가.
      //   단, '예비창업자'는 아직 사업자번호가 없으므로 예외로 통과시킨다.
      const isPreStartup = form.businessType === "예비창업자";
      if (!isPreStartup) {
        // 정상 조회 성공 OR 국세청 서버 장애 시 수동입력 확정(bnoManual) → 통과 허용
        const bnoOk =
          (!!form.bno && bnoResult?.ok && bnoResult?.found) ||
          (!!form.bno && bnoManual);
        if (!bnoOk) {
          setContactErr(BNO_TEXT.errorRequired);
          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
      const name = (form.name || "").trim();
      const phoneDigits = (form.phone || "").replace(/[^0-9]/g, "");
      if (!name) {
        setContactErr(CONTACT_TEXT.errorName);
        return;
      }
      if (phoneDigits.length < 10) {
        setContactErr(CONTACT_TEXT.errorPhone);
        return;
      }
      setContactErr("");

      // ★ 부분완료 리드 저장 (대표님 전략) ★
      //   여기까지 왔다 = 사업자번호 필터 통과 + 이름·전화 입력 완료 = '검증된 진짜 사업자'.
      //   이후 진단을 중간에 그만두더라도 연락처는 DB(status='partial')에 남겨,
      //   대표님이 직접 전화 돌릴 고품질 리드로 확보한다. (실패해도 진행에는 영향 없음)
      (async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id ?? null;
          const uemail = sessionData.session?.user?.email ?? null;
          // 관리자·통계제외 계정(대표님 테스트)은 저장하지 않음
          if (!isStatsExcludedEmail(uemail)) {
            await savePartialLead(form, uid);
          }
        } catch {
          /* noop */
        }
      })();
    }
    setStep(step + 1);
  };

  const submit = () => {
    // ★ 담보 질문 제거(대표님 요청)에 따른 매칭 안전장치 ★
    //   '담보 보유' 질문을 화면에서 뺐으므로, 매칭이 참조하는 collateral 값을
    //   '없음'으로 자동 세팅한다. (대부분 소상공인 = 담보없음 → 보증서·정책자금 매칭 유지)
    //   ※ setForm은 비동기라 저장에 넘기는 form을 즉시 보정하기 위해 직접 채워둔다.
    if (!form.collateral) form.collateral = "없음";
    // 진단 결과를 localStorage 에 30일간 저장 (탭 닫아도 유지 · 1달 후 자동 만료)
    // ★ 어느 로그인 계정의 진단인지 '소유자'를 함께 저장 → 다른 계정으로 로그인하면
    //    이 진단이 따라오지 않도록 한다. (계정별 데이터 분리)
    (async () => {
      // 결과 화면 목적지 — ?analyze=1 로 'AI 분석 중' 연출을 보여준다.
      const RESULT_URL = "/matching-preview?analyze=1";
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user ?? null;

        // 소유자(user.id)를 붙여 저장 — 비회원이면 null(나중에 로그인 시 자동 연결)
        saveDiagnosis(form, user?.id ?? null);
        // 진단이 완료됐으니 진행중 초안은 정리
        clearDiagnosisDraft();

        // ★ 전환 추적 ★ 진단(설문) 제출 완료 = 서비스 신청 전환.
        trackConversion("SubmitApplication");

        // ── DB 저장 (회원·비회원 공통) ──
        //   완료 저장 RPC는 같은 전화번호의 partial 리드가 있으면 completed 로
        //   '승격'하고 없으면 새로 저장한다. → 1단계에서 남긴 부분리드가 중복으로
        //   쌓이지 않고, 진단을 끝까지 마치면 자동으로 완료 상태가 된다.
        //   ※ 관리자·통계제외 계정(대표님 테스트)은 저장 생략.
        if (!isStatsExcludedEmail(user?.email)) {
          await saveCompletedDiagnosis(form, user?.id ?? null);
        }

        if (user) {
          // ── 이미 로그인한 경우: 곧바로 결과로 ──
          router.push(RESULT_URL);
          return;
        }

        // ── 비회원인 경우 (게이트 제거로 진단을 끝까지 마친 방문자) ──
        //   진단은 이미 localStorage 에 저장됨 → 로그인만 하면 결과가 그대로 뜬다.
        //   로그인 후 곧장 '결과 화면'으로 보내므로(next=결과URL) 진단 페이지로
        //   되돌아가 처음부터 다시 하는 예전 버그가 발생하지 않는다.
        router.push(`/signup?next=${encodeURIComponent(RESULT_URL)}`);
      } catch {
        // 세션 확인/DB 저장 실패해도 진단은 저장돼 있으니 결과 화면으로는 보낸다.
        router.push(RESULT_URL);
      }
    })();
  };

  // ── 진행률(%) 계산 (대표님 요청) ──────────────────────────────
  //   스텝(1/3·2/3) 기준이 아니라 "실제 답한 질문 수 / 전체 질문 수"로 계산해
  //   질문 하나를 답할 때마다 상단 %가 조금씩 올라가게 한다. (소수점은 반올림 정수)
  //   ※ 목록에 있는 필드 = 진행률 계산 대상 질문. 답이 채워지면 1칸 오른다.
  //     - 단일선택/텍스트: 값이 있으면 답한 것
  //     - 복수선택(배열): 1개 이상 고르면 답한 것
  const PROGRESS_FIELDS: { key: string; multi?: boolean }[] = [
    // 1단계 (사업장 기본정보 + 대표자 연락)
    { key: "bno" }, { key: "name" }, { key: "phone" },
    { key: "businessType" }, { key: "industries", multi: true },
    { key: "revenue" }, { key: "years" }, { key: "age" }, { key: "region" },
    // 2단계 (필요한 지원 + 자금 여건 + 강점)
    { key: "purposes", multi: true }, { key: "credit" }, { key: "employees" },
    { key: "currentInstitutions", multi: true },
    { key: "certifications", multi: true }, { key: "innovation", multi: true },
    // 3단계 (맞춤 매칭 + 결격 + 전화상담)
    { key: "revenueGrowth2y" }, { key: "smartDevice" }, { key: "wantsRefinance" },
    { key: "reFounder" }, { key: "govSelected" }, { key: "privateInvestment" },
    { key: "phoneConsult" },
  ];
  const answeredCount = PROGRESS_FIELDS.reduce((n, f) => {
    const v = form[f.key];
    if (f.multi) return n + (Array.isArray(v) && v.length > 0 ? 1 : 0);
    return n + (v !== undefined && v !== null && String(v).trim() !== "" ? 1 : 0);
  }, 0);
  // 답한 질문 수 ÷ 전체 질문 수 → 반올림 정수 %. (최소 진행 표시를 위해 아직 0개여도 바는 0%)
  const progress = Math.round((answeredCount / PROGRESS_FIELDS.length) * 100);

  // ── 선택 버튼 공통 스타일 (Radio·Multi 완전 통일 · 모바일/PC 최적화) ──
  //   모바일: 살짝 큰 터치영역(py-2) · PC: 여유있게(sm:py-2). 글자·모서리·색 전부 동일.
  const pillCls = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-[1.03] ${
      active
        ? "border-brand-orange bg-brand-grad text-brand-dark"
        : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
    }`;
  const Radio = ({ k, opts }: { k: string; opts: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button key={o} onClick={() => set(k, o)} className={pillCls(form[k] === o)}>
          {o}
        </button>
      ))}
    </div>
  );
  // breakBefore: 해당 라벨 앞에서 강제 줄바꿈(PC에서 원하는 줄 배치 — 대표님 요청)
  const Multi = ({ k, opts, breakBefore }: { k: string; opts: string[]; breakBefore?: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <Fragment key={o}>
          {breakBefore?.includes(o) && <div className="hidden w-full sm:block" aria-hidden />}
          <button onClick={() => toggle(k, o)} className={pillCls((form[k] || []).includes(o))}>
            {o}
          </button>
        </Fragment>
      ))}
    </div>
  );
  // 혁신성장 테마처럼 항목이 많은 다중선택 → 반응형 그리드
  //  모바일: 2열 (글자 안 잘리게) / 작은태블릿: 3열 / 큰화면: 5열(2줄)
  const MultiGrid = ({ k, opts }: { k: string; opts: string[] }) => (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 md:grid-cols-5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => toggle(k, o)}
          className={`min-h-[40px] break-keep rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition hover:scale-[1.03] sm:text-xs ${
            (form[k] || []).includes(o)
              ? "border-brand-orange bg-brand-grad text-brand-dark"
              : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
  // 조건부 질문(라벨+설명힌트+단일선택) — 소진공 혁신형 상품 정밀 매칭용
  const CondQ = ({ k, field }: { k: string; field: { label: string; hint: string; opts: string[] } }) => (
    <div className="mb-5 last:mb-0">
      <p className="mb-1 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">{keepBrackets(field.label)}</p>
      <p className="mb-2 break-keep text-xs leading-snug text-brand-gray">{field.hint}</p>
      <Radio k={k} opts={field.opts} />
    </div>
  );

  // ── 세션 확인 중 로딩 화면 ──
  if (gate === "checking") {
    return (
      <PageShell pageKey="diagnosis">
        <Header />
        <main className="flex min-h-[50vh] items-center justify-center px-4 py-20">
          <p className="text-sm font-semibold text-brand-gray">불러오는 중...</p>
        </main>
        <Footer />
      </PageShell>
    );
  }

  return (
    <PageShell pageKey="diagnosis">
      <Header />
      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* 진행률 바 */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm font-semibold text-brand-gray">
              <span>{step}{DIAGNOSIS_TEXT.stepLabel} / {DIAGNOSIS_TEXT.totalStepLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-brand-grad transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 1 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
              <h1 className="mb-1 break-keep text-base font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP1_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP1_SUBTITLE}</p>

              {/* 사업자번호 자동 조회 (국세청 연동) — 박스 틀 색상 빨간색으로 통일(대표님 요청) */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4">
                <p className="mb-2 break-keep text-[13px] font-bold text-brand-dark xs:text-sm sm:text-base">
                  {BNO_TEXT.title}{" "}
                  <span className="whitespace-nowrap text-xs font-bold text-brand-red">{BNO_TEXT.badge}</span>
                </p>
                <div className="flex w-full items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bno}
                    onChange={(e) => setBno(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkBno()}
                    placeholder={BNO_TEXT.placeholder}
                    className="min-w-0 flex-1 rounded-full border border-gray-300 px-3 py-2 text-xs text-brand-dark focus:border-brand-orange focus:outline-none xs:text-sm sm:px-4 sm:py-2.5"
                  />
                  <button
                    onClick={checkBno}
                    disabled={bnoLoading}
                    className="btn-brand shrink-0 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    {bnoLoading ? BNO_TEXT.buttonLoading : BNO_TEXT.button}
                  </button>
                </div>
                {bnoResult && (
                  <div className="mt-3 text-sm">
                    {bnoManual ? (
                      /* 국세청 장애 → 수동 접수 완료 안내 */
                      <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3">
                        <p className="font-semibold text-brand-dark">
                          ✅ 사업자등록번호가 접수되었습니다.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-brand-gray">
                          국세청 서버 점검으로 자동확인 없이 접수되었습니다. 다음 단계로
                          진행하실 수 있으며, 자동확인은 추후 처리됩니다.
                        </p>
                      </div>
                    ) : bnoServerDown ? (
                      /* 국세청 서버 오류 → 수동입력 우회 제공 */
                      <div className="rounded-xl border border-brand-red/30 bg-brand-red/5 px-4 py-3">
                        <p className="font-semibold text-brand-red">
                          ⚠️ 국세청 서버가 일시적으로 혼잡합니다.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-brand-gray">
                          잠시 후 다시 <b>조회</b>를 눌러주시거나, 신청을 놓치지 않도록 아래 버튼으로
                          사업자등록번호를 <b>직접 입력하여 접수</b>하실 수 있습니다.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={checkBno}
                            disabled={bnoLoading}
                            className="rounded-full border border-brand-red/40 bg-white px-3 py-1.5 text-xs font-semibold text-brand-red disabled:opacity-60"
                          >
                            {bnoLoading ? "재시도 중…" : "다시 조회"}
                          </button>
                          <button
                            onClick={confirmManualBno}
                            className="btn-brand rounded-full px-3 py-1.5 text-xs font-semibold"
                          >
                            직접 입력하고 계속하기
                          </button>
                        </div>
                      </div>
                    ) : !bnoResult.ok ? (
                      <p className="text-brand-red">⚠️ {bnoResult.message}</p>
                    ) : !bnoResult.found ? (
                      <p className="text-brand-red">⚠️ {bnoResult.message}</p>
                    ) : (
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="font-semibold text-brand-dark">
                          {bnoResult.statusCode === "01" ? "✅" : "⚠️"} {BNO_TEXT.statusPrefix}{" "}
                          <span
                            className={
                              bnoResult.statusCode === "01"
                                ? "text-brand-green"
                                : "text-brand-red"
                            }
                          >
                            {bnoResult.status}
                          </span>
                        </p>
                        {bnoResult.taxType && (
                          <p className="mt-1 text-brand-gray">{BNO_TEXT.taxTypePrefix} {bnoResult.taxType}</p>
                        )}
                        {bnoResult.endDate && (
                          <p className="mt-1 text-brand-gray">{BNO_TEXT.endDatePrefix} {bnoResult.endDate}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-brand-gray">{BNO_TEXT.note}</p>
                <p className="mt-1 text-xs font-semibold text-brand-red/80">{BNO_TEXT.errorPreStartupHint}</p>
              </div>

              {/* 대표자 성함 및 연락처 — 사업자등록번호 조회 바로 아래에 배치(대표님 요청). 성함·연락처 필수 · 박스 틀 색상 빨간색으로 통일 */}
              <GroupBox title={CONTACT_TEXT.groupTitle} tone="red" matchBno>
                {CONTACT_TEXT.groupNote && (
                  <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray">
                    {CONTACT_TEXT.groupNote}
                  </p>
                )}
                <Field label={CONTACT_TEXT.nameLabel}>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder={CONTACT_TEXT.namePlaceholder}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-orange"
                  />
                </Field>
                <Field label={CONTACT_TEXT.phoneLabel}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone || ""}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder={CONTACT_TEXT.phonePlaceholder}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-orange"
                  />
                </Field>
              </GroupBox>

              {/* ★ 대표님 요청 ★ 신청 결격사유 확인을 1단계 성함 아래로 이동.
                  어렵게 다 작성했는데 결격사유면 신청도 못 하므로, 처음에 먼저 확인.
                  (회생·파산 / 세금 체납 — 승인 자체가 막히는 핵심 항목만) */}
              <div className="mb-5 overflow-hidden rounded-2xl border border-brand-red/20 bg-brand-red/5">
                {/* 제목 바 — 진한 빨강 배경에 흰 글자로 강조 (대표님 요청) */}
                <div className="flex flex-wrap items-center gap-x-1.5 bg-brand-red px-4 py-2.5 sm:px-5">
                  <p className="break-keep text-sm font-extrabold leading-snug text-white">
                    ⚠️ 신청 결격사유 확인
                  </p>
                  <span className="break-keep text-xs font-bold leading-snug text-brand-yellow">
                    (해당 시 신청이 불가)
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <Field label={STEP3_FIELDS.bankruptcy.label} hint={STEP3_FIELDS.bankruptcy.hint}><Radio k="bankruptcy" opts={STEP3_FIELDS.bankruptcy.opts} /></Field>
                  <div className="mb-0">
                    <p className="mb-2 break-keep font-bold leading-snug text-brand-dark">{keepBrackets(STEP3_FIELDS.taxDelinquent.label)}</p>
                    <Radio k="taxDelinquent" opts={STEP3_FIELDS.taxDelinquent.opts} />
                  </div>
                  {/* 자본잠식은 법인사업자에게만 물어봄 (개인은 파산·회생으로 판정) */}
                  {form.businessType === "법인사업자" && (
                    <div className="mt-5">
                      <p className="mb-1 break-keep font-bold leading-snug text-brand-dark">{keepBrackets(STEP3_FIELDS.capitalImpairment.label)}</p>
                      <p className="mb-2 break-keep text-xs leading-relaxed text-brand-gray">
                        {STEP3_FIELDS.capitalImpairment.hint}
                      </p>
                      <Radio k="capitalImpairment" opts={STEP3_FIELDS.capitalImpairment.opts} />
                    </div>
                  )}
                </div>
              </div>

              {/* 사업장 정보 — 문맥별 한 박스로 묶어 깔끔하게 (유형→업종→업력→매출→연령→지역 자연스러운 순서) */}
              <GroupBox title={STEP1_GROUP}>
                <Field label={STEP1_FIELDS.businessType.label}><Radio k="businessType" opts={STEP1_FIELDS.businessType.opts} /></Field>
                <Field label={STEP1_FIELDS.industries.label}><Multi k="industries" opts={STEP1_FIELDS.industries.opts} /></Field>
                <Field label={STEP1_FIELDS.years.label}><Radio k="years" opts={STEP1_FIELDS.years.opts} /></Field>
                <Field label={STEP1_FIELDS.revenue.label}><Radio k="revenue" opts={STEP1_FIELDS.revenue.opts} /></Field>
                <Field label={STEP1_FIELDS.age.label}><Radio k="age" opts={STEP1_FIELDS.age.opts} /></Field>
                {/* 지역 — '기타' 클릭 시 직접 입력창 노출(대표님 요청) */}
                <Field label={STEP1_FIELDS.region.label}>
                  <div className="flex flex-wrap gap-2">
                    {STEP1_FIELDS.region.opts.map((o) => {
                      const active = o === "기타" ? regionEtc : !regionEtc && form.region === o;
                      return (
                        <button
                          key={o}
                          onClick={() => {
                            if (o === "기타") {
                              setRegionEtc(true);
                              set("region", "");
                            } else {
                              setRegionEtc(false);
                              set("region", o);
                            }
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-[1.03] ${
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
                  {regionEtc && (
                    <input
                      type="text"
                      value={form.region || ""}
                      onChange={(e) => set("region", e.target.value)}
                      placeholder="지역을 직접 입력해 주세요 (예: 00도 00시)"
                      className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-orange"
                    />
                  )}
                </Field>
              </GroupBox>

              {/* ※ 1단계 스마트기기 질문 제거(대표님 요청) — 동일 취지 질문이 3단계 'smartDevice'에 있어 매칭은 그대로 유지됨 */}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
              <h1 className="mb-1 break-keep text-base font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP2_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP2_SUBTITLE}</p>

              {/* ① 어떤 지원이 필요한가 — 3단계처럼 라벨+짧은 힌트로 간결화(대표님 요청). 희망금액 질문 제거 */}
              <GroupBox title={STEP2_GROUP_NEED} tone="orange">
                <Field label={STEP2_FIELDS.purposes.label} hint={STEP2_FIELDS.purposes.hint}><Multi k="purposes" opts={STEP2_FIELDS.purposes.opts} breakBefore={["수출자금"]} /></Field>
              </GroupBox>

              {/* ② 자금 여건·현재 이용 현황 — 순서(대표님 요청): 신용점수 → 직원수 → 이용 중인 정책기관
                  ※ '담보 보유 여부' 질문은 제거(대표님 요청). 매칭은 '담보없음' 기준(대부분 소상공인)으로
                     제출 시 자동 세팅되므로 보증서·정책자금 매칭 정확도는 그대로 유지됨. */}
              <GroupBox title={STEP2_GROUP_FINANCE}>
                <Field label={STEP3_FIELDS.credit.label} hint={STEP3_FIELDS.credit.hint}><Radio k="credit" opts={STEP3_FIELDS.credit.opts} /></Field>
                <Field label={STEP2_FIELDS.employees.label} hint={STEP2_FIELDS.employees.hint}><Radio k="employees" opts={STEP2_FIELDS.employees.opts} /></Field>
                <Field label={STEP2_FIELDS.currentInstitutions.label} hint={STEP2_FIELDS.currentInstitutions.hint}><Multi k="currentInstitutions" opts={STEP2_FIELDS.currentInstitutions.opts} /></Field>
              </GroupBox>

              {/* ③ 우리 기업의 강점 (인증·특허·혁신성장) — 있으면 자격이 열려 더 유리한 문맥으로 묶음 */}
              <GroupBox title={STEP2_GROUP_STRENGTH} tone="green">
                <Field label={STEP3_FIELDS.certifications.label} hint={STEP3_FIELDS.certifications.hint}><Multi k="certifications" opts={STEP3_FIELDS.certifications.opts} /></Field>
                <Field label={STEP3_FIELDS.innovation.label} hint={STEP3_FIELDS.innovation.hint}><Multi k="innovation" opts={STEP3_FIELDS.innovation.opts} /></Field>
              </GroupBox>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
              <h1 className="mb-1 break-keep text-base font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP3_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP3_SUBTITLE}</p>

              {/* ── 정밀 매칭 질문 (소진공 혁신형 상품 정확히 골라내기) ── */}
              <div className="mb-5 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/10 p-4 sm:p-5">
                <p className="mb-1 break-keep text-sm font-extrabold text-brand-dark">
                  🎯 맞춤 매칭을 위한 추가 질문
                </p>
                <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray">
                  아래 질문은 맞는 상품만 골라 드리기 위한 것입니다. 해당 없으면 &lsquo;아니요&rsquo;를 선택하시면 됩니다.
                </p>
                {/* ★ 대표님 요청 순서 ★ 연매출성장 → 스마트기기 → 대환 → 재도전 → 정부선정 → 민간투자
                    (성실상환 policyFundGood 질문은 대표님 요청으로 삭제, 스마트공장 질문도 화면 제외) */}
                <CondQ k="revenueGrowth2y" field={STEP3_CONDITIONAL_FIELDS.revenueGrowth2y} />
                <CondQ k="smartDevice" field={STEP3_CONDITIONAL_FIELDS.smartDevice} />
                <CondQ k="wantsRefinance" field={STEP3_CONDITIONAL_FIELDS.wantsRefinance} />
                <CondQ k="reFounder" field={STEP3_CONDITIONAL_FIELDS.reFounder} />
                <CondQ k="govSelected" field={STEP3_CONDITIONAL_FIELDS.govSelected} />
                <CondQ k="privateInvestment" field={STEP3_CONDITIONAL_FIELDS.privateInvestment} />
              </div>

              {/* ── 전화 상담 희망 여부 (대표님 요청 — 마지막 질문 1개) ── */}
              <div className="mb-5 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 sm:p-5">
                <p className="mb-1 break-keep text-sm font-extrabold leading-snug text-brand-dark">
                  {PHONE_CONSULT_FIELD.label}
                </p>
                <p className="mb-3 break-keep text-xs leading-relaxed text-brand-gray">
                  {PHONE_CONSULT_FIELD.hint}
                </p>
                <Radio k="phoneConsult" opts={PHONE_CONSULT_FIELD.opts} />
              </div>
              {/* ※ 결격사유(회생·파산/세금체납/자본잠식) 확인은 1단계로 이동했습니다(대표님 요청). */}
            </div>
          )}

          {/* 조회 2회 제한 안내 (마지막 단계에서만 노출) */}
          {step === 3 && (
            <div className="mt-6 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
              <p className="break-keep text-sm font-bold text-brand-dark">
                ⚠️ 정확한 정보를 입력해 주세요
              </p>
              <p className="mt-2 break-keep text-xs leading-relaxed text-brand-gray sm:text-[13px]">
                결제 1회당 <b className="text-brand-orange">새 사업자 조회는 1회</b>까지만 가능합니다.
              </p>
              <p className="mt-3 break-keep text-xs leading-relaxed text-brand-gray sm:text-[13px]">
                입력값이 정확할수록 딱 알맞는 결과를 받아보실 수 있습니다.
              </p>
              <p className="mt-3 break-keep text-xs leading-relaxed text-brand-gray sm:text-[13px]">
                진단 결과는 <b className="text-brand-dark">결제 후 1개월간</b> 계속해서 열람하실 수 있습니다.
              </p>
            </div>
          )}

          {/* 1단계 연락정보 미입력 시 안내 */}
          {step === 1 && contactErr && (
            <p className="mt-4 rounded-xl bg-brand-red/10 px-4 py-2.5 text-center text-sm font-semibold text-brand-red">
              ⚠️ {contactErr}
            </p>
          )}

          {/* 네비 버튼 */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="btn-outline flex-1 rounded-full py-3">
                {DIAGNOSIS_TEXT.prevButton}
              </button>
            )}
            {step < 3 ? (
              <button onClick={goNext} className="btn-brand flex-1 rounded-full py-3">
                {DIAGNOSIS_TEXT.nextButton}
              </button>
            ) : (
              <button onClick={submit} className="btn-brand flex-1 rounded-full py-3">
                {DIAGNOSIS_TEXT.submitButton}
              </button>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-brand-gray">
            {DIAGNOSIS_TEXT.disclaimer}
          </p>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
