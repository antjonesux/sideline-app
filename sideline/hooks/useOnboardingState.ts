"use client";

import {
  onboardingStateQueryKey,
  type OnboardingStateData,
} from "@/lib/onboardingState";
import {
  CURRENT_WELCOME_VERSION,
  type FeatureOnboardingKey,
  shouldShowFeatureOnboarding,
  shouldShowWelcomeModal,
} from "@/lib/onboardingVersion";
import {
  shouldSuppressFeatureOnboarding,
  wasWelcomeDismissedThisSession,
} from "@/lib/onboardingSessionGate";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToastStore } from "@/store/toastStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

async function fetchOnboardingState(): Promise<OnboardingStateData> {
  const res = await fetch("/api/user/onboarding-state", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  const json = (await res.json()) as { data?: OnboardingStateData; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error ?? "Couldn't load onboarding state.");
  }
  return json.data;
}

export function onboardingStateQueryKeyForUser(userId: string | undefined) {
  return [...onboardingStateQueryKey, userId ?? "anon"] as const;
}

export function useOnboardingState(enabled = true) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: onboardingStateQueryKeyForUser(userId),
    queryFn: fetchOnboardingState,
    enabled: enabled && Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

type MarkWelcomeSeenVars = { welcomeModalVersionSeen: number };
type MarkFeatureSeenVars = { featureKey: FeatureOnboardingKey; seen: true };

type MarkOnboardingVars = MarkWelcomeSeenVars | MarkFeatureSeenVars;

export function useMarkOnboardingSeen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const key = onboardingStateQueryKeyForUser(user?.id);

  return useMutation({
    mutationFn: async (vars: MarkOnboardingVars) => {
      const res = await fetch("/api/user/onboarding-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const json = (await res.json()) as { data?: OnboardingStateData; error?: string };
      if (!res.ok || !json.data) {
        throw new Error(json.error ?? COULDNT_SAVE);
      }
      return json.data;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OnboardingStateData>(key);
      if (previous) {
        if ("welcomeModalVersionSeen" in vars) {
          queryClient.setQueryData<OnboardingStateData>(key, {
            ...previous,
            welcomeModalVersionSeen: Math.max(
              previous.welcomeModalVersionSeen ?? 0,
              vars.welcomeModalVersionSeen,
            ),
          });
        } else {
          queryClient.setQueryData<OnboardingStateData>(key, {
            ...previous,
            onboardingSeen: { ...previous.onboardingSeen, [vars.featureKey]: true },
          });
        }
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(key, ctx.previous);
      }
      addToast(COULDNT_SAVE, "error");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });
}

export function useWelcomeModalOpen(enabled: boolean) {
  const query = useOnboardingState(enabled);
  const open =
    enabled &&
    query.isSuccess &&
    shouldShowWelcomeModal(query.data.welcomeModalVersionSeen);
  return { ...query, open };
}

export function useFeatureOnboardingOpen(featureKey: FeatureOnboardingKey, enabled: boolean) {
  const pathname = usePathname();
  const query = useOnboardingState(enabled);
  const welcomeWouldShow =
    query.isSuccess && shouldShowWelcomeModal(query.data.welcomeModalVersionSeen);
  const welcomePending = welcomeWouldShow && !wasWelcomeDismissedThisSession();
  const featurePending =
    query.isSuccess && shouldShowFeatureOnboarding(query.data.onboardingSeen[featureKey]);
  const suppressAfterWelcome = shouldSuppressFeatureOnboarding(pathname);
  const open =
    enabled &&
    query.isSuccess &&
    !welcomePending &&
    !suppressAfterWelcome &&
    featurePending;
  return { ...query, open, welcomePending };
}

export function markWelcomeCompletePayload(): MarkWelcomeSeenVars {
  return { welcomeModalVersionSeen: CURRENT_WELCOME_VERSION };
}
