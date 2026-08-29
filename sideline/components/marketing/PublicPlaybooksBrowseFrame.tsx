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
  const shellPad = user ? "px-[var(--app-shell-px)]" : "";
  const topPad = user ? "pt-6" : "pt-24";

  if (pinnedHeaderExtra) {
    return (
      <div className={cn("flex h-dvh flex-col", topPad)}>
        <div className={cn("shrink-0 border-b border-slate-800/80", shellPad)}>
          <div className="mx-auto w-full max-w-6xl pb-4 pt-2">
            {breadcrumb}
            {pinnedHeaderExtra}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={cn("mx-auto w-full max-w-6xl pb-16 pt-8", shellPad)}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-6xl pb-16", topPad, shellPad)}>
      <div className="pt-2">{breadcrumb}</div>
      {children}
    </div>
  );
}
