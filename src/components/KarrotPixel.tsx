"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 당근마켓 전환 추적 픽셀(Karrot Pixel).
 *
 * ★ 목적 ★
 *   당근 광고를 보고 들어온 방문자가 우리 사이트에서 어떤 행동을 했는지
 *   (페이지 열람 → 진단 → 결제)를 당근 광고 관리자에서 측정하기 위한 코드.
 *   이게 있어야 "광고비 대비 실제 전환(ROAS)"을 볼 수 있다.
 *
 * ★ 왜 layout 에 직접 넣지 않고 컴포넌트로 만들었나 ★
 *   당근이 준 원본 코드는 일반 HTML 사이트용이라 <head> 에 그냥 붙이면
 *   Next.js(SPA)에서는 (1) hydration 경고, (2) 페이지 이동 시 track 이
 *   다시 안 불려 조회수 누락 문제가 생긴다.
 *   → next/script(afterInteractive)로 로드하고, 라우트가 바뀔 때마다
 *     ViewPage 를 다시 쏘도록 usePathname 으로 감지한다.
 *
 * 전환 추적 코드 ID : 1784601037453856001
 * 코드 이름         : 모두의사업친구
 */
const KARROT_PIXEL_ID = "1784601037453856001";

declare global {
  interface Window {
    // 당근 픽셀 전역 객체 (외부 스크립트가 주입)
    karrotPixel?: {
      init: (id: string) => void;
      track: (event: string, payload?: Record<string, unknown>) => void;
    };
  }
}

/**
 * 전환 이벤트를 당근 픽셀 + Vercel Analytics 로 동시에 전송하는 헬퍼.
 *
 * 어느 컴포넌트에서든 import 해서 호출하면 된다.
 *   trackConversion("CompleteRegistration");            // 회원가입 완료
 *   trackConversion("SubmitApplication");               // 진단(서비스 신청) 완료
 *   trackConversion("Purchase", { value: 9900 });       // 결제 완료(금액 포함)
 *
 * · 당근 이벤트명(ViewPage/Purchase/CompleteRegistration/SubmitApplication 등)은
 *   당근이 정한 표준 이름을 그대로 사용한다.
 * · Vercel Analytics 는 커스텀 이벤트로 같은 이름을 기록해 대시보드의 Events 에 뜬다.
 * · SSR/빌드 시점(window 없음)에는 아무 것도 하지 않으므로 안전하다.
 */
export function trackConversion(
  event: string,
  payload?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  // 1) 당근 픽셀 전환 이벤트
  try {
    if (window.karrotPixel) {
      window.karrotPixel.track(event, payload);
    }
  } catch {
    /* 픽셀 미로드 등은 조용히 무시 (사용자 흐름에 영향 X) */
  }

  // 2) Vercel Analytics 커스텀 이벤트 (window.va 가 있으면)
  try {
    const va = (window as unknown as {
      va?: (cmd: string, name: string, data?: Record<string, unknown>) => void;
    }).va;
    if (typeof va === "function") {
      va("event", event, payload);
    }
  } catch {
    /* Analytics 미로드도 무시 */
  }
}

export default function KarrotPixel() {
  const pathname = usePathname();

  // 페이지(경로)가 바뀔 때마다 ViewPage 를 다시 전송.
  //  → SPA 특성상 새로고침 없이 화면만 바뀌므로, 수동으로 조회를 알려준다.
  useEffect(() => {
    if (typeof window !== "undefined" && window.karrotPixel) {
      window.karrotPixel.track("ViewPage");
    }
  }, [pathname]);

  return (
    <Script
      id="karrot-pixel"
      src="https://karrot-pixel.business.daangn.com/karrot-pixel.js"
      strategy="afterInteractive"
      onLoad={() => {
        // 스크립트 로드 완료 후 초기화 + 첫 조회 전송
        if (typeof window !== "undefined" && window.karrotPixel) {
          window.karrotPixel.init(KARROT_PIXEL_ID);
          window.karrotPixel.track("ViewPage");
        }
      }}
    />
  );
}
