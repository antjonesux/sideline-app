import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import type { TeamPlaybookSeed } from "../../lib/seed/types";
import type { PlayArtReference } from "./types";
import { defaultReferencePath, referencesDir } from "./reference";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function referenceFromSeed(seed: TeamPlaybookSeed): PlayArtReference {
  const sideOfBall = seed.sideOfBall ?? "offense";
  return {
    gameVersion: (seed.gameVersion ?? "cfb26") as PlayArtReference["gameVersion"],
    sideOfBall,
    playbook: seed.team.trim(),
    formations: seed.formations.map((formation) => ({
      name: formation.formation.trim(),
      plays: formation.plays.map((play) => normalizePlayName(play.playName)),
    })),
  };
}

export async function importSeedModule(seedSlug: string): Promise<TeamPlaybookSeed> {
  const filePath = join(__dirname, "..", "..", "lib", "seed", "playbooks", `${seedSlug}.ts`);
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
  const slug = `${ref.gameVersion}-${ref.sideOfBall}-${ref.playbook.trim().toLowerCase().replace(/\s+/g, "-")}`;
  const target = outPath ?? defaultReferencePath(slug);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(ref, null, 2)}\n`, "utf8");
  return target;
}

export function ensureReferencesDir(): string {
  return referencesDir();
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let seedSlug = "";
  let outPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--seed" && argv[i + 1]) {
      seedSlug = argv[i + 1];
      i += 1;
    } else if (arg === "--out" && argv[i + 1]) {
      outPath = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Build canonical play-art reference JSON from a playbook seed module.

Usage (from sideline/):
  npm run play-art:reference -- --seed cfb27-usc
  npm run play-art:reference -- --seed cfb27-usc --out scripts/play-art/references/custom.json
`);
      process.exit(0);
    }
  }

  if (!seedSlug) {
    console.error("Missing --seed <slug> (e.g. cfb27-usc)");
    process.exit(1);
  }

  const seed = await importSeedModule(seedSlug);
  const ref = referenceFromSeed(seed);
  const written = writeReferenceFile(ref, outPath);
  console.log(`Wrote reference: ${written}`);
  console.log(`  ${ref.formations.length} formations, ${ref.formations.reduce((s, f) => s + f.plays.length, 0)} plays`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
