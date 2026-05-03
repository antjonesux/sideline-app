"use client";

import { Button } from "@/components/ui/button";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PASSWORD_HINT, passwordRuleChecks, isPasswordValid, passwordsMatch } from "@/lib/passwordValidation";

export function ResetPasswordForm() {
  const { updatePassword, user, isLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pwBlurred, setPwBlurred] = useState(false);
  const [confirmBlurred, setConfirmBlurred] = useState(false);

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
            <a href="/landing">Back to welcome</a>
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
            You&apos;re good to go.
          </p>
          <Button asChild variant="default" className="inline-flex">
            <a href="/film">Go to Film Room</a>
          </Button>
        </div>
      </div>
    );
  }

  const pwRules = passwordRuleChecks(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPwBlurred(true);
    setConfirmBlurred(true);

    if (!isPasswordValid(password)) {
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError("We couldn't update your password. Try again.");
        return;
      }
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
              onChange={(e) => {
                setPassword(e.currentTarget.value);
                setPwBlurred(false);
              }}
              onBlur={() => setPwBlurred(true)}
              autoComplete="new-password"
              required
              minLength={6}
              aria-invalid={pwBlurred && password.length > 0 && !isPasswordValid(password)}
              className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10 ${
                pwBlurred && password.length > 0 && !isPasswordValid(password)
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                  : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
              }`}
            />
            {pwBlurred && password.length > 0 && !isPasswordValid(password) ? (
              <p className="mt-1.5 font-sans text-sm text-red-400">{PASSWORD_HINT}</p>
            ) : null}
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
            onChange={(e) => {
              setConfirmPassword(e.currentTarget.value);
              setConfirmBlurred(false);
            }}
            onBlur={() => setConfirmBlurred(true)}
            autoComplete="new-password"
            required
            minLength={6}
            aria-invalid={confirmBlurred && confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword)}
            className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10 ${
              confirmBlurred && confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword)
                ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
            }`}
          />
          {confirmBlurred && confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword) ? (
            <p className="mt-1.5 font-sans text-sm text-red-400">Passwords don&apos;t match.</p>
          ) : null}
          <Button type="submit" variant="default" className="w-full" disabled={busy}>
            {busy ? "Updating\u2026" : "Update password"}
          </Button>
        </form>

        {error && <p className="text-center font-sans text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
