/** Scheme routes — list, create, detail, and edit. */
export function isSchemeBuilderPath(pathname: string): boolean {
  if (pathname === "/schemes") return true;
  return pathname.startsWith("/schemes/");
}

export function isSchemeListPath(pathname: string): boolean {
  return pathname === "/schemes";
}

export function isSchemeNewPath(pathname: string): boolean {
  return pathname === "/schemes/new";
}

export function isSchemeEditPath(pathname: string): boolean {
  return /^\/schemes\/[^/]+\/edit\/?$/.test(pathname);
}

/** Scheme id from `/schemes/[id]` — excludes list, create, and edit routes. */
export function schemeIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/schemes/")) return null;
  const parts = pathname.slice("/schemes/".length).split("/");
  const segment = parts[0];
  if (!segment || segment === "new") return null;
  if (parts[1] === "edit") return null;
  return segment;
}
