"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 sm:mb-5">
      <p className="mb-2 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">{keepBrackets(label)}</p>
      {children}
    </div>
  );
}

function GroupBox({
  title,
  children,
  tone = "gray",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "gray" | "orange" | "green" | "red";
}) {
  const toneCls =
    tone === "orange"
      ? "border-brand-orange/30 bg-brand-orange/5"
      : tone === "green"
      ? "border-brand-green/30 bg-brand-green/5"
      : tone === "red"
      ? "border-brand-red/20 bg-brand-red/5"
      : "border-gray-200 bg-gray-50/70";
  return (
    <div className={`mb-4 rounded-2xl border p-3.5 sm:p-5 ${toneCls}`}>
      <p className="mb-3 break-keep text-sm font-extrabold text-brand-dark sm:mb-4">{title}</p>
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
  // 대표자 연락 정보(성함·연락처) 필수 검증 에러 메시지
  const [contactErr, setContactErr] = useState("");

  // 사업자번호 조회 상태
  const [bno, setBno] = useState("");
  const [bnoLoading, setBnoLoading] = useState(false);
  const [bnoResult, setBnoResult] = useState<any>(null);

  const checkBno = async () => {
    setBnoResult(null);
    const digits = bno.replace(/[^0-9]/g, "");
    if (digits.length !== 10) {
      setBnoResult({ ok: false, message: BNO_TEXT.errorLength });
      return;
    }
    setBnoLoading(true);
    try {
      const res = await fetch("/api/business-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bno: digits }),
      });
      const data = await res.json();
      setBnoResult(data);
      if (data.ok && data.found) {
        // 조회 결과를 진단 데이터에 함께 저장
        set("bno", digits);
        set("bnoStatus", data.status);
        set("bnoTaxType", data.taxType);
      }
    } catch {
      setBnoResult({ ok: false, message: BNO_TEXT.errorServer });
    } finally {
      setBnoLoading(false);
    }
  };

  // ★ 대표님 요청 ★ 단계가 바뀌면 화면을 맨 위로 올려줘서,
  //   고객이 스크롤을 직접 올리지 않아도 새 질문 상단부터 시작되게 한다.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) =>
    setForm((f: any) => {
      const arr = f[k] || [];
      return { ...f, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] };
    });

  // 다음 단계로 이동 — 1단계에서는 대표자 성함·연락처를 필수로 검증한다.
  const goNext = () => {
    if (step === 1) {
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
    }
    setStep(step + 1);
  };

  const submit = () => {
    try {
      sessionStorage.setItem("mpp_diagnosis", JSON.stringify(form));
    } catch {}

    // 진단 응답을 DB(diagnoses)에도 저장 → 어드민에서 전체 고객 진단서 열람 가능
    // (로그인 안 한 상태여도 저장. 실패해도 흐름은 계속 진행)
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user ?? null;
        // ★ 관리자(운영자) 계정은 DB에 기록하지 않음 (대표님 요청 — 테스트가 통계에 안 섞이게) ★
        if (isAdminEmail(user?.email)) return;
        // 1단계에서 받은 대표자 성함·연락처를 전용 컬럼(name/phone)에도 저장
        // → 관리자 목록·엑셀·상담 안내에서 정확히 식별됩니다. (profile 안에도 함께 보관)
        await supabase.from("diagnoses").insert({
          user_id: user?.id ?? null,
          profile: form,
          name: (form.name || "").trim() || null,
          phone: (form.phone || "").trim() || null,
          email: user?.email ?? null,
        });
      } catch {
        /* 저장 실패해도 사용자 흐름은 막지 않음 */
      }
    })();

    router.push("/matching-preview");
  };

  const progress = (step / 3) * 100;

  const Radio = ({ k, opts }: { k: string; opts: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => set(k, o)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition hover:scale-[1.03] sm:px-4 sm:py-2 ${
            form[k] === o
              ? "border-brand-orange bg-brand-grad text-brand-dark"
              : "border-gray-300 bg-white text-brand-dark hover:border-brand-orange"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
  const Multi = ({ k, opts }: { k: string; opts: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => toggle(k, o)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition hover:scale-[1.03] sm:px-4 sm:py-2 ${
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
    <div className="mb-6 last:mb-0">
      <p className="mb-1 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">{keepBrackets(field.label)}</p>
      <p className="mb-2 break-keep text-xs leading-relaxed text-brand-gray">{field.hint}</p>
      <Radio k={k} opts={field.opts} />
    </div>
  );

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
              <h1 className="mb-1 text-lg font-extrabold text-brand-dark sm:text-xl">{STEP1_TITLE}</h1>
              <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray sm:mb-5 sm:text-sm">{STEP1_SUBTITLE}</p>

              {/* 사업자번호 자동 조회 (국세청 연동) — 박스 틀 색상 빨간색으로 통일(대표님 요청) */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4">
                <p className="mb-2 font-bold text-brand-dark">
                  {BNO_TEXT.title}
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
                    {!bnoResult.ok ? (
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

              {/* 대표자 성함 및 연락처 — 사업자등록번호 조회 바로 아래에 배치(대표님 요청). 성함·연락처 필수 · 박스 틀 색상 빨간색으로 통일 */}
              <GroupBox title={CONTACT_TEXT.groupTitle} tone="red">
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
              <div className="mb-5 rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4 sm:p-5">
                <p className="mb-3 break-keep text-sm font-extrabold leading-snug text-brand-red">
                  ⚠️ 신청 결격사유 확인{"\u00A0"}
                  <span className="font-bold">(해당 시 신청이 어려워 먼저 확인드립니다)</span>
                </p>
                <Field label={STEP3_FIELDS.bankruptcy.label}><Radio k="bankruptcy" opts={STEP3_FIELDS.bankruptcy.opts} /></Field>
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
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-1.5 text-xl font-extrabold text-brand-dark">{STEP2_TITLE}</h1>
              <p className="mb-5 break-keep text-sm leading-relaxed text-brand-gray">{STEP2_SUBTITLE}</p>

              {/* ① 어떤 지원이 필요한가 (상담목적+관심분야 통합, 희망 금액) */}
              <GroupBox title={STEP2_GROUP_NEED} tone="orange">
                <Field label={STEP2_FIELDS.purposes.label}><Multi k="purposes" opts={STEP2_FIELDS.purposes.opts} /></Field>
                <Field label={STEP2_FIELDS.desiredAmount.label}><Radio k="desiredAmount" opts={STEP2_FIELDS.desiredAmount.opts} /></Field>
              </GroupBox>

              {/* ② 자금 여건·현재 이용 현황 (신용점수·담보·이용기관·직원수) — 대출 자격 판정 문맥으로 묶음 */}
              <GroupBox title={STEP2_GROUP_FINANCE}>
                <Field label={STEP3_FIELDS.credit.label}><Radio k="credit" opts={STEP3_FIELDS.credit.opts} /></Field>
                <Field label={STEP2_FIELDS.collateral.label}><Radio k="collateral" opts={STEP2_FIELDS.collateral.opts} /></Field>
                <Field label={STEP2_FIELDS.currentInstitutions.label}><Multi k="currentInstitutions" opts={STEP2_FIELDS.currentInstitutions.opts} /></Field>
                {/* 직원수(4대보험 통합) — 힌트 포함 */}
                <div className="mb-6 last:mb-0">
                  <p className="mb-1 break-keep font-bold leading-snug text-brand-dark">{keepBrackets(STEP2_FIELDS.employees.label)}</p>
                  <p className="mb-2 break-keep text-xs leading-relaxed text-brand-gray">
                    {STEP2_FIELDS.employees.hint}
                  </p>
                  <Radio k="employees" opts={STEP2_FIELDS.employees.opts} />
                </div>
              </GroupBox>

              {/* ③ 우리 기업의 강점 (인증·특허·혁신성장) — 있으면 자격이 열려 더 유리한 문맥으로 묶음 */}
              <GroupBox title={STEP2_GROUP_STRENGTH} tone="green">
                <Field label={STEP3_FIELDS.certifications.label}><Multi k="certifications" opts={STEP3_FIELDS.certifications.opts} /></Field>
                <Field label={STEP3_FIELDS.innovation.label}><MultiGrid k="innovation" opts={STEP3_FIELDS.innovation.opts} /></Field>
              </GroupBox>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-1.5 text-xl font-extrabold text-brand-dark">{STEP3_TITLE}</h1>
              <p className="mb-5 break-keep text-sm leading-relaxed text-brand-gray">{STEP3_SUBTITLE}</p>

              {/* ── 정밀 매칭 질문 (소진공 혁신형 상품 정확히 골라내기) ── */}
              <div className="mb-5 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/10 p-4 sm:p-5">
                <p className="mb-1 break-keep text-sm font-extrabold text-brand-dark">
                  🎯 맞춤 매칭을 위한 추가 질문
                </p>
                <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray">
                  아래 질문은 맞는 상품만 골라 드리기 위한 것입니다.
                  <br />
                  해당 없으면 &lsquo;아니요&rsquo;를 선택하시면 됩니다.
                </p>
                {/* ★ 대표님 요청: 질문 글자수가 긴 것부터 위 → 아래로 배치(읽기 편하게) ★ */}
                <CondQ k="revenueGrowth2y" field={STEP3_CONDITIONAL_FIELDS.revenueGrowth2y} />
                <CondQ k="wantsRefinance" field={STEP3_CONDITIONAL_FIELDS.wantsRefinance} />
                <CondQ k="govSelected" field={STEP3_CONDITIONAL_FIELDS.govSelected} />
                <CondQ k="smartDevice" field={STEP3_CONDITIONAL_FIELDS.smartDevice} />
                <CondQ k="reFounder" field={STEP3_CONDITIONAL_FIELDS.reFounder} />
                <CondQ k="privateInvestment" field={STEP3_CONDITIONAL_FIELDS.privateInvestment} />
                {/* 스마트공장은 제조업일 때만 노출 */}
                {(form.industries || []).includes("제조업") && (
                  <CondQ k="smartFactory" field={STEP3_CONDITIONAL_FIELDS.smartFactory} />
                )}
                <CondQ k="policyFundGood" field={STEP3_CONDITIONAL_FIELDS.policyFundGood} />
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
                입력값이 정확할수록 딱 맞는 결과를 받아보실 수 있으니,
                제출 전에 한 번 더 확인해 주세요.
              </p>
              <p className="mt-3 break-keep text-xs leading-relaxed text-brand-gray sm:text-[13px]">
                조회하신 결과는 <b className="text-brand-dark">결제 후 1개월간</b> 언제든
                계속적으로 열람하실 수 있습니다.
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
