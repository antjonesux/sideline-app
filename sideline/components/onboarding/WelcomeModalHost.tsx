"use client";

import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWelcomeModalOpen } from "@/hooks/useOnboardingState";
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
 * Shows for every authenticated user who has not seen the current welcome version.
 */
export function WelcomeModalHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const routeAllowed = useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/landing" || pathname.startsWith("/landing/")) return false;
    if (isPublicPlaybooksPath(pathname)) return false;
    if (isOnboardingChromePath(pathname, searchParams)) return false;
    return true;
  }, [pathname, searchParams]);

  const enabled = Boolean(user) && !isLoading && routeAllowed && !dismissedLocally;
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
