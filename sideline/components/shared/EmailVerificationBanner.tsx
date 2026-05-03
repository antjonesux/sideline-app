"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { RESEND_VERIFICATION_EMAIL_CTA, VERIFY_EMAIL_BANNER } from "@/lib/coachCopy";

export function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const pathname = usePathname() ?? "";
  const [busy, setBusy] = useState(false);
  const [inline, setInline] = useState<string | null>(null);

  if (!user?.email || user.email_confirmed_at) return null;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/landing")
  ) {
    return null;
  }

  async function handleResend() {
    setInline(null);
    setBusy(true);
    try {
      const { error } = await resendVerificationEmail();
      if (error) setInline(error);
      else setInline("Check your inbox for the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mb-5 rounded-lg border border-slate-700 bg-slate-900/90 px-4 py-3 sm:px-5"
      role="region"
      aria-label="Email verification"
    >
      <p className="font-sans text-sm leading-snug text-slate-300">{VERIFY_EMAIL_BANNER}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Button type="button" size="sm" className="w-full sm:w-auto" disabled={busy} onClick={handleResend}>
          {busy ? "Sending…" : RESEND_VERIFICATION_EMAIL_CTA}
        </Button>
        {inline ? <p className="font-sans text-xs text-slate-400">{inline}</p> : null}
      </div>
    </div>
  );
}
