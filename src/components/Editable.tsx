"use client";

import { useEffect, useRef, useState } from "react";
import { useEdit, EditValue } from "./EditContext";

type Tag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "li"
  | "a"
  | "strong"
  | "em"
  | "summary"
  | "div"
  | "button";

type Props = {
  id: string; // 페이지 내 고유 키
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
};

// 현재 편집 중인 요소를 전역으로 공유 (툴바가 스타일 적용할 대상)
type SelectedTarget = {
  id: string;
  apply: (v: EditValue) => void;
  current: EditValue;
} | null;

let currentSelected: SelectedTarget = null;
const listeners = new Set<(t: SelectedTarget) => void>();

export function setSelected(t: SelectedTarget) {
  currentSelected = t;
  listeners.forEach((l) => l(t));
}
export function subscribeSelected(fn: (t: SelectedTarget) => void) {
  listeners.add(fn);
  fn(currentSelected);
  return () => {
    listeners.delete(fn);
  };
}

export default function Editable({
  id,
  as = "p",
  children,
  className = "",
  href,
  onClick,
}: Props) {
  const { editMode, edits, saveEdit } = useEdit();
  const ref = useRef<HTMLElement>(null);
  const saved = edits[id];
  // 대표님이 실제로 텍스트를 고친 경우에만 저장된 HTML을 사용.
  // 그렇지 않으면 항상 코드의 최신 문구(children)를 보여줌 → "미리보기 항상 최신화"
  const [initialHtml] = useState<string | null>(
    saved?.edited && saved?.html ? saved.html : null
  );

  // 저장된 스타일 적용
  const styleObj: React.CSSProperties = {};
  if (saved?.fontSize) styleObj.fontSize = saved.fontSize;
  if (saved?.color) styleObj.color = saved.color;
  if (saved?.fontFamily) styleObj.fontFamily = saved.fontFamily;
  if (saved?.bold) styleObj.fontWeight = 800;
  if (saved?.italic) styleObj.fontStyle = "italic";
  if (saved?.underline) styleObj.textDecoration = "underline";

  const applyStyle = (v: EditValue) => {
    saveEdit(id, v);
  };

  const handleBlur = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    // 대표님이 직접 고친 것으로 표시 (edited: true) → 이후 이 항목만 저장본 유지
    saveEdit(id, { html, edited: true });
  };

  const handleFocus = () => {
    if (!ref.current) return;
    setSelected({
      id,
      apply: applyStyle,
      current: saved ?? {},
    });
  };

  useEffect(() => {
    // 편집 모드 종료 시 선택 해제
    if (!editMode && currentSelected?.id === id) {
      setSelected(null);
    }
  }, [editMode, id]);

  const Tag = as as any;

  const commonProps: any = {
    ref,
    "data-editable": id,
    className: `${className} ${editMode ? "mpp-edit-active" : ""}`.trim(),
    style: styleObj,
  };

  if (editMode) {
    commonProps.contentEditable = true;
    commonProps.suppressContentEditableWarning = true;
    commonProps.onBlur = handleBlur;
    commonProps.onFocus = handleFocus;
    // 편집 모드에서는 링크 이동 방지
    commonProps.onClick = (e: React.MouseEvent) => e.preventDefault();
  } else {
    if (href && as === "a") commonProps.href = href;
    if (onClick) commonProps.onClick = onClick;
  }

  // 대표님이 직접 편집한 항목만 저장된 HTML을 렌더 (그 외엔 항상 최신 코드 문구)
  if (initialHtml !== null && saved?.edited) {
    return (
      <Tag
        {...commonProps}
        dangerouslySetInnerHTML={{ __html: saved?.html ?? initialHtml }}
      />
    );
  }

  return <Tag {...commonProps}>{children}</Tag>;
}
