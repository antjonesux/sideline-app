import type { DraftPlayRow } from "@/lib/playSheetTypes";

export function playSheetDraftKey(schemeId: string, defensiveScheme: string) {
  return `sideline-playsheet-draft-v1:${schemeId}:${defensiveScheme}`;
}

export type StoredDraft = {
  rows: DraftPlayRow[];
  savedAt: number;
};

export function loadDraftFromStorage(
  schemeId: string,
  defensiveScheme: string,
): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(
      playSheetDraftKey(schemeId, defensiveScheme),
    );
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredDraft;
    if (!p?.rows || !Array.isArray(p.rows)) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveDraftToStorage(
  schemeId: string,
  defensiveScheme: string,
  rows: DraftPlayRow[],
): void {
  if (typeof window === "undefined") return;
  const payload: StoredDraft = { rows, savedAt: Date.now() };
  localStorage.setItem(
    playSheetDraftKey(schemeId, defensiveScheme),
    JSON.stringify(payload),
  );
}

export function clearDraftStorage(
  schemeId: string,
  defensiveScheme: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(playSheetDraftKey(schemeId, defensiveScheme));
}
