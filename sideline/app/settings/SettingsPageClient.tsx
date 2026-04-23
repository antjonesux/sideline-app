"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { useScrollLock } from "@/lib/useScrollLock";
import { useToastStore } from "@/store/toastStore";
import { passwordRuleChecks, isPasswordValid, passwordsMatch } from "@/lib/passwordValidation";
import { mapAuthError } from "@/lib/authErrors";

type DrawerKey = "email" | "password" | "signout" | "delete";

export function SettingsPageClient({ email }: { email: string }) {
  const router = useRouter();
  const { signOut, updatePassword } = useAuth();
  const addToast = useToastStore((s) => s.addToast);

  const [activeDrawer, setActiveDrawer] = useState<DrawerKey | null>(null);
  const drawerOpen = activeDrawer !== null && activeDrawer !== "delete";

  useScrollLock(drawerOpen);

  useEffect(() => {
    if (!activeDrawer) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveDrawer(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDrawer]);

  // --- Password drawer state ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const pwRules = passwordRuleChecks(newPassword);
  const pwValid = isPasswordValid(newPassword) && passwordsMatch(newPassword, confirmPw);

  function resetPasswordFields() {
    setNewPassword("");
    setConfirmPw("");
    setPwError(null);
    setPwBusy(false);
  }

  async function handleUpdatePassword() {
    setPwError(null);
    setPwBusy(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setPwError(mapAuthError(error));
      setPwBusy(false);
      return;
    }
    addToast("Password updated.", "success");
    resetPasswordFields();
    setActiveDrawer(null);
  }

  // --- Sign out ---
  const [signOutBusy, setSignOutBusy] = useState(false);

  async function handleSignOut() {
    setSignOutBusy(true);
    const { error } = await signOut();
    if (!error) {
      router.push("/login");
    } else {
      setSignOutBusy(false);
    }
  }

  // --- Delete account ---
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDeleteError(body?.error ?? "Couldn't delete account. Try again.");
        setDeleteBusy(false);
        return;
      }
      await signOut();
      addToast("Account deleted.", "success");
      router.push("/login");
    } catch {
      setDeleteError("Couldn't delete account. Check connection and try again.");
      setDeleteBusy(false);
    }
  }

  function closeDrawer() {
    setActiveDrawer(null);
    resetPasswordFields();
    setSignOutBusy(false);
    setDeleteError(null);
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="shrink-0 rounded-lg p-2 -ml-2 text-slate-400 hover:text-white"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="app-page-title min-w-0 truncate">Settings</h1>
      </header>

      {/* Account section */}
      <div className="app-card divide-y divide-slate-800 overflow-hidden">
        <p className="app-field-label px-4 pt-3 pb-1 mb-0">Account</p>

        <SettingsRow label="Email" value={email} onClick={() => setActiveDrawer("email")} />
        <SettingsRow label="Password" value="••••••••" onClick={() => setActiveDrawer("password")} />
      </div>

      {/* Session section */}
      <div className="app-card divide-y divide-slate-800 overflow-hidden">
        <p className="app-field-label px-4 pt-3 pb-1 mb-0">Session</p>

        <SettingsRow label="Sign out" onClick={() => setActiveDrawer("signout")} />
        <SettingsRow label="Delete account" danger onClick={() => setActiveDrawer("delete")} />
      </div>

      {/* --- Email drawer --- */}
      <BottomSheet open={activeDrawer === "email"} onClose={closeDrawer} title="Email">
        <p className="font-sans text-sm text-slate-300 break-all">{email}</p>
        <p className="mt-2 font-sans text-xs text-slate-500">
          Email changes are not supported yet.
        </p>
      </BottomSheet>

      {/* --- Password drawer --- */}
      <BottomSheet open={activeDrawer === "password"} onClose={closeDrawer} title="Update password">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpdatePassword();
          }}
        >
          <div>
            <PasswordInput
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="app-input pr-10"
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
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.currentTarget.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="app-input pr-10"
          />
          {confirmPw.length > 0 && !passwordsMatch(newPassword, confirmPw) && (
            <p className="font-sans text-xs text-red-400">Passwords don't match.</p>
          )}
          {pwError && <p className="font-sans text-sm text-red-400">{pwError}</p>}
          <button type="submit" disabled={!pwValid || pwBusy} className="btn-primary-block">
            {pwBusy ? "Updating\u2026" : "Update password"}
          </button>
        </form>
      </BottomSheet>

      {/* --- Sign out drawer --- */}
      <BottomSheet open={activeDrawer === "signout"} onClose={closeDrawer} title="Sign out">
        <p className="font-sans text-sm text-slate-400">
          You'll need to sign in again to access your data.
        </p>
        <button
          type="button"
          disabled={signOutBusy}
          onClick={() => void handleSignOut()}
          className="btn-primary-block mt-4"
        >
          {signOutBusy ? "Signing out\u2026" : "Sign out"}
        </button>
      </BottomSheet>

      {/* --- Delete account (destructive modal) --- */}
      <ConfirmDestructiveModal
        open={activeDrawer === "delete"}
        onClose={closeDrawer}
        title="Delete account"
        message={
          <>
            This will permanently delete your account, games, play sheets, and all associated data.{" "}
            <strong className="text-red-300">This cannot be undone.</strong>
            {deleteError && (
              <p className="mt-3 text-sm text-red-400">{deleteError}</p>
            )}
          </>
        }
        confirmLabel="Delete my account"
        onConfirm={handleDeleteAccount}
        busy={deleteBusy}
      />
    </section>
  );
}

// --- Helpers ---

function SettingsRow({
  label,
  value,
  danger,
  onClick,
}: {
  label: string;
  value?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-800/60"
    >
      <span className={`font-sans text-sm font-medium ${danger ? "text-red-400" : "text-slate-200"}`}>
        {label}
      </span>
      <span className="flex items-center gap-1">
        {value && (
          <span className="max-w-[10rem] truncate font-sans text-sm text-slate-500">{value}</span>
        )}
        <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </button>
  );
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[50] bg-black/60" aria-hidden onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[51] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
        role="dialog"
        aria-modal
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full rounded-t-xl border border-slate-700 bg-slate-900 shadow-xl sm:rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="app-modal-title text-lg">{title}</h2>
            <button
              type="button"
              className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </>
  );
}
