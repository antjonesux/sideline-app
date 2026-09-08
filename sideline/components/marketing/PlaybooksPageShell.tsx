"use client";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Public playbooks chrome — marketing nav for signed-out visitors; footer always.
 * Signed-in users get app-shell sidebar at md+; mobile hamburger lives in PublicPlaybooksBrowseFrame.
 */
export function PlaybooksPageShell({
  children,
  nextFromUrl,
}: {
  children: React.ReactNode;
  nextFromUrl?: string;
}) {
  const { user, isLoading } = useAuth();
  const showMarketingNav = !isLoading && !user;

  return (
    <div className="flex min-h-dvh flex-col">
      {showMarketingNav ? <MarketingNav nextFromUrl={nextFromUrl} /> : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MarketingFooter />
    </div>
  );
}
