import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlayArtUrl } from "../../lib/playArtUrl";
import type { PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_ROOT = join(__dirname, ".reference-cache");

export type ReferenceImageRequest = {
  formation: string;
  formationType: string;
  playName: string;
};

export type ReferenceImageResult = {
  playName: string;
  url: string;
  cachePath: string;
  buffer: Buffer;
};

export type ReferenceImageFailure = {
  formation: string;
  playName: string;
  url: string;
  reason: string;
};

export type ReferenceDownloadStats = {
  succeeded: number;
  failed: number;
  failuresByFormation: Map<string, ReferenceImageFailure[]>;
  formationsWithAllFailed: string[];
};

export function createReferenceDownloadStats(): ReferenceDownloadStats {
  return {
    succeeded: 0,
    failed: 0,
    failuresByFormation: new Map(),
    formationsWithAllFailed: [],
  };
}

export function recordReferenceDownloadSuccess(stats: ReferenceDownloadStats): void {
  stats.succeeded += 1;
}

export function recordReferenceDownloadFailure(
  stats: ReferenceDownloadStats,
  failure: ReferenceImageFailure,
): void {
  stats.failed += 1;
  const list = stats.failuresByFormation.get(failure.formation) ?? [];
  list.push(failure);
  stats.failuresByFormation.set(failure.formation, list);
}

export function logReferenceDownloadSummary(stats: ReferenceDownloadStats): void {
  console.log(
    `Reference downloads: ${stats.succeeded} succeeded, ${stats.failed} failed`,
  );
  if (stats.failed === 0) return;

  console.log("Failed by formation:");
  for (const [formation, failures] of stats.failuresByFormation) {
    const plays = failures.map((f) => {
      const file = f.url ? f.url.split("/").pop() : "(no url)";
      return file || f.playName;
    });
    console.log(`  - ${formation}: ${failures.length} failure(s) (${plays.join(", ")})`);
  }
  console.log(
    `Formations with all references failed: ${stats.formationsWithAllFailed.length}`,
  );
  for (const formation of stats.formationsWithAllFailed) {
    console.log(`  - ${formation}`);
  }
}

function cacheKeyForUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function cachePathForReference(reference: PlayArtReference, url: string): string {
  const version = reference.gameVersion.toLowerCase();
  const side = reference.sideOfBall.toLowerCase();
  const hash = cacheKeyForUrl(url);
  return join(CACHE_ROOT, version, side, `${hash}.jpg`);
}

export function buildReferencePlayArtUrl(
  reference: PlayArtReference,
  formation: string,
  formationType: string,
  playName: string,
): string | null {
  return buildPlayArtUrl({
    formation,
    formationType,
    playName,
    gameVersion: reference.gameVersion,
    side: reference.sideOfBall,
  });
}

async function downloadReferenceImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Resolve a cfb.fan reference image for matching.
 * Cached under scripts/play-art/.reference-cache/ (never published as owned art).
 */
export async function fetchReferenceImage(
  reference: PlayArtReference,
  request: ReferenceImageRequest,
): Promise<ReferenceImageResult> {
  const url = buildReferencePlayArtUrl(
    reference,
    request.formation,
    request.formationType,
    request.playName,
  );
  if (!url) {
    throw new Error(
      `Could not build cfb.fan URL for "${request.formation}" / "${request.playName}"`,
    );
  }

  const cachePath = cachePathForReference(reference, url);
  if (existsSync(cachePath)) {
    return {
      playName: request.playName,
      url,
      cachePath,
      buffer: readFileSync(cachePath),
    };
  }

  const buffer = await downloadReferenceImage(url);
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, buffer);
  return { playName: request.playName, url, cachePath, buffer };
}

export async function fetchReferenceImagesForFormation(
  reference: PlayArtReference,
  formation: string,
  formationType: string,
  playNames: string[],
  stats?: ReferenceDownloadStats,
): Promise<{ images: ReferenceImageResult[]; failures: ReferenceImageFailure[] }> {
  const images: ReferenceImageResult[] = [];
  const failures: ReferenceImageFailure[] = [];

  for (const playName of playNames) {
    const url = buildReferencePlayArtUrl(reference, formation, formationType, playName);
    if (!url) {
      const failure: ReferenceImageFailure = {
        formation,
        playName,
        url: "",
        reason: "Could not build cfb.fan URL",
      };
      failures.push(failure);
      console.warn(
        `[WARN] Reference download failed: ${formation}/${playName} — (no url) — ${failure.reason}`,
      );
      if (stats) recordReferenceDownloadFailure(stats, failure);
      continue;
    }

    try {
      const image = await fetchReferenceImage(reference, {
        formation,
        formationType,
        playName,
      });
      images.push(image);
      if (stats) recordReferenceDownloadSuccess(stats);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      const failure: ReferenceImageFailure = { formation, playName, url, reason };
      failures.push(failure);
      console.warn(
        `[WARN] Reference download failed: ${formation}/${playName} — ${url} — ${reason}`,
      );
      if (stats) recordReferenceDownloadFailure(stats, failure);
    }
  }

  if (stats && playNames.length > 0 && images.length === 0) {
    stats.formationsWithAllFailed.push(formation);
  }

  return { images, failures };
}

export function referenceCacheRoot(): string {
  return CACHE_ROOT;
}
