"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 홈 '실제 결과 화면 예시' 목업 안에서 쓰는 아코디언(details) 래퍼.
 *
 *  목적(모바일 정보 압축):
 *   - PC(sm 이상): 기존처럼 처음부터 '펼쳐진' 상태로 보여줍니다. (디자인 그대로)
 *   - 모바일: 정보가 너무 길어 조잡해 보이므로, 지정한 섹션은 '접힌' 상태로 시작합니다.
 *     고객이 제목(summary)을 눌러야 상세가 펼쳐집니다.
 *
 *  구현: <details>는 open 속성이 반응형(sm:)으로 제어되지 않으므로,
 *        마운트 시 화면 폭을 보고 모바일이면 open을 꺼줍니다.
 *        (SSR 초기 렌더는 open=true 로 두어 PC/크롤러에 콘텐츠가 그대로 보이게 함)
 */
export default function MobileCollapsibleDetails({
  className,
  summary,
  children,
  collapseOnMobile = true,
}: {
  className?: string;
  summary: ReactNode;
  children: ReactNode;
  collapseOnMobile?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!collapseOnMobile) return;
    const el = ref.current;
    if (!el) return;
    // 640px 미만(모바일)일 때만 접는다. PC는 펼친 상태 그대로.
    const mq = window.matchMedia("(max-width: 639px)");
    if (mq.matches) el.open = false;
  }, [collapseOnMobile]);

  return (
    <details ref={ref} open className={className}>
      {summary}
      {children}
    </details>
  );
}
