export const PASSWORD_MIN_LENGTH = 8;
/** Sign-up / password update — matches product copy; keep in sync with `mapAuthError` Supabase password hints. */
export const PASSWORD_HINT = "Use at least 8 characters with a letter and a number.";

export type PasswordRule = { label: string; met: boolean };

function hasLetter(password: string): boolean {
  return /[a-zA-Z]/.test(password);
}

function hasNumber(password: string): boolean {
  return /\d/.test(password);
}

export function passwordRuleChecks(password: string): PasswordRule[] {
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "At least one letter", met: hasLetter(password) },
    { label: "At least one number", met: hasNumber(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && hasLetter(password) && hasNumber(password);
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}
