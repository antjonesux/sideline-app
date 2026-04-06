import type { GamePlanBundle } from "@/lib/gamePlanTypes";

export async function fetchGamePlanBundle(
  offensiveSchemeId: string,
  defensiveScheme: string,
): Promise<GamePlanBundle | null> {
  const q = new URLSearchParams({
    offensiveSchemeId,
    defensiveScheme,
  });
  const res = await fetch(`/api/gameplan?${q.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as GamePlanBundle;
}
