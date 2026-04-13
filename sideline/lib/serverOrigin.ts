/**
 * Origin for server-side fetch() to this app's own API routes.
 * On Vercel, VERCEL_URL is always set (no protocol). Without this, falling back to
 * localhost breaks RSC pages that call the local API during SSR.
 */
export function getServerOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
