"use client";

import { Button } from "@/components/ui/button";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PASSWORD_HINT, passwordRuleChecks, isPasswordValid, passwordsMatch } from "@/lib/passwordValidation";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { buildLandingHref, buildLoginHref } from "@/lib/navigation/loginHref";

function BackToLandingLink({ next }: { next?: string | null }) {
  return (
    <div className="-mt-2 mb-4 w-full sm:-mt-1 sm:mb-6">
      <IconBackButton href={buildLandingHref(next)} aria-label="Back to welcome" />
    </div>
  );
}

const secondaryLinkClass =
  "-mt-1 block w-full text-center font-sans text-sm font-medium text-[#94a3b8] underline decoration-[#94a3b8] underline-offset-2 transition-colors hover:text-emerald-400 hover:decoration-emerald-400 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

function AuthSurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg sm:p-8">{children}</div>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const nextForBack = searchParams.get("next");
  const { updatePassword, user, isLoading, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set before `signOut` so a brief null `user` does not flash the expired state. */
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [pwBlurred, setPwBlurred] = useState(false);
  const [confirmBlurred, setConfirmBlurred] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center px-4">
        <div className="animate-pulse rounded-md bg-slate-700/55 h-6 w-32" />
      </div>
    );
  }

  if (!user && !passwordUpdated) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <AuthSurfaceCard>
          <div className="text-left">
            <BackToLandingLink next={nextForBack} />
          </div>
          <div className="space-y-6 text-center">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              This reset link expired. Request a new one.
            </p>
            <Button asChild variant="default" className="w-full">
              <Link href={buildLoginHref({})}>Sign in</Link>
            </Button>
          </div>
        </AuthSurfaceCard>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <AuthSurfaceCard>
          <div className="text-left">
            <BackToLandingLink next={nextForBack} />
          </div>
          <div className="space-y-6 text-center">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">Password updated</h1>
            <p className="font-sans text-sm text-slate-400">
              You&apos;re good to go. Sign in with your new password.
            </p>
            <Button asChild variant="default" className="w-full">
              <Link href={buildLoginHref({})}>Sign in</Link>
            </Button>
          </div>
        </AuthSurfaceCard>
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
      setPasswordUpdated(true);
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
      <AuthSurfaceCard>
        <div className="space-y-8">
          <div className="text-left">
            <BackToLandingLink next={nextForBack} />
          </div>
          <header className="space-y-2 text-center">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">Create a new password</h1>
            <p className="font-sans text-sm text-slate-400">Choose a new password for your Sideline account.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="reset-new-password" className="mb-1.5 block text-left font-sans text-xs font-medium text-slate-400">
                New password
              </label>
              <PasswordInput
                id="reset-new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => {
                  setPassword(e.currentTarget.value);
                  setPwBlurred(false);
                }}
                onBlur={() => setPwBlurred(true)}
                autoComplete="new-password"
                required
                minLength={8}
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
            <div>
              <label htmlFor="reset-confirm-password" className="mb-1.5 block text-left font-sans text-xs font-medium text-slate-400">
                Confirm password
              </label>
              <PasswordInput
                id="reset-confirm-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.currentTarget.value);
                  setConfirmBlurred(false);
                }}
                onBlur={() => setConfirmBlurred(true)}
                autoComplete="new-password"
                required
                minLength={8}
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
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={busy}>
              {busy ? "Updating\u2026" : "Update password"}
            </Button>
          </form>

          {error ? <p className="text-center font-sans text-sm text-red-400">{error}</p> : null}

          <Link href={buildLoginHref({})} className={secondaryLinkClass}>
            Remembered your password? Sign in
          </Link>
        </div>
      </AuthSurfaceCard>
    </div>
  );
}
