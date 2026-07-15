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

// referrer 도메인 → 채널 코드 추정
function guessFromReferrer(ref: string): string | null {
  if (!ref) return null;
  const h = ref.toLowerCase();
  if (h.includes("instagram")) return "instagram";
  if (h.includes("facebook") || h.includes("fb.")) return "meta";
  if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
  if (h.includes("naver")) return "naver";
  if (h.includes("google")) return "google";
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
        // 새 광고 링크로 들어옴 → 채널 갱신
        localStorage.setItem(STORAGE_KEY, fromUrl.toLowerCase().trim());
        return;
      }

      // 이미 저장된 채널이 있으면 유지 (첫 유입 채널 보존)
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return;

      // utm 도 없고 저장값도 없으면 referrer 로 추정
      const guessed = guessFromReferrer(document.referrer || "");
      if (guessed) {
        localStorage.setItem(STORAGE_KEY, guessed);
      } else if (document.referrer) {
        // 외부에서 왔지만 채널 특정 불가 → 기타(외부)
        const sameHost = document.referrer.includes(window.location.host);
        if (!sameHost) localStorage.setItem(STORAGE_KEY, "etc");
      }
      // referrer 도 없으면(직접 입력/북마크) 저장하지 않음 → 가입 시 "direct" 처리
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
