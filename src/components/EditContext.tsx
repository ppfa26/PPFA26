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

  // LocalStorage 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw);
        if (all[pageKey]) setEdits(all[pageKey]);
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
