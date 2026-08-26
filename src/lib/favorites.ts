// =========================================================================
//  관심 지원사업 즐겨찾기 (대표님 요청 · 고객 편의)  [미니앱 → 홈페이지 이식]
//   · 결과 화면(matching-preview)의 각 지원사업 카드 ⭐ 버튼으로 관심 항목 저장/해제.
//   · localStorage 기반(로그인 불필요, 이 기기(브라우저)에 저장).
//   · 제목(title)을 키로 사용(항목마다 고유 id가 없어 title로 식별).
//   · 다른 곳(마이페이지)에서는 getFavorites/isFavorite/toggleFavorite 만 쓰면 됨.
// =========================================================================

const KEY = "mpp_favorites_v1";

// 저장 항목: 제목 + (표시용) 종류/아이콘. 예전(문자열 배열) 데이터도 자동 호환.
export type FavoriteItem = {
  title: string;
  kind?: string; // "정부지원제도" | "정책자금" | "기관" | "추가 감면·혜택" 등(표시용)
  icon?: string; // 이모지(표시용)
  savedAt: number; // 저장 시각(ms)
};

// ── 전체 읽기 (구버전 문자열 배열도 안전하게 흡수) ──
function readAll(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x): FavoriteItem | null => {
        if (typeof x === "string") return { title: x, savedAt: 0 };
        if (x && typeof x.title === "string")
          return {
            title: x.title,
            kind: typeof x.kind === "string" ? x.kind : undefined,
            icon: typeof x.icon === "string" ? x.icon : undefined,
            savedAt: typeof x.savedAt === "number" ? x.savedAt : 0,
          };
        return null;
      })
      .filter((x): x is FavoriteItem => x !== null);
  } catch {
    return [];
  }
}

function writeAll(list: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
    // 다른 컴포넌트(마이페이지 등)가 즉시 반영할 수 있도록 커스텀 이벤트 발행
    try {
      window.dispatchEvent(new CustomEvent("mpp:favorites-changed"));
    } catch {
      /* noop */
    }
  } catch {
    /* 저장 실패(용량초과·사생활 모드) — 무시 */
  }
}

// ── 즐겨찾기 여부 ──
export function isFavorite(title: string): boolean {
  if (!title) return false;
  return readAll().some((f) => f.title === title);
}

// ── 토글(있으면 제거, 없으면 추가) → 토글 후 상태(true=이제 즐겨찾기됨) 반환 ──
export function toggleFavorite(
  title: string,
  meta?: { kind?: string; icon?: string }
): boolean {
  if (!title) return false;
  const list = readAll();
  const idx = list.findIndex((f) => f.title === title);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeAll(list);
    return false; // 이제 즐겨찾기 아님
  }
  list.unshift({
    title,
    kind: meta?.kind,
    icon: meta?.icon,
    savedAt: Date.now(),
  });
  writeAll(list);
  return true; // 이제 즐겨찾기됨
}

// ── 단건 삭제(마이페이지 목록에서 X) ──
export function removeFavorite(title: string): void {
  if (!title) return;
  writeAll(readAll().filter((f) => f.title !== title));
}

// ── 전체 즐겨찾기 목록(최신순) ──
export function getFavorites(): FavoriteItem[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

// ── 즐겨찾기 개수 ──
export function favoriteCount(): number {
  return readAll().length;
}

// ── 전체 삭제 ──
export function clearFavorites(): void {
  writeAll([]);
}
