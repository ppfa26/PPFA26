"use client";

import { useEffect } from "react";

/**
 * 유입경로(광고 채널) 캡처 장치.
 *
 * ★ 동작 ★
 * 1) 방문자가 광고 링크로 들어오면 URL 뒤 ?utm_source=xxx 값을 읽어 저장한다.
 *    (예: 모두의사업친구.kr?utm_source=daangn  →  "daangn" 저장)
 * 2) utm_source 가 없으면 referrer(직전 사이트) 로 채널을 추정한다.
 *    (인스타/페북/네이버/유튜브/카카오 등에서 넘어온 경우 자동 인식)
 * 3) 저장된 값은 회원가입 시 auth.users 메타데이터(utm_source)에 함께 기록되어,
 *    관리자 회원 목록에서 "이 회원이 어느 광고로 왔는지" 배지로 표시된다.
 *
 * ※ 한 번 저장하면(첫 방문 채널) 이후 페이지 이동으로 덮어쓰지 않는다.
 *   단, 새 광고 링크(utm_source 파라미터가 있는 링크)로 다시 들어오면 갱신한다.
 */
const STORAGE_KEY = "mpp_utm_source";
// 유입 신호의 '강도' 표시 — utm 파라미터(광고 링크)는 강한 신호(고정),
// referrer 추정치는 약한 신호(다음 방문의 실제 referrer 로 갱신 허용)
const STRENGTH_KEY = "mpp_utm_strength"; // "hard"(광고링크) | "soft"(referrer추정)

// referrer 도메인 → 채널 코드 추정
function guessFromReferrer(ref: string): string | null {
  if (!ref) return null;
  const h = ref.toLowerCase();
  if (h.includes("threads")) return "threads";
  if (h.includes("instagram")) return "instagram";
  if (h.includes("facebook") || h.includes("fb.")) return "meta";
  if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
  if (h.includes("naver")) return "naver";
  // 구글 계열(검색·지도 등) — 크롬 주소창에서 검색해 들어오면 referrer 가 구글 검색페이지
  if (h.includes("google") || h.includes("bing.") || h.includes("daum.net")) return "google";
  if (h.includes("daangn") || h.includes("karrot")) return "daangn";
  if (h.includes("kakao")) return "kakao";
  if (h.includes("tiktok")) return "tiktok";
  if (h.includes("band.us")) return "band";
  return null;
}

export default function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // 광고 링크에 붙는 대표 파라미터들 (utm_source 우선, 없으면 대체 키)
      const fromUrl =
        params.get("utm_source") ||
        params.get("source") ||
        params.get("ref") ||
        params.get("utm") ||
        "";

      if (fromUrl) {
        // 새 광고 링크(utm 파라미터)로 들어옴 → 강한 신호로 고정 저장
        localStorage.setItem(STORAGE_KEY, fromUrl.toLowerCase().trim());
        localStorage.setItem(STRENGTH_KEY, "hard");
        return;
      }

      // 이미 '광고 링크(hard)'로 저장된 채널이 있으면 그대로 보존
      const saved = localStorage.getItem(STORAGE_KEY);
      const strength = localStorage.getItem(STRENGTH_KEY);
      if (saved && strength === "hard") return;

      // utm 파라미터가 없는 방문 → referrer(직전 사이트)로 채널 추정.
      //   ※ 예전에 referrer 추정으로 저장된 'soft' 값(예: 광고 앱 인앱 브라우저에서
      //     한 번 남은 threads 등)은 이번 실제 방문의 referrer 로 갱신한다.
      //     → "크롬으로 검색해 들어왔는데 스레드로 뜨는" 문제 방지.
      const guessed = guessFromReferrer(document.referrer || "");
      if (guessed) {
        localStorage.setItem(STORAGE_KEY, guessed);
        localStorage.setItem(STRENGTH_KEY, "soft");
      } else if (document.referrer) {
        // 외부에서 왔지만 채널 특정 불가 → 기타(외부)
        const sameHost = document.referrer.includes(window.location.host);
        if (!sameHost) {
          localStorage.setItem(STORAGE_KEY, "etc");
          localStorage.setItem(STRENGTH_KEY, "soft");
        }
        // 같은 사이트 내 이동이면 기존 soft 값 유지
      } else if (saved && strength === "soft") {
        // referrer 가 아예 없는 방문(주소창 직접입력/북마크) → 직접유입으로 정정
        localStorage.setItem(STORAGE_KEY, "direct");
      }
      // referrer 도 없고 저장값도 없으면 저장하지 않음 → 가입 시 "direct" 처리
    } catch {
      /* 저장 실패해도 서비스에 영향 없음 */
    }
  }, []);

  return null;
}

// 가입 시 읽어갈 헬퍼 (signup 페이지에서 사용)
export function getCapturedUtmSource(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "direct";
  } catch {
    return "direct";
  }
}
