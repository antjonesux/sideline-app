// Seed file template for a team playbook.
// Copy this file, rename to {team-slug}.ts, and fill in the data.
// Example: /lib/seed/playbooks/tcu.ts
//
// This file is reference-only — do not import it from seed runners.

import type { TeamPlaybookSeed } from "../types";

export const TEAM_NAME_SEED: TeamPlaybookSeed = {
  // Team name — must match a key in TEAM_SCHEMES exactly
  team: "TEAM NAME",

  // Scheme classification — must match a value in ALL_SCHEMES
  // Pulled automatically from TEAM_SCHEMES[team] but can be overridden here if needed
  scheme: "Scheme Name",

  // Catalog game version — use 'cfb27' for CFB27 playbooks; omit for CFB26 (defaults to cfb26)
  gameVersion: "cfb27",

  // Source attribution for traceability
  source: {
    url: "https://cfb.fan/27/playbooks/{team}-off/",
    verified: "YYYY-MM-DD",
  },

  // List of all formations in this playbook with their plays
  // Formation names must be exactly as they appear on cfb.fan
  formations: [
    {
      formation: "Formation Name",
      formationType: "Gun", // Gun | Pistol | Singleback | I Form | etc.
      plays: [
        {
          playName: "PLAY NAME IN CAPS",
          isNewIn26: false, // true if this play is new for CFB26
          isNewIn27: false, // true if this play is new for CFB27
          playType: "Medium Pass", // optional — tags the play for recommendation engine
        },
        // ... more plays
      ],
    },
    // ... more formations
  ],
};
