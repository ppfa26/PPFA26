"use client";

import { useEffect } from "react";

/**
 * 복제/도용 방어 + 억지력 장치 (대표님 요청 — "복사해서 다른 데 올리면 오류나게").
 *
 * ⚠️ 현실 안내: 웹 프론트엔드는 소스가 브라우저로 전달되어야 화면이 뜨므로
 *    기술적으로 100% 복제 차단은 불가능하다. 다만 아래 여러 겹의 방어로
 *    "쉽게 통째로 복사해 자기 사이트로 올리는" 행위를 실질적으로 막고,
 *    복제본이 정상 동작하지 못하도록(오류/원본 리다이렉트) 만든다.
 *    ※ 진짜 핵심(매칭 로직)은 서버 API에서 처리되므로 이미 안전하다.
 *
 *  방어 계층:
 *   (1) 도메인 잠금(anti-clone): 허용 도메인이 아닌 곳에서 실행되면 화면을
 *       가리고 원본 사이트로 리다이렉트 → 복사본은 정상 동작 불가.
 *   (2) 개발자도구/소스보기 단축키 차단(F12, Ctrl+U, Ctrl+Shift+I/J/C).
 *   (3) 우클릭(컨텍스트 메뉴)·드래그 억제.
 *   (4) 대량 복사 시 출처 문구 강제 삽입.
 *   (5) 콘솔 경고(법적 억지력).
 */

// 허용 도메인 화이트리스트. 여기에 없는 host에서 열리면 복제본으로 간주한다.
// (로컬 개발·프리뷰·Vercel 배포·실도메인 모두 정상 동작하도록 등록)
const ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "모두의사업친구.kr",
  "xn--2e0br4kgyfb0gp4gbrcj9s.kr", // '모두의사업친구.kr' 퓨니코드 (브라우저 hostname 반환값)
  "www.모두의사업친구.kr",
  "www.xn--2e0br4kgyfb0gp4gbrcj9s.kr",
];

// 허용 도메인 접미사(서브도메인/미리보기 도메인 포함 매칭)
const ALLOWED_SUFFIXES = [
  ".vercel.app", // Vercel 프리뷰·프로덕션
  ".모두의사업친구.kr",
  ".xn--2e0br4kgyfb0gp4gbrcj9s.kr",
];

const CANONICAL_URL = "https://모두의사업친구.kr";

function isAllowedHost(host: string): boolean {
  const h = (host || "").toLowerCase();
  if (!h) return true; // host를 못 읽는 특수 환경은 통과(오탐 방지)
  if (ALLOWED_HOSTS.includes(h)) return true;
  if (ALLOWED_SUFFIXES.some((suf) => h.endsWith(suf))) return true;
  return false;
}

export default function CopyGuard() {
  useEffect(() => {
    // ── (1) 도메인 잠금 — 복제본이면 원본으로 튕겨낸다 ──
    try {
      const host = window.location.hostname;
      if (!isAllowedHost(host)) {
        // 화면을 즉시 가려 콘텐츠 노출을 막고, 원본으로 이동시킨다.
        document.documentElement.innerHTML =
          '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center;background:#111;color:#fff;">' +
          '<div><h1 style="font-size:20px;margin-bottom:12px;">⚠️ 허가되지 않은 접근</h1>' +
          '<p style="font-size:14px;line-height:1.7;color:#bbb;">본 서비스는 저작권 및 영업비밀로 보호됩니다.<br/>정식 사이트로 이동합니다…</p></div></div>';
        window.location.replace(CANONICAL_URL);
        return;
      }
    } catch {
      /* noop — 오탐 방지: 판별 실패 시 그냥 진행 */
    }

    // ── (5) 콘솔 경고 ──
    try {
      const warn =
        "%c⚠️ 무단 복제 금지\n%c이 사이트(모두의사업친구)의 화면 구성·문구·매칭 로직은 저작권 및 영업비밀로 보호됩니다.\n무단 복제·도용 시 관련 법령에 따라 민·형사상 책임을 물을 수 있습니다.";
      // eslint-disable-next-line no-console
      console.log(
        warn,
        "color:#ff6a00;font-size:16px;font-weight:900;",
        "color:#333;font-size:12px;line-height:1.6;"
      );
    } catch {
      /* noop */
    }

    // ── (2) 개발자도구/소스보기 단축키 차단 ──
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      // F12
      if (key === "f12") {
        e.preventDefault();
        return;
      }
      // Ctrl+U (소스 보기)
      if ((e.ctrlKey || e.metaKey) && key === "u") {
        e.preventDefault();
        return;
      }
      // Ctrl+S (페이지 저장)
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I / J / C (개발자도구·콘솔·검사)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // ── (3) 우클릭(컨텍스트 메뉴) 억제 ──
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);

    // ── (3) 드래그 시작 억제 (텍스트·이미지 통째 드래그 복사 방지) ──
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    document.addEventListener("dragstart", onDragStart);

    // ── (4) 대량 복사 시 출처 강제 삽입 ──
    const onCopy = (e: ClipboardEvent) => {
      try {
        const sel = window.getSelection()?.toString() ?? "";
        if (sel.length > 100 && e.clipboardData) {
          e.preventDefault();
          e.clipboardData.setData(
            "text/plain",
            sel +
              "\n\n— 출처: 모두의사업친구(모두의사업친구.kr) · 무단 복제·도용 금지"
          );
        }
      } catch {
        /* noop */
      }
    };
    document.addEventListener("copy", onCopy);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  return null;
}
