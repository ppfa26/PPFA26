"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REPORT_FORCE_OPEN_ALL, REPORT_RESTORE_OPEN } from "@/components/report/AccordionCard";

// 외부(예: 마이페이지에서 이동)에서 다운로드를 자동 트리거할 때 쓰는 이벤트
export const REPORT_TRIGGER_DOWNLOAD = "report:trigger-download";

// ────────────────────────────────────────────────────────────────
// 리포트 다운받기(대표님 요청 2026-07)
//   진단 결과 리포트를 '아코디언 전부 펼친 상태' 그대로 PDF로 만들어 다운로드.
//   · 캡처 대상: targetId(기본 #advanced-result) - 결과 대시보드 전체
//   · html2canvas 로 화면 그대로 이미지화 → jsPDF 로 A4 여러 페이지 분할 저장
//   · 두 라이브러리는 CDN 에서 동적 로드(번들 크기 증가 방지 · 다른 CDN 라이브러리와 동일 패턴)
//   · 캡처 직전 window 이벤트로 모든 AccordionCard 를 강제로 펼치고, 끝나면 원상복구
//   ⚠️ 판독/스코어링과 무관한 순수 표시·내보내기 기능. 데이터 가공/생성 없음.
// ────────────────────────────────────────────────────────────────

// CDN 스크립트를 한 번만 로드하는 유틸(중복 로드 방지)
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드된 동일 src 가 있으면 재사용
    const existing = document.querySelector(`script[data-src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`load fail: ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(`load fail: ${src}`)));
    document.head.appendChild(s);
  });
}

// 필요 라이브러리 로드 → 전역(window)에서 꺼내 반환
async function ensureLibs(): Promise<{ html2canvas: any; jsPDF: any }> {
  const w = window as any;
  if (!w.html2canvas) {
    await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
  }
  if (!w.jspdf) {
    await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
  }
  const html2canvas = w.html2canvas;
  const jsPDF = w.jspdf?.jsPDF || w.jsPDF;
  if (!html2canvas || !jsPDF) throw new Error("PDF 라이브러리를 불러오지 못했습니다.");
  return { html2canvas, jsPDF };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ReportDownloadButton({
  targetId = "advanced-result",
  fileName = "모두의사업친구_진단리포트",
  className = "",
  label = "📄 리포트 다운받기",
}: {
  targetId?: string;
  fileName?: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  // 중복 자동 실행 방지(외부 트리거가 여러 번 와도 1회만)
  const autoFiredRef = useRef(false);

  const handleDownload = useCallback(async () => {
    if (busy) return;
    const target = document.getElementById(targetId);
    if (!target) {
      alert("리포트 영역을 찾지 못했습니다. 결과가 모두 표시된 뒤 다시 시도해주세요.");
      return;
    }
    setBusy(true);
    try {
      const { html2canvas, jsPDF } = await ensureLibs();

      // 1) 모든 아코디언 강제 펼침 → DOM 반영/이미지 로딩 대기
      window.dispatchEvent(new Event(REPORT_FORCE_OPEN_ALL));
      await wait(600); // 리렌더 + 지연 콘텐츠(공고/이미지) 여유

      // 2) 캡처 (배경 흰색 · 해상도 2배 · 외부이미지 CORS 허용)
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: target.scrollWidth,
        // iframe(쿠팡 배너 등) 캡처는 실패할 수 있으나 리포트 본문엔 없음
        ignoreElements: (el: Element) => el.tagName === "IFRAME",
      });

      // 3) A4 세로에 맞춰 여러 페이지로 분할
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth(); // 210mm
      const pageH = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 8; // mm
      const contentW = pageW - margin * 2;
      // 캔버스 픽셀 → mm 비율
      const pxPerMm = canvas.width / contentW;
      const pageContentHpx = (pageH - margin * 2) * pxPerMm; // 한 페이지에 담을 캔버스 세로 픽셀

      let renderedHpx = 0;
      let pageIndex = 0;
      const totalHpx = canvas.height;

      while (renderedHpx < totalHpx) {
        const sliceHpx = Math.min(pageContentHpx, totalHpx - renderedHpx);

        // 페이지별 슬라이스를 별도 캔버스로 잘라 이미지화
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceHpx;
        const ctx = slice.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHpx,
            canvas.width,
            sliceHpx,
            0,
            0,
            canvas.width,
            sliceHpx,
          );
        }
        const imgData = slice.toDataURL("image/jpeg", 0.92);
        const sliceHmm = sliceHpx / pxPerMm;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, margin, contentW, sliceHmm);

        renderedHpx += sliceHpx;
        pageIndex += 1;
      }

      // 4) 파일명에 날짜 붙여 저장
      const d = new Date();
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
      pdf.save(`${fileName}_${ymd}.pdf`);
    } catch (e: any) {
      alert(`PDF 생성 중 문제가 발생했습니다.\n${e?.message || ""}`);
    } finally {
      // 5) 아코디언 원래 상태로 복구
      window.dispatchEvent(new Event(REPORT_RESTORE_OPEN));
      setBusy(false);
    }
  }, [busy, targetId, fileName]);

  // 외부 자동 트리거(마이페이지 '리포트 다운받기' → ?download=1 로 이동)에 반응.
  //   1회만 실행하고, 대상 DOM 이 준비될 때까지 잠깐 폴링해 준다.
  useEffect(() => {
    const onTrigger = () => {
      if (autoFiredRef.current) return;
      autoFiredRef.current = true;
      let tries = 0;
      const tick = () => {
        const target = document.getElementById(targetId);
        if (target) {
          handleDownload();
        } else if (tries < 20) {
          tries += 1;
          setTimeout(tick, 300); // 최대 약 6초 대기
        }
      };
      tick();
    };
    window.addEventListener(REPORT_TRIGGER_DOWNLOAD, onTrigger);
    return () => window.removeEventListener(REPORT_TRIGGER_DOWNLOAD, onTrigger);
  }, [handleDownload, targetId]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-orange bg-white px-6 py-2.5 text-sm font-bold text-brand-orange transition hover:bg-brand-orange/5 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
      }
      aria-busy={busy}
    >
      {busy ? "리포트 만드는 중…" : label}
    </button>
  );
}
