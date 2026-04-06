import {
  readCachedSchemeDetail,
  readCachedSchemes,
  writeCachedSchemeDetail,
  writeCachedSchemes,
} from "@/lib/cache";
import type { Scheme, SchemeDetail } from "@/lib/types";
import { getStaticSchemeDetail, getStaticSchemes } from "@/lib/staticData";

export async function fetchSchemesWithCache(): Promise<Scheme[]> {
  try {
    const res = await fetch("/api/schemes", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Scheme[];
    writeCachedSchemes(data);
    return data;
  } catch {
    return readCachedSchemes() ?? getStaticSchemes();
  }
}

export async function fetchSchemeDetailWithCache(
  id: string,
): Promise<SchemeDetail | null> {
  try {
    const res = await fetch(`/api/schemes/${id}`, { cache: "no-store" });
    if (res.status === 404) return getStaticSchemeDetail(id);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as SchemeDetail;
    writeCachedSchemeDetail(data);
    return data;
  } catch {
    return readCachedSchemeDetail(id) ?? getStaticSchemeDetail(id);
  }
}
