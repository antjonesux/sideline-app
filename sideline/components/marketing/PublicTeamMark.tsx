"use client";

import { useState } from "react";
import { getTeamInitials, getTeamLogoUrl } from "@/lib/publicTeamLogos";
import { cn } from "@/lib/utils";

type PublicTeamMarkProps = {
  playbookName: string;
  /** Force initials (scheme / defense cards) even if an ESPN id exists. */
  preferInitials?: boolean;
  className?: string;
};

function InitialsCircle({ playbookName, className }: { playbookName: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-heading text-sm font-bold uppercase tracking-wide text-white",
        className,
      )}
      aria-hidden
    >
      {getTeamInitials(playbookName)}
    </span>
  );
}

/** ESPN CDN logo with emerald initials fallback (missing URL or load error). */
export function PublicTeamMark({ playbookName, preferInitials = false, className }: PublicTeamMarkProps) {
  const logoUrl = preferInitials ? null : getTeamLogoUrl(playbookName);
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return <InitialsCircle playbookName={playbookName} className={className} />;
  }

  return (
    // ESPN CDN hotlink — onError swaps to initials.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={48}
      height={48}
      className={cn("h-12 w-12 shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
