"use client";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useAuth } from "@/components/providers/AuthProvider";

/** Renders marketing top nav only for signed-out visitors on public playbook pages. */
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
    </>
  );
}
