import type {
  Scheme,
  SchemeDetail,
  SchemeFormation,
  SchemePlayerType,
  SituationalCall,
} from "@/lib/types";

/** Stable IDs aligned with `supabase/seed.sql` for local fallback and linking. */
export const SCHEME_IDS = {
  arbuckle: "00000001-0000-4000-8000-000000000001",
  spreadRpo: "00000001-0000-4000-8000-000000000002",
  proStyle: "00000001-0000-4000-8000-000000000003",
  veerShoot: "00000001-0000-4000-8000-000000000004",
  option: "00000001-0000-4000-8000-000000000005",
  powerSpread: "00000001-0000-4000-8000-000000000006",
} as const;

function callsForScheme(schemeId: string): SituationalCall[] {
  const rows: Omit<
    SituationalCall,
    "id" | "scheme_id" | "created_at"
  >[] = [
    {
      situation: "1st & 10",
      down: 1,
      distance_min: 10,
      distance_max: 10,
      formation: "Gun Spread",
      play_type: "RPO or Mesh Concept",
      rationale: "Attack leverage pre-snap.",
      priority: 1,
    },
    {
      situation: "2nd & Medium",
      down: 2,
      distance_min: 4,
      distance_max: 6,
      formation: "Gun Doubles",
      play_type: "Quick Game",
      rationale: "Stay on schedule.",
      priority: 2,
    },
    {
      situation: "2nd & Long",
      down: 2,
      distance_min: 7,
      distance_max: 99,
      formation: "Pistol Wing Slot",
      play_type: "Play Action",
      rationale: "Buy time, attack vertically.",
      priority: 3,
    },
    {
      situation: "3rd & Short",
      down: 3,
      distance_min: 1,
      distance_max: 2,
      formation: "Pistol U Off",
      play_type: "QB Power / RPO",
      rationale: "Force hat conflict.",
      priority: 4,
    },
    {
      situation: "3rd & Long",
      down: 3,
      distance_min: 6,
      distance_max: 99,
      formation: "Gun Empty Trips",
      play_type: "Four Verts / Spacing",
      rationale: "Force safety declaration.",
      priority: 5,
    },
    {
      situation: "Red Zone",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Pistol Full House TE",
      play_type: "Fade / Back Shoulder",
      rationale: "Isolate WR in space.",
      priority: 6,
    },
    {
      situation: "2-Minute Drill",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Gun Empty Base Flex",
      play_type: "Slants / Crossers",
      rationale: "Fast, high-percentage completions.",
      priority: 7,
    },
  ];
  return rows.map((r, i) => ({
    ...r,
    id: `${schemeId}-call-${i + 1}`,
    scheme_id: schemeId,
  }));
}

function formationsArbuckle(schemeId: string, playbook: string): SchemeFormation[] {
  const g = (name: string, group: string, notes?: string): SchemeFormation => ({
    id: `${schemeId}-f-${name.replace(/\s+/g, "-")}`,
    scheme_id: schemeId,
    formation_name: name,
    formation_group: group,
    cfb26_playbook: playbook,
    notes: notes ?? null,
  });
  return [
    g("Gun Empty Base Flex", "Core Passing"),
    g("Gun Empty Trips Y Off", "Core Passing"),
    g("Gun Spread Dbl Flex", "Core Passing"),
    g("Gun Trey Open Offset", "Core Passing"),
    g("Pistol Wing Slot", "RPO/Run"),
    g("Pistol U Off", "RPO/Run"),
    g("Pistol Bunch TE", "RPO/Run"),
    g("Gun Y Off Trips", "RPO/Run"),
    g("Pistol Full House TE", "Red Zone"),
    g("Gun Bunch Open TE", "Red Zone"),
    g("Gun Empty Y Off Trips", "3rd Down"),
    g("Gun Trio Offset", "3rd Down"),
    g("Gun Flex Y Off Wk", "3rd Down"),
  ];
}

function playerTypesArbuckle(schemeId: string): SchemePlayerType[] {
  const p = (
    position: string,
    archetype_label: string,
    key_attributes: string[],
    avoid_note: string,
  ): SchemePlayerType => ({
    id: `${schemeId}-pt-${position}`,
    scheme_id: schemeId,
    position,
    archetype_label,
    key_attributes,
    avoid_note,
  });
  return [
    p("QB", "Dual-Threat Scrambler", ["Speed", "Throw on Run", "Short Accuracy", "Release Speed"], "Avoid pure pocket passers"),
    p("HB", "Receiving Back", ["Speed", "Catching", "Pass Block"], "Avoid power backs — screens and checkdowns are the role"),
    p("WR1", "Route Runner", ["Route Running", "Catch in Traffic", "Release"], "Speed helps but technique wins"),
    p("WR2", "Separator", ["Short Route Running", "Catching", "Acceleration"], "Must win quickly off the line"),
    p("TE", "Blocking TE or Mismatch Weapon", ["Pass Block", "Catch in Traffic"], "Used as either extra blocker or seam threat"),
    p("OL", "Pass Protector", ["Pass Block", "Awareness"], "Wide splits demand footwork over power"),
  ];
}

const SCHEME_SUMMARIES: Scheme[] = [
  {
    id: SCHEME_IDS.arbuckle,
    name: "Arbuckle Air Raid",
    coach_name: "Ben Arbuckle",
    description:
      "Tempo passing offense built on quick game, mesh, and spacing that stresses horizontal and vertical conflict. It lives in empty and open sets, forcing the defense to declare early and play in space.",
    tempo: "Up-Tempo",
    cfb26_playbook: "Oklahoma / Washington State",
  },
  {
    id: SCHEME_IDS.spreadRpo,
    name: "Spread RPO",
    coach_name: "Lane Kiffin",
    description:
      "Spread formations with conflict reads that tie linebackers and safeties to the run fit. The offense stays ahead of the chains by marrying quick perimeter throws to downhill run threats.",
    tempo: "Up-Tempo",
    cfb26_playbook: "Ole Miss / Texas",
  },
  {
    id: SCHEME_IDS.proStyle,
    name: "Pro Style",
    coach_name: "Kirby Smart / Nick Saban tree",
    description:
      "Under-center and gun balance that leans on play action and personnel packages. You win on schedule with efficient runs, then punish linebackers who creep with shot plays off of believable run action.",
    tempo: "Controlled",
    cfb26_playbook: "Georgia / Alabama",
  },
  {
    id: SCHEME_IDS.veerShoot,
    name: "Veer & Shoot",
    coach_name: "Jeff Lebby",
    description:
      "Vertical spacing married to tempo and orbit motion. The goal is to stress safeties with speed outsides while keeping linebackers in run-pass conflict on the way downfield.",
    tempo: "Up-Tempo",
    cfb26_playbook: "Ole Miss (Veer variant)",
  },
  {
    id: SCHEME_IDS.option,
    name: "Option",
    coach_name: "Troy Calhoun / Jeff Monken tree",
    description:
      "Triple-option and speed option families that read defenders instead of blocking them. Assignment football rewards disciplined ball security and precise mesh points more than raw receiver depth.",
    tempo: "Ball Control",
    cfb26_playbook: "Air Force / Army",
  },
  {
    id: SCHEME_IDS.powerSpread,
    name: "Power Spread",
    coach_name: "Matt Campbell tree",
    description:
      "Spread alignments with gap schemes and tight-end usage that still throw efficiently. You stay multiple without becoming finesse-only: power and counter punish light boxes.",
    tempo: "Controlled",
    cfb26_playbook: "Iowa State / Wisconsin variant",
  },
];

function genericPlayerTypes(
  schemeId: string,
  qb: { label: string; keys: string[]; avoid: string },
  hb: { label: string; keys: string[]; avoid: string },
): SchemePlayerType[] {
  const base = (
    position: string,
    archetype_label: string,
    key_attributes: string[],
    avoid_note: string,
  ): SchemePlayerType => ({
    id: `${schemeId}-pt-${position}`,
    scheme_id: schemeId,
    position,
    archetype_label,
    key_attributes,
    avoid_note,
  });
  return [
    base("QB", qb.label, qb.keys, qb.avoid),
    base("HB", hb.label, hb.keys, hb.avoid),
    base(
      "WR1",
      "X Receiver",
      ["Release", "Catch in Traffic", "Contested Catch"],
      "Pure speed without combat catch traits limits third-down reliability.",
    ),
    base(
      "WR2",
      "Slot / Z",
      ["Route Running", "Separation", "YAC"],
      "Slow-footed possession-only types narrow the quick game.",
    ),
    base(
      "TE",
      "Move TE",
      ["Blocking", "Route Running", "Hands"],
      "One-dimensional blockers shrink the middle-field menu.",
    ),
    base(
      "OL",
      "Zone / Gap Blend",
      ["Run Block", "Pass Block", "Awareness"],
      "Low-awareness linemen expose stunts and simulated pressures.",
    ),
  ];
}

function genericFormations(
  schemeId: string,
  playbook: string,
  groups: Record<string, string[]>,
): SchemeFormation[] {
  const out: SchemeFormation[] = [];
  let n = 0;
  for (const [formation_group, names] of Object.entries(groups)) {
    for (const formation_name of names) {
      n += 1;
      out.push({
        id: `${schemeId}-f-${n}`,
        scheme_id: schemeId,
        formation_name,
        formation_group,
        cfb26_playbook: playbook,
        notes: null,
      });
    }
  }
  return out;
}

const DETAILS: Record<string, SchemeDetail> = {};

function put(detail: SchemeDetail) {
  DETAILS[detail.id] = detail;
}

put({
  ...SCHEME_SUMMARIES[0],
  scheme_player_types: playerTypesArbuckle(SCHEME_IDS.arbuckle),
  scheme_formations: formationsArbuckle(
    SCHEME_IDS.arbuckle,
    "Washington State",
  ),
  situational_calls: callsForScheme(SCHEME_IDS.arbuckle),
});

put({
  ...SCHEME_SUMMARIES[1],
  scheme_player_types: genericPlayerTypes(SCHEME_IDS.spreadRpo, {
    label: "RPO Field General",
    keys: ["Throw Accuracy", "Throw on Run", "Awareness"],
    avoid: "Statue QBs limit conflict answers when linebackers trigger late.",
  }, {
    label: "One-Cut Runner",
    keys: ["Speed", "Vision", "Carrying"],
    avoid: "Dancers who need east-west space slow mesh timing.",
  }),
  scheme_formations: genericFormations(SCHEME_IDS.spreadRpo, "Ole Miss / Texas", {
    "Core Passing": [
      "Gun Spread",
      "Gun Trips TE",
      "Gun Bunch Open",
      "Empty Trey",
    ],
    "RPO/Run": [
      "Pistol Wing",
      "Gun Far/Near",
      "Spread Offset",
      "Trips TE Offset",
    ],
    "Red Zone": ["Bunch TE", "Wing Tight", "Goal Line Spread"],
    "3rd Down": ["Empty Trips", "Doubles Y Off", "Stack Slot"],
  }),
  situational_calls: callsForScheme(SCHEME_IDS.spreadRpo),
});

put({
  ...SCHEME_SUMMARIES[2],
  scheme_player_types: genericPlayerTypes(SCHEME_IDS.proStyle, {
    label: "Pro Pocket",
    keys: ["Throw Power", "Accuracy", "Awareness"],
    avoid: "Chaos-only scramblers can miss timing on play-action shots.",
  }, {
    label: "North/South Runner",
    keys: ["Trucking", "Vision", "Stamina"],
    avoid: "Satellite backs shrink gap-scheme identity.",
  }),
  scheme_formations: genericFormations(SCHEME_IDS.proStyle, "Georgia / Alabama", {
    "Core Passing": ["I Pro", "Gun Doubles", "Ace Slot", "Pro Spread"],
    "RPO/Run": ["I Form", "Strong I", "Pistol Ace", "Offset I"],
    "Red Zone": ["Jumbo TE", "I Tight", "Wing TE"],
    "3rd Down": ["Gun Trips", "Empty Doubles", "Slot Drive"],
  }),
  situational_calls: callsForScheme(SCHEME_IDS.proStyle),
});

put({
  ...SCHEME_SUMMARIES[3],
  scheme_player_types: genericPlayerTypes(SCHEME_IDS.veerShoot, {
    label: "Deep Ball Operator",
    keys: ["Throw Power", "Deep Accuracy", "Mobility"],
    avoid: "Checkdown-only passers leave vertical stress unused.",
  }, {
    label: "Home-Run Back",
    keys: ["Speed", "Receiving", "Stamina"],
    avoid: "Plodders cannot threaten the flat when safeties rotate.",
  }),
  scheme_formations: genericFormations(
    SCHEME_IDS.veerShoot,
    "Ole Miss (Veer variant)",
    {
      "Core Passing": [
        "Gun Trips",
        "Empty Base",
        "Trey Open",
        "Dbl Flex",
      ],
      "RPO/Run": ["Pistol Trips", "Gun Y Off", "Spread Slot", "Bunch"],
      "Red Zone": ["Bunch TE", "Tight Doubles", "Wing Slot"],
      "3rd Down": ["Empty Trips", "Stack", "Sprintout Gun"],
    },
  ),
  situational_calls: callsForScheme(SCHEME_IDS.veerShoot),
});

put({
  ...SCHEME_SUMMARIES[4],
  scheme_player_types: genericPlayerTypes(SCHEME_IDS.option, {
    label: "Mesh Point QB",
    keys: ["Speed", "Carrying", "Stamina"],
    avoid: "Slow-footed passers break mesh timing and pitch lanes.",
  }, {
    label: "Pitch Back",
    keys: ["Speed", "Awareness", "Catching"],
    avoid: "Fumble-prone backs end drives in this system.",
  }),
  scheme_formations: genericFormations(SCHEME_IDS.option, "Air Force / Army", {
    "Core Passing": ["Flexbone", "Double Wing", "Spread Option"],
    "RPO/Run": ["Flexbone", "I Option", "Slot Option"],
    "Red Zone": ["Heavy Jumbo", "Wing Tight", "Bunch Tight"],
    "3rd Down": ["Spread Option", "Trips Flex", "Quick Flex"],
  }),
  situational_calls: callsForScheme(SCHEME_IDS.option),
});

put({
  ...SCHEME_SUMMARIES[5],
  scheme_player_types: genericPlayerTypes(SCHEME_IDS.powerSpread, {
    label: "Efficient Distributor",
    keys: ["Accuracy", "Throw Under Pressure", "Awareness"],
    avoid: "Fragile pocket passers struggle when play-action is noisy.",
  }, {
    label: "Gap Scheme Runner",
    keys: ["Trucking", "Vision", "Stamina"],
    avoid: "Outside-only speed backs misalign with power/counter.",
  }),
  scheme_formations: genericFormations(
    SCHEME_IDS.powerSpread,
    "Iowa State / Wisconsin variant",
    {
      "Core Passing": ["Gun Trips TE", "Pro Spread", "Ace Doubles"],
      "RPO/Run": ["Pistol Ace", "Gun Tight", "Offset TE", "Wing"],
      "Red Zone": ["Jumbo TE", "Full House", "Tight Bunch"],
      "3rd Down": ["Gun Trips", "Empty TE", "Drive Doubles"],
    },
  ),
  situational_calls: callsForScheme(SCHEME_IDS.powerSpread),
});

export function getStaticSchemes(): Scheme[] {
  return SCHEME_SUMMARIES;
}

export function getStaticSchemeDetail(id: string): SchemeDetail | null {
  return DETAILS[id] ?? null;
}
