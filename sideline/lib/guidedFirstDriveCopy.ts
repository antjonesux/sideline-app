/**
 * Coach-facing copy for the guided onboarding “first drive breakdown” overlay.
 * Lives in its own module so `coachCopy.ts` can stay free of imports from `guidedOnboardingInsight.ts` (avoids circular deps).
 */

export const GUIDED_FIRST_DRIVE_EYEBROW = "FIRST DRIVE BREAKDOWN";

/** Screen-reader summary for the Radix dialog description slot. */
export const GUIDED_FIRST_DRIVE_DIALOG_DESCRIPTION =
  "One coaching takeaway from the calls you logged on this drive, plus suggested next steps.";

export const GUIDED_FIRST_DRIVE_HEADLINE_TENDENCY = "You're already showing tendencies";
export const GUIDED_FIRST_DRIVE_HEADLINE_BEST = "Here's what your first drive showed";
export const GUIDED_FIRST_DRIVE_HEADLINE_BALANCED = "Your calls are already telling a story";

export const GUIDED_FIRST_DRIVE_NUDGE_PASS_TILT =
  "Next drive, mix in an early run to keep the defense honest.";
export const GUIDED_FIRST_DRIVE_NUDGE_RUN_TILT =
  "Next drive, threaten the pass when linebackers start filling the box.";
export const GUIDED_FIRST_DRIVE_NUDGE_RPO_TILT =
  "You've got a tendency forming. Now you can adjust before it becomes a habit.";

export const GUIDED_FIRST_DRIVE_NUDGE_BEST_PLAY =
  "What moved the ball there is worth another look when down, distance, and leverage line up again.";

export const GUIDED_FIRST_DRIVE_NUDGE_BALANCED =
  "Keep logging drives so Film Room can sharpen situational edges.";

export const GUIDED_FIRST_DRIVE_PRIMARY_BALANCED = "You mixed your calls well on that drive";

export function guidedFirstDrivePrimaryTendency(typeLabel: "RUN" | "PASS" | "RPO", pctRounded: number): string {
  return `You called ${typeLabel} ${pctRounded}% of the time`;
}

export function guidedFirstDrivePrimaryBest(display: string): string {
  return `${display} was your best call`;
}
