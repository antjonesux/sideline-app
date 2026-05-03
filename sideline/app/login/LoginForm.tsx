"use client";

import { Button } from "@/components/ui/button";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { isValidEmail } from "@/lib/emailValidation";
import { PASSWORD_HINT, passwordRuleChecks, isPasswordValid, passwordsMatch } from "@/lib/passwordValidation";
import { appWordmarkStyle } from "@/lib/landing/appWordmarkStyle";
import { buildLandingHref } from "@/lib/navigation/loginHref";

type View = "sign-in" | "create-account" | "forgot-password";

const INVALID_EMAIL_MSG = "Enter a valid email address.";

function BackToLandingLink({ next }: { next?: string | null }) {
  return (
    <div className="-mt-2 mb-4 w-full sm:-mt-1 sm:mb-6">
      <Link
        href={buildLandingHref(next)}
        className="inline-flex min-h-10 items-center gap-2 rounded-md font-sans text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        aria-label="Back to welcome"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </Link>
    </div>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const registerIntent = searchParams.get("register") === "1";
  const nextForLandingBack = searchParams.get("next");
  const { user, signInWithPassword, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [view, setView] = useState<View>(() => (registerIntent ? "create-account" : "sign-in"));

  useEffect(() => {
    if (registerIntent) setView("create-account");
  }, [registerIntent]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const clearFieldErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
  };

  const safeDest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const anyBusy = busy || googleBusy;

  if (user) {
    if (typeof window !== "undefined") window.location.replace(safeDest);
    return null;
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    setError(null);
    const { error: err } = await signInWithGoogle(safeDest);
    if (err) {
      setError(err);
      setGoogleBusy(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError(INVALID_EMAIL_MSG);
      return;
    }
    if (!password) {
      setPasswordError("Password is required.");
      return;
    }
    // Strong rules only for new accounts — sign-in must accept legacy Supabase passwords.
    if (view === "create-account" && !isPasswordValid(password)) {
      setPasswordError(PASSWORD_HINT);
      return;
    }
    if (view === "create-account" && !passwordsMatch(password, confirmPassword)) {
      setConfirmPasswordError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      if (view === "sign-in") {
        const { error: err } = await signInWithPassword(email, password);
        if (err) { setError(err); return; }
        window.location.replace(safeDest);
      } else {
        const { error: err, confirmationRequired } = await signUp(email, password);
        if (err) { setError(err); return; }
        if (confirmationRequired) {
          setConfirmationSent(true);
        } else {
          window.location.replace(safeDest);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError(INVALID_EMAIL_MSG);
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await resetPassword(email);
      if (err) { setError(err); return; }
      setResetSent(true);
    } finally {
      setBusy(false);
    }
  }

  // --- Confirmation sent screen ---
  if (confirmationSent) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-left">
            <BackToLandingLink next={nextForLandingBack} />
          </div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
            Check your email
          </h1>
          <p className="font-sans text-sm text-slate-400">
            We sent a confirmation link to <span className="text-slate-200">{email}</span>.
            Open it to activate your account, then come back to sign in.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirmationSent(false);
              setView("sign-in");
              setPassword("");
              setConfirmPassword("");
              clearFieldErrors();
            }}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  // --- Reset link sent screen ---
  if (resetSent) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-left">
            <BackToLandingLink next={nextForLandingBack} />
          </div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
            Check your email
          </h1>
          <p className="font-sans text-sm text-slate-400">
            If an account exists for <span className="text-slate-200">{email}</span>,
            we sent a link to reset your password.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={anyBusy}
              onClick={async () => {
                setBusy(true);
                await resetPassword(email);
                setBusy(false);
              }}
            >
              {busy ? "Sending\u2026" : "Resend link"}
            </Button>
            <button
              type="button"
              onClick={() => {
              setResetSent(false);
              setView("sign-in");
              clearFieldErrors();
            }}
              className="font-sans text-xs text-slate-500 hover:text-slate-300"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Forgot password form ---
  if (view === "forgot-password") {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <BackToLandingLink next={nextForLandingBack} />
          <header className="space-y-2 text-center">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white">
              Reset password
            </h1>
            <p className="font-sans text-sm text-slate-400">
              Enter your email and we'll send a reset link.
            </p>
          </header>

          <form onSubmit={handleForgotSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onBlur={() => {
                  if (!email.trim()) return;
                  if (!isValidEmail(email)) setEmailError(INVALID_EMAIL_MSG);
                  else setEmailError(null);
                }}
                autoComplete="email"
                required
                aria-invalid={Boolean(emailError)}
                className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                    : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
                }`}
              />
              {emailError ? <p className="mt-1.5 font-sans text-sm text-red-400">{emailError}</p> : null}
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={anyBusy}>
              {busy ? "Sending\u2026" : "Send reset link"}
            </Button>
          </form>

          {error && <p className="text-center font-sans text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={() => {
              setView("sign-in");
              setError(null);
              clearFieldErrors();
            }}
            className="-mt-1 block w-full text-center font-sans text-sm font-medium text-[#94a3b8] underline decoration-[#94a3b8] underline-offset-2 transition-colors hover:text-emerald-400 hover:decoration-emerald-400 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // --- Main login / register ---
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <BackToLandingLink next={nextForLandingBack} />
        <header className="text-center">
          <h1
            className="font-sans text-[36px] font-bold uppercase leading-none tracking-[1.08px] text-white"
            style={appWordmarkStyle}
          >
            The Sideline
          </h1>
          <p className="mt-3 font-sans text-sm font-medium leading-snug text-[#94a3b8] sm:text-[15px]">
            Study your game. Call it smarter.
          </p>
        </header>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={anyBusy}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-sans text-sm font-medium tracking-normal text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <GoogleIcon />
          {googleBusy ? "Redirecting\u2026" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="font-sans text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => {
              setView("sign-in");
              setError(null);
              clearFieldErrors();
            }}
            className={`rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors ${
              view === "sign-in" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setView("create-account");
              setError(null);
              clearFieldErrors();
            }}
            className={`rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors ${
              view === "create-account" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              onBlur={() => {
                if (!email.trim()) return;
                if (!isValidEmail(email)) setEmailError(INVALID_EMAIL_MSG);
                else setEmailError(null);
              }}
              autoComplete="email"
              required
              aria-invalid={Boolean(emailError)}
              className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                emailError
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                  : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
              }`}
            />
            {emailError ? <p className="mt-1.5 font-sans text-sm text-red-400">{emailError}</p> : null}
          </div>
          <div>
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.currentTarget.value);
                setPasswordError(null);
              }}
              onBlur={() => {
                if (!password.length || view !== "create-account") return;
                if (!isPasswordValid(password)) setPasswordError(PASSWORD_HINT);
                else setPasswordError(null);
              }}
              autoComplete={view === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={view === "create-account" ? 8 : undefined}
              aria-invalid={Boolean(passwordError)}
              className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10 ${
                passwordError
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                  : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
              }`}
            />
            {passwordError ? <p className="mt-1.5 font-sans text-sm text-red-400">{passwordError}</p> : null}
          </div>
          {view === "create-account" && (
            <>
              <ul className="space-y-1">
                {passwordRuleChecks(password).map((r) => (
                  <li key={r.label} className="flex items-center gap-2 font-sans text-xs">
                    <span className={r.met ? "text-emerald-400" : "text-slate-500"}>
                      {r.met ? "✓" : "○"}
                    </span>
                    <span className={r.met ? "text-slate-300" : "text-slate-500"}>{r.label}</span>
                  </li>
                ))}
              </ul>
              <div>
                <PasswordInput
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.currentTarget.value);
                    setConfirmPasswordError(null);
                  }}
                  onBlur={() => {
                    if (!confirmPassword.length) return;
                    if (!passwordsMatch(password, confirmPassword)) setConfirmPasswordError("Passwords don't match.");
                    else setConfirmPasswordError(null);
                  }}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(confirmPasswordError)}
                  className={`block w-full rounded-lg border bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10 ${
                    confirmPasswordError
                      ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/25"
                      : "border-slate-700 focus:border-emerald-600/60 focus:ring-emerald-500/25"
                  }`}
                />
                {confirmPasswordError ? (
                  <p className="mt-1.5 font-sans text-sm text-red-400">{confirmPasswordError}</p>
                ) : null}
              </div>
            </>
          )}
          <Button type="submit" variant="default" className="w-full" disabled={anyBusy}>
            {busy
              ? "Working\u2026"
              : view === "sign-in"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        {view === "sign-in" && (
          <button
            type="button"
            onClick={() => {
              setView("forgot-password");
              setError(null);
              clearFieldErrors();
            }}
            className="-mt-1 block w-full text-center font-sans text-sm font-medium text-[#94a3b8] underline decoration-[#94a3b8] underline-offset-2 transition-colors hover:text-emerald-400 hover:decoration-emerald-400 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Forgot password?
          </button>
        )}

        {error && <p className="text-center font-sans text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}
