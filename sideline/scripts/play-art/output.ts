import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MappedPlayArt, PlayArtManifestRecord, PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_PLAY_ART_ROOT = join(__dirname, "..", "..", "public", "play-art");
const GENERATED_MANIFEST_PATH = join(__dirname, "..", "..", "lib", "generated", "play-art-manifest.json");

export function publicPlayArtRoot(): string {
  return PUBLIC_PLAY_ART_ROOT;
}

export function generatedManifestPath(): string {
  return GENERATED_MANIFEST_PATH;
}

export function writePlayArtAssets(
  reference: PlayArtReference,
  mapped: MappedPlayArt[],
  mediaFiles: Map<string, Buffer>,
): number {
  let written = 0;
  for (const item of mapped) {
    const buffer = mediaFiles.get(item.mediaPath);
    if (!buffer) {
      throw new Error(`Missing media buffer for ${item.mediaPath}`);
    }
    const relative = item.assetPath.replace(/^\//, "");
    const absolute = join(__dirname, "..", "..", "public", relative);
    const dir = dirname(absolute);
    mkdirSync(dir, { recursive: true });
    writeFileSync(absolute, buffer);
    written += 1;
  }
  return written;
}

export function manifestRecordsFromMapped(
  reference: PlayArtReference,
  mapped: MappedPlayArt[],
): PlayArtManifestRecord[] {
  return mapped.map((item) => ({
    game_version: reference.gameVersion,
    side_of_ball: reference.sideOfBall,
    playbook: reference.playbook,
    formation: item.formation,
    play_name: item.playName,
    asset_id: item.assetId,
    asset_path: item.assetPath,
  }));
}

type ExistingManifest = {
  version: number;
  entries: PlayArtManifestRecord[];
};

export function mergeManifestForPlaybook(
  reference: PlayArtReference,
  newRecords: PlayArtManifestRecord[],
): ExistingManifest {
  let existing: ExistingManifest = { version: 1, entries: [] };
  if (existsSync(GENERATED_MANIFEST_PATH)) {
    existing = JSON.parse(readFileSync(GENERATED_MANIFEST_PATH, "utf8")) as ExistingManifest;
  }

  const playbookKey = reference.playbook.trim();
  const versionKey = reference.gameVersion.trim().toLowerCase();
  const sideKey = reference.sideOfBall.trim().toLowerCase();

  const retained = existing.entries.filter(
    (entry) =>
      !(
        entry.playbook.trim() === playbookKey &&
        entry.game_version.trim().toLowerCase() === versionKey &&
        entry.side_of_ball.trim().toLowerCase() === sideKey
      ),
  );

  return {
    version: 1,
    entries: [...retained, ...newRecords],
  };
}

export function writePlayArtManifest(manifest: ExistingManifest): string {
  mkdirSync(dirname(GENERATED_MANIFEST_PATH), { recursive: true });
  writeFileSync(GENERATED_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return GENERATED_MANIFEST_PATH;
}

export function writeValidationReport(
  report: unknown,
  outDir: string,
  slug: string,
): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${slug}-validation.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path;
}
