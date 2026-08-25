/**
 * 20 verified USC Vault crops for the SVG auto-trace prototype.
 * Identities come from trusted playbook mappings in play-art-manifest.json.
 */

export type SampleCategory = "pass" | "run" | "option" | "motion" | "blocking";

export type TraceSample = {
  category: SampleCategory;
  formation: string;
  playName: string;
  /** Why this play was chosen / any substitution note. */
  note: string;
};

/**
 * Coverage target from session brief:
 * 5 pass · 5 run · 4 option · 3 motion · 3 heavy blocking
 *
 * Substitutions:
 * - No USC "TRAP" by name → COUNTER Y LEAD (pulls) for blocking detail
 * - "Curl Flats" → CURL COMBO
 */
export const TRACE_SAMPLES: TraceSample[] = [
  // --- Pass concepts (5) ---
  {
    category: "pass",
    formation: "Gun Split Slot",
    playName: "SLANTS",
    note: "Quick game; short angled routes",
  },
  {
    category: "pass",
    formation: "Gun Split Slot",
    playName: "MESH",
    note: "Crossing mesh; dense route geometry",
  },
  {
    category: "pass",
    formation: "Gun Split Slot Offset",
    playName: "FLOOD",
    note: "Flood concept; varied depths",
  },
  {
    category: "pass",
    formation: "Gun Spread Flex",
    playName: "SMASH CORNERS",
    note: "Smash / corner; deep + short pairing",
  },
  {
    category: "pass",
    formation: "Gun Doubles Y Off",
    playName: "CURL COMBO",
    note: "Curl combo (stand-in for Curl Flats)",
  },

  // --- Run concepts (5) ---
  {
    category: "run",
    formation: "Gun Split Y Offset",
    playName: "INSIDE ZONE SPLIT",
    note: "Inside zone",
  },
  {
    category: "run",
    formation: "Gun Doubles Y Off Wk",
    playName: "OUTSIDE ZONE",
    note: "Outside zone stretch",
  },
  {
    category: "run",
    formation: "Gun Doubles Y Off Wk",
    playName: "HB POWER O",
    note: "Power; pull / kick-out detail",
  },
  {
    category: "run",
    formation: "Gun Split Slot Offset",
    playName: "HB COUNTER",
    note: "Counter; misdirection + pulls",
  },
  {
    category: "run",
    formation: "Goal Line Normal",
    playName: "STRONG TOSS",
    note: "Toss; edge run geometry",
  },

  // --- Option concepts (4) ---
  {
    category: "option",
    formation: "Gun Split Slot Offset",
    playName: "SPEED OPTION",
    note: "Speed option",
  },
  {
    category: "option",
    formation: "Gun Doubles Y Off",
    playName: "READ OPTION",
    note: "Read option",
  },
  {
    category: "option",
    formation: "Gun Split Y Offset",
    playName: "MTN TRIPLE OPTION RT",
    note: "Triple option variant + motion",
  },
  {
    category: "option",
    formation: "Gun Doubles Y Off",
    playName: "JET CNTR Y READ OPTION",
    note: "Jet + counter + read option",
  },

  // --- Motion (3) ---
  {
    category: "motion",
    formation: "Gun Doubles Y Off",
    playName: "ORBIT ALERT COUNTER",
    note: "Orbit motion",
  },
  {
    category: "motion",
    formation: "Gun Split Slot",
    playName: "PA WHEEL",
    note: "Wheel route motion/path",
  },
  {
    category: "motion",
    formation: "Gun Doubles Y Off",
    playName: "FAKE JET HB WHEEL",
    note: "Fake jet + wheel",
  },

  // --- Heavy blocking (3) ---
  {
    category: "blocking",
    formation: "Gun Split Slot",
    playName: "HB SLIP SCREEN",
    note: "Screen blocking scheme",
  },
  {
    category: "blocking",
    formation: "Gun Split Y Offset",
    playName: "COUNTER Y LEAD",
    note: "Pulls / lead (TRAP substitute — no USC TRAP by name)",
  },
  {
    category: "blocking",
    formation: "Gun Doubles Y Off Wk",
    playName: "PA JAILBREAK SCREEN",
    note: "Jailbreak screen; dense blockers",
  },
];
