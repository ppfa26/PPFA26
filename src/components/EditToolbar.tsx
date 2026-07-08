"use client";

import { useEffect, useState } from "react";
import { useEdit, EditValue } from "./EditContext";
import { subscribeSelected } from "./Editable";

const FONT_SIZES = ["12", "14", "16", "18", "24", "32"];
const COLORS = [
  { name: "다크", v: "#191919" },
  { name: "그레이", v: "#6B7280" },
  { name: "옐로우", v: "#FEE500" },
  { name: "오렌지", v: "#FF9500" },
  { name: "레드", v: "#FF3B30" },
  { name: "그린", v: "#00C471" },
  { name: "화이트", v: "#FFFFFF" },
];
const FONTS = [
  { name: "프리텐다드", v: "Pretendard, sans-serif" },
  { name: "노토산스", v: "'Noto Sans KR', sans-serif" },
  { name: "나눔고딕", v: "'Nanum Gothic', sans-serif" },
  { name: "나눔명조", v: "'Nanum Myeongjo', serif" },
  { name: "프리텐다드 볼드", v: "Pretendard, sans-serif|bold" },
];

export default function EditToolbar() {
  const { editMode, setEditMode, resetAll, showToast } = useEdit();
  const [selected, setSelected] = useState<{
    id: string;
    apply: (v: EditValue) => void;
    current: EditValue;
  } | null>(null);

  useEffect(() => {
    return subscribeSelected((t) => setSelected(t));
  }, []);

  const apply = (v: EditValue) => {
    if (selected) selected.apply(v);
  };

  const handleReset = () => {
    if (
      confirm(
        "이 페이지의 모든 편집 내용을 초기화할까요?\n(원래 문구/색상/폰트로 되돌아갑니다)"
      )
    ) {
      resetAll();
      setTimeout(() => location.reload(), 400);
    }
  };

  return (
    <>
      {/* 편집 모드 토글 버튼 (우측 하단 고정) - 큼직한 글자 버튼 */}
      {!editMode ? (
        <button
          onClick={() => setEditMode(true)}
          aria-label="글자 수정하기"
          className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 rounded-full border-2 border-brand-orange bg-white px-5 py-3.5 text-sm font-bold text-brand-dark shadow-lg transition hover:bg-brand-orange hover:text-white sm:text-base"
        >
          <span className="text-lg">✏️</span>
          글자 수정하기
        </button>
      ) : (
        <button
          onClick={() => {
            setEditMode(false);
            showToast("저장 완료 ✓");
          }}
          aria-label="저장하고 끝내기"
          className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 rounded-full bg-brand-green px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-105 sm:text-base"
        >
          <span className="text-lg">💾</span>
          저장하고 끝내기
        </button>
      )}

      {/* 편집 툴바 (상단 고정) */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[9997] border-b border-gray-200 bg-white/95 backdrop-blur px-3 py-2 shadow-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-brand-orange whitespace-nowrap">
              ✏️ 편집 모드
            </span>

            {/* 폰트 크기 */}
            <select
              onChange={(e) => apply({ fontSize: e.target.value + "px" })}
              disabled={!selected}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
              defaultValue=""
            >
              <option value="" disabled>
                크기
              </option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>

            {/* 폰트 */}
            <select
              onChange={(e) => {
                const [family, bold] = e.target.value.split("|");
                apply({ fontFamily: family, bold: bold === "bold" });
              }}
              disabled={!selected}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 max-w-[110px]"
              defaultValue=""
            >
              <option value="" disabled>
                폰트
              </option>
              {FONTS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* 색상 */}
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c.v}
                  onClick={() => apply({ color: c.v })}
                  disabled={!selected}
                  title={c.name}
                  className="h-6 w-6 rounded-full border border-gray-300 disabled:opacity-40"
                  style={{ background: c.v }}
                />
              ))}
              <input
                type="color"
                onChange={(e) => apply({ color: e.target.value })}
                disabled={!selected}
                title="커스텀 색상"
                className="h-6 w-7 cursor-pointer rounded border border-gray-300 disabled:opacity-40"
              />
            </div>

            {/* 스타일 B / I / U */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => apply({ bold: true })}
                disabled={!selected}
                className="h-7 w-7 rounded border border-gray-300 font-black disabled:opacity-40"
              >
                B
              </button>
              <button
                onClick={() => apply({ italic: true })}
                disabled={!selected}
                className="h-7 w-7 rounded border border-gray-300 italic disabled:opacity-40"
              >
                I
              </button>
              <button
                onClick={() => apply({ underline: true })}
                disabled={!selected}
                className="h-7 w-7 rounded border border-gray-300 underline disabled:opacity-40"
              >
                U
              </button>
            </div>

            {/* 저장하고 끝내기 + 초기화 */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  setEditMode(false);
                  showToast("저장 완료 ✓");
                }}
                className="rounded-full bg-brand-green px-3 py-1 font-bold text-white"
              >
                💾 저장
              </button>
              <button
                onClick={handleReset}
                className="rounded-full bg-brand-red px-3 py-1 font-bold text-white"
              >
                초기화
              </button>
            </div>
          </div>
          <p className="mx-auto max-w-5xl pt-1 text-[11px] text-brand-gray">
            👆 고칠 <b>글자를 클릭</b>하고 바로 타이핑하세요. 다른 곳을 누르면 자동 저장됩니다. 다 하시면 오른쪽 <b>💾 저장</b> 버튼을 누르세요.
          </p>
        </div>
      )}

      {/* 편집 모드일 때 상단 툴바 높이만큼 여백 */}
      {editMode && <div className="h-14 sm:h-10" />}
    </>
  );
}
