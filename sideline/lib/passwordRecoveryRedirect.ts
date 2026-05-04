/**
 * `redirectTo` passed to `supabase.auth.resetPasswordForEmail` — must stay in sync with AuthProvider.
 */
export function buildPasswordRecoveryRedirectTo(): string {
  const windowOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const base = windowOrigin || envOrigin;
  return `${base}/auth/callback?type=recovery`;
}
