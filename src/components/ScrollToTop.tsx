"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 페이지(경로)가 바뀔 때마다 화면을 자동으로 최상단으로 올려줍니다.
 *
 *  왜 필요한가?
 *   - 진단 → 로딩 → 결과 등 다음 페이지로 넘어갈 때,
 *     기존 스크롤 위치가 그대로 남아 있으면 고객이 중간부터 보게 되어 불편합니다.
 *   - 경로(pathname)가 바뀌는 순간 항상 맨 위(0,0)로 이동시켜
 *     새 페이지를 처음부터 읽을 수 있게 합니다.
 *
 *  화면에 아무것도 그리지 않는(보이지 않는) 유틸 컴포넌트입니다.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // 브라우저의 '뒤로가기 스크롤 복원' 기능이 최상단 이동을 덮어쓰지 않도록,
    // 경로 변경 시에는 즉시(맨 위)로 강제 이동합니다.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      // 일부 구형 인앱 브라우저 대응(옵션 미지원 시)
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
