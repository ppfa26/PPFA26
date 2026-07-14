"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabaseClient";
import {
  DIAGNOSIS_TEXT,
  BNO_TEXT,
  STEP1_TITLE,
  STEP1_FIELDS,
  STEP2_TITLE,
  STEP2_FIELDS,
  STEP3_TITLE,
  STEP3_FIELDS,
  STEP3_CONDITIONAL_FIELDS,
} from "@/lib/diagnosisConfig";

export default function Diagnosis() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({ purposes: [], interests: [], industries: [], certifications: [], innovation: [], currentInstitutions: [] });

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

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) =>
    setForm((f: any) => {
      const arr = f[k] || [];
      return { ...f, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] };
    });

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
        await supabase.from("diagnoses").insert({
          user_id: user?.id ?? null,
          profile: form,
          name: (form as any)?.name ?? null,
          phone: (form as any)?.phone ?? null,
          email: user?.email ?? (form as any)?.email ?? null,
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
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
          className={`min-h-[40px] break-keep rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition sm:text-xs ${
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
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <p className="mb-2 font-bold text-brand-dark">{label}</p>
      {children}
    </div>
  );
  // 조건부 질문(라벨+설명힌트+단일선택) — 소진공 혁신형 상품 정밀 매칭용
  const CondQ = ({ k, field }: { k: string; field: { label: string; hint: string; opts: string[] } }) => (
    <div className="mb-6">
      <p className="mb-1 break-keep text-sm font-bold leading-snug text-brand-dark sm:text-base">{field.label}</p>
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
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">{STEP1_TITLE}</h1>

              {/* 사업자번호 자동 조회 (국세청 연동) */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 p-4">
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

              <Field label={STEP1_FIELDS.businessType.label}><Radio k="businessType" opts={STEP1_FIELDS.businessType.opts} /></Field>
              <Field label={STEP1_FIELDS.industries.label}><Multi k="industries" opts={STEP1_FIELDS.industries.opts} /></Field>
              <Field label={STEP1_FIELDS.revenue.label}><Radio k="revenue" opts={STEP1_FIELDS.revenue.opts} /></Field>
              <Field label={STEP1_FIELDS.years.label}><Radio k="years" opts={STEP1_FIELDS.years.opts} /></Field>
              <Field label={STEP1_FIELDS.age.label}><Radio k="age" opts={STEP1_FIELDS.age.opts} /></Field>
              <Field label={STEP1_FIELDS.region.label}><Radio k="region" opts={STEP1_FIELDS.region.opts} /></Field>
              {/* ※ 1단계 스마트기기 질문 제거(대표님 요청) — 동일 취지 질문이 3단계 'smartDevice'에 있어 매칭은 그대로 유지됨 */}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">{STEP2_TITLE}</h1>
              {/* 상담목적+관심분야 통합 (중복 제거) */}
              <Field label={STEP2_FIELDS.purposes.label}><Multi k="purposes" opts={STEP2_FIELDS.purposes.opts} /></Field>
              <Field label={STEP2_FIELDS.desiredAmount.label}><Radio k="desiredAmount" opts={STEP2_FIELDS.desiredAmount.opts} /></Field>
              {/* 자금 성격 질문(신용점수·인증·혁신성장)을 2단계로 재배치 → 3단계 부담 완화 */}
              <Field label={STEP3_FIELDS.credit.label}><Radio k="credit" opts={STEP3_FIELDS.credit.opts} /></Field>
              <Field label={STEP3_FIELDS.certifications.label}><Multi k="certifications" opts={STEP3_FIELDS.certifications.opts} /></Field>
              <Field label={STEP3_FIELDS.innovation.label}><MultiGrid k="innovation" opts={STEP3_FIELDS.innovation.opts} /></Field>
              {/* ── 3단계에서 2단계 하단으로 이동 (3단계 질문지가 너무 길어서) ── */}
              <Field label={STEP2_FIELDS.currentInstitutions.label}><Multi k="currentInstitutions" opts={STEP2_FIELDS.currentInstitutions.opts} /></Field>
              <Field label={STEP2_FIELDS.collateral.label}><Radio k="collateral" opts={STEP2_FIELDS.collateral.opts} /></Field>
              {/* 직원수(4대보험 통합) — 힌트 포함 */}
              <div className="mb-6">
                <p className="mb-1 font-bold text-brand-dark">{STEP2_FIELDS.employees.label}</p>
                <p className="mb-2 break-keep text-xs leading-relaxed text-brand-gray">
                  {STEP2_FIELDS.employees.hint}
                </p>
                <Radio k="employees" opts={STEP2_FIELDS.employees.opts} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">{STEP3_TITLE}</h1>

              {/* ── 정밀 매칭 질문 (소진공 혁신형 상품 정확히 골라내기) ── */}
              <div className="mb-2 mt-8 rounded-xl border border-brand-yellow/50 bg-brand-yellow/10 p-4">
                <p className="mb-1 break-keep text-sm font-extrabold text-brand-dark">
                  🎯 맞춤 매칭을 위한 추가 질문
                </p>
                <p className="mb-4 break-keep text-xs leading-relaxed text-brand-gray">
                  아래 질문은 해당되는 지원상품만 정확히 골라 안내해 드리기 위한 것입니다. 해당 없으면 &lsquo;아니요&rsquo;를 선택하시면 됩니다.
                </p>
                <CondQ k="revenueGrowth2y" field={STEP3_CONDITIONAL_FIELDS.revenueGrowth2y} />
                {/* 스마트공장은 제조업일 때만 노출 */}
                {(form.industries || []).includes("제조업") && (
                  <CondQ k="smartFactory" field={STEP3_CONDITIONAL_FIELDS.smartFactory} />
                )}
                <CondQ k="smartDevice" field={STEP3_CONDITIONAL_FIELDS.smartDevice} />
                <CondQ k="govSelected" field={STEP3_CONDITIONAL_FIELDS.govSelected} />
                <CondQ k="policyFundGood" field={STEP3_CONDITIONAL_FIELDS.policyFundGood} />
                <CondQ k="reFounder" field={STEP3_CONDITIONAL_FIELDS.reFounder} />
                <CondQ k="wantsRefinance" field={STEP3_CONDITIONAL_FIELDS.wantsRefinance} />
                <CondQ k="privateInvestment" field={STEP3_CONDITIONAL_FIELDS.privateInvestment} />
              </div>

              {/* ── 신청 결격사유 (결제 차단 판정) — 한 블록으로 묶어 안내 ── */}
              <div className="mb-2 mt-8 rounded-xl border border-brand-red/20 bg-brand-red/5 p-4">
                <p className="mb-3 break-keep text-sm font-extrabold text-brand-red">
                  ⚠️ 신청 결격사유 확인 (해당 시 승인이 어려워 정확히 안내드립니다)
                </p>
                <Field label={STEP3_FIELDS.bankruptcy.label}><Radio k="bankruptcy" opts={STEP3_FIELDS.bankruptcy.opts} /></Field>
                <Field label={STEP3_FIELDS.taxDelinquent.label}><Radio k="taxDelinquent" opts={STEP3_FIELDS.taxDelinquent.opts} /></Field>
                {/* 자본잠식은 법인사업자에게만 물어봄 (개인은 파산·회생으로 판정) */}
                {form.businessType === "법인사업자" && (
                  <div className="mb-1">
                    <p className="mb-1 font-bold text-brand-dark">{STEP3_FIELDS.capitalImpairment.label}</p>
                    <p className="mb-2 break-keep text-xs leading-relaxed text-brand-gray">
                      {STEP3_FIELDS.capitalImpairment.hint}
                    </p>
                    <Radio k="capitalImpairment" opts={STEP3_FIELDS.capitalImpairment.opts} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 조회 2회 제한 안내 (마지막 단계에서만 노출) */}
          {step === 3 && (
            <div className="mt-6 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
              <p className="break-keep text-sm font-bold text-brand-dark">
                ⚠️ 정확한 정보를 입력해 주세요
              </p>
              <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-gray">
                결제 1회당 <b className="text-brand-orange">새 사업자 조회는 2회</b>까지만 가능합니다.
                (실수를 대비한 횟수입니다.) 입력값이 정확할수록 대표님 사업장에 딱 맞는 결과를
                받아보실 수 있으니, 제출 전에 한 번 더 확인해 주세요. 조회하신 결과는{" "}
                <b className="text-brand-dark">결제 후 1개월간</b> 언제든 다시 열람하실 수 있습니다.
              </p>
            </div>
          )}

          {/* 네비 버튼 */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="btn-outline flex-1 rounded-full py-3">
                {DIAGNOSIS_TEXT.prevButton}
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="btn-brand flex-1 rounded-full py-3">
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
