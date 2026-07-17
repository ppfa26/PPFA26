"use client";

import { useEffect, useState } from "react";
import benefitsData from "@/data/benefits-extra.json";
import { loadDiagnosisRaw } from "@/lib/diagnosisStore";
import AccordionCard from "@/components/report/AccordionCard";

// ── Props 구조 (지시사항 명세 그대로) ─────────────────────────────
//  값이 없으면 undefined 또는 0으로 전달 → 내부에서 "정보 부족" 처리
export type ExtraBenefitsUserInput = {
  businessType?: string;
  industry?: string;
  yearsInBusiness?: number;
  annualRevenue?: number;
  workerCount?: number;
  region?: string;
  representativeAge?: number;
};

type Props = {
  // userInput 을 직접 넘길 수도 있고(명세), 안 넘기면 컴포넌트가
  // sessionStorage("mpp_diagnosis")에서 스스로 읽어 매핑한다.
  userInput?: ExtraBenefitsUserInput;
  // ★ 미리보기 잠금 (대표님 요청) — 제목·목차는 보이고, 알맹이(신청방법·서류·소요기간·링크)만 흐리게 ★
  previewLock?: boolean;
};

// ── 데이터 타입 ─────────────────────────────────────────────────
type ExtraBenefit = {
  id: string;
  title: string;
  icon: string;
  description: string;
  applyUrl: string;
  applyName: string;
  requiredDocs: string[];
  processingTime: string;
  deadline: string;
  warning?: string;
  benefit?: string; // 이 혜택을 챙기면 무엇을 얻는지 (대표님 요청)
  applyHow?: string; // 신청 방법 (대표님 요청)
  duration?: string; // 승인·반영 소요기간 (대표님 요청)
  excludedIndustries?: string[];
  products?: { name: string; maxAmount: number }[];
};

// ── 진단 프로필(한글 옵션) → 숫자 Props 매핑 ────────────────────
//  ※ 기존 페이지 코드를 건드리지 않기 위해, 세션의 한글 값을
//    이 컴포넌트가 직접 숫자 Props로 변환한다. (어댑터 역할)
function mapProfileToUserInput(profile: Record<string, unknown>): ExtraBenefitsUserInput {
  const get = (k: string): string | undefined => {
    const v = profile[k];
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0] as string;
    return undefined;
  };

  // 연매출(한글) → 대략 숫자(원). 구간 대표값 사용.
  const revenueStr = get("revenue");
  let annualRevenue: number | undefined;
  if (revenueStr === "매출 없음") annualRevenue = 0;
  else if (revenueStr === "1억 미만") annualRevenue = 50_000_000;
  else if (revenueStr === "5억 미만") annualRevenue = 300_000_000;
  else if (revenueStr === "5억 이상") annualRevenue = 600_000_000;

  // 업력(한글) → 대략 연차(년)
  const yearsStr = get("years");
  let yearsInBusiness: number | undefined;
  if (yearsStr === "창업 예정") yearsInBusiness = 0;
  else if (yearsStr === "1년 미만") yearsInBusiness = 0;
  else if (yearsStr === "3년 미만") yearsInBusiness = 2;
  else if (yearsStr === "7년 미만") yearsInBusiness = 5;
  else if (yearsStr === "7년 이상") yearsInBusiness = 7;

  // 대표자 연령(한글) → 대략 나이 (신·구 옵션 모두 인정: "만 39세 이하 (청년)" / "만 40세 이상")
  const ageStr = get("age");
  let representativeAge: number | undefined;
  if (ageStr?.includes("39세 이하") || ageStr?.includes("청년")) representativeAge = 30;
  else if (ageStr?.includes("40세 이상") || ageStr?.includes("39세 이상")) representativeAge = 45;

  const industriesRaw = profile["industries"];
  const industry = Array.isArray(industriesRaw)
    ? (industriesRaw as string[]).join(", ")
    : get("industries");

  return {
    businessType: get("businessType"),
    industry,
    yearsInBusiness,
    annualRevenue,
    // 진단에 직원수 필드가 없음 → undefined (정보 부족 처리)
    workerCount: undefined,
    region: get("region"),
    representativeAge,
  };
}

// ── 금액 포맷 ───────────────────────────────────────────────────
function formatKRW(won: number): string {
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`;
  }
  if (won >= 10_000) {
    const man = Math.round(won / 10_000);
    return `${man.toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}

// ── 자격 판정 결과 타입 ─────────────────────────────────────────
type Verdict = {
  eligible: boolean | null; // null = 정보 부족으로 판정 불가
  savingText?: string; // 예상 절감·수령액 (큰 글씨)
  note?: string; // 보조 설명 (판정 불가 사유 등)
};

// 수도권 판정 (서울/경기/인천)
function isMetro(region?: string): boolean {
  if (!region) return false;
  return ["서울", "경기", "인천"].some((r) => region.includes(r));
}

function judge(b: ExtraBenefit, u: ExtraBenefitsUserInput): Verdict {
  switch (b.id) {
    // ── 카드 수수료 우대율 ──
    case "cardFee": {
      const rev = u.annualRevenue;
      if (rev === undefined) return { eligible: null, note: "연매출 정보 부족으로 판정 불가" };
      if (rev > 3_000_000_000) return { eligible: false, note: "연매출 30억 초과" };
      let rate = 0;
      if (rev <= 300_000_000) rate = 0.003;
      else if (rev <= 500_000_000) rate = 0.004;
      else if (rev <= 1_000_000_000) rate = 0.005;
      else rate = 0.006;
      const saving = rev * rate;
      return {
        eligible: true,
        savingText: rev === 0 ? "매출 발생 시 절감" : `연 약 ${formatKRW(saving)} 절감`,
      };
    }

    // ── 창업 세액감면 ──
    case "startupTaxCut": {
      const years = u.yearsInBusiness;
      const rev = u.annualRevenue;
      const age = u.representativeAge;
      if (years === undefined || age === undefined)
        return { eligible: null, note: "업력·연령 정보 부족으로 판정 불가" };
      // 업종 제외 판정
      const excluded = (b.excludedIndustries ?? []).some((ex) =>
        (u.industry ?? "").includes(ex)
      );
      if (years > 5) return { eligible: false, note: "창업 5년 초과" };
      if (excluded) return { eligible: false, note: "감면 제외 업종" };

      const metro = isMetro(u.region);
      let rate = 0;
      if (age <= 34 && !metro) rate = 100;
      else if (age <= 34 && metro) rate = 50;
      else if (age >= 35 && !metro) rate = 50;
      else rate = 0;

      if (rate === 0)
        return { eligible: false, note: "연령·지역 요건상 감면 대상 아님" };

      if (rev === undefined || rev === 0)
        return {
          eligible: true,
          savingText: `소득세 ${rate}% 감면 대상`,
          note: "매출 발생 시 감면액 산정",
        };
      const saving = rev * 0.1 * (rate / 100);
      return {
        eligible: true,
        savingText: `첫 해 약 ${formatKRW(saving)} 절감 (${rate}% 감면)`,
      };
    }

    // ── 노란우산공제 ──
    case "noransanggong": {
      const bt = u.businessType;
      if (bt === undefined) return { eligible: null, note: "사업자 유형 정보 부족으로 판정 불가" };
      if (bt !== "개인사업자") return { eligible: false, note: "개인사업자 대상" };
      return { eligible: true, savingText: `연 약 ${formatKRW(1_200_000)} 절세` };
    }

    // ── 청년창업중소기업 세액감면 ──
    case "youngStartupTaxCut": {
      const age = u.representativeAge;
      const years = u.yearsInBusiness;
      const rev = u.annualRevenue;
      if (age === undefined || years === undefined)
        return { eligible: null, note: "대표자 연령·업력 정보 부족으로 판정 불가" };
      // 청년 요건: 만 34세 이하
      if (age > 34) return { eligible: false, note: "만 34세 이하 청년 대상" };
      if (years > 5) return { eligible: false, note: "창업 5년 초과" };
      // 업종 제외 판정
      const excluded = (b.excludedIndustries ?? []).some((ex) =>
        (u.industry ?? "").includes(ex)
      );
      if (excluded) return { eligible: false, note: "감면 제외 업종" };

      // 수도권과밀억제권역 외 100% / 수도권 50%
      const metro = isMetro(u.region);
      const rate = metro ? 50 : 100;
      if (rev === undefined || rev === 0)
        return {
          eligible: true,
          savingText: `소득세·법인세 ${rate}% 감면 대상`,
          note: `${metro ? "수도권" : "수도권 외"} 창업 · 창업 후 5년간 적용`,
        };
      const saving = rev * 0.1 * (rate / 100);
      return {
        eligible: true,
        savingText: `연 약 ${formatKRW(saving)} 절감 (${rate}% 감면)`,
        note: `${metro ? "수도권" : "수도권 외"} 창업 · 창업 후 5년간 적용`,
      };
    }

    default:
      return { eligible: null, note: "판정 불가" };
  }
}

export default function ExtraBenefitsSection({ userInput, previewLock = false }: Props) {
  const [input, setInput] = useState<ExtraBenefitsUserInput | null>(
    userInput ?? null
  );
  // 미리보기 잠금 클래스 — 제목은 그대로, 알맹이만 흐리게+클릭차단
  // 이 카드(🎁 추가 혜택)는 텍스트가 밀집돼 모자이크가 과해 보여 약한 블러 적용 (대표님 요청)
  const lockText = previewLock ? "preview-lock-text-soft" : "";
  const lockClick = previewLock ? "preview-lock-click-soft" : "";

  // userInput props 가 없을 때만 세션에서 읽어 매핑
  useEffect(() => {
    if (userInput) {
      setInput(userInput);
      return;
    }
    try {
      const raw = loadDiagnosisRaw();
      const profile = raw ? JSON.parse(raw) : {};
      setInput(mapProfileToUserInput(profile));
    } catch {
      setInput({});
    }
  }, [userInput]);

  const u = input ?? {};
  const benefits = benefitsData.extraBenefits as ExtraBenefit[];

  return (
    <>
      {/* ========== 🎁 추가 감면 혜택 — 아코디언(접기) 카드 (대표님 요청) ========== */}
      <AccordionCard
        emoji="🎁"
        title="대표님이 챙기면 좋은 추가 감면 혜택"
        subtitle={
          <>
            지원제도 외에도 <b>지금 순서대로 챙기면</b> 큰 돈을 아낄 수 있는 감면 혜택입니다.
            데드라인이 지나면 <b className="text-brand-red">영구히 못 받는</b> 항목도 있으니 꼭 확인하세요.
          </>
        }
      >
        {/* 5개 혜택 항목 — 기관 박스처럼 구분선(divide)으로 정리 */}
        <div className="mt-4 divide-y divide-gray-200">
          {benefits.map((b) => {
            const v = judge(b, u);
            const isYes = v.eligible === true;
            const isNo = v.eligible === false;
            const isUnknown = v.eligible === null;

            return (
              <div
                key={b.id}
                className="group origin-left py-4 transition-transform duration-150 first:pt-0 last:pb-0 hover:scale-[1.01]"
              >
                {/* 상단: 아이콘 + 제목 + 대상 뱃지 (정부지원제도 항목과 동일 구조) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-base ${isYes ? "" : "opacity-60"}`}>{b.icon}</span>
                  <span className={`break-keep text-sm font-extrabold text-brand-dark ${lockText}`}>
                    {b.title}
                  </span>
                  {isYes ? (
                    <span className="shrink-0 break-keep rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                      ✅ 신청 대상
                    </span>
                  ) : isNo ? (
                    <span className="shrink-0 break-keep rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-brand-dark/60">
                      대상 아님
                    </span>
                  ) : (
                    <span className="shrink-0 break-keep rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-brand-dark/60">
                      🔜 판정 불가
                    </span>
                  )}
                </div>

                {/* 예상 절감·수령액 — 정부지원제도의 초록 안내 자리처럼 강조 */}
                {v.savingText && (
                  <p
                    className={`mt-1 break-keep text-sm font-extrabold ${
                      isYes ? "text-brand-orange" : "text-brand-dark/50"
                    } ${lockText}`}
                  >
                    {v.savingText}
                  </p>
                )}

                {/* 설명 (제목 아래 목차성 문구라 노출 유지) */}
                <p className="mt-1 break-keep text-xs leading-relaxed text-brand-gray">
                  {b.description}
                </p>

                {/* 판정 불가/대상 아님 사유 */}
                {v.note && (
                  <p className="mt-1 break-keep text-[11px] text-brand-dark/50">ℹ️ {v.note}</p>
                )}

                {/* 혜택 — 이걸 챙기면 무엇을 얻는지 (대표님 요청) */}
                {b.benefit && (
                  <p className="mt-2 break-keep rounded-lg border-l-2 border-brand-orange bg-brand-yellow/15 px-3 py-2 text-[11px] font-semibold leading-relaxed text-brand-dark">
                    <span className="font-extrabold text-brand-orange">혜택 </span>
                    {b.benefit}
                  </p>
                )}

                {/* 정책자금: 상품 리스트 (있을 때만) */}
                {b.products && b.products.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {b.products.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <span className={`break-keep text-xs font-bold text-brand-dark ${lockText}`}>
                          {p.name}
                        </span>
                        <span className={`shrink-0 break-keep text-xs font-extrabold text-brand-orange ${lockText}`}>
                          최대 {formatKRW(p.maxAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 신청 방법 + 필요 서류 + 처리시간 + 소요기간 — 회색 박스로 묶음 (알맹이라 잠금) */}
                <div className={`mt-2 rounded-lg bg-gray-50 px-3 py-2 ${lockText}`}>
                  {/* 신청 방법 (대표님 요청 — 간단하게라도) */}
                  {b.applyHow && (
                    <p className="break-keep text-[11px] leading-relaxed text-brand-dark/80">
                      <span className="font-bold text-brand-dark">📝 신청 방법 </span>
                      {b.applyHow}
                    </p>
                  )}
                  <div className={`flex flex-wrap items-center gap-1.5 ${b.applyHow ? "mt-1.5" : ""}`}>
                    <span className="break-keep text-[11px] font-bold text-brand-dark/70">
                      📄 필요 서류
                    </span>
                    {b.requiredDocs.map((doc) => (
                      <span
                        key={doc}
                        className="break-keep rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-dark/70 ring-1 ring-gray-200"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 break-keep text-[11px] text-brand-dark/60">
                    ⏱️ 서류 작성 · <b className="text-brand-dark/80">{b.processingTime}</b>
                  </p>
                  {/* 승인·반영 소요기간 (대표님 요청 — 대략적으로) */}
                  {b.duration && (
                    <p className="mt-1 break-keep text-[11px] text-brand-dark/60">
                      🗓️ 소요 기간 · <b className="text-brand-orange">{b.duration}</b>
                    </p>
                  )}
                </div>

                {/* 데드라인 경고 (빨강) — 목차성 경고라 노출 유지 */}
                {b.warning && (
                  <p
                    className="mt-2 break-keep rounded-lg px-3 py-2 text-[11px] font-semibold leading-relaxed"
                    style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
                  >
                    ⚠️ {b.deadline} · {b.warning}
                  </p>
                )}

                {/* 신청하러 가기 버튼 — 왼쪽 하단 소형 버튼(정책금융기관 카드와 동일 디자인) · 결제 전 클릭 차단 */}
                <a
                  href={previewLock ? undefined : b.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-block break-keep rounded-lg bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 ${lockClick}`}
                >
                  🔗 {b.applyName}에서 신청하러 가기 →
                </a>
              </div>
            );
          })}
        </div>

        {/* 하단 하이라이트 — 카드 안 소형 배너 */}
        <div className="mt-4 rounded-xl bg-brand-yellow/30 px-4 py-3 text-center">
          <p className="break-keep text-sm font-black leading-snug text-brand-dark">
            💡 요건에 맞게 챙기면 첫 해 <span className="whitespace-nowrap">연 최대 700만원 절감</span> 가능
          </p>
          <p className="mt-1 break-keep text-[11px] font-semibold leading-relaxed text-brand-dark/70">
            <span className="whitespace-nowrap">놓친 항목 있으면 지금이라도 신청하세요.</span>{" "}
            <span className="whitespace-nowrap">소급 가능한 항목도 있습니다.</span>
          </p>
        </div>
      </AccordionCard>
      {/* ※ 🗓️ '이 순서대로만 챙기세요' 타임라인 블록 제거(대표님 요청) — 위 4가지 혜택 카드로 충분 */}
    </>
  );
}
