/**
 * Compare lib/seed/playbooks/{slug}.ts to rows in cfb26_plays (diagnostic only; no writes).
 *
 * Usage:
 *   npm run verify:playbook -- tcu
 *   npm run verify:playbook -- tcu usc
 *   npm run verify:playbook -- --all
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { TeamPlaybookSeed } from "../lib/seed/types";
import { requireServiceSupabase } from "./_seedEnv";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const raw = process.argv.slice(2);
  let all = false;
  const slugs: string[] = [];
  for (const a of raw) {
    if (a === "--all") all = true;
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else slugs.push(a.toLowerCase().trim());
  }
  return { all, slugs };
}

function extractTeamSeed(mod: Record<string, unknown>): TeamPlaybookSeed {
  for (const v of Object.values(mod)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      "team" in v &&
      "formations" in v &&
      "scheme" in v &&
      "source" in v
    ) {
      return v as TeamPlaybookSeed;
    }
  }
  throw new Error("No TeamPlaybookSeed export found.");
}

async function importSeed(slug: string): Promise<TeamPlaybookSeed> {
  const filePath = join(__dirname, "..", "lib", "seed", "playbooks", `${slug}.ts`);
  const href = pathToFileURL(filePath).href;
  const mod = (await import(href)) as Record<string, unknown>;
  return extractTeamSeed(mod);
}

function listAllSlugs(): string[] {
  const dir = join(__dirname, "..", "lib", "seed", "playbooks");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_"))
    .map((f) => f.replace(/\.ts$/, ""));
}

type SeedPlayKey = string;

function seedPlayMap(seed: TeamPlaybookSeed): Map<SeedPlayKey, { isNewIn26: boolean }> {
  const m = new Map<SeedPlayKey, { isNewIn26: boolean }>();
  for (const f of seed.formations) {
    const formation = f.formation.trim();
    for (const p of f.plays) {
      const k = `${formation}\u0000${p.playName.trim()}`;
      m.set(k, { isNewIn26: Boolean(p.isNewIn26) });
    }
  }
  return m;
}

async function verifySlug(supabase: SupabaseClient, slug: string) {
  console.log(`\n── ${slug} ──`);
  const seed = await importSeed(slug);
  const playbook = seed.team.trim();
  const seedMap = seedPlayMap(seed);
  const seedFormationCount = new Set(seed.formations.map((f) => f.formation.trim())).size;
  const seedPlayCount = seedMap.size;

  const { data: dbRows, error } = await supabase
    .from("cfb26_plays")
    .select("formation, play_name, is_new_in_26")
    .eq("playbook", playbook);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  const dbList = dbRows ?? [];
  const dbFormationCount = new Set(dbList.map((r) => r.formation.trim())).size;
  const dbKeys = new Map<SeedPlayKey, boolean>();
  for (const r of dbList) {
    dbKeys.set(`${r.formation.trim()}\u0000${r.play_name.trim()}`, Boolean(r.is_new_in_26));
  }

  const fmt = (n: number) => n.toLocaleString("en-US");
  const formationMatch = dbFormationCount === seedFormationCount;
  const playCountMatch = dbKeys.size === seedPlayCount;

  console.log(
    `  Formations — seed: ${fmt(seedFormationCount)}, db: ${fmt(dbFormationCount)} ${formationMatch ? "[match]" : "[diff]"}`,
  );
  console.log(
    `  Plays — seed: ${fmt(seedPlayCount)}, db: ${fmt(dbKeys.size)} ${playCountMatch ? "[match]" : "[diff]"}`,
  );

  const missingInDb: string[] = [];
  for (const k of seedMap.keys()) {
    if (!dbKeys.has(k)) missingInDb.push(k.replace("\u0000", " / "));
  }

  const extraInDb: string[] = [];
  for (const k of dbKeys.keys()) {
    if (!seedMap.has(k)) extraInDb.push(k.replace("\u0000", " / "));
  }

  if (missingInDb.length) {
    console.log(`  Missing from DB (${fmt(missingInDb.length)}):`);
    for (const line of missingInDb.slice(0, 25)) console.log(`     - ${line}`);
    if (missingInDb.length > 25) console.log(`     … and ${fmt(missingInDb.length - 25)} more`);
  }

  if (extraInDb.length) {
    console.log(`  Extra in DB (${fmt(extraInDb.length)}):`);
    for (const line of extraInDb.slice(0, 25)) console.log(`     - ${line}`);
    if (extraInDb.length > 25) console.log(`     … and ${fmt(extraInDb.length - 25)} more`);
  }

  let flagMismatch = 0;
  for (const [k, seedMeta] of seedMap) {
    if (!dbKeys.has(k)) continue;
    const dbFlag = dbKeys.get(k);
    if (dbFlag !== seedMeta.isNewIn26) flagMismatch += 1;
  }
  if (flagMismatch === 0) {
    console.log("  is_new_in_26 flags: [match] for overlapping plays");
  } else {
    console.log(`  is_new_in_26 flags: [diff] ${fmt(flagMismatch)} play(s) vs seed`);
  }
}

async function main() {
  const { all, slugs: argSlugs } = parseArgs();
  let slugs = argSlugs;
  if (all) {
    slugs = listAllSlugs();
    if (slugs.length === 0) {
      console.log("No team seed files to verify.");
      return;
    }
  } else if (slugs.length === 0) {
    console.error("Usage: npm run verify:playbook -- <slug> [slug...] | --all");
    process.exit(1);
  }

  const { url, key } = requireServiceSupabase();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const slug of slugs) {
    try {
      await verifySlug(supabase, slug);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
