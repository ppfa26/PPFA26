"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";

const STEP1 = {
  businessType: ["예비창업자", "개인사업자", "법인", "프리랜서"],
  revenue: ["매출 없음", "1억 미만", "5억 미만", "5억 이상"],
  years: ["창업 예정", "1년 미만", "3년 미만", "7년 미만", "7년 이상"],
  age: ["39세 이하", "39세 이상"],
  region: ["서울시", "경기도", "인천시", "세종시", "충청도", "전라도", "강원도", "경상도", "제주도"],
};
const PURPOSES = ["창업자금", "운전자금", "시설자금", "수출자금", "재기자금", "R&D자금"];
const AMOUNTS = ["1,000만원 미만", "5,000만원 미만", "1억 미만", "5억 미만", "5억 이상"];
const INTERESTS = ["정책자금", "정부지원금", "창업지원", "바우처", "인증", "교육"];
const CREDIT = ["700점 이하", "839점 이하", "839점 이상"];
const YESNO = ["있음", "없음"];

export default function Diagnosis() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({ purposes: [], interests: [] });

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
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <p className="mb-2 font-bold text-brand-dark">{label}</p>
      {children}
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
              <span>{step}단계 / 3단계</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-brand-grad transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 1 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">1단계 · 기본 정보</h1>
              <Field label="사업자 유형"><Radio k="businessType" opts={STEP1.businessType} /></Field>
              <Field label="업종">
                <input
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-orange"
                  placeholder="예: 음식점, 제조업, IT서비스"
                  value={form.industry || ""}
                  onChange={(e) => set("industry", e.target.value)}
                />
              </Field>
              <Field label="매출 규모"><Radio k="revenue" opts={STEP1.revenue} /></Field>
              <Field label="업력"><Radio k="years" opts={STEP1.years} /></Field>
              <Field label="대표자 연령"><Radio k="age" opts={STEP1.age} /></Field>
              <Field label="지역"><Radio k="region" opts={STEP1.region} /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">2단계 · 자금·지원 목적</h1>
              <Field label="자금 목적 (다중 선택)"><Multi k="purposes" opts={PURPOSES} /></Field>
              <Field label="희망 규모"><Radio k="desiredAmount" opts={AMOUNTS} /></Field>
              <Field label="관심 분야 (다중 선택)"><Multi k="interests" opts={INTERESTS} /></Field>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeUp rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h1 className="mb-5 text-xl font-extrabold text-brand-dark">3단계 · 신용·특이사항</h1>
              <Field label="신용등급"><Radio k="credit" opts={CREDIT} /></Field>
              <Field label="담보 유무"><Radio k="collateral" opts={YESNO} /></Field>
              <Field label="회생·파산 이력"><Radio k="bankruptcy" opts={YESNO} /></Field>
              <Field label="4대보험 가입 여부"><Radio k="insurance" opts={YESNO} /></Field>
              <Field label="가입 지원수 (대표자 제외)">
                <input
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-orange"
                  placeholder="예: 2명"
                  value={form.insuranceCount || ""}
                  onChange={(e) => set("insuranceCount", e.target.value)}
                />
              </Field>
              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="mb-3 font-bold text-brand-dark">연락처</p>
                <input className="mb-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-orange" placeholder="이름" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
                <input className="mb-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-orange" placeholder="휴대폰" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
                <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-orange" placeholder="이메일" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          )}

          {/* 네비 버튼 */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="btn-outline flex-1 rounded-full py-3">
                이전
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="btn-brand flex-1 rounded-full py-3">
                다음 단계
              </button>
            ) : (
              <button onClick={submit} className="btn-brand flex-1 rounded-full py-3">
                결과 확인하기
              </button>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-brand-gray">
            ⚠️ 본 서비스는 신청 방법·전략 자문 서비스이며, 자금 승인을 보장하지 않습니다.
          </p>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
