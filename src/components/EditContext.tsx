"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

type EditState = {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  edits: Record<string, EditValue>;
  saveEdit: (key: string, value: EditValue) => void;
  resetAll: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
};

export type EditValue = {
  html?: string;
  fontSize?: string;
  color?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

const STORAGE_KEY = "mpp_page_inline_edits_v3";
const META_KEY = "mpp_page_inline_meta_v1"; // 페이지별 콘텐츠 버전 저장

// 코드 문구를 크게 바꿀 때 이 숫자를 올리면, 이전에 브라우저에 저장된
// 인라인 편집본이 자동으로 정리되고 최신 코드 문구가 표시됩니다.
export const CONTENT_VERSION = 2;

const EditCtx = createContext<EditState | null>(null);

export function EditProvider({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, EditValue>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // LocalStorage 로드 (콘텐츠 버전 체크 포함)
  useEffect(() => {
    try {
      // 이 페이지의 저장된 콘텐츠 버전 확인
      const metaRaw = localStorage.getItem(META_KEY);
      const meta = metaRaw ? JSON.parse(metaRaw) : {};
      const savedVersion = meta[pageKey];

      if (savedVersion !== CONTENT_VERSION) {
        // 코드 문구가 갱신됨 → 이 페이지의 옛 편집본 폐기하고 최신 코드 사용
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        if (all[pageKey]) {
          delete all[pageKey];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
        meta[pageKey] = CONTENT_VERSION;
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        setEdits({});
      } else {
        // 버전 동일 → 대표님이 저장한 편집본 그대로 사용
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const all = JSON.parse(raw);
          if (all[pageKey]) setEdits(all[pageKey]);
        }
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [pageKey]);

  const persist = useCallback(
    (next: Record<string, EditValue>) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        all[pageKey] = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        // 편집 저장 시 현재 콘텐츠 버전도 함께 기록
        const metaRaw = localStorage.getItem(META_KEY);
        const meta = metaRaw ? JSON.parse(metaRaw) : {};
        meta[pageKey] = CONTENT_VERSION;
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        return true;
      } catch {
        return false;
      }
    },
    [pageKey]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1000);
  }, []);

  const saveEdit = useCallback(
    (key: string, value: EditValue) => {
      setEdits((prev) => {
        const merged = { ...prev, [key]: { ...prev[key], ...value } };
        const ok = persist(merged);
        showToast(ok ? "저장됨 ✓" : "저장 실패");
        return merged;
      });
    },
    [persist, showToast]
  );

  const resetAll = useCallback(() => {
    setEdits({});
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      delete all[pageKey];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      showToast("초기화됨 ✓");
    } catch {
      showToast("저장 실패");
    }
  }, [pageKey, showToast]);

  return (
    <EditCtx.Provider
      value={{
        editMode,
        setEditMode,
        edits,
        saveEdit,
        resetAll,
        toast,
        showToast,
      }}
    >
      {loaded ? children : children}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] rounded-full bg-brand-dark px-5 py-2.5 text-sm font-bold text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </EditCtx.Provider>
  );
}

export function useEdit() {
  const ctx = useContext(EditCtx);
  if (!ctx) {
    // Provider 밖에서 사용 시 no-op 반환 (안전)
    return {
      editMode: false,
      setEditMode: () => {},
      edits: {},
      saveEdit: () => {},
      resetAll: () => {},
      toast: null,
      showToast: () => {},
    } as EditState;
  }
  return ctx;
}
