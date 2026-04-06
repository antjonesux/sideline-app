import type { TeamSchemeRow } from "./teamSchemeData";

import teamRows from "@/data/cfb26-team-schemes.json";

const rows = teamRows as TeamSchemeRow[];

/** Case-insensitive map: team display name → defensive scheme */
const schemeByTeam = new Map<string, string>();
for (const { team_name, defensive_scheme } of rows) {
  schemeByTeam.set(team_name.toLowerCase(), defensive_scheme);
}

export function getAllTeamRows(): TeamSchemeRow[] {
  return rows;
}

export function getDefensiveSchemeForTeam(teamName: string): string | null {
  const key = teamName.trim().toLowerCase();
  return schemeByTeam.get(key) ?? null;
}

export function filterTeamsByQuery(query: string): TeamSchemeRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.team_name.toLowerCase().includes(q));
}
