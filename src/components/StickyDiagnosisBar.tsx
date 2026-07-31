"use client";

import { useEffect, useState } from "react";
import { BETA_FREE } from "@/lib/betaConfig";

/**
 * 모바일 전용 화면 하단 고정 CTA 바.
 * - 지난 분석 결과(방문자가 진단 1단계조차 시작 안 함 → 랜딩 설득력 문제) 대응:
 *   사용자가 페이지 어디를 보고 있든 항상 '무료 진단 시작' 버튼을 노출해
 *   진단 시작률(전환율)을 끌어올린다.
 * - 우하단 카카오/앱설치 플로팅 버튼과 겹치지 않도록 바 자체는 왼쪽 정렬 폭으로 두고,
 *   플로팅 버튼 자리는 비워 둔다.
 * - 히어로가 화면에 보일 때(맨 위)는 숨기고, 스크롤을 조금 내리면 나타난다.
 * - 데스크톱(sm 이상)에서는 히어로/하단 CTA로 충분하므로 표시하지 않는다.
 */
export default function StickyDiagnosisBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // 스크롤을 화면 높이의 60% 이상 내렸을 때부터 노출 (첫 화면에선 방해 안 됨)
      setShow(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all duration-300 sm:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
      aria-hidden={!show}
    >
      {/* 우하단 카카오 플로팅 버튼(128px)과 안 겹치도록 오른쪽 여백 확보 */}
      <div className="mr-[136px] flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black leading-tight text-brand-dark">
            {BETA_FREE ? "지금은 전부 무료!" : "1분 무료 진단"}
          </p>
          <p className="truncate text-[11px] leading-tight text-brand-gray">
            사업자번호만 있으면 1분이면 끝나요
          </p>
        </div>
        <a
          href="/diagnosis-chat"
          className="btn-red shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-bold"
        >
          무료 진단 →
        </a>
      </div>
    </div>
  );
}
