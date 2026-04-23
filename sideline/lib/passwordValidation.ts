export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_HINT = "At least 6 characters";

export type PasswordRule = { label: string; met: boolean };

export function passwordRuleChecks(password: string): PasswordRule[] {
  return [{ label: PASSWORD_HINT, met: password.length >= PASSWORD_MIN_LENGTH }];
}

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}
