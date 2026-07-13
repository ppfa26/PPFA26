"use client";

import benefitsData from "@/data/benefits-extra.json";

// ── 타입 정의 (benefits-extra.json 구조와 1:1 대응) ──────────────
type ExtraBenefit = {
  id: string;
  title: string;
  icon: string;
  applyName: string;
  warning?: string;
};

type TimelinePhase = {
  title: string;
  color: string;
  items: string[];
};

// 색상 매핑 — 지시사항 컬러 스펙 그대로
const PHASE_STYLES: Record<
  string,
  { bg: string; bar: string; badge: string; badgeText: string }
> = {
  red: { bg: "#FEE2E2", bar: "#EF4444", badge: "#FCA5A5", badgeText: "#7F1D1D" },
  orange: { bg: "#FED7AA", bar: "#F97316", badge: "#FDBA74", badgeText: "#7C2D12" },
  blue: { bg: "#DBEAFE", bar: "#3B82F6", badge: "#93C5FD", badgeText: "#1E3A8A" },
  green: { bg: "#D1FAE5", bar: "#10B981", badge: "#6EE7B7", badgeText: "#065F46" },
};

export default function BenefitTimeline() {
  const benefits = benefitsData.extraBenefits as ExtraBenefit[];
  const timeline = benefitsData.timeline as Record<string, TimelinePhase>;

  // id → 혜택 조회용 맵
  const byId: Record<string, ExtraBenefit> = {};
  benefits.forEach((b) => {
    byId[b.id] = b;
  });

  // phase1 ~ phase4 순서대로
  const phaseKeys = ["phase1", "phase2", "phase3", "phase4"].filter(
    (k) => timeline[k]
  );

  return (
    <div className="mt-6 flex flex-col gap-3">
      {phaseKeys.map((key) => {
        const phase = timeline[key];
        const style = PHASE_STYLES[phase.color] ?? PHASE_STYLES.blue;
        return (
          <div
            key={key}
            className="overflow-hidden rounded-2xl"
            style={{
              backgroundColor: style.bg,
              borderLeft: `6px solid ${style.bar}`,
            }}
          >
            <div className="px-4 py-4 sm:px-5">
              {/* Phase 제목 */}
              <p
                className="break-keep text-sm font-extrabold sm:text-base"
                style={{ color: style.badgeText }}
              >
                {phase.title}
              </p>

              {/* 항목 체크박스 리스트 */}
              <ul className="mt-3 flex flex-col gap-3">
                {phase.items.map((itemId) => {
                  const b = byId[itemId];
                  if (!b) return null;
                  return (
                    <li
                      key={itemId}
                      className="rounded-xl bg-white/70 px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] font-bold"
                          style={{ borderColor: style.bar, color: style.bar }}
                          aria-hidden="true"
                        >
                          □
                        </span>
                        <div className="min-w-0">
                          <p className="break-keep text-sm font-bold text-brand-dark">
                            {b.icon} {b.title}
                          </p>
                          <p className="mt-0.5 break-keep text-xs text-brand-dark/70">
                            → {b.applyName}
                          </p>
                          {b.warning && (
                            <p
                              className="mt-1 break-keep text-[11px] font-semibold leading-relaxed"
                              style={{ color: "#EF4444" }}
                            >
                              ⚠️ {b.warning}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
