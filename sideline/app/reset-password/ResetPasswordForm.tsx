"use client";

import { Button } from "@/components/ui/button";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { passwordRuleChecks, isPasswordValid, passwordsMatch } from "@/lib/passwordValidation";

export function ResetPasswordForm() {
  const { updatePassword, user, isLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <div className="animate-pulse rounded-md bg-slate-700/55 h-6 w-32" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
            Link expired
          </h1>
          <p className="font-sans text-sm text-slate-400">
            This reset link is no longer valid. Request a new one from the sign-in page.
          </p>
          <Button asChild variant="secondary" className="inline-flex">
            <a href="/login">Back to sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
            Password updated
          </h1>
          <p className="font-sans text-sm text-slate-400">
            Your password has been changed. You're signed in.
          </p>
          <Button asChild variant="default" className="inline-flex">
            <a href="/film">Go to Film Room</a>
          </Button>
        </div>
      </div>
    );
  }

  const pwRules = passwordRuleChecks(password);
  const pwValid = isPasswordValid(password) && passwordsMatch(password, confirmPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) { setError(err); return; }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
            Update password
          </h1>
          <p className="font-sans text-sm text-slate-400">
            Enter a new password for your account.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <PasswordInput
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 pr-10"
            />
            <ul className="mt-2 space-y-1">
              {pwRules.map((r) => (
                <li key={r.label} className="flex items-center gap-2 font-sans text-xs">
                  <span className={r.met ? "text-emerald-400" : "text-slate-500"}>
                    {r.met ? "✓" : "○"}
                  </span>
                  <span className={r.met ? "text-slate-300" : "text-slate-500"}>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <PasswordInput
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 pr-10"
          />
          {confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword) && (
            <p className="font-sans text-xs text-red-400">Passwords don't match.</p>
          )}
          <Button type="submit" variant="default" className="w-full" disabled={!pwValid || busy}>
            {busy ? "Updating\u2026" : "Update password"}
          </Button>
        </form>

        {error && <p className="text-center font-sans text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
