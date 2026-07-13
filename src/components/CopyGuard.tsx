"use client";

import { useEffect } from "react";

/**
 * 복제/도용에 대한 약한 방어 + 억지력 장치.
 * - 웹은 근본적으로 소스가 브라우저로 전달되므로 100% 차단은 불가능하다.
 * - 다만 (1) 개발자도구 콘솔에 무단복제 경고, (2) 대량 텍스트 드래그/복사 억제,
 *   (3) 저작권 표기로 '쉬운 복제'를 심리적·법적으로 방어한다.
 * - SEO/정상 사용자 경험을 해치지 않도록, 우클릭·개발자도구 자체를 막지는 않는다.
 */
export default function CopyGuard() {
  useEffect(() => {
    // 1) 콘솔 경고 (도용 시도자에게 남기는 경고 + 법적 억지력)
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

    // 2) 대량 복사 억제: 100자 이상 한 번에 복사하면 출처 문구를 덧붙인다.
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

    return () => document.removeEventListener("copy", onCopy);
  }, []);

  return null;
}
