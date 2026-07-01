/**
 * CFB27 playbook scraper (cfb.fan) — reusable for annual playbook pulls.
 *
 * Usage (from sideline/):
 *   npx tsx scripts/scrape-cfb27.ts
 *
 * Swap the TEAMS array for each seed session or game version batch.
 */

import * as cheerio from "cheerio";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSchemeForTeam } from "../lib/playbooks/scheme-classifications";
import type { FormationSeed, PlaySeed, TeamPlaybookSeed } from "../lib/seed/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED_DIR = join(ROOT, "lib", "seed", "playbooks");
const CACHE_DIR = join(ROOT, "tmp", "cfb27");
const PLAY_TEAM_CACHE_PATH = join(CACHE_DIR, "_play-team-cache.json");

const TEAMS = [
  { slug: "new-mexico-off", team: "New Mexico", scheme: "Multiple" },
  { slug: "new-mexico-state-off", team: "New Mexico State", scheme: "Multiple" },
  { slug: "hawaii-off", team: "Hawaii", scheme: "Run and Shoot" },
  { slug: "wyoming-off", team: "Wyoming", scheme: "Pro Style" },
  { slug: "utep-off", team: "UTEP", scheme: "Multiple" },
  { slug: "western-kentucky-off", team: "Western Kentucky", scheme: "Air Raid" },
  { slug: "san-jose-state-off", team: "San Jose State", scheme: "Spread" },
  { slug: "sam-houston-state-off", team: "Sam Houston", scheme: "Spread" },
  { slug: "middle-tennessee-state-off", team: "Middle Tennessee", scheme: "Spread" },
  { slug: "jacksonville-state-off", team: "Jacksonville State", scheme: "Spread" },
  { slug: "kennesaw-state-off", team: "Kennesaw State", scheme: "Option" },
  { slug: "missouri-state-off", team: "Missouri State", scheme: "Multiple" },
  { slug: "north-dakota-state-off", team: "North Dakota State", scheme: "Pro Style" },
  { slug: "delaware-off", team: "Delaware", scheme: "Multiple" },
  { slug: "florida-international-off", team: "Florida International", scheme: "Spread" },
  { slug: "sacramento-state-off", team: "Sacramento State", scheme: "Spread Option" },
];

const BASE_URL = "https://cfb.fan";
const DELAY_MS = 1000;
const VERIFIED = "2026-07-01";

const FETCH_HEADERS = {
  "user-agent": "SidelinePlaybookSeedGenerator/1.0 (+https://github.com)",
  accept: "text/html,application/xhtml+xml",
};

type FormationRef = {
  formationType: string;
  formationSuffix: string;
  formationSlug: string;
};

type ScrapeError = { team: string; context: string; message: string };

const formationPlaysCache = new Map<string, { playSlug: string; playName: string }[]>();
let playTeamCache = new Map<string, string[]>();
let playTeamCacheDirty = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function teamToFileSlug(team: string): string {
  return team.toLowerCase().replace(/\s+/g, "-");
}

function teamToConstName(team: string): string {
  return `CFB27_${team.toUpperCase().replace(/\s+/g, "_").replace(/&/g, "")}`;
}

function classifyPlayType(playName: string): string {
  const name = playName.toUpperCase();
  if (name.includes("RPO")) return "RPO";
  if (name.startsWith("PA ") || name.includes(" PA ") || name.includes("PLAY ACTION")) {
    return "Play Action";
  }
  if (name.includes("SCREEN")) return "Screen";
  const runIndicators = [
    "ZONE",
    "SWEEP",
    "COUNTER",
    "POWER",
    "DRAW",
    "TRAP",
    "DIVE",
    "HB BASE",
    "STRETCH",
    "BUCK",
    "ISO",
    "TOSS",
    "OPTION",
    "QB SNEAK",
    "KNEEL",
    "SPIKE",
    "FULLBACK",
    "FB ",
    "HB BLAST",
    "LEAD",
    "SLAM",
    "WHAM",
    "DUO",
    "DART",
    "JET SWEEP",
    "READ OPT",
    "SPEED OPT",
    "TRIPLE OPT",
    "MIDLINE",
  ];
  if (!name.startsWith("PA ") && !name.includes("RPO")) {
    for (const indicator of runIndicators) {
      if (name.includes(indicator)) return "Run";
    }
  }
  return "Pass";
}

function loadPlayTeamCache(): void {
  if (!existsSync(PLAY_TEAM_CACHE_PATH)) return;
  try {
    const raw = JSON.parse(readFileSync(PLAY_TEAM_CACHE_PATH, "utf8")) as Record<string, string[]>;
    playTeamCache = new Map(Object.entries(raw));
    console.log(`Loaded play-team cache: ${playTeamCache.size.toLocaleString("en-US")} entries`);
  } catch {
    console.warn("Could not load play-team cache; starting fresh.");
  }
}

function savePlayTeamCache(): void {
  if (!playTeamCacheDirty) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  const obj: Record<string, string[]> = {};
  for (const [k, v] of playTeamCache) obj[k] = v;
  writeFileSync(PLAY_TEAM_CACHE_PATH, JSON.stringify(obj), "utf8");
  playTeamCacheDirty = false;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const text = await res.text();
  if (text.includes("Just a moment")) throw new Error(`GET ${url} -> Cloudflare challenge`);
  return text;
}

function parseTeamFormations(html: string, teamSlug: string): FormationRef[] {
  const $ = cheerio.load(html);
  const formations: FormationRef[] = [];
  const slugPattern = teamSlug.replace(/-/g, "\\-");

  $("h2").each((_, el) => {
    const formationType = $(el).text().trim();
    if (!formationType) return;

    $(el)
      .parent()
      .find(`a[href*="/27/playbooks/${teamSlug}/"]`)
      .each((__, link) => {
        const href = $(link).attr("href") ?? "";
        const suffix = $(link).text().replace(/\s+/g, " ").trim();
        const match = href.match(new RegExp(`/27/playbooks/${slugPattern}/([^/]+)/`));
        if (!match || !suffix) return;

        formations.push({
          formationType,
          formationSuffix: suffix,
          formationSlug: match[1],
        });
      });
  });

  return formations;
}

function parsePlaysFromFormationPage(
  html: string,
  formationSlug: string,
): { playSlug: string; playName: string }[] {
  const $ = cheerio.load(html);
  const plays: { playSlug: string; playName: string }[] = [];
  const prefix = `/playbooks/plays/${formationSlug}/`;

  $(`a[href^="${prefix}"]`).each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const playSlug = href.slice(prefix.length).replace(/\/$/, "");
    if (!playSlug || playSlug.includes("/")) return;

    const header = $(el).find(".play-tile__header").text().replace(/\s+/g, " ").trim();
    const playName = (header || $(el).text()).replace(/\s+/g, " ").trim().toUpperCase();
    if (playName) plays.push({ playSlug, playName });
  });

  return plays;
}

async function getFormationPlays(
  formationSlug: string,
): Promise<{ playSlug: string; playName: string }[]> {
  const cached = formationPlaysCache.get(formationSlug);
  if (cached) return cached;

  await delay(DELAY_MS);
  const html = await fetchHtml(`${BASE_URL}/playbooks/formations/${formationSlug}/`);
  const plays = parsePlaysFromFormationPage(html, formationSlug);
  formationPlaysCache.set(formationSlug, plays);
  return plays;
}

async function getPlayTeams(formationSlug: string, playSlug: string): Promise<string[]> {
  const cacheKey = `${formationSlug}/${playSlug}`;
  const cached = playTeamCache.get(cacheKey);
  if (cached) return cached;

  await delay(DELAY_MS);
  const html = await fetchHtml(`${BASE_URL}/playbooks/plays/${formationSlug}/${playSlug}/`);
  const $ = cheerio.load(html);
  const teams: string[] = [];

  $("a.playbooks-list__link").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/\/27\/playbooks\/([^/]+)\//);
    if (match) teams.push(match[1]);
  });

  playTeamCache.set(cacheKey, teams);
  playTeamCacheDirty = true;
  return teams;
}

function emitSeedFile(team: string, seed: TeamPlaybookSeed): string {
  const constName = teamToConstName(team);
  const lines: string[] = [
    "import { TeamPlaybookSeed } from '../types';",
    "",
    `export const ${constName}_SEED: TeamPlaybookSeed = {`,
    `  team: ${JSON.stringify(seed.team)},`,
    `  scheme: ${JSON.stringify(seed.scheme)},`,
    `  gameVersion: 'cfb27',`,
    "  source: {",
    `    url: ${JSON.stringify(seed.source.url)},`,
    `    verified: ${JSON.stringify(seed.source.verified)},`,
    "  },",
    "  formations: [",
  ];

  for (const f of seed.formations) {
    lines.push("    {");
    lines.push(`      formation: ${JSON.stringify(f.formation)},`);
    lines.push(`      formationType: ${JSON.stringify(f.formationType)},`);
    lines.push("      plays: [");
    for (const p of f.plays) {
      lines.push(
        `        { playName: ${JSON.stringify(p.playName)}, isNewIn26: false, isNewIn27: false, playType: ${JSON.stringify(p.playType ?? "Pass")} },`,
      );
    }
    lines.push("      ],");
    lines.push("    },");
  }

  lines.push("  ],");
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

async function scrapeTeam(
  entry: (typeof TEAMS)[number],
  errors: ScrapeError[],
): Promise<TeamPlaybookSeed | null> {
  const scheme = getSchemeForTeam(entry.team);
  if (scheme == null) {
    errors.push({ team: entry.team, context: "TEAM_SCHEMES", message: `No scheme for "${entry.team}"` });
    console.error(`\n✗ ${entry.team}: not in TEAM_SCHEMES`);
    return null;
  }

  console.log(`\nScraping ${entry.team} (${entry.slug}, ${scheme})…`);

  let teamHtml: string;
  try {
    await delay(DELAY_MS);
    teamHtml = await fetchHtml(`${BASE_URL}/playbooks/${entry.slug}/`);
  } catch (e) {
    const message = (e as Error).message;
    errors.push({ team: entry.team, context: "team page", message });
    console.error(`  ✗ team page: ${message}`);
    return null;
  }

  const formationRefs = parseTeamFormations(teamHtml, entry.slug);
  console.log(`  ${formationRefs.length} formations found`);

  const formations: FormationSeed[] = [];

  for (const ref of formationRefs) {
    const fullFormation = `${ref.formationType} ${ref.formationSuffix}`.trim();
    let globalPlays: { playSlug: string; playName: string }[];

    try {
      globalPlays = await getFormationPlays(ref.formationSlug);
    } catch (e) {
      const message = (e as Error).message;
      errors.push({ team: entry.team, context: `formation ${ref.formationSlug}`, message });
      console.error(`  ✗ formation ${ref.formationSlug}: ${message}`);
      continue;
    }

    const plays: PlaySeed[] = [];
    for (const { playSlug, playName } of globalPlays) {
      try {
        const teams = await getPlayTeams(ref.formationSlug, playSlug);
        if (!teams.includes(entry.slug)) continue;
        plays.push({
          playName,
          isNewIn26: false,
          isNewIn27: false,
          playType: classifyPlayType(playName),
        });
      } catch (e) {
        const message = (e as Error).message;
        errors.push({
          team: entry.team,
          context: `play ${ref.formationSlug}/${playSlug}`,
          message,
        });
      }
    }

    if (plays.length) {
      formations.push({
        formation: fullFormation,
        formationType: ref.formationType,
        plays,
      });
      console.log(`    ${fullFormation}: ${plays.length} plays`);
    }
  }

  if (!formations.length) {
    errors.push({ team: entry.team, context: "validation", message: "No formations with plays" });
    console.error(`  ✗ no playable formations`);
    return null;
  }

  return {
    team: entry.team,
    scheme,
    gameVersion: "cfb27",
    source: {
      url: `${BASE_URL}/playbooks/${entry.slug}/`,
      verified: VERIFIED,
    },
    formations,
  };
}

async function main() {
  mkdirSync(SEED_DIR, { recursive: true });
  loadPlayTeamCache();

  const errors: ScrapeError[] = [];
  let teamsOk = 0;
  let totalFormations = 0;
  let totalPlays = 0;
  const seededSlugs: string[] = [];

  console.log(`CFB27 scraper — ${TEAMS.length} teams`);

  for (const entry of TEAMS) {
    const seed = await scrapeTeam(entry, errors);
    if (!seed) continue;

    const fileSlug = teamToFileSlug(entry.team);
    const seedPath = join(SEED_DIR, `cfb27-${fileSlug}.ts`);
    writeFileSync(seedPath, emitSeedFile(entry.team, seed), "utf8");

    const plays = seed.formations.reduce((n, f) => n + f.plays.length, 0);
    teamsOk += 1;
    totalFormations += seed.formations.length;
    totalPlays += plays;
    seededSlugs.push(`cfb27-${fileSlug}`);
    console.log(`  ✓ wrote cfb27-${fileSlug}.ts (${seed.formations.length} formations, ${plays} plays)`);
  }

  savePlayTeamCache();

  console.log("\n=== SCRAPE SUMMARY ===");
  console.log(`Teams requested: ${TEAMS.length}`);
  console.log(`Seed files written: ${teamsOk}`);
  console.log(`Formations: ${totalFormations.toLocaleString("en-US")}`);
  console.log(`Plays: ${totalPlays.toLocaleString("en-US")}`);
  console.log(`Play-team cache: ${playTeamCache.size.toLocaleString("en-US")} entries`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length) {
    for (const err of errors.slice(0, 40)) {
      console.log(`  [${err.team}] ${err.context}: ${err.message}`);
    }
    if (errors.length > 40) console.log(`  … and ${errors.length - 40} more`);
  }
  if (seededSlugs.length) {
    console.log("\nSeed slugs:");
    console.log(seededSlugs.join(" "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
