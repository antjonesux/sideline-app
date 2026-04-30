/** Loose but practical email shape check for inline form validation. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  return EMAIL_RE.test(t);
}
