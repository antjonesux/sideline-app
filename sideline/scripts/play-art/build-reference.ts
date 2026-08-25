import { existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayNameBase } from "../../lib/utils";
import type { TeamPlaybookSeed } from "../../lib/seed/types";
import type { PlayArtReference } from "./types";
import { defaultReferencePath, referencesDir } from "./reference";
import {
  displayNameToTeamSlug,
  docxPathToSeedSlug,
  parseGameFlag,
  seedSlugToReferencePath,
  teamSlugToSeedSlug,
} from "./lib/slug-utils";
import {
  loadPlaybookCatalog,
  loadSourceAliases,
  resolveSourceDocx,
  SOURCE_ROOT,
} from "./source-discovery";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PLAYBOOKS_DIR = join(__dirname, "..", "..", "lib", "seed", "playbooks");

export function referenceFromSeed(seed: TeamPlaybookSeed): PlayArtReference {
  const sideOfBall = seed.sideOfBall ?? "offense";
  return {
    gameVersion: (seed.gameVersion ?? "cfb26") as PlayArtReference["gameVersion"],
    sideOfBall,
    playbook: seed.team.trim(),
    formations: seed.formations.map((formation) => ({
      name: formation.formation.trim(),
      // Preserve spaced hole numbers (`0 1 TRAP`) for cfb.fan URL slug fidelity.
      // Identity matching still runs normalizePlayName (digit collapse) downstream.
      plays: formation.plays.map((play) => normalizePlayNameBase(play.playName)),
    })),
  };
}

export async function importSeedModule(seedSlug: string): Promise<TeamPlaybookSeed> {
  const filePath = join(SEED_PLAYBOOKS_DIR, `${seedSlug}.ts`);
  if (!existsSync(filePath)) {
    throw new Error(
      `Seed module not found: lib/seed/playbooks/${seedSlug}.ts\n` +
        `If this is a valid team or scheme, the slug may need a mapping exception ` +
        `(see scripts/play-art/source-aliases.json) or the seed file may be missing.`,
    );
  }
  const href = new URL(`file://${filePath}`).href;
  const mod = (await import(href)) as Record<string, unknown>;
  for (const value of Object.values(mod)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "team" in value &&
      "formations" in value &&
      "scheme" in value &&
      "source" in value
    ) {
      return value as TeamPlaybookSeed;
    }
  }
  throw new Error(`No TeamPlaybookSeed export in lib/seed/playbooks/${seedSlug}.ts`);
}

export function writeReferenceFile(ref: PlayArtReference, outPath?: string): string {
  const slug = `${ref.gameVersion}-${ref.sideOfBall}-${displayNameToTeamSlug(ref.playbook)}`;
  const target = outPath ?? defaultReferencePath(slug);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(ref, null, 2)}\n`, "utf8");
  return target;
}

export function ensureReferencesDir(): string {
  return referencesDir();
}

/** Build reference JSON from a seed module slug. Importable by ingest auto-build. */
export async function buildReferenceFromSeedSlug(
  seedSlug: string,
  outPath?: string,
): Promise<{ path: string; reference: PlayArtReference }> {
  const seed = await importSeedModule(seedSlug);
  const reference = referenceFromSeed(seed);
  // Prefer seed-slug path so ampersand display names (`Run & Shoot`) land on
  // `cfb27-offense-run-and-shoot.json`, matching seedSlugToReferencePath.
  const target =
    outPath ?? seedSlugToReferencePath(seedSlug, referencesDir());
  const path = writeReferenceFile(reference, target);
  return { path, reference };
}

function readFlag(argv: string[], name: string): string | undefined {
  const eqPrefix = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1] && !argv[i + 1].startsWith("-")) {
      return argv[i + 1];
    }
    if (arg.startsWith(eqPrefix)) {
      return arg.slice(eqPrefix.length);
    }
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function suggestNearbyDocx(sourcePath: string): string | null {
  const dir = dirname(sourcePath);
  if (!existsSync(dir)) return null;
  const wanted = basename(sourcePath).toLowerCase();
  const stem = wanted.replace(/\.docx?$/i, "");
  try {
    const candidates = readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".docx"));
    const hit = candidates.find(
      (name) =>
        name.toLowerCase() === `${stem}.docx` ||
        name.toLowerCase().replace(/\.docx$/i, "") === stem,
    );
    return hit ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve seed slug from CLI flags.
 * Priority: --seed > --source (catalog/alias/slug) > --team
 */
export function resolveSeedSlugFromArgs(argv: string[]): {
  seedSlug: string;
  game: string;
  sourcePath?: string;
} {
  const game = parseGameFlag(readFlag(argv, "--game"));
  const seedFlag = readFlag(argv, "--seed");
  const sourcePath = readFlag(argv, "--source") ?? readFlag(argv, "--docx");
  const teamFlag = readFlag(argv, "--team");

  if (seedFlag?.trim()) {
    return { seedSlug: seedFlag.trim(), game, sourcePath };
  }

  if (sourcePath?.trim()) {
    const resolved = sourcePath.trim();
    if (!existsSync(resolved)) {
      const suggestion = suggestNearbyDocx(resolved);
      let message = `Error: DOCX not found: ${resolved}`;
      if (suggestion) {
        message += `\nDid you mean: ${suggestion}?`;
      }
      throw new Error(message);
    }

    const catalog = loadPlaybookCatalog();
    const aliases = loadSourceAliases();
    const discovery = resolveSourceDocx(resolved, catalog, aliases, SOURCE_ROOT);
    if (
      (discovery.status === "MATCH" || discovery.status === "ALIAS") &&
      discovery.resolvedSeed
    ) {
      return { seedSlug: discovery.resolvedSeed, game, sourcePath: resolved };
    }
    if (discovery.status === "AMBIGUOUS") {
      throw new Error(
        `Ambiguous source '${basename(resolved)}'. Candidates: ${(discovery.candidates ?? []).join(", ")}. ` +
          `Pass --seed=<slug> explicitly.`,
      );
    }
    return { seedSlug: docxPathToSeedSlug(resolved, game), game, sourcePath: resolved };
  }

  if (teamFlag?.trim()) {
    return { seedSlug: teamSlugToSeedSlug(teamFlag.trim(), game), game };
  }

  throw new Error(
    "Error: Must provide either --source=<docx> or --seed=<slug> (or --team=<slug>).",
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Build canonical play-art reference JSON from a playbook seed module.

Usage (from sideline/):
  npm run play-art:reference -- --source="scripts/play-art/source/Multiple & Pro Style/California.docx"
  npm run play-art:reference -- --seed=cfb27-usc
  npm run play-art:reference -- --team=california
  npm run play-art:reference -- --seed=cfb27-usc --out scripts/play-art/references/custom.json

Flags:
  --source=<docx>   Derive seed from DOCX filename (aliases via source-aliases.json)
  --seed=<slug>     Seed module slug (backward compatible)
  --team=<slug>     Team/scheme slug → {game}-{team}
  --game=cfb27      Game version prefix (default: cfb27)
  --out=<path>      Optional explicit output path
`);
    process.exit(0);
  }

  let resolved: ReturnType<typeof resolveSeedSlugFromArgs>;
  try {
    resolved = resolveSeedSlugFromArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const outPath = readFlag(argv, "--out");

  try {
    const { path, reference } = await buildReferenceFromSeedSlug(resolved.seedSlug, outPath);
    console.log(`Seed: ${resolved.seedSlug}`);
    console.log(`Wrote reference: ${path}`);
    console.log(
      `  ${reference.formations.length} formations, ` +
        `${reference.formations.reduce((s, f) => s + f.plays.length, 0)} plays`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to build reference for ${resolved.seedSlug}.`);
    console.error(`Underlying error: ${message}`);
    console.error("Possible causes:");
    console.error(
      `  - Team slug derived from filename not recognized (may need source-aliases.json)`,
    );
    console.error("  - Missing seed module under lib/seed/playbooks/");
    console.error("  - Seed module export shape invalid");
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
