import { COULDNT_FINISH_THAT, COULDNT_SAVE } from "@/lib/coachCopy";
import {
  normalizeOnboardingState,
  type OnboardingSeenMap,
  type OnboardingStateData,
} from "@/lib/onboardingState";
import {
  CURRENT_WELCOME_VERSION,
  isFeatureOnboardingKey,
  type FeatureOnboardingKey,
} from "@/lib/onboardingVersion";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PrefsRow = {
  welcome_modal_version_seen: number | null;
  onboarding_seen: unknown;
};

async function readPrefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ data: OnboardingStateData | null; error: string | null }> {
  const { data, error } = await supabase
    .from("user_onboarding_prefs")
    .select("welcome_modal_version_seen, onboarding_seen")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("onboarding-state GET:", error);
    return { data: null, error: COULDNT_FINISH_THAT };
  }

  return { data: normalizeOnboardingState(data as PrefsRow | null), error: null };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await readPrefs(supabase, user.id);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? COULDNT_FINISH_THAT }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

type PostBody = {
  welcomeModalVersionSeen?: number;
  featureKey?: FeatureOnboardingKey;
  seen?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: COULDNT_SAVE }, { status: 400 });
  }

  const hasWelcome =
    typeof body.welcomeModalVersionSeen === "number" && Number.isFinite(body.welcomeModalVersionSeen);
  const hasFeature = isFeatureOnboardingKey(body.featureKey) && body.seen === true;

  if (hasWelcome === hasFeature) {
    return NextResponse.json({ error: COULDNT_SAVE }, { status: 400 });
  }

  const existing = await readPrefs(supabase, user.id);
  if (existing.error || !existing.data) {
    return NextResponse.json({ error: existing.error ?? COULDNT_FINISH_THAT }, { status: 400 });
  }

  let welcomeModalVersionSeen = existing.data.welcomeModalVersionSeen;
  let onboardingSeen: OnboardingSeenMap = { ...existing.data.onboardingSeen };

  if (hasWelcome) {
    const nextVersion = Math.floor(body.welcomeModalVersionSeen as number);
    if (nextVersion < 1 || nextVersion > CURRENT_WELCOME_VERSION + 10) {
      return NextResponse.json({ error: COULDNT_SAVE }, { status: 400 });
    }
    welcomeModalVersionSeen = Math.max(welcomeModalVersionSeen ?? 0, nextVersion);
  } else {
    const key = body.featureKey as FeatureOnboardingKey;
    onboardingSeen = { ...onboardingSeen, [key]: true };
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from("user_onboarding_prefs")
    .upsert(
      {
        user_id: user.id,
        welcome_modal_version_seen: welcomeModalVersionSeen,
        onboarding_seen: onboardingSeen,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("welcome_modal_version_seen, onboarding_seen")
    .single();

  if (upsertErr) {
    console.error("onboarding-state POST:", upsertErr);
    return NextResponse.json({ error: COULDNT_SAVE }, { status: 400 });
  }

  return NextResponse.json({
    data: normalizeOnboardingState(upserted as PrefsRow),
  });
}
