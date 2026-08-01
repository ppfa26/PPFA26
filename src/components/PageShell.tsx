"use client";

import { EditProvider } from "./EditContext";
import { ReactNode } from "react";

// 모든 페이지를 감싸 인라인 편집 기능을 부여하는 셸 (관리자 페이지 포함 예외 없음)
//
// ★ stickyFooter 옵션 (대표님 요청) ★
//   true를 주면 화면 전체 높이(min-h-[100dvh])를 세로 flex로 잡아,
//   콘텐츠가 짧아도 <main>이 남는 공간을 채우고 <Footer/>가 항상 화면 맨 아래에 붙는다.
//   (이때 해당 페이지의 <main>에는 flex-1 을 함께 줘야 한다)
//   ※ 기본값 false → 옵션을 안 주면 기존 동작과 100% 동일(다른 페이지 영향 없음).
export default function PageShell({
  pageKey,
  children,
  stickyFooter = false,
}: {
  pageKey: string;
  children: ReactNode;
  stickyFooter?: boolean;
}) {
  return (
    <EditProvider pageKey={pageKey}>
      {stickyFooter ? (
        <div className="flex min-h-[100dvh] flex-col">{children}</div>
      ) : (
        children
      )}
    </EditProvider>
  );
}
