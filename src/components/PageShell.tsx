"use client";

import { EditProvider } from "./EditContext";
import EditToolbar from "./EditToolbar";
import { ReactNode } from "react";

// 모든 페이지를 감싸 인라인 편집 기능을 부여하는 셸 (관리자 페이지 포함 예외 없음)
export default function PageShell({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  return (
    <EditProvider pageKey={pageKey}>
      {children}
      <EditToolbar />
    </EditProvider>
  );
}
