import type { SchemeDetail } from "@/lib/types";

export const schemeDetailQueryKey = (id: string) => ["schemes", "detail", id] as const;

export async function fetchSchemeDetail(id: string): Promise<SchemeDetail> {
  const res = await fetch(`/api/schemes/${id}`);
  const j = (await res.json()) as { data?: SchemeDetail; error?: string };
  if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load scheme");
  if (!j.data) throw new Error("Failed to load scheme");
  return j.data;
}
