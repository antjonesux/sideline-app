import type {
  CoverageAffinityRow,
  FieldPositionRuleRow,
} from "@/lib/mvp4Types";

/** Embedded defaults when Supabase rules are unavailable (demo / offline). */
export const STATIC_FIELD_POSITION_RULES: FieldPositionRuleRow[] = [
  {
    field_zone: "BACKED_UP",
    prioritize_play_types: ["run", "quick_game", "rpo", "screen"],
    suppress_play_types: ["empty_formation", "deep_shot", "trick_play"],
    rule_note:
      "Protect the ball. No turnovers. Get a first down.",
  },
  {
    field_zone: "OWN_TERRITORY",
    prioritize_play_types: ["balanced", "play_action", "quick_game"],
    suppress_play_types: [],
    rule_note:
      "Establish rhythm. Set up play action for midfield.",
  },
  {
    field_zone: "MIDFIELD",
    prioritize_play_types: ["explosive", "deep_shot", "rpo", "play_action"],
    suppress_play_types: [],
    rule_note:
      "Attack. You have field to work with. Take your shot.",
  },
  {
    field_zone: "SCORING",
    prioritize_play_types: ["high_pct_pass", "run", "play_action", "quick_game"],
    suppress_play_types: ["deep_shot", "negative_screen"],
    rule_note:
      "You're in range. Don't waste the field position.",
  },
  {
    field_zone: "RED_ZONE",
    prioritize_play_types: [
      "compressed_route",
      "run",
      "play_action",
      "back_shoulder",
    ],
    suppress_play_types: ["empty_formation", "all_go"],
    rule_note: "Field shrinks. Routes get shorter. Win 1-on-1.",
  },
  {
    field_zone: "GOAL_LINE",
    prioritize_play_types: ["power_run", "qb_sneak", "play_action_boot", "run"],
    suppress_play_types: ["empty_formation", "spread", "needs_space"],
    rule_note:
      "This is execution. Simple. Physical. Win at the point of attack.",
  },
];

export const STATIC_COVERAGE_AFFINITIES: CoverageAffinityRow[] = [
  {
    coverage_tag: "COVER 0",
    favored_play_types: ["quick_game", "screen", "slant"],
    suppressed_play_types: ["deep_shot"],
  },
  {
    coverage_tag: "COVER 1",
    favored_play_types: ["crosser", "dig", "seam"],
    suppressed_play_types: ["short_flat"],
  },
  {
    coverage_tag: "COVER 2",
    favored_play_types: ["seam", "middle_field", "corner"],
    suppressed_play_types: ["flat_route"],
  },
  {
    coverage_tag: "COVER 3",
    favored_play_types: ["mesh_levels", "mesh", "levels", "curl_flat"],
    suppressed_play_types: ["boundary_streak"],
  },
  {
    coverage_tag: "COVER 4",
    favored_play_types: ["short_game", "crosser", "rpo"],
    suppressed_play_types: ["deep_post"],
  },
  {
    coverage_tag: "BLITZING",
    favored_play_types: ["quick_game", "screen", "hot_route"],
    suppressed_play_types: ["slow_developing", "seven_step"],
  },
  {
    coverage_tag: "MAN",
    favored_play_types: ["rub", "pick", "motion"],
    suppressed_play_types: ["iso_wr"],
  },
  {
    coverage_tag: "BRACKET WR1",
    favored_play_types: ["wr2_te_hb", "space"],
    suppressed_play_types: ["wr1_iso"],
  },
  {
    coverage_tag: "BRACKET MY WR1",
    favored_play_types: ["wr2_te_hb", "space"],
    suppressed_play_types: ["wr1_iso"],
  },
];
