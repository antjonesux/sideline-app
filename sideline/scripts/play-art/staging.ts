import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slugifyPlaybookName } from "../../lib/playArtUrl";
import type { MappedPlayArt, PlayArtManifestRecord, PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STAGING_ROOT = join(__dirname, ".staging");
const PUBLIC_ROOT = join(__dirname, "..", "..", "public");
const GENERATED_MANIFEST_PATH = join(__dirname, "..", "..", "lib", "generated", "play-art-manifest.json");

export function stagingRoot(): string {
  return STAGING_ROOT;
}

export function stagingDirForSlug(slug: string): string {
  return join(STAGING_ROOT, slug);
}

export function clearStaging(slug: string): void {
  const dir = stagingDirForSlug(slug);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Write unique content-addressed assets into staging.
 * Duplicate hashes within the playbook are written once.
 */
export function writeMappedAssetsToStaging(
  slug: string,
  mapped: MappedPlayArt[],
  mediaFiles: Map<string, Buffer>,
): { written: number; uniqueAssetCount: number } {
  clearStaging(slug);
  const stagingAssetsRoot = join(stagingDirForSlug(slug), "assets");
  const writtenIds = new Set<string>();
  let written = 0;

  for (const item of mapped) {
    if (!item.assetId || !item.assetPath) {
      throw new Error(
        `Mapped play "${item.formation}" / "${item.playName}" is missing content-hash asset identity`,
      );
    }
    if (writtenIds.has(item.assetId)) {
      continue;
    }
    const buffer = mediaFiles.get(item.mediaPath);
    if (!buffer) {
      throw new Error(`Missing media buffer for ${item.mediaPath}`);
    }
    const relative = item.assetPath.replace(/^\//, "");
    const absolute = join(stagingAssetsRoot, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, buffer);
    writtenIds.add(item.assetId);
    written += 1;
  }

  return { written, uniqueAssetCount: writtenIds.size };
}

type ManifestFile = {
  version: number;
  entries: PlayArtManifestRecord[];
};

export function writeManifestToStaging(
  slug: string,
  manifest: ManifestFile,
): string {
  const path = join(stagingDirForSlug(slug), "play-art-manifest.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return path;
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

function removeLegacyPlaybookAssetTree(reference: PlayArtReference): string | null {
  const playbookRoot = join(
    PUBLIC_ROOT,
    "play-art",
    reference.gameVersion.toLowerCase(),
    reference.sideOfBall.toLowerCase(),
    slugifyPlaybookName(reference.playbook),
  );
  if (!existsSync(playbookRoot)) {
    return null;
  }
  rmSync(playbookRoot, { recursive: true, force: true });
  return playbookRoot;
}

/** Copy staged content-addressed assets into public/ and update generated manifest. */
export function publishStaging(
  slug: string,
  reference: PlayArtReference,
  manifest: ManifestFile,
): {
  assetCount: number;
  uniqueAssetCount: number;
  manifestPath: string;
  publicRoot: string;
  removedLegacyRoot: string | null;
} {
  const stagingAssetsRoot = join(stagingDirForSlug(slug), "assets");
  if (!existsSync(stagingAssetsRoot)) {
    throw new Error(`Staging assets missing for ${slug}`);
  }

  const stagedPlayArt = join(stagingAssetsRoot, "play-art");
  if (!existsSync(stagedPlayArt)) {
    throw new Error(`Staging play-art tree missing for ${slug}`);
  }

  // Merge into public/play-art (shared assets/ dir is additive; do not wipe other hashes).
  copyDirRecursive(stagedPlayArt, join(PUBLIC_ROOT, "play-art"));

  const removedLegacyRoot = removeLegacyPlaybookAssetTree(reference);

  mkdirSync(dirname(GENERATED_MANIFEST_PATH), { recursive: true });
  writeFileSync(GENERATED_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const uniqueAssetCount = countFilesRecursive(stagingAssetsRoot);
  clearStaging(slug);

  return {
    assetCount: uniqueAssetCount,
    uniqueAssetCount,
    manifestPath: GENERATED_MANIFEST_PATH,
    publicRoot: join(PUBLIC_ROOT, "play-art"),
    removedLegacyRoot,
  };
}

function countFilesRecursive(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) count += countFilesRecursive(path);
    else count += 1;
  }
  return count;
}

export function generatedManifestPath(): string {
  return GENERATED_MANIFEST_PATH;
}
