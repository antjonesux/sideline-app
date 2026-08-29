"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Shared vertical rhythm for public playbook browse pages so the breadcrumb
 * stays in the same screen position when navigating home → playbook → formation → play.
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
  /** Signed-in pages inherit `--app-shell-pt` from `<main>`; marketing keeps hero offset. */
  const topPad = user ? "" : "pt-24";
  const headerInsetClass = user ? "" : "pt-2";

  if (pinnedHeaderExtra) {
    return (
      <div className={cn("flex h-dvh flex-col", topPad)}>
        <div className="shrink-0">
          <div className={cn("mx-auto w-full max-w-6xl border-b border-slate-800/80 pb-4", headerInsetClass)}>
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
    <div className={cn("mx-auto w-full max-w-6xl pb-16", topPad)}>
      {breadcrumb ? <div className={headerInsetClass}>{breadcrumb}</div> : null}
      {children}
    </div>
  );
}
