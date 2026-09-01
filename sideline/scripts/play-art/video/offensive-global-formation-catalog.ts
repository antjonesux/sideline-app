/**
 * Union offensive formation → play lists across all CFB27 offensive seeds.
 * Used for formation-aware global source recovery (not identity by OCR formation).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  OFFENSIVE_REUSE_GAME_VERSION,
  OFFENSIVE_REUSE_SIDE,
  listOffensivePlaybookSlugs,
} from "./offensive-art-reuse";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");

function resolveSeedSlug(playArtRoot: string, playbookSlug: string): string {
  const reportPath = join(
    playArtRoot,
    "video-staging",
    OFFENSIVE_REUSE_GAME_VERSION,
    OFFENSIVE_REUSE_SIDE,
    playbookSlug,
    "report.json",
  );
  if (existsSync(reportPath)) {
    const raw = JSON.parse(readFileSync(reportPath, "utf8")) as { seedSlug?: string };
    if (raw.seedSlug) return raw.seedSlug;
  }
  return `cfb27-${playbookSlug}`;
}

export async function buildGlobalOffensiveFormationCatalog(
  playArtRoot = PLAY_ART_ROOT,
): Promise<Map<string, string[]>> {
  const catalog = new Map<string, Set<string>>();
  const slugs = listOffensivePlaybookSlugs(playArtRoot);

  for (const slug of slugs) {
    try {
      const seedSlug = resolveSeedSlug(playArtRoot, slug);
      const seed = await importSeedModule(seedSlug);
      const ref = referenceFromSeed(seed);
      for (const formation of ref.formations) {
        const plays = catalog.get(formation.name) ?? new Set<string>();
        for (const play of formation.plays) plays.add(play);
        catalog.set(formation.name, plays);
      }
    } catch {
      // Skip books without importable seeds.
    }
  }

  const out = new Map<string, string[]>();
  for (const [formation, plays] of catalog) {
    out.set(formation, [...plays].sort((a, b) => a.localeCompare(b)));
  }
  return out;
}
