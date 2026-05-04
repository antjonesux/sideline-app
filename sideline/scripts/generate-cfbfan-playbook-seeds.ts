/**
 * One-shot / batch generator: fetch cfb.fan CFB26 offensive playbooks and write
 * `lib/seed/playbooks/{slug}.ts` files (TeamPlaybookSeed).
 *
 * Usage (from repo `sideline/`):
 *   NODE_PATH=./node_modules tsx ./scripts/generate-cfbfan-playbook-seeds.ts
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../lib/utils";
import type { TeamPlaybookSeed } from "../lib/seed/types";
import { getSchemeForTeam } from "../lib/playbooks/scheme-classifications";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Edit `TEAMS` per batch, then run from `sideline/`.
 * `urlSlug` when cfb.fan path differs from `fileSlug` (e.g. cal-off vs california.ts).
 *
 * Batch list, `urlSlug` overrides, and fragility notes:
 * `lib/seed/cfb26-playbook-seed-generator.md`
 * Session context: repo-root `SESSION_BRIEF.md`
 */
type TeamBatchEntry = { fileSlug: string; team: string; urlSlug?: string };

/** Batch 3 (2026-05-04): 60 teams — must match on-disk seeds this script regenerates. */
const TEAMS: TeamBatchEntry[] = [
  { fileSlug: "akron", team: "Akron" },
  { fileSlug: "appalachian-state", team: "Appalachian State" },
  { fileSlug: "arizona", team: "Arizona" },
  { fileSlug: "arizona-state", team: "Arizona State" },
  { fileSlug: "arkansas-state", team: "Arkansas State" },
  { fileSlug: "ball-state", team: "Ball State" },
  { fileSlug: "boise-state", team: "Boise State" },
  { fileSlug: "boston-college", team: "Boston College" },
  { fileSlug: "buffalo", team: "Buffalo" },
  { fileSlug: "california", team: "California", urlSlug: "cal" },
  { fileSlug: "central-michigan", team: "Central Michigan" },
  { fileSlug: "charlotte", team: "Charlotte" },
  { fileSlug: "clemson", team: "Clemson" },
  { fileSlug: "coastal-carolina", team: "Coastal Carolina" },
  { fileSlug: "east-carolina", team: "East Carolina" },
  { fileSlug: "fiu", team: "Florida International", urlSlug: "florida-international" },
  { fileSlug: "florida-atlantic", team: "Florida Atlantic" },
  { fileSlug: "florida-state", team: "Florida State" },
  { fileSlug: "fresno-state", team: "Fresno State" },
  { fileSlug: "georgia-southern", team: "Georgia Southern" },
  { fileSlug: "georgia-state", team: "Georgia State" },
  { fileSlug: "hawaii", team: "Hawaii" },
  { fileSlug: "jacksonville-state", team: "Jacksonville State" },
  { fileSlug: "kennesaw-state", team: "Kennesaw State" },
  { fileSlug: "louisville", team: "Louisville" },
  { fileSlug: "marshall", team: "Marshall" },
  { fileSlug: "memphis", team: "Memphis" },
  { fileSlug: "middle-tennessee", team: "Middle Tennessee", urlSlug: "mid-tenn-state" },
  { fileSlug: "nc-state", team: "NC State" },
  { fileSlug: "nevada", team: "Nevada" },
  { fileSlug: "new-mexico", team: "New Mexico" },
  { fileSlug: "new-mexico-state", team: "New Mexico State" },
  { fileSlug: "north-texas", team: "North Texas" },
  { fileSlug: "northwestern", team: "Northwestern" },
  { fileSlug: "old-dominion", team: "Old Dominion" },
  { fileSlug: "pittsburgh", team: "Pittsburgh" },
  { fileSlug: "rutgers", team: "Rutgers" },
  { fileSlug: "sam-houston", team: "Sam Houston", urlSlug: "sam-houston-state" },
  { fileSlug: "san-diego-state", team: "San Diego State" },
  { fileSlug: "smu", team: "SMU" },
  { fileSlug: "south-alabama", team: "South Alabama" },
  { fileSlug: "stanford", team: "Stanford" },
  { fileSlug: "syracuse", team: "Syracuse" },
  { fileSlug: "temple", team: "Temple" },
  { fileSlug: "toledo", team: "Toledo" },
  { fileSlug: "troy", team: "Troy" },
  { fileSlug: "tulane", team: "Tulane" },
  { fileSlug: "uab", team: "UAB" },
  { fileSlug: "unlv", team: "UNLV" },
  { fileSlug: "usf", team: "USF" },
  { fileSlug: "utah", team: "Utah" },
  { fileSlug: "utah-state", team: "Utah State" },
  { fileSlug: "utep", team: "UTEP" },
  { fileSlug: "utsa", team: "UTSA" },
  { fileSlug: "virginia", team: "Virginia" },
  { fileSlug: "virginia-tech", team: "Virginia Tech" },
  { fileSlug: "wake-forest", team: "Wake Forest" },
  { fileSlug: "washington", team: "Washington" },
  { fileSlug: "western-michigan", team: "Western Michigan" },
  { fileSlug: "wyoming", team: "Wyoming" },
];

const VERIFIED = "2026-05-04";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function inferFormationType(formation: string): string {
  const n = formation.trim();
  const prefixes: [string, string][] = [
    ["Hail Mary", "Hail Mary"],
    ["Goal Line", "Goal Line"],
    ["Power I", "Power I"],
    ["Singleback", "Singleback"],
    ["I Form", "I Form"],
    ["Pistol", "Pistol"],
    ["Strong", "Strong"],
    ["Weak", "Weak"],
    ["Gun", "Gun"],
  ];
  for (const [prefix, type] of prefixes) {
    if (n.startsWith(prefix)) return type;
  }
  return "Gun";
}

function slugToExportConst(fileSlug: string): string {
  return `${fileSlug.replace(/-/g, "_").toUpperCase()}_SEED`;
}

function extractFormationHrefs(html: string, urlSlug: string): string[] {
  const esc = urlSlug.replace(/-/g, "\\-");
  const re = new RegExp(`href="/26/playbooks/${esc}-off/([^/"]+)/"`, "g");
  const seen = new Set<string>();
  const order: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const pathSeg = m[1];
    if (!pathSeg || pathSeg.includes("..")) continue;
    if (!seen.has(pathSeg)) {
      seen.add(pathSeg);
      order.push(pathSeg);
    }
  }
  return order;
}

function extractH1FormationName(html: string): string | null {
  const m = html.match(/<h1[^>]*class="mt-3"[^>]*>([^<]+)<\/h1>/);
  if (m) return m[1].trim();
  const m2 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return m2 ? m2[1].trim() : null;
}

function extractPlayNames(html: string): string[] {
  const names: string[] = [];
  const re = /<div class="play-tile__header">\s*([^<]+?)\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].replace(/\s+/g, " ").trim();
    if (raw) names.push(raw);
  }
  return names;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "SidelinePlaybookSeedGenerator/1.0 (+https://github.com)" },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

function validateCanonicalUniqueness(seed: TeamPlaybookSeed, slug: string): void {
  const seen = new Set<string>();
  for (const f of seed.formations) {
    const formation = f.formation.trim();
    for (const p of f.plays) {
      const play = normalizePlayName(p.playName.trim());
      const k = `${formation}\u0000${play}`;
      if (seen.has(k)) throw new Error(`[${slug}] duplicate canonical ${formation} / ${play}`);
      seen.add(k);
    }
  }
}

async function buildSeed(team: string, urlSlug: string): Promise<TeamPlaybookSeed> {
  const base = `https://cfb.fan/26/playbooks/${urlSlug}-off`;
  const indexHtml = await fetchHtml(`${base}/`);
  const formationPathSegs = extractFormationHrefs(indexHtml, urlSlug);
  if (formationPathSegs.length === 0) {
    throw new Error(`No formations found for ${team} (${urlSlug})`);
  }

  const scheme = getSchemeForTeam(team);
  if (scheme == null) throw new Error(`Team "${team}" missing from TEAM_SCHEMES`);

  const formations: TeamPlaybookSeed["formations"] = [];

  for (const seg of formationPathSegs) {
    await sleep(80);
    const fhtml = await fetchHtml(`${base}/${seg}/`);
    const formationName = extractH1FormationName(fhtml);
    if (!formationName) throw new Error(`No h1 formation for ${team} ${seg}`);

    const playHeaders = extractPlayNames(fhtml);
    const playSet = new Set<string>();
    const plays = playHeaders.map((playName) => {
      const pk = normalizePlayName(playName);
      if (playSet.has(pk)) throw new Error(`[${team}] dup play in ${formationName}: ${playName}`);
      playSet.add(pk);
      return { playName, isNewIn26: false as boolean };
    });

    if (plays.length === 0) {
      throw new Error(`[${team}] formation "${formationName}" has no plays`);
    }

    formations.push({
      formation: formationName,
      formationType: inferFormationType(formationName),
      plays,
    });
  }

  return {
    team,
    scheme,
    source: { url: `${base}/`, verified: VERIFIED },
    formations,
  };
}

function emitTs(fileSlug: string, seed: TeamPlaybookSeed): string {
  const constName = slugToExportConst(fileSlug);
  const body = JSON.stringify(seed, null, 2);
  return `import type { TeamPlaybookSeed } from "../types";

export const ${constName}: TeamPlaybookSeed = ${body};
`;
}

async function main() {
  const outDir = join(__dirname, "..", "lib", "seed", "playbooks");
  const summary: { slug: string; team: string; formations: number; plays: number }[] = [];

  for (const { fileSlug, team, urlSlug: urlSlugOverride } of TEAMS) {
    const urlSlug = urlSlugOverride ?? fileSlug;
    process.stdout.write(`${team} (${fileSlug})... `);
    const seed = await buildSeed(team, urlSlug);
    validateCanonicalUniqueness(seed, fileSlug);
    const plays = seed.formations.reduce((n, f) => n + f.plays.length, 0);
    summary.push({ slug: fileSlug, team, formations: seed.formations.length, plays });
    const path = join(outDir, `${fileSlug}.ts`);
    writeFileSync(path, emitTs(fileSlug, seed), "utf8");
    console.log(`OK (${seed.formations.length} formations, ${plays} plays)`);
    await sleep(120);
  }

  console.log("\n--- Summary ---");
  for (const row of summary) {
    console.log(`${row.team}\t${row.formations}\t${row.plays}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
