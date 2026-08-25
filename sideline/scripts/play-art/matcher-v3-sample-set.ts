/**
 * Representative diagnostic sample set for Matcher V3 accuracy work.
 * Operator-only — not used at runtime.
 */

export type DiagnosticSampleKind = "pass" | "review" | "hard" | "usc";

export type DiagnosticSample = {
  playbook: "air-force" | "usc";
  formation: string;
  cropId: string;
  /** Expected / assigned play when known from V2 report. */
  playName?: string;
  kind: DiagnosticSampleKind;
  note?: string;
};

/**
 * ~28 pairs: healthy PASS, weak REVIEW, hard/mirrored concepts, USC verified.
 * Selected from V2 Air Force + USC reports (Aug 2026).
 */
export const MATCHER_V3_DIAGNOSTIC_SAMPLES: DiagnosticSample[] = [
  // --- Known-good PASS (healthy margins) ---
  {
    playbook: "air-force",
    formation: "Power I Strong",
    cropId: "source-91:middle",
    playName: "X SLANT",
    kind: "pass",
    note: "margin≈0.187",
  },
  {
    playbook: "air-force",
    formation: "Maryland I Heavy",
    cropId: "source-94:middle",
    playName: "PA HB WHEEL",
    kind: "pass",
    note: "margin≈0.183",
  },
  {
    playbook: "air-force",
    formation: "Gun Split",
    cropId: "source-130:middle",
    playName: "PA POWER READ WHEEL",
    kind: "pass",
    note: "margin≈0.232",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Twins",
    cropId: "source-134:middle",
    playName: "CORNERS",
    kind: "pass",
    note: "margin≈0.192",
  },
  {
    playbook: "air-force",
    formation: "Gun Wing",
    cropId: "source-155:middle",
    playName: "MTN HB SCISSORS",
    kind: "pass",
    note: "margin≈0.211",
  },
  {
    playbook: "air-force",
    formation: "Pistol Empty Y Tight",
    cropId: "source-108:right",
    playName: "MTN SALEM",
    kind: "pass",
    note: "margin≈0.193",
  },
  {
    playbook: "air-force",
    formation: "Gun Split",
    cropId: "source-129:left",
    playName: "TEXAS",
    kind: "pass",
    note: "margin≈0.152",
  },

  // --- REVIEW: likely correct, weak margin ---
  {
    playbook: "air-force",
    formation: "Gun Split Twins",
    cropId: "source-139:left",
    playName: "POWER G",
    kind: "review",
    note: "vs POWER G READ OPT margin≈0.002",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Twins",
    cropId: "source-138:right",
    playName: "POWER READ",
    kind: "review",
    note: "vs POWER G READ OPT margin≈0.031",
  },
  {
    playbook: "air-force",
    formation: "Gun Split",
    cropId: "source-130:right",
    playName: "POWER READ FOLLOW",
    kind: "review",
    note: "vs POWER READ margin≈0.003",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Twins",
    cropId: "source-136:middle",
    playName: "INSIDE ZONE SPLIT",
    kind: "review",
    note: "vs RPO SPLIT ALERT SNAG margin≈0.022",
  },
  {
    playbook: "air-force",
    formation: "Gun Wing",
    cropId: "source-155:left",
    playName: "MTN QB ZONE",
    kind: "review",
    note: "vs MTN QB G DOWN margin≈0.022",
  },
  {
    playbook: "air-force",
    formation: "Pistol Empty Y Tight",
    cropId: "source-109:left",
    playName: "DIY REVERSE",
    kind: "review",
    note: "vs QB BLAST margin≈0.034",
  },
  {
    playbook: "air-force",
    formation: "Flexbone Trio Right",
    cropId: "source-61:middle",
    playName: "INSIDE VEER TRIPLE OPT",
    kind: "review",
    note: "vs MIDLINE TRIPLE margin≈0.005",
  },
  {
    playbook: "air-force",
    formation: "Flexbone Trio Right",
    cropId: "source-62:right",
    playName: "TR CNTR WK",
    kind: "review",
    note: "vs INSIDE VEER TRIPLE WK margin≈0.0003",
  },
  {
    playbook: "air-force",
    formation: "Maryland I Heavy",
    cropId: "source-93:left",
    playName: "POWER O",
    kind: "review",
    note: "score≈0.746 below PASS gate",
  },
  {
    playbook: "air-force",
    formation: "Power I Strong",
    cropId: "source-90:left",
    playName: "POWER O",
    kind: "review",
    note: "vs HB ZONE; Power vs Zone",
  },
  {
    playbook: "air-force",
    formation: "Gun Spread Offset",
    cropId: "source-146:left",
    playName: "ZONE SPEED OPTION",
    kind: "review",
    note: "vs READ OPTION",
  },
  {
    playbook: "air-force",
    formation: "Wingbone Normal",
    cropId: "source-72:left",
    playName: "LOAD OPTION",
    kind: "review",
    note: "vs INSIDE VEER TRIPLE OPTION",
  },

  // --- Hard / mirrored / similar concepts ---
  {
    playbook: "air-force",
    formation: "Gun Split",
    cropId: "source-129:middle",
    playName: "TRIPLE OPTION RT",
    kind: "hard",
    note: "PASS but option family; check vs SPEED OPTION",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Tight",
    cropId: "source-141:left",
    playName: "HB POWER O",
    kind: "hard",
    note: "vs TRIPLE OPTION LT",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Tight",
    cropId: "source-141:middle",
    playName: "DOUBLE FLARES",
    kind: "hard",
    note: "negative margin vs TRIPLE OPTION LT",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Tight",
    cropId: "source-141:right",
    playName: "TRIPLE OPTION LT",
    kind: "hard",
    note: "LT vs RT collision with source-142:middle",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Tight",
    cropId: "source-142:middle",
    playName: "TRIPLE OPTION RT",
    kind: "hard",
    note: "mirrored Triple Option RT",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Y Offset",
    cropId: "source-126:left",
    playName: "TRIPLE OPTION RT",
    kind: "hard",
    note: "LT/RT + zone collision",
  },
  {
    playbook: "air-force",
    formation: "Gun Split Y Offset",
    cropId: "source-127:middle",
    playName: "TR OPT LEAD LT",
    kind: "hard",
    note: "mirrored option lead",
  },
  {
    playbook: "air-force",
    formation: "Gun Doubles",
    cropId: "source-76:right",
    playName: "INSIDE ZONE",
    kind: "hard",
    note: "Inside Zone; negative margin vs MIDLINE READ OPTION",
  },
  {
    playbook: "air-force",
    formation: "Gun Doubles",
    cropId: "source-77:right",
    playName: "SPEED OPTION",
    kind: "hard",
    note: "Speed Option vs READ OPTION",
  },

  // --- USC verified (positional / trusted ground truth) ---
  {
    playbook: "usc",
    formation: "Gun Trips",
    cropId: "source-138:left",
    playName: "TRIPS CROSS",
    kind: "usc",
    note: "verified USC pair",
  },
  {
    playbook: "usc",
    formation: "Gun Trips",
    cropId: "source-139:middle",
    playName: "INSIDE ZONE",
    kind: "usc",
  },
  {
    playbook: "usc",
    formation: "Gun Y Off Trips",
    cropId: "source-45:right",
    playName: "HB POWER RT",
    kind: "usc",
    note: "thin margin vs INSIDE ZONE",
  },
  {
    playbook: "usc",
    formation: "Gun Y Off Trips",
    cropId: "source-44:middle",
    playName: "PA Y FLOOD",
    kind: "usc",
    note: "healthy margin PASS",
  },
];

export const PLAYBOOK_PATHS = {
  "air-force": {
    reference: "scripts/play-art/references/cfb27-offense-air-force.json",
    source: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
  },
  usc: {
    reference: "scripts/play-art/references/cfb27-offense-usc.json",
    source: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
  },
} as const;
