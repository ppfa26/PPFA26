"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listDiagnosisRecords,
  deleteDiagnosisRecord,
  clearDiagnosisRecords,
  formatRecordDate,
  type DiagnosisRecord,
} from "@/lib/diagnosisHistory";
import { saveDiagnosis, getDiagnosisOwner } from "@/lib/diagnosisStore";

// ─────────────────────────────────────────────────────────────────────────
//  DiagnosisHistorySection - 마이페이지 '📚 내 진단 기록' 목록 (미니앱 → 홈페이지 이식)
//   · 진단을 마칠 때마다 쌓인 기록(여러 건)을 최신순으로 보여준다.
//   · '결과 다시 보기' → 그 진단을 현재 진단(diagnosisStore)으로 되살려
//     결과 화면(/matching-preview)에서 다시 확인.
//   · localStorage 기반이라 마운트 후에만 렌더(hydration 안전).
// ─────────────────────────────────────────────────────────────────────────
export default function DiagnosisHistorySection() {
  const router = useRouter();
  const [items, setItems] = useState<DiagnosisRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setItems(listDiagnosisRecords());
    refresh();
    window.addEventListener("mpp:diag-history-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mpp:diag-history-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!mounted) return null;

  // 기록이 하나도 없으면 섹션 자체를 숨긴다(빈 안내는 '나의 진단 결과' 섹션이 담당).
  if (items.length === 0) return null;

  // ── 재조회: 이 기록을 현재 진단으로 되살리고 결과 화면으로 이동 ──
  const reopen = (rec: DiagnosisRecord) => {
    try {
      // 소유자는 기존 소유자 유지(비회원이면 null). 결과 화면이 서버 동기화도 병행.
      saveDiagnosis(rec.profile, getDiagnosisOwner());
    } catch {
      /* 저장 실패해도 이동은 시도 */
    }
    router.push("/matching-preview?analyze=1");
  };

  return (
    <section
      id="mypage-diagnosis-history"
      className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-brand-dark sm:text-lg">
          📚 내 진단 기록{" "}
          <span className="align-middle text-sm font-bold text-brand-orange">
            {items.length}개
          </span>
        </h2>
        <button
          type="button"
          onClick={() => {
            clearDiagnosisRecords();
            setItems([]);
          }}
          className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-brand-gray transition hover:bg-gray-50"
        >
          전체 비우기
        </button>
      </div>

      <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-brand-gray">
        진단을 마칠 때마다 자동 저장돼요. 예전 진단 결과도 언제든 다시 볼 수 있습니다.
      </p>

      <ul className="mt-3 space-y-2">
        {items.map((rec) => (
          <li
            key={rec.id}
            className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold text-brand-dark">
                {rec.label}
                {typeof rec.matchCount === "number" && (
                  <span className="ml-1.5 whitespace-nowrap text-[12px] font-extrabold text-brand-red">
                    {rec.matchCount}개 매칭
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold text-brand-gray">
                {formatRecordDate(rec.createdAt)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => reopen(rec)}
              className="shrink-0 whitespace-nowrap rounded-full bg-brand-dark px-3.5 py-1.5 text-[12px] font-bold text-white transition hover:opacity-90 active:scale-[0.97]"
            >
              결과 다시 보기
            </button>
            <button
              type="button"
              onClick={() => {
                deleteDiagnosisRecord(rec.id);
                setItems(listDiagnosisRecords());
              }}
              aria-label="이 기록 삭제"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-dark/30 transition hover:bg-brand-red/10 hover:text-brand-red"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 break-keep text-[11px] leading-relaxed text-brand-gray">
        ※ 진단 기록은 이 기기(브라우저)에 저장됩니다. 다른 기기에서는 보이지 않을 수 있어요.
      </p>
    </section>
  );
}
