import type { Scheme, SchemeDetail } from "@/lib/types";

const VERSION = "1";
const LIST_KEY = `the-sideline:schemes:v${VERSION}`;

function schemeDetailKey(id: string) {
  return `the-sideline:scheme:${id}:v${VERSION}`;
}

export function readCachedSchemes(): Scheme[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Scheme[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedSchemes(schemes: Scheme[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(schemes));
  } catch {
    /* quota or private mode */
  }
}

export function readCachedSchemeDetail(id: string): SchemeDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(schemeDetailKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as SchemeDetail;
  } catch {
    return null;
  }
}

export function writeCachedSchemeDetail(detail: SchemeDetail) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(schemeDetailKey(detail.id), JSON.stringify(detail));
  } catch {
    /* quota or private mode */
  }
}
