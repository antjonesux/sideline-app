import {
  DEFAULT_CATALOG_GAME_VERSION,
  type CatalogGameVersion,
} from "@/lib/constants";

/** Parse Call Sheets landing `?version=` — defaults to the latest catalog (CFB27). */
export function parseCallSheetVersionFilter(raw: string | null | undefined): CatalogGameVersion {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "cfb26" || v === "cfb27") return v;
  return DEFAULT_CATALOG_GAME_VERSION;
}

export function callSheetMatchesVersionFilter(
  sheetVersion: string | null | undefined,
  filter: CatalogGameVersion,
): boolean {
  const v = (sheetVersion ?? "").trim().toLowerCase();
  const effective: CatalogGameVersion = v === "cfb26" ? "cfb26" : v === "cfb27" ? "cfb27" : DEFAULT_CATALOG_GAME_VERSION;
  return effective === filter;
}
