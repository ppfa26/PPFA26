"use client";

import { useEffect, useState } from "react";

/**
 * "앱으로 설치하기" PWA 설치 버튼 (오른쪽 하단, 채널톡 버튼 바로 위).
 *
 * 동작:
 *  - 안드로이드 크롬 등: beforeinstallprompt 이벤트를 잡아뒀다가
 *    버튼을 누르면 네이티브 "홈 화면에 추가" 설치창을 띄운다.
 *  - 아이폰 사파리: 자동 설치 API가 없으므로, 버튼을 누르면
 *    "공유 → 홈 화면에 추가" 안내 카드를 보여준다.
 *  - 이미 설치되어(앱으로) 실행 중이면 버튼을 숨긴다.
 */

// beforeinstallprompt 이벤트 타입 (표준 타입 정의에 없어 직접 선언)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 앱(홈 화면 아이콘)으로 실행 중이면 버튼을 아예 띄우지 않음
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 전용 플래그
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) return;

    // 아이폰/아이패드 여부 판별 (사파리는 자동 설치 API가 없음)
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS =
      /iphone|ipad|ipod/.test(ua) ||
      // 아이패드OS는 데스크톱 UA로 위장하므로 터치 포인트로 보정
      (ua.includes("macintosh") && "ontouchend" in document);
    if (iOS) setIsIOS(true);

    // 버튼은 항상 노출 (설치 가능/불가와 무관하게 항상 보이도록)
    setVisible(true);

    // 안드로이드 크롬 등: 설치 가능 이벤트를 잡아둔다
    const handler = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 미니 배너 억제
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 설치 완료 시 버튼 숨김
    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleClick = async () => {
    // 안드로이드 등: 네이티브 설치창이 준비돼 있으면 바로 실행
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
      return;
    }
    // 그 외(아이폰/데스크톱/미지원): 설치 안내 카드 토글
    setShowGuide((v) => !v);
  };

  if (!visible) return null;

  return (
    <>
      {/* 설치 안내 카드 (아이폰 / 데스크톱 / 미지원 브라우저용) */}
      {showGuide && (
        <div
          id="install-guide"
          className="fixed bottom-32 right-5 z-50 w-64 rounded-2xl border border-brand-dark/10 bg-white p-4 text-brand-dark shadow-2xl ring-1 ring-black/5 sm:bottom-36 sm:right-7"
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setShowGuide(false)}
            className="absolute right-3 top-2 text-lg leading-none text-brand-dark/40 hover:text-brand-dark"
          >
            ×
          </button>
          <p className="mb-2 text-[13px] font-extrabold">
            📱 홈 화면에 앱 추가하기
          </p>
          {isIOS ? (
            <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-brand-dark/80">
              <li>
                하단 <b>공유 버튼</b>{" "}
                <span className="whitespace-nowrap">(네모+↑)</span> 탭
              </li>
              <li>
                <b>&lsquo;홈 화면에 추가&rsquo;</b> 선택
              </li>
              <li>
                오른쪽 위 <b>&lsquo;추가&rsquo;</b> 누르면 완료!
              </li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-brand-dark/80">
              <li>
                브라우저 <b>메뉴(⋮)</b> 열기
              </li>
              <li>
                <b>&lsquo;앱 설치&rsquo;</b> 또는{" "}
                <b>&lsquo;홈 화면에 추가&rsquo;</b> 선택
              </li>
              <li>
                <b>&lsquo;설치&rsquo;</b> 누르면 완료!
              </li>
            </ol>
          )}
        </div>
      )}

      {/* 설치 버튼 — 채널톡 버튼 바로 위 (bottom 간격을 채널톡보다 위로) */}
      <button
        type="button"
        id="install-app-button"
        onClick={handleClick}
        aria-label="앱으로 설치하기"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #E11D2E 0%, #8E1420 100%)",
        }}
        className="group fixed bottom-[68px] right-4 z-50 flex w-[128px] items-center justify-center gap-1 rounded-full border border-black/5 px-2.5 py-1.5 shadow-lg ring-1 ring-black/5 transition hover:shadow-xl sm:bottom-24 sm:right-7 sm:w-[176px] sm:gap-1.5 sm:px-3.5 sm:py-2.5"
      >
        {/* 홈 화면 추가 아이콘 — 화면(사각형) 안에 + 추가 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
        <span className="whitespace-nowrap text-[11px] font-extrabold text-white sm:text-[13px]">
          앱으로 설치하기
        </span>
      </button>
    </>
  );
}
