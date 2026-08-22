import manifestJson from "@/lib/generated/play-art-manifest.json";
import { normalizePlayName } from "@/lib/utils";

export type PlayArtManifestEntry = {
  game_version: string;
  side_of_ball: string;
  playbook: string;
  formation: string;
  play_name: string;
  /** SHA-256 of published card bytes when present (ingestion-time identity). */
  asset_id?: string;
  asset_path: string;
};

export type PlayArtManifest = {
  version: number;
  entries: PlayArtManifestEntry[];
};

export type PlayArtLookupInput = {
  gameVersion: string;
  sideOfBall: string;
  playbook: string;
  formation: string;
  playName: string;
};

function manifestLookupKey(input: PlayArtLookupInput): string {
  return [
    input.gameVersion.trim().toLowerCase(),
    input.sideOfBall.trim().toLowerCase(),
    input.playbook.trim(),
    input.formation.trim(),
    normalizePlayName(input.playName),
  ].join("\u0000");
}

const MANIFEST = manifestJson as PlayArtManifest;

const ownedAssetByKey = new Map<string, string>();
for (const entry of MANIFEST.entries) {
  ownedAssetByKey.set(
    manifestLookupKey({
      gameVersion: entry.game_version,
      sideOfBall: entry.side_of_ball,
      playbook: entry.playbook,
      formation: entry.formation,
      playName: entry.play_name,
    }),
    entry.asset_path,
  );
}

/** Resolve a Sideline-owned play-art public path, or `null` when not in the manifest. */
export function resolveOwnedPlayArtPath(input: PlayArtLookupInput): string | null {
  return ownedAssetByKey.get(manifestLookupKey(input)) ?? null;
}

export function playArtManifestEntryCount(): number {
  return MANIFEST.entries.length;
}
