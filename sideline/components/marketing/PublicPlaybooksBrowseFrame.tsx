"use client";

import { useState } from "react";
import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Shared vertical rhythm for public playbook browse pages so the breadcrumb
 * stays in the same screen position when navigating home → playbook → formation → play.
 * Authenticated mobile: hamburger on its own top row (same drawer as call sheets).
 */
export function PublicPlaybooksBrowseFrame({
  breadcrumb,
  children,
  pinnedHeaderExtra,
}: {
  breadcrumb: React.ReactNode;
  children: React.ReactNode;
  /** When set, breadcrumb + extra stay pinned; children scroll below (home only). */
  pinnedHeaderExtra?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Signed-in pages inherit `--app-shell-pt` from `<main>`; marketing keeps hero offset. */
  const topPad = user ? "" : "pt-24";
  const headerInsetClass = user ? "" : "pt-2";

  const mobileMenuRow = user ? (
    <div className="md:hidden">
      <CallSheetMenuButton onClick={() => setMenuOpen(true)} />
      <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  ) : null;

  if (pinnedHeaderExtra) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", topPad)}>
        <div className="shrink-0">
          <div className={cn("mx-auto w-full max-w-6xl space-y-3 border-b border-slate-800/80 pb-4", headerInsetClass)}>
            {mobileMenuRow}
            {breadcrumb}
            {pinnedHeaderExtra}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-6xl pb-16 pt-8">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-3 pb-16", topPad)}>
      {mobileMenuRow}
      {breadcrumb ? <div className={headerInsetClass}>{breadcrumb}</div> : null}
      {children}
    </div>
  );
}
