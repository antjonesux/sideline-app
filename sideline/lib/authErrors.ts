/** Converts raw Supabase auth error messages into user-friendly copy. */
export function mapAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login")) return "Invalid email or password.";
  if (lower.includes("email not confirmed"))
    return "Check your email to confirm your account before signing in.";
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (lower.includes("password") && lower.includes("least"))
    return "Password must be at least 6 characters.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Too many attempts. Wait a moment and try again.";
  if (lower.includes("user not found"))
    return "No account found with that email.";
  if (lower.includes("signups not allowed"))
    return "Account registration is not enabled yet. Contact the team for access.";
  if (lower.includes("same_password") || lower.includes("same password"))
    return "New password must be different from your current password.";
  return raw;
}
