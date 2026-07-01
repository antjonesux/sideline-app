import type { SchemeSummary } from "@/lib/types";

export const schemeListQueryKey = ["schemes", "list"] as const;

function coerceSchemeList(payload: unknown): SchemeSummary[] {
  if (Array.isArray(payload)) return payload as SchemeSummary[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as SchemeSummary[];
  }
  return [];
}

export async function fetchSchemeList(): Promise<SchemeSummary[]> {
  const res = await fetch("/api/schemes");
  const j = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load schemes");
  return coerceSchemeList(j);
}
