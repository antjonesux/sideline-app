/** Builds `/login` with optional `register=1` and safe internal `next` (rejects `//`). */
export function buildLoginHref(opts: { register?: boolean; next?: string | null | undefined }): string {
  const params = new URLSearchParams();
  if (opts.register) params.set("register", "1");
  const n = opts.next;
  if (typeof n === "string" && n.startsWith("/") && !n.startsWith("//")) {
    params.set("next", n);
  }
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

/** Builds `/landing` with optional safe internal `next`. */
export function buildLandingHref(next?: string | null): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return `/landing?next=${encodeURIComponent(next)}`;
  }
  return "/landing";
}
