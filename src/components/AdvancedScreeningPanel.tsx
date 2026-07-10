"use client";

// ─────────────────────────────────────────────────────────────────────────
//  정밀 추가진단(선택) 패널 — 추가 판정 레이어 UI
//  ⚠️ 기존 대시보드 매칭 결과는 그대로 두고, 이 패널만 아래에 얹습니다.
//     입력하지 않으면 아무 판정도 표시되지 않습니다(선택 기능).
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Company,
  runAdvancedScreening,
  AdvancedScreeningReport,
  SOURCE_TAGS,
} from "@/lib/advancedScreening";

const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "manufacturing", label: "제조업" },
  { value: "wholesale", label: "도매업" },
  { value: "retail", label: "소매업" },
  { value: "construction", label: "건설업" },
  { value: "service", label: "서비스업" },
  { value: "IT", label: "IT업" },
];

// 억/만원 단위 입력 → 원 단위 변환 도우미
function toWon(억: string): number | undefined {
  const n = parseFloat(억);
  if (isNaN(n)) return undefined;
  return Math.round(n * 100000000);
}

export default function AdvancedScreeningPanel() {
  // 결제 후 결과창 최상단에 노출 → 기본 펼침(정확한 판독을 위해 작성 필수)
  const [open, setOpen] = useState(true);
  const [report, setReport] = useState<AdvancedScreeningReport | null>(null);

  // 폼 상태 (핵심 필드만 노출)
  const [industry, setIndustry] = useState("manufacturing");
  const [revenue억, setRevenue억] = useState("");
  const [debt억, setDebt억] = useState("");
  const [equity억, setEquity억] = useState("");
  const [ceoAge, setCeoAge] = useState("");
  const [years, setYears] = useState("");
  const [kcb, setKcb] = useState("");
  const [nice, setNice] = useState("");

  // 체크박스 (부결/자격 판정용)
  const [taxDelinquent, setTaxDelinquent] = useState(false);
  const [insuranceDelinquent, setInsuranceDelinquent] = useState(false);
  const [capitalImpairment, setCapitalImpairment] = useState(false);
  const [revenueDrop30, setRevenueDrop30] = useState(false);
  const [ceoChanged, setCeoChanged] = useState(false);
  const [isPreFounder, setIsPreFounder] = useState(false);
  const [isReFounder, setIsReFounder] = useState(false);
  const [hasMainbiz, setHasMainbiz] = useState(false);

  const handleRun = () => {
    const company: Company = {
      industry,
      annual_revenue: toWon(revenue억),
      total_debt: toWon(debt억),
      total_equity: toWon(equity억),
      ceo_age: ceoAge ? parseInt(ceoAge, 10) : undefined,
      years_in_business: years ? parseFloat(years) : undefined,
      kcb_score: kcb ? parseInt(kcb, 10) : undefined,
      nice_score: nice ? parseInt(nice, 10) : undefined,
      tax_delinquent: taxDelinquent,
      insurance_4_delinquent: insuranceDelinquent,
      full_capital_impairment: capitalImpairment,
      revenue_drop_30pct_yoy: revenueDrop30,
      revenue_drop_yoy_pct: revenueDrop30 ? 30 : 0,
      ceo_changed_1y: ceoChanged,
      is_pre_founder: isPreFounder,
      is_re_founder: isReFounder,
      has_mainbiz: hasMainbiz,
    };
    setReport(runAdvancedScreening(company));
    // 결과로 스크롤
    setTimeout(() => {
      document.getElementById("advanced-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const inputCls =
    "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange";
  const labelCls = "mb-1 block text-xs font-semibold text-brand-dark";

  return (
    <section id="advanced-screening" className="mb-2 scroll-mt-4">
      {/* 필수 작성 안내 배너 — 결제 후 결과창 최상단에서 정밀진단 작성을 강하게 유도 */}
      <div className="mb-3 overflow-hidden rounded-2xl border-2 border-brand-orange bg-brand-yellow/20 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-extrabold text-brand-dark sm:text-base">
          <span className="text-lg">📋</span>
          정확한 진단을 위해 정밀 진단 리스트를 꼭 작성해 주세요
        </p>
        <p className="mt-1.5 break-keep text-xs leading-relaxed text-brand-dark/70 sm:text-sm">
          아래 정밀 진단 리스트를 <b className="text-brand-orange">반드시 작성</b>해야 신용보증기금 부결 여부·예상 한도까지
          정확하게 판독할 수 있습니다. 정확한 판독을 위해 작성 부탁드립니다.
        </p>
      </div>

      {/* 토글 헤더 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-brand-orange bg-white px-5 py-4 text-left shadow-card transition hover:shadow-lg"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xl">🔬</span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-extrabold text-brand-dark sm:text-base">
                정밀 추가진단
              </span>
              <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold text-white sm:text-[11px]">
                필수
              </span>
            </span>
            <span className="mt-0.5 block break-keep text-xs text-brand-gray">
              신용점수·재무 정보를 입력하면 신보 부결 여부·예상 한도까지 정밀 분석
            </span>
          </span>
        </span>
        <span className="ml-2 shrink-0 text-lg text-brand-gray">{open ? "▲" : "▼"}</span>
      </button>

      {/* 입력 폼 */}
      {open && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="mb-4 break-keep rounded-xl bg-yellow-50 px-3 py-2 text-xs leading-relaxed text-brand-dark/70">
            💡 <b className="text-brand-orange">정확한 진단을 위해 아래 리스트를 꼭 작성해 주세요.</b> 아는 항목만
            입력하셔도 되지만, KCB·NICE 신용점수와 재무 정보를 함께 넣어주실수록 판독이 정확해집니다.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>업종</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>연매출 (억원)</label>
              <input value={revenue억} onChange={(e) => setRevenue억(e.target.value)} className={inputCls} placeholder="예: 5" inputMode="decimal" />
            </div>
            <div>
              <label className={labelCls}>갚아야 할 대출·빚 총액 (억원)</label>
              <input value={debt억} onChange={(e) => setDebt억(e.target.value)} className={inputCls} placeholder="은행대출 등 합계 · 예: 2" inputMode="decimal" />
            </div>
            <div>
              <label className={labelCls}>자기자본 (억원)</label>
              <input value={equity억} onChange={(e) => setEquity억(e.target.value)} className={inputCls} placeholder="예: 3" inputMode="decimal" />
            </div>
            <div>
              <label className={labelCls}>대표자 나이 (만)</label>
              <input value={ceoAge} onChange={(e) => setCeoAge(e.target.value)} className={inputCls} placeholder="예: 45" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls}>업력 (년)</label>
              <input value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} placeholder="예: 3" inputMode="decimal" />
            </div>
            <div>
              <label className={labelCls}>KCB 점수</label>
              <input value={kcb} onChange={(e) => setKcb(e.target.value)} className={inputCls} placeholder="1~1000" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls}>NICE 점수</label>
              <input value={nice} onChange={(e) => setNice(e.target.value)} className={inputCls} placeholder="1~1000" inputMode="numeric" />
            </div>
          </div>

          {/* 체크박스 */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { s: taxDelinquent, set: setTaxDelinquent, l: "국세·지방세 체납 있음" },
              { s: insuranceDelinquent, set: setInsuranceDelinquent, l: "4대보험료 체납 있음" },
              { s: capitalImpairment, set: setCapitalImpairment, l: "자기자본 전액잠식" },
              { s: revenueDrop30, set: setRevenueDrop30, l: "전년比 매출 30% 이상 감소" },
              { s: ceoChanged, set: setCeoChanged, l: "최근 1년 내 대표자 변경" },
              { s: isPreFounder, set: setIsPreFounder, l: "예비창업자" },
              { s: isReFounder, set: setIsReFounder, l: "재창업자" },
              { s: hasMainbiz, set: setHasMainbiz, l: "메인비즈 인증 보유" },
            ].map((c, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-brand-dark">
                <input
                  type="checkbox"
                  checked={c.s}
                  onChange={(e) => c.set(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-brand-orange"
                />
                <span className="break-keep">{c.l}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRun}
            className="mt-5 w-full rounded-xl bg-brand-grad py-3 font-bold text-brand-dark transition hover:opacity-90"
          >
            정밀 판정 실행하기
          </button>
        </div>
      )}

      {/* 판정 결과 */}
      {report && <AdvancedResult report={report} />}
    </section>
  );
}

// 등급 → 색상/라벨
function verdictStyle(ok: boolean): { cls: string; icon: string } {
  return ok
    ? { cls: "bg-green-50 border-brand-green text-brand-green", icon: "✅" }
    : { cls: "bg-red-50 border-brand-red text-brand-red", icon: "⚠️" };
}

function AdvancedResult({ report }: { report: AdvancedScreeningReport }) {
  const {
    koditHardReject,
    financials,
    responsibleMgmt,
    creditMatches,
    loanLimit,
    manufacturing,
    mainbizGrade,
    govPrograms,
    disclaimer,
    revalidation,
  } = report;

  const cardCls = "rounded-2xl border border-gray-200 bg-white p-5 shadow-card";
  const srcCls = "mt-2 text-[11px] text-brand-gray";

  return (
    <div id="advanced-result" className="mt-6 space-y-4">
      <h2 className="text-lg font-extrabold text-brand-dark">🔬 정밀 추가진단 결과</h2>

      {/* BLOCK 1: 신보 즉시부결 */}
      <div className={cardCls}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-bold text-brand-dark">신용보증기금(신보) 사전 자가진단</span>
        </div>
        {koditHardReject.result === "PASS" ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(true).cls}`}>
            {verdictStyle(true).icon} 즉시부결 항목에 해당하지 않습니다. (13개 항목 통과)
          </div>
        ) : (
          <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(false).cls}`}>
            {verdictStyle(false).icon} 아래 항목으로 신보 심사가 어려울 수 있습니다:
            <ul className="mt-1 list-inside list-disc">
              {koditHardReject.rejectReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <p className={srcCls}>{SOURCE_TAGS.KODIT}</p>
      </div>

      {/* BLOCK 5: 재무비율 */}
      <div className={cardCls}>
        <span className="mb-2 block text-sm font-bold text-brand-dark">재무비율 검증</span>
        <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(financials.kodit_result === "PASS").cls}`}>
          {verdictStyle(financials.kodit_result === "PASS").icon}{" "}
          {financials.kodit_result === "PASS" ? "재무 관점 부결 요인 없음" : "재무 관점 부결 요인 발견"}
        </div>
        {financials.issues.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {financials.issues.map((it, i) => (
              <li key={i} className={it.level === "REJECT" ? "text-brand-red" : "text-brand-orange"}>
                {it.level === "REJECT" ? "🚫" : "⚠️"} [{it.level}] {it.reason}
              </li>
            ))}
          </ul>
        )}
        {financials.bank_credit_eligible && (
          <p className="mt-2 text-xs font-semibold text-brand-green">
            💡 매출 30억 이상 요건 충족 → 은행 법인신용대출 검토 가능
          </p>
        )}
        <p className={srcCls}>{SOURCE_TAGS.FINANCE}</p>
      </div>

      {/* BLOCK 6: 책임경영 (미입력 항목 많으면 안내) */}
      {responsibleMgmt.failed_count > 0 && (
        <div className={cardCls}>
          <span className="mb-2 block text-sm font-bold text-brand-dark">신보 책임경영 평가 (참고)</span>
          <div className={`rounded-xl border px-3 py-2 text-sm ${verdictStyle(responsibleMgmt.result === "PASS").cls}`}>
            {verdictStyle(responsibleMgmt.result === "PASS").icon} {responsibleMgmt.note}
          </div>
          <p className="mt-2 text-[11px] text-brand-gray">
            ※ 미입력 항목은 &lsquo;미충족&rsquo;으로 계산됩니다. 정확한 판정은 해당 항목을 확인 후 상담에서 재검토하세요.
          </p>
          <p className={srcCls}>{SOURCE_TAGS.KODIT}</p>
        </div>
      )}

      {/* BLOCK 2: 신용점수 기관 매칭 */}
      <div className={cardCls}>
        <span className="mb-2 block text-sm font-bold text-brand-dark">신용점수 기반 이용 가능 기관</span>
        <div className="space-y-2">
          {creditMatches.map((m, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <span className="rounded-full bg-brand-dark px-2 py-0.5 text-[11px] font-bold text-white">
                {m.institution}
              </span>
              <span className="text-xs text-brand-gray">{m.criteria}</span>
            </div>
          ))}
        </div>
        <p className={srcCls}>{SOURCE_TAGS.MICRO} · {SOURCE_TAGS.KODIT}</p>
      </div>

      {/* BLOCK 3: 예상 대출한도 */}
      {loanLimit && (
        <div className={cardCls}>
          <span className="mb-2 block text-sm font-bold text-brand-dark">업종별 예상 기본 한도 (참고)</span>
          <p className="text-2xl font-black text-brand-orange">약 {loanLimit.base_limit_display}</p>
          <p className="mt-1 text-xs text-brand-gray">계산식: 연매출 × {loanLimit.ratio}</p>
          <p className="mt-2 text-xs text-brand-dark">
            📈 한도 상향 가능 요소: {loanLimit.boost_available.join(" · ")}
          </p>
          <p className={srcCls}>{SOURCE_TAGS.KIBO}</p>
        </div>
      )}

      {/* BLOCK 7: 제조업 분류 / 메인비즈 */}
      {(manufacturing || mainbizGrade) && (
        <div className={cardCls}>
          <span className="mb-2 block text-sm font-bold text-brand-dark">인증·제조업 요건 (참고)</span>
          {manufacturing && (
            <p className="text-sm text-brand-dark">
              제조업 분류: <b>{manufacturing.type}</b>
              {manufacturing.note ? ` (${manufacturing.note})` : manufacturing.tech_evaluation ? " · 기술평가 대상" : ""}
            </p>
          )}
          {mainbizGrade && (
            <p className="mt-1 text-sm text-brand-dark">
              메인비즈 예상 등급: <b>{mainbizGrade}</b>
            </p>
          )}
          <p className={srcCls}>{SOURCE_TAGS.KIBO}</p>
        </div>
      )}

      {/* BLOCK 4: 2026 지원사업 */}
      {govPrograms.length > 0 && (
        <div className={cardCls}>
          <span className="mb-2 block text-sm font-bold text-brand-dark">
            신청 자격이 열리는 2026 정부지원사업 ({govPrograms.length}종)
          </span>
          <div className="flex flex-wrap gap-2">
            {govPrograms.map((p, i) => (
              <span key={i} className="rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
                {p.name.replace(/_/g, " ")}
                {p.amount_max ? ` · 최대 ${(p.amount_max / 100000000).toFixed(p.amount_max % 100000000 === 0 ? 0 : 2)}억` : ""}
              </span>
            ))}
          </div>
          <p className={srcCls}>{SOURCE_TAGS.BIZINFO}</p>
        </div>
      )}

      {/* 면책조항 + 재검증 안내 */}
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="break-keep text-xs leading-relaxed text-brand-dark/60">⚠️ {disclaimer}</p>
        <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">🗓️ {revalidation}</p>
      </div>
    </div>
  );
}
