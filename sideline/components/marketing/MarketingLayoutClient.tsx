"use client";

import { usePathname } from "next/navigation";
import { MarketingBlueprintBackground } from "@/components/marketing/MarketingBlueprintBackground";
import { useAuth } from "@/components/providers/AuthProvider";

/** Marketing route-group layout — skip blueprint when signed-in on `/playbooks/*` (app shell). */
export function MarketingLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const onPlaybooks = pathname === "/playbooks" || pathname.startsWith("/playbooks/");
  const signedInPlaybooks = onPlaybooks && Boolean(user);

  if (isLoading && onPlaybooks) {
    return <div className="min-h-dvh bg-slate-950">{children}</div>;
  }

  if (signedInPlaybooks) {
    return <>{children}</>;
  }

  return (
    <div className="relative scroll-smooth scroll-pt-24 text-slate-100">
      <MarketingBlueprintBackground variant="viewport" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
