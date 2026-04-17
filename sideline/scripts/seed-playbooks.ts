/**
 * Seed cfb26_plays from /lib/seed/playbooks/{slug}.ts
 *
 * Usage:
 *   npm run seed:playbook -- tcu
 *   npm run seed:playbook -- tcu usc texas
 *   npm run seed:playbook -- --all
 *   npm run seed:playbook -- tcu --dry-run
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizePlayName } from "../lib/utils";
import { ALL_SCHEMES, getSchemeForTeam } from "../lib/playbooks/scheme-classifications";
import { resolveSeedPlayType } from "../lib/seed/playTypeClassifier";
import type { TeamPlaybookSeed } from "../lib/seed/types";
import { requireServiceSupabase } from "./_seedEnv";

const __dirname = dirname(fileURLToPath(import.meta.url));

const UNIQUE_CONSTRAINT_SQL = `ALTER TABLE cfb26_plays
ADD CONSTRAINT cfb26_plays_unique_play
UNIQUE (playbook, formation, play_name);`;

const PROBE_PLAYBOOK = "__sideline_seed_probe__";

function parseArgs() {
  const raw = process.argv.slice(2);
  let dryRun = false;
  let all = false;
  const slugs: string[] = [];
  for (const a of raw) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--all") all = true;
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else slugs.push(a.toLowerCase().trim());
  }
  return { dryRun, all, slugs };
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
  throw new Error("No TeamPlaybookSeed export found (object with team, scheme, source, formations).");
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

function validateSeed(seed: TeamPlaybookSeed, slug: string): string[] {
  const errors: string[] = [];
  const classified = getSchemeForTeam(seed.team);
  if (classified == null) {
    errors.push(`Team "${seed.team}" is not in TEAM_SCHEMES (check spelling vs scheme-classifications).`);
  } else if (classified !== seed.scheme.trim()) {
    errors.push(
      `Scheme mismatch: seed has "${seed.scheme}" but TEAM_SCHEMES["${seed.team}"] is "${classified}".`,
    );
  }
  if (!(ALL_SCHEMES as readonly string[]).includes(seed.scheme.trim())) {
    errors.push(`Scheme "${seed.scheme}" is not one of ALL_SCHEMES.`);
  }
  if (!seed.formations?.length) {
    errors.push("At least one formation is required.");
  }

  const formationNames = new Set<string>();
  for (const f of seed.formations) {
    const fn = (f.formation ?? "").trim();
    if (!fn) {
      errors.push("Formation with empty name.");
      continue;
    }
    const fk = fn.toLowerCase();
    if (formationNames.has(fk)) {
      errors.push(`Duplicate formation name: "${fn}".`);
    }
    formationNames.add(fk);

    if (!f.plays?.length) {
      errors.push(`Formation "${fn}" has no plays.`);
      continue;
    }
    const playNames = new Set<string>();
    for (const p of f.plays) {
      const pn = (p.playName ?? "").trim();
      if (!pn) {
        errors.push(`Empty play name in formation "${fn}".`);
        continue;
      }
      const pk = normalizePlayName(pn);
      if (playNames.has(pk)) {
        errors.push(`Duplicate play "${pn}" in formation "${fn}".`);
      }
      playNames.add(pk);
    }
  }

  if (errors.length && slug === "_template") {
    return ["_template.ts is a reference file — add real team seed files for Phase 3."];
  }

  return errors;
}

function flattenSeedToRows(seed: TeamPlaybookSeed) {
  const playbook = seed.team.trim();
  const rows: {
    playbook: string;
    formation: string;
    formation_type: string;
    play_name: string;
    play_type: string;
    is_new_in_26: boolean;
  }[] = [];

  for (const f of seed.formations) {
    const formation = f.formation.trim();
    const formationType = f.formationType.trim();
    for (const p of f.plays) {
      rows.push({
        playbook,
        formation,
        formation_type: formationType,
        play_name: normalizePlayName(p.playName.trim()),
        play_type: resolveSeedPlayType({
          team: playbook,
          playName: normalizePlayName(p.playName.trim()),
          explicitPlayType: p.playType,
        }),
        is_new_in_26: Boolean(p.isNewIn26),
      });
    }
  }
  return rows;
}

async function assertCfb26UpsertSupported(supabase: SupabaseClient, dryRun: boolean) {
  if (dryRun) return;

  const probeRow = {
    playbook: PROBE_PLAYBOOK,
    formation: "_",
    play_name: "_",
    formation_type: "Gun",
    play_type: "Inside Run",
    is_new_in_26: false,
  };

  const { error } = await supabase.from("cfb26_plays").upsert([probeRow], {
    onConflict: "playbook,formation,play_name",
  });

  await supabase.from("cfb26_plays").delete().eq("playbook", PROBE_PLAYBOOK);

  if (
    error &&
    (/no unique constraint/i.test(error.message) ||
      /ON CONFLICT/i.test(error.message) ||
      /unique or exclusion constraint/i.test(error.message))
  ) {
    console.error(
      "cfb26_plays is missing a unique constraint on (playbook, formation, play_name).\n" +
        "Run this in the Supabase SQL editor (after removing any duplicate rows):\n\n" +
        UNIQUE_CONSTRAINT_SQL +
        "\n",
    );
    process.exit(1);
  }

  if (error) {
    console.error("Unexpected error testing upsert:", error.message);
    process.exit(1);
  }
}

async function main() {
  const { dryRun, all, slugs: argSlugs } = parseArgs();
  let slugs = argSlugs;
  if (all) {
    slugs = listAllSlugs();
    if (slugs.length === 0) {
      console.log("No team seed files in lib/seed/playbooks/ (Phase 3 adds them).");
      return;
    }
  } else if (slugs.length === 0) {
    console.error("Usage: npm run seed:playbook -- <slug> [slug...] | --all [--dry-run]");
    process.exit(1);
  }

  const { url, key } = requireServiceSupabase();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  await assertCfb26UpsertSupported(supabase, dryRun);

  for (const slug of slugs) {
    console.log(`\n── ${slug} ──`);
    let seed: TeamPlaybookSeed;
    try {
      seed = await importSeed(slug);
    } catch (e) {
      console.error(`Failed to load seed module: ${(e as Error).message}`);
      process.exit(1);
    }

    const validationErrors = validateSeed(seed, slug);
    if (validationErrors.length) {
      for (const err of validationErrors) console.error(`  - ${err}`);
      process.exit(1);
    }

    const rows = flattenSeedToRows(seed);
    const playbook = seed.team.trim();

    const { data: existingRows, error: exErr } = await supabase
      .from("cfb26_plays")
      .select("formation, play_name")
      .eq("playbook", playbook);

    if (exErr && !dryRun) {
      console.error("Could not read existing plays:", exErr.message);
      process.exit(1);
    }

    const existingKeys = new Set(
      (existingRows ?? []).map((r) => `${r.formation}\u0000${r.play_name}`),
    );
    let newCount = 0;
    let updateCount = 0;
    for (const r of rows) {
      const k = `${r.formation}\u0000${r.play_name}`;
      if (existingKeys.has(k)) updateCount += 1;
      else newCount += 1;
    }

    const newIn26 = rows.filter((r) => r.is_new_in_26).length;
    console.log(
      `  Formations: ${seed.formations.length.toLocaleString("en-US")} | Plays: ${rows.length.toLocaleString("en-US")} (new: ${newCount.toLocaleString("en-US")}, updated: ${updateCount.toLocaleString("en-US")}) | is_new_in_26: ${newIn26.toLocaleString("en-US")}`,
    );

    if (dryRun) {
      console.log("  (dry-run — no database writes)");
      continue;
    }

    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error: upErr } = await supabase.from("cfb26_plays").upsert(slice, {
        onConflict: "playbook,formation,play_name",
      });
      if (upErr) {
        console.error("Upsert failed:", upErr.message);
        if (/unique|ON CONFLICT/i.test(upErr.message)) {
          console.error("\nIf the unique constraint is missing:\n" + UNIQUE_CONSTRAINT_SQL);
        }
        process.exit(1);
      }
    }
    console.log("  Done.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
