"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    const { error } = await signOut();
    if (!error) {
      router.push("/login");
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="font-sans text-xs font-medium text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
    >
      {busy ? "Signing out\u2026" : "Sign out"}
    </button>
  );
}
