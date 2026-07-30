"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";
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
  // 라벨 끝의 대괄호 표기(예: "[완납 여부]")는 살짝 작은 글씨로 분리 표시(대표님 요청).
  const lm = label.match(/^(.*?)\s*(\[[^\]]*\])\s*$/);
  const labelMain = lm ? lm[1] : label;
  const labelBadge = lm ? lm[2] : "";
  return (
    // data-question: 답을 고르면 '다음 질문'을 화면 중앙으로 스크롤하기 위한 마커(대표님 요청)
    <div data-question className="mb-5 scroll-mt-24 last:mb-0 sm:mb-6">
      {label && (
        <p className="mb-1 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">
          {keepBrackets(labelMain)}
          {labelBadge && (
            <span className="ml-1 whitespace-nowrap align-middle text-[11px] font-semibold text-brand-gray sm:text-xs">
              {labelBadge}
            </span>
          )}
        </p>
      )}
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
  // 지역 '기타'(직접 입력) 모드 여부 - true면 아래에 직접 입력창을 띄웁니다.
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

  // 국세청 조회 1회 시도 - 결과를 { kind } 로 반환 (재시도 판단용)
  //   kind: "found"(성공) | "serverDown"(국세청 장애→재시도 후보) | "answered"(미등록·형식오류 등 확정응답)
  const tryFetchBno = async (
    digits: string
  ): Promise<{ kind: "found" | "serverDown" | "answered"; data: any }> => {
    // 재시도를 감안해 개별 시도는 4.5초로 짧게 끊는다 (총 대기 과도하지 않게)
    const TIMEOUT_MS = 4500;
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
      if (data.ok && data.found) return { kind: "found", data };
      if (data.serverError) return { kind: "serverDown", data };
      return { kind: "answered", data }; // 미등록·형식오류 등 국세청이 '정상 응답'한 경우
    } catch {
      // 타임아웃/네트워크 오류 → 국세청 연결 문제로 간주(재시도 후보)
      return {
        kind: "serverDown",
        data: { ok: false, serverError: true, message: BNO_TEXT.errorServer },
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const checkBno = async () => {
    setBnoResult(null);
    setBnoServerDown(false);
    setBnoManual(false);
    const digits = bno.replace(/[^0-9]/g, "");
    // 10자리 미만이면 오류 문구 없이 조용히 대기(대표님 요청: '10자리를 정확히...' 안내 제거)
    if (digits.length !== 10) {
      setBnoResult(null);
      return;
    }
    setBnoLoading(true);

    // ★ 대표님 요청 반영 ★ 고객은 오래 못 기다린다.
    //   단, 국세청 503은 '순간 장애'인 경우가 많으므로 자동으로 딱 1회만 짧게(1.2초 텀) 재시도한다.
    //   그래도 안 되면 즉시 수동입력 우회를 연다. (무한 재시도로 시간 끌지 않음)
    try {
      let r = await tryFetchBno(digits);

      // 국세청 장애면 1.2초 뒤 자동 1회 재시도 (순간 혼잡이면 두 번째에 성공)
      if (r.kind === "serverDown") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        r = await tryFetchBno(digits);
      }

      if (r.kind === "found") {
        setBnoResult(r.data);
        set("bno", digits);
        set("bnoStatus", r.data.status);
        set("bnoTaxType", r.data.taxType);
        set("bnoVerified", true); // 국세청 검증됨
        return;
      }

      if (r.kind === "serverDown") {
        // 재시도까지 실패 → 수동입력 우회 열기
        setBnoResult(r.data);
        setBnoServerDown(true);
        return;
      }

      // 정상 응답이지만 미등록/형식오류 → 그대로 안내(수동입력 안 열림)
      setBnoResult(r.data);
    } finally {
      setBnoLoading(false);
    }
  };

  // ★ 국세청 서버 장애 시 수동입력 확정 - 검증 없이 사업자번호를 접수한다(신청 누락 방지) ★
  const confirmManualBno = () => {
    const digits = bno.replace(/[^0-9]/g, "");
    // 10자리 미만이면 오류 문구 없이 조용히 대기(대표님 요청: '10자리를 정확히...' 안내 제거)
    if (digits.length !== 10) {
      setBnoResult(null);
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

  // 답을 고르면 '다음 질문'을 화면 중앙으로 부드럽게 이동(대표님 요청) - 스크롤 내리는 수고 제거.
  //  · 단일 선택(Radio)에서만 자동 이동 (복수 선택은 여러 개 고르므로 자동 이동 제외 → 화면 튐 방지)
  //  · 이벤트가 발생한 버튼이 속한 [data-question] 블록의 '다음 [data-question]'으로 이동
  const scrollToNextQuestion = (e?: any) => {
    try {
      if (typeof window === "undefined") return;
      const target = e?.currentTarget as HTMLElement | undefined;
      const cur = target?.closest("[data-question]");
      const all = Array.from(document.querySelectorAll("[data-question]"));
      const idx = cur ? all.indexOf(cur) : -1;
      const next = idx >= 0 ? (all[idx + 1] as HTMLElement | undefined) : undefined;
      // 다음 질문이 있으면 중앙으로, 없으면(마지막 질문) '다음 단계' 버튼이 보이게 살짝 아래로
      window.requestAnimationFrame(() => {
        if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch {
      /* noop */
    }
  };
  const set = (k: string, v: any, e?: any) => {
    setForm((f: any) => ({ ...f, [k]: v }));
    scrollToNextQuestion(e);
  };
  const toggle = (k: string, v: string) =>
    setForm((f: any) => {
      const arr = f[k] || [];
      return { ...f, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] };
    });

  // 다음 단계로 이동 - 1단계에서는 사업자등록번호(필수)·성함·연락처를 검증한다.
  const goNext = () => {
    if (step === 1) {
      // ★ 대표님 요청 ★ 사업자등록번호 필수 - 없는 사업자는 신청 불가.
      //   단, '예비창업자'는 아직 사업자번호가 없으므로 예외로 통과시킨다.
      const isPreStartup = typeof form.businessType === "string" && form.businessType.startsWith("예비");
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
      // 제3자 제공 동의는 회원가입 단계에서 받으므로 진단 질문지에서는 검사하지 않는다(대표님 요청).
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
    // 다음 단계로 넘어가면 항상 상단부터 보이도록(대표님 요청)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    // ★ 담보 질문 제거(대표님 요청)에 따른 매칭 안전장치 ★
    //   '담보 보유' 질문을 화면에서 뺐으므로, 매칭이 참조하는 collateral 값을
    //   '없음'으로 자동 세팅한다. (대부분 소상공인 = 담보없음 → 보증서·정책자금 매칭 유지)
    //   ※ setForm은 비동기라 저장에 넘기는 form을 즉시 보정하기 위해 직접 채워둔다.
    if (!form.collateral) form.collateral = "없음";
    // ★ 심층질문 카드 미선택 = "아니요" 자동 세팅 (대표님 요청: 카드형 UI로 전환) ★
    //   카드를 탭하지 않은 심층질문은 값이 비어 있으므로, 매칭이 참조하는 값을
    //   각 질문의 '아니요' 옵션으로 채워 결과 정확도를 기존과 100% 동일하게 유지한다.
    //   (기존 Radio 방식에서 '아니요'를 고른 것과 완전히 같은 값)
    const DEEP_KEYS = [
      "revenueGrowth2y", "smartDevice", "wantsRefinance",
      "reFounder", "govSelected", "privateInvestment",
    ];
    DEEP_KEYS.forEach((k) => {
      if (!form[k]) form[k] = "아니요";
    });
    // 진단 결과를 localStorage 에 30일간 저장 (탭 닫아도 유지 · 1달 후 자동 만료)
    // ★ 어느 로그인 계정의 진단인지 '소유자'를 함께 저장 → 다른 계정으로 로그인하면
    //    이 진단이 따라오지 않도록 한다. (계정별 데이터 분리)
    (async () => {
      // 결과 화면 목적지 - ?analyze=1 로 'AI 분석 중' 연출을 보여준다.
      const RESULT_URL = "/matching-preview?analyze=1";
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user ?? null;

        // 소유자(user.id)를 붙여 저장 - 비회원이면 null(나중에 로그인 시 자동 연결)
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
  // ★ px(좌우 패딩)는 pillCls에 넣지 않는다 ★
  //   여기에 px-4를 박아두면 cols3처럼 뒤에서 px-0으로 덮어써도 Tailwind 빌드 CSS 순서상
  //   px-4가 이겨 좌측 패딩이 남고, 긴 글자("개인사업자")가 오른쪽으로 밀려 보이는 버그가 생김.
  //   → 기본 패딩은 pillPad에서 주고, cols3/cols4는 각자 좁은 패딩을 명시(충돌 없음).
  const pillCls = (active: boolean) =>
    `rounded-full border py-2 text-sm font-semibold transition hover:scale-[1.03] ${
      active
        ? "border-brand-orange bg-brand-grad text-brand-dark"
        : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
    }`;
  const pillPad = "px-4"; // 기본 좌우 패딩 (cols3/cols4 이외에 사용)
  // cols2: 글자가 긴 2지선다(결격사유 등)를 모바일에서 균등 2열로 정렬 → 너비 들쭉날쭉 방지
  // grid: 선택지가 여러 개인 항목(업력·직원수 등)을 모바일에서 균등 2열 그리드로 정렬해
  //       'flex-wrap' 특유의 마지막 줄 1개만 남는(2/2/1) 어색함을 없앤다. PC(sm)에서는 자동 줄바꿈 유지.
  // 옵션 문구를 "라벨 [상태]" 형태로 분리해 모바일에서만 2줄로 표시(대표님 요청).
  //   예) "해당 없음 [신청 가능]" → 모바일: '해당 없음' / '[신청 가능]' 2줄 · PC: 한 줄 그대로.
  //   대괄호가 없는 옵션은 그냥 그대로 표시.
  const renderOptLabel = (o: string, twoLine?: boolean) => {
    if (!twoLine) return o;
    const m = o.match(/^(.*?)\s*(\[[^\]]*\])\s*$/);
    if (!m) return o;
    return (
      <>
        {m[1]}
        {/* 모바일: 줄바꿈 · PC(sm 이상): 공백 한 칸으로 한 줄 유지 */}
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> </span>
        {m[2]}
      </>
    );
  };
  const Radio = ({
    k,
    opts,
    cols2,
    cols3,
    cols4,
    grid,
    twoLine,
  }: {
    k: string;
    opts: string[];
    cols2?: boolean;
    cols3?: boolean;
    cols4?: boolean;
    grid?: boolean;
    twoLine?: boolean; // 모바일에서 옵션을 "라벨/[상태]" 2줄로 표시
  }) =>
    cols2 || cols3 || cols4 || grid ? (
      <div
        className={
          cols2
            ? "grid w-full grid-cols-2 gap-2"
            : cols3
            ? // cols3: 짧은 3지선다(사업자 유형 등)를 모바일에서도 한 줄 3열로 꽉 차게 정렬
              "grid w-full grid-cols-3 gap-2"
            : cols4
            ? // cols4: 짧은 4지선다(지역 등)를 모바일에서도 한 줄 4열로 꽉 차게 정렬
              "grid w-full grid-cols-4 gap-2"
            : // grid: 모바일 균등 2열 → PC(sm 이상)는 내용 폭에 맞춰 자동 흐름
              "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
        }
      >
        {opts.map((o) => (
          <button
            key={o}
            onClick={(e) => set(k, o, e)}
            className={`${pillCls(form[k] === o)} w-full break-keep text-center sm:w-auto ${
              cols3
                ? // cols3: 3열이라 폭이 좁음 → 좌우 패딩 제거·폰트 축소해 긴 글자("개인사업자")도
                  //         pill 안에 오버플로우 없이 '정중앙' 정렬되게 함(대표님 요청). PC는 원래대로.
                  "whitespace-nowrap px-0 text-[11px] sm:px-4 sm:text-sm"
                : cols4
                ? // cols4: 4열이라 더 좁음 → 모바일 폰트·패딩 더 축소 + 한 줄 유지
                  "whitespace-nowrap px-0.5 text-[13px] sm:px-4 sm:text-sm"
                : twoLine
                ? // twoLine: 모바일 2줄 표시 → 줄간격 살짝 좁게(leading-tight) + 기본 패딩
                  `${pillPad} leading-tight sm:leading-normal`
                : pillPad
            }`}
          >
            {renderOptLabel(o, twoLine)}
          </button>
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <button key={o} onClick={(e) => set(k, o, e)} className={`${pillCls(form[k] === o)} ${pillPad}`}>
            {o}
          </button>
        ))}
      </div>
    );
  // breakBefore: 해당 라벨 앞에서 강제 줄바꿈(PC에서 원하는 줄 배치 - 대표님 요청)
  // grid: 모바일에서 균등 2열 그리드로 정렬(정책기관 등) → flex-wrap 특유의 들쭉날쭉/마지막 1개 어색함 제거.
  //       PC(sm 이상)는 자동 줄바꿈 유지.
  const Multi = ({
    k,
    opts,
    breakBefore,
    grid,
    labelMap,
  }: {
    k: string;
    opts: string[];
    breakBefore?: string[];
    grid?: boolean;
    // 화면에만 짧게 보이는 라벨 매핑(값은 opts 그대로 저장) - 매칭 로직 영향 없음
    labelMap?: Record<string, string>;
  }) =>
    grid ? (
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {opts.map((o) => (
          <button
            key={o}
            onClick={() => toggle(k, o)}
            className={`${pillCls((form[k] || []).includes(o))} ${pillPad} w-full break-keep text-center sm:w-auto`}
          >
            {labelMap?.[o] ?? o}
          </button>
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <Fragment key={o}>
            {breakBefore?.includes(o) && <div className="hidden w-full sm:block" aria-hidden />}
            <button onClick={() => toggle(k, o)} className={`${pillCls((form[k] || []).includes(o))} ${pillPad}`}>
              {labelMap?.[o] ?? o}
            </button>
          </Fragment>
        ))}
      </div>
    );

  // ── 심층질문 체크리스트 카드 (대표님 요청: 같은 부류끼리·답하기 편하게·톤 통일) ──
  //   ★결과 무관★ 탭하면 값이 "예"("긍정 옵션"), 다시 탭하면 "아니요"로 토글된다.
  //     기존 Radio(예/아니요)와 완전히 같은 값을 저장하므로 matching.ts 결과는 100% 동일.
  //   미선택(값 없음)은 submit 시 아래 ensureDeepDefaults()가 부정 옵션으로 채운다.
  const DeepCard = ({
    k,
    field,
    emoji,
  }: {
    k: string;
    field: { label: string; hint: string; opts: string[] };
    emoji: string;
  }) => {
    const yesOpt = field.opts[0]; // "예" 계열
    const noOpt = field.opts[1]; // "아니요" 계열
    const active = form[k] === yesOpt;
    return (
      <button
        type="button"
        data-question
        onClick={() => set(k, active ? noOpt : yesOpt)}
        // deep-card / deep-card-active: globals.css 다크테마에서 카드 배경·테두리를
        //   또렷하게 살리기 위한 명시 클래스(이모지·글자가 묻히지 않도록).
        className={`deep-card flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition hover:scale-[1.01] sm:p-4 ${
          active
            ? "deep-card-active border-brand-orange bg-brand-orange/10 shadow-card"
            : "border-gray-200 bg-white hover:border-brand-orange/60"
        }`}
      >
        {/* 이모지 - 살짝 밝은 원형 배경을 깔아 다크 배경 위에서도 또렷하게(대표님 요청 가시성 개선) */}
        <span className="deep-card-emoji mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-grad/25 text-lg leading-none sm:text-xl">
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-keep text-[13px] font-bold leading-snug text-brand-dark sm:text-sm">
            {keepBrackets(field.label)}
          </span>
          <span className="mt-0.5 block break-keep text-[11px] leading-snug text-brand-gray sm:text-xs">
            {field.hint}
          </span>
        </span>
        {/* 체크 표시 - 켜지면 오렌지 채움, 꺼지면 빈 원(테두리만) */}
        <span
          className={`deep-card-check mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold transition ${
            active
              ? "border-brand-orange bg-brand-orange text-white"
              : "border-gray-300 text-transparent"
          }`}
          aria-hidden
        >
          ✓
        </span>
      </button>
    );
  };

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
              <h1 className="mb-1 break-keep text-[15px] font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP1_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP1_SUBTITLE}</p>

              {/* 사업자번호 자동 조회 (국세청 연동)
                  ★톤 통일★ 위험(결격) 박스만 빨강, 나머지는 차분한 회색 1톤으로(대표님 요청).
                  '(필수)' 강조는 제목 옆 빨강 배지로 충분하므로 박스 틀은 회색으로 통일. */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
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
                  {/* ★ 예비창업자 바로가기 (대표님 요청) ★ 아직 사업자등록 전이면 이 버튼 하나로
                      사업자 구분을 '예비'로 세팅 → goNext의 isPreStartup 예외로 사업자번호 없이 통과.
                      기존 라디오와 완전히 같은 값("예비")을 세팅하므로 매칭·검증 로직 100% 동일. */}
                  <button
                    type="button"
                    onClick={() => set("businessType", "예비")}
                    className="shrink-0 whitespace-nowrap rounded-full border border-brand-orange bg-white px-3 py-2 text-xs font-bold text-brand-orange shadow-sm transition-all hover:bg-brand-orange/5 disabled:opacity-60 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    예비창업자
                  </button>
                </div>
                {form.businessType === "예비" && (
                  /* ★ 대표님 요청 ★ 조회 결과 박스처럼 하단 박스로 표시해 바로 알아보게 */
                  <div className="mt-3 rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-sm">
                    <p className="font-semibold text-brand-dark">
                      ✅ 예비창업자를 선택하였습니다. 바로 다음 단계로 진행하세요.
                    </p>
                  </div>
                )}
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
                      <div className="rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3">
                        <p className="font-semibold text-brand-dark">
                          🛠️ 지금은 국세청 조회 서버 점검 시간입니다.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-brand-gray">
                          국세청 사업자 조회는 <b>정기 점검</b>이 잦아 일시적으로 연결이 안 될 수 있습니다.
                          아래 <b className="text-brand-orange">직접 입력하고 계속하기</b>를 클릭하시면 신청이 정상 접수됩니다.
                        </p>
                        {/* ★ 시선 유도 (대표님 요청) ★ 오류 시 이 버튼을 누르면 된다는 걸 손가락+맥박 애니메이션으로 강조 */}
                        <p className="mt-2 flex items-center gap-1 text-xs font-extrabold text-brand-orange">
                          <span className="animate-nudgeDown inline-block">👇</span>
                          여기를 눌러 계속 진행하세요
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <button
                            onClick={confirmManualBno}
                            className="btn-brand animate-attentionPulse rounded-full px-5 py-2 text-xs font-extrabold"
                          >
                            직접 입력하고 계속하기 →
                          </button>
                          <button
                            onClick={checkBno}
                            disabled={bnoLoading}
                            className="rounded-full border border-brand-gray/40 bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray disabled:opacity-60"
                          >
                            {bnoLoading ? "재시도 중…" : "다시 조회"}
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
              </div>

              {/* 대표자 성함 및 연락처 - 사업자등록번호 조회 바로 아래에 배치(대표님 요청).
                  ★톤 통일★ 위험(결격) 박스만 빨강, 나머지는 차분한 회색 1톤으로 통일(대표님 요청). */}
              <GroupBox title={CONTACT_TEXT.groupTitle} matchBno>
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

                {/* 제3자 제공 동의는 회원가입 단계에서 1회만 받는다(중복 제거·거부감 완화, 대표님 요청).
                    비회원은 진단 결과를 볼 수 없어 반드시 가입을 거치므로 동의 근거는 가입 시점에 확보된다. */}
              </GroupBox>

              {/* ★ 대표님 요청 ★ 신청 결격사유 확인을 1단계 성함 아래로 이동.
                  어렵게 다 작성했는데 결격사유면 신청도 못 하므로, 처음에 먼저 확인.
                  (회생·파산 / 세금 체납 - 승인 자체가 막히는 핵심 항목만)
                  ★톤 통일(대표님 요청)★ 위쪽 빨간 띠(제목 바)를 없애고 '대표자 기본정보'
                  박스와 동일한 GroupBox(회색 1톤)로 통일. "(해당 시 신청이 불가)"는
                  제목 괄호로 넣어 자동으로 포인트색 뱃지 처리됨. */}
              <GroupBox title="⚠️ 신청 결격사유 확인 (필수)">
                <Field label={STEP3_FIELDS.bankruptcy.label}><Radio k="bankruptcy" opts={STEP3_FIELDS.bankruptcy.opts} cols2 twoLine /></Field>
                <Field label={STEP3_FIELDS.taxDelinquent.label}>
                  <Radio k="taxDelinquent" opts={STEP3_FIELDS.taxDelinquent.opts} cols2 twoLine />
                </Field>
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
              </GroupBox>

              {/* 사업장 정보 - 문맥별 한 박스로 묶어 깔끔하게 (유형→업종→업력→매출→연령→지역 자연스러운 순서) */}
              <GroupBox title={STEP1_GROUP}>
                <Field label={STEP1_FIELDS.businessType.label}><Radio k="businessType" opts={STEP1_FIELDS.businessType.opts} cols3 /></Field>
                <Field label={STEP1_FIELDS.industries.label}><Multi k="industries" opts={STEP1_FIELDS.industries.opts} /></Field>
                {/* 업력(6개)·연매출(5개)은 3열로 배치해 세로 길이를 줄임(페이지 높이 균등화·대표님 요청).
                    값은 그대로라 매칭 결과 영향 없음. */}
                <Field label={STEP1_FIELDS.years.label}><Radio k="years" opts={STEP1_FIELDS.years.opts} cols3 /></Field>
                <Field label={STEP1_FIELDS.revenue.label}><Radio k="revenue" opts={STEP1_FIELDS.revenue.opts} cols3 /></Field>
                <Field label={STEP1_FIELDS.age.label}><Radio k="age" opts={STEP1_FIELDS.age.opts} cols3 /></Field>
                {/* 지역 - '기타' 클릭 시 직접 입력창 노출(대표님 요청) */}
                <Field label={STEP1_FIELDS.region.label}>
                  {/* 지역 4개(서울·경기·인천·기타)를 모바일에서도 한 줄 4열로 정렬(대표님 요청) */}
                  <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
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
                          className={`w-full whitespace-nowrap rounded-full border px-0.5 py-2 text-[13px] font-semibold transition hover:scale-[1.03] sm:w-auto sm:px-4 sm:text-sm ${
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

              {/* ※ 1단계 스마트기기 질문 제거(대표님 요청) - 동일 취지 질문이 3단계 'smartDevice'에 있어 매칭은 그대로 유지됨 */}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
              <h1 className="mb-1 break-keep text-[15px] font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP2_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP2_SUBTITLE}</p>

              {/* ① 자금 여건·현재 이용 현황 - 순서(대표님 요청): 신용점수 → 직원수 → 이용 중인 정책기관
                  ※ '담보 보유 여부' 질문은 제거(대표님 요청). 매칭은 '담보없음' 기준(대부분 소상공인)으로
                     제출 시 자동 세팅되므로 보증서·정책자금 매칭 정확도는 그대로 유지됨. */}
              <GroupBox title={STEP2_GROUP_FINANCE}>
                <Field label={STEP3_FIELDS.credit.label} hint={STEP3_FIELDS.credit.hint}><Radio k="credit" opts={STEP3_FIELDS.credit.opts} grid /></Field>
                <Field label={STEP2_FIELDS.employees.label} hint={STEP2_FIELDS.employees.hint}><Radio k="employees" opts={STEP2_FIELDS.employees.opts} grid /></Field>
                <Field label={STEP2_FIELDS.currentInstitutions.label} hint={STEP2_FIELDS.currentInstitutions.hint}><Multi k="currentInstitutions" opts={STEP2_FIELDS.currentInstitutions.opts} labelMap={STEP2_FIELDS.currentInstitutions.labelMap} grid /></Field>
              </GroupBox>

              {/* ② 필요한 지원 (회사 정보 문맥 - '무엇이 필요한지'는 회사 상황의 일부이므로 2페이지에 배치.
                  페이지 세로길이 균등화 목적으로도 2페이지에 무게를 실어 1·2·3 높이를 맞춤(대표님 요청).
                  ★톤 통일★ 색을 빼고 회색 기본 톤으로(대표님 요청). */}
              <GroupBox title={STEP2_GROUP_NEED}>
                <Field label={STEP2_FIELDS.purposes.label} hint={STEP2_FIELDS.purposes.hint}><Multi k="purposes" opts={STEP2_FIELDS.purposes.opts} breakBefore={["수출자금"]} /></Field>
              </GroupBox>

              {/* ③ 우리 기업의 강점 (인증·특허·혁신성장) - 있으면 자격이 열려 더 유리한 문맥으로 묶음.
                  ★톤 통일★ 색을 빼고 회색 기본 톤으로(대표님 요청). */}
              <GroupBox title={STEP2_GROUP_STRENGTH}>
                {/* ★ 순서 변경 (대표님 요청) ★ 혁신성장분야 → 특허·인증 보유 여부 순. (매칭 무관: 표시 순서만) */}
                <Field label={STEP3_FIELDS.innovation.label} hint={STEP3_FIELDS.innovation.hint}><Multi k="innovation" opts={STEP3_FIELDS.innovation.opts} /></Field>
                <Field label={STEP3_FIELDS.certifications.label} hint={STEP3_FIELDS.certifications.hint}><Multi k="certifications" opts={STEP3_FIELDS.certifications.opts} /></Field>
              </GroupBox>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
              <h1 className="mb-1 break-keep text-[15px] font-extrabold leading-snug text-brand-dark sm:text-lg">{STEP3_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP3_SUBTITLE}</p>

              {/* ── ① 정밀 매칭 질문 (카드형 체크리스트 · 대표님 요청) ──
                  탭하면 켜짐(=예), 다시 탭하면 꺼짐(=아니요). 해당되는 것만 켜면 됩니다.
                  ★결과 무관★ 값은 기존 예/아니요와 동일 → matching.ts 결과 100% 유지.
                  ★톤 통일★ 노랑 큰 박스 → GroupBox와 동일한 차분한 회색 톤으로(대표님 요청). */}
              <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 sm:p-5">
                <p className="mb-1 break-keep text-sm font-extrabold text-brand-dark">
                  🎯 맞춤 매칭을 위한 추가 질문
                </p>
                <p className="mb-3 break-keep text-xs leading-relaxed text-brand-gray sm:mb-4">
                  해당되는 항목을 눌러주세요. 안 누른 질문은 자동으로 &lsquo;아니요&rsquo;로 체크됩니다.
                </p>
                {/* ★ 대표님 요청 순서 ★ 연매출성장 → 스마트기기 → 대환 → 재도전 → 정부선정 → 민간투자 */}
                <div className="grid grid-cols-1 gap-3">
                  <DeepCard k="revenueGrowth2y" field={STEP3_CONDITIONAL_FIELDS.revenueGrowth2y} emoji="📈" />
                  <DeepCard k="smartDevice" field={STEP3_CONDITIONAL_FIELDS.smartDevice} emoji="🖥️" />
                  <DeepCard k="wantsRefinance" field={STEP3_CONDITIONAL_FIELDS.wantsRefinance} emoji="🔄" />
                  <DeepCard k="reFounder" field={STEP3_CONDITIONAL_FIELDS.reFounder} emoji="🔁" />
                  <DeepCard k="govSelected" field={STEP3_CONDITIONAL_FIELDS.govSelected} emoji="🏆" />
                  <DeepCard k="privateInvestment" field={STEP3_CONDITIONAL_FIELDS.privateInvestment} emoji="💵" />
                </div>
              </div>

              {/* ── 전화 상담 희망 여부 (대표님 요청 - 마지막 질문 1개) ──
                  ★톤 통일★ 오렌지 박스 → GroupBox와 동일한 차분한 회색 톤으로(대표님 요청). */}
              <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 sm:p-5">
                <p className="mb-1 break-keep text-sm font-extrabold leading-snug text-brand-dark">
                  {PHONE_CONSULT_FIELD.label}
                </p>
                <p className="mb-3 break-keep text-xs leading-relaxed text-brand-gray">
                  {PHONE_CONSULT_FIELD.hint}
                </p>
                <Radio k="phoneConsult" opts={PHONE_CONSULT_FIELD.opts} cols2 />
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
              <button
                onClick={() => {
                  setStep(step - 1);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="btn-outline flex-1 rounded-full py-3"
              >
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
      {/* ── 쿠팡 파트너스 광고 (무료진단 1·2·3 단계 하단 · 푸터 위) ── */}
      <div className="border-t border-brand-dark/5 px-4 py-5">
        <CoupangPartnersBanner
          iframeSrc="https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=680&height=140&tsource="
          iframeHeight={140}
        />
      </div>
      <Footer />
    </PageShell>
  );
}
