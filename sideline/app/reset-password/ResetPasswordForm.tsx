"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

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
        <div className="app-skeleton h-6 w-32" />
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
          <a href="/login" className="btn-secondary inline-flex">
            Back to sign in
          </a>
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
          <a href="/film" className="btn-primary inline-flex">
            Go to Film Room
          </a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
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
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="app-input"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="app-input"
          />
          <button type="submit" disabled={busy} className="btn-primary-block">
            {busy ? "Updating\u2026" : "Update password"}
          </button>
        </form>

        {error && <p className="text-center font-sans text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
