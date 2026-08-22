import { createHash } from "node:crypto";
import { buildContentAddressedPlayArtAssetPath } from "../../lib/playArtUrl";
import type { MappedPlayArt, PlayArtReference } from "./types";

/** SHA-256 hex digest of final play-card image bytes (ingestion-time only). */
export function hashPlayArtBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Assign content-hash asset IDs and shared public paths to mapped cards.
 * Identical final image bytes reuse the same asset_id / asset_path.
 */
export function assignContentHashedAssets(
  reference: PlayArtReference,
  mapped: MappedPlayArt[],
  mediaFiles: Map<string, Buffer>,
): { mapped: MappedPlayArt[]; uniqueAssetCount: number } {
  const seenIds = new Set<string>();
  const next: MappedPlayArt[] = [];

  for (const item of mapped) {
    const buffer = mediaFiles.get(item.mediaPath);
    if (!buffer) {
      throw new Error(`Missing media buffer for ${item.mediaPath}`);
    }
    const assetId = hashPlayArtBytes(buffer);
    const assetPath = buildContentAddressedPlayArtAssetPath({
      gameVersion: reference.gameVersion,
      assetId,
      extension: item.extension,
    });
    if (!assetPath) {
      throw new Error(`Failed to build content-addressed path for asset ${assetId}`);
    }
    seenIds.add(assetId);
    next.push({
      ...item,
      assetId,
      assetPath,
    });
  }

  return { mapped: next, uniqueAssetCount: seenIds.size };
}
