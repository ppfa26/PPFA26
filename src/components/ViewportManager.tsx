"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ★ 데스크톱(PC) 화면 강제 - 경로 전환(SPA 네비게이션) 대응 ★
 *
 *  layout.tsx <head> 의 DESKTOP_VIEWPORT_SCRIPT 는 '첫 로드' 시점에만 실행됩니다.
 *  Next.js App Router 는 페이지를 이동할 때 <head> 스크립트를 다시 실행하지 않으므로,
 *  랜딩(데스크톱 강제) → 진단 챗봇/폼(표준 반응형) 처럼 정책이 다른 페이지로
 *  '클라이언트 이동'하면 viewport 가 바뀌지 않는 문제가 생깁니다.
 *
 *  이 컴포넌트는 경로(pathname)가 바뀔 때마다 <head> 스크립트와 '동일한 규칙'으로
 *  viewport 를 다시 계산·적용해, 어느 경로로 이동하든 정책이 항상 맞도록 합니다.
 *
 *   - 진단 챗봇/폼(입력칸 자동 줌 문제 회피 대상) → 표준 반응형
 *   - 그 외(랜딩·결과·가격 등) 이면서 폭 < 820 → 데스크톱(820px) 강제 축소
 *   - 진짜 PC/태블릿(폭 ≥ 820) → 표준 반응형(원본 그대로)
 *
 *  화면에 아무것도 그리지 않는 유틸 컴포넌트입니다.
 */
const DESKTOP_WIDTH = 820;
const EXCLUDE = ["/diagnosis-chat", "/diagnosis-form"];

function applyViewport(pathname: string) {
  try {
    let vp = document.querySelector("meta[name=viewport]");
    if (!vp) {
      vp = document.createElement("meta");
      vp.setAttribute("name", "viewport");
      document.head.appendChild(vp);
    }
    const excluded = EXCLUDE.some(
      (p) => pathname === p || pathname.indexOf(p + "/") === 0
    );
    const w = Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0
    );
    if (excluded || w >= DESKTOP_WIDTH) {
      vp.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
      );
      return;
    }
    const scale = Math.round((w / DESKTOP_WIDTH) * 1000) / 1000;
    vp.setAttribute(
      "content",
      "width=" +
        DESKTOP_WIDTH +
        ", initial-scale=" +
        scale +
        ", maximum-scale=5, user-scalable=yes"
    );
  } catch {
    /* no-op */
  }
}

export default function ViewportManager() {
  const pathname = usePathname();

  useEffect(() => {
    applyViewport(pathname);
    const onResize = () => applyViewport(pathname);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [pathname]);

  return null;
}
