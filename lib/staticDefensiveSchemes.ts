import type { DefensiveSchemeProfile } from "@/lib/gamePlanTypes";

/** Mirrors `supabase/seed.sql` defensive_schemes for offline / empty-DB fallback. */
export const STATIC_DEFENSIVE_SCHEMES: DefensiveSchemeProfile[] = [
  {
    id: "static-3-2-6",
    scheme_name: "3-2-6",
    description:
      "Three down linemen, two linebackers, six defensive backs. A light box built to flood the field with cover players against spread and tempo.",
    coverage_tendency:
      "Split-field and quarters tendencies; lots of cloud and sky help to the boundary.",
    pressure_tendency: "Zone Controlled",
  },
  {
    id: "static-3-3-5",
    scheme_name: "3-3-5",
    description:
      "Three down, three linebackers, five DBs. Spill-and-kill philosophy with fast fill from linebackers and safeties near the line.",
    coverage_tendency:
      "Cover 3 / rip/liz variants and pattern-match zones that spin late.",
    pressure_tendency: "Blitz Heavy",
  },
  {
    id: "static-3-3-5-tite",
    scheme_name: "3-3-5 Tite",
    description:
      "Tite front with snug interior DL; linebackers play tight fits and safeties drive the conflict. Built to shrink the run game without selling out the pass.",
    coverage_tendency:
      "Single-high and split-safety shells with heavy hole/robber answers in the middle.",
    pressure_tendency: "Base Coverage",
  },
  {
    id: "static-3-4",
    scheme_name: "3-4",
    description:
      "Three down linemen with stand-up edge players — four linebackers on the field. Multiple fronts stemmed from the same personnel.",
    coverage_tendency:
      "Cover 3 and man-match answers; will travel linebackers to tight ends and backs.",
    pressure_tendency: "Blitz Heavy",
  },
  {
    id: "static-3-4-multiple",
    scheme_name: "3-4 Multiple",
    description:
      "Odd and even looks from the same roster: stems, shifts, and hybrid edge players to disguise who is rushing.",
    coverage_tendency:
      "Quarters and tight split-safety plans with late rotation at the snap.",
    pressure_tendency: "Zone Controlled",
  },
  {
    id: "static-4-2-5",
    scheme_name: "4-2-5",
    description:
      "Four down linemen, two linebackers, five DBs. Nickel world — built to stop the pass and defend spread offenses without losing a run fit.",
    coverage_tendency:
      "Heavy Cover 3 and Cover 4 shells. Will bracket your best WR. Look to exploit the middle of the field.",
    pressure_tendency: "Zone Controlled",
  },
  {
    id: "static-4-3",
    scheme_name: "4-3",
    description:
      "Classic seven-man spacing: four linemen, three linebackers. Line-first run defense with linebackers scraping clean.",
    coverage_tendency:
      "Cover 3 and Tampa-2 families; cloud corners and flat defenders who rally to the ball.",
    pressure_tendency: "Base Coverage",
  },
  {
    id: "static-4-3-multiple",
    scheme_name: "4-3 Multiple",
    description:
      "Even/over/tight toggles and NFL-style rules — same linebackers, different shades and techniques pre-snap.",
    coverage_tendency:
      "Quarters and split-safety with pattern-read hook/curl players.",
    pressure_tendency: "Zone Controlled",
  },
  {
    id: "static-multiple-d",
    scheme_name: "Multiple D",
    description:
      "Personnel-driven game plans: odd, even, and dime packages mixed weekly. Looks unpredictable snap-to-snap.",
    coverage_tendency:
      "Coverage map changes by formation — expect man answers after condensed sets.",
    pressure_tendency: "Blitz Heavy",
  },
];

export function getStaticDefensiveProfile(
  schemeName: string,
): DefensiveSchemeProfile | null {
  return (
    STATIC_DEFENSIVE_SCHEMES.find((s) => s.scheme_name === schemeName) ?? null
  );
}
