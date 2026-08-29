"use client";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useAuth } from "@/components/providers/AuthProvider";

/** Renders marketing chrome for signed-out visitors on public playbook pages. */
export function PlaybooksPageShell({
  children,
  nextFromUrl,
}: {
  children: React.ReactNode;
  nextFromUrl?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading || user) {
    return <>{children}</>;
  }

  return (
    <>
      <MarketingNav nextFromUrl={nextFromUrl} />
      {children}
      <MarketingFooter />
    </>
  );
}
