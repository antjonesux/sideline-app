"use client";

import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOnboardingBetaEnabled, useWelcomeModalOpen } from "@/hooks/useOnboardingState";
import { markWelcomeDismissedForSession } from "@/lib/onboardingSessionGate";
import {
  isOnboardingChromePath,
  isPublicPlaybooksPath,
} from "@/lib/navigation/appShellRoutes";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * App-shell host for the multi-step welcome modal.
 * Fetches onboarding state once per session (shared TanStack query).
 * Beta-only (`isFilmRoomBetaUser`) — no fetch/mount for everyone else.
 */
export function WelcomeModalHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const isBeta = useOnboardingBetaEnabled();
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const routeAllowed = useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/landing" || pathname.startsWith("/landing/")) return false;
    if (isPublicPlaybooksPath(pathname)) return false;
    if (isOnboardingChromePath(pathname, searchParams)) return false;
    return true;
  }, [pathname, searchParams]);

  const enabled =
    Boolean(user) && !isLoading && isBeta && routeAllowed && !dismissedLocally;
  const { open } = useWelcomeModalOpen(enabled);

  if (!enabled) return null;

  return (
    <WelcomeModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          markWelcomeDismissedForSession(pathname);
          setDismissedLocally(true);
        }
      }}
    />
  );
}
