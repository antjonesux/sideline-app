import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import type { PlayArtManifestRecord, PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_MANIFEST_PATH = join(
  __dirname,
  "..",
  "..",
  "lib",
  "generated",
  "play-art-manifest.json",
);

/** Playbooks whose published mappings passed visual QA and may seed trusted-hash reuse.
 * Air Force provisional / `--approve-review` rows are excluded until verified. */
export const TRUSTED_PLAYBOOKS = new Set(["USC"]);

export type TrustedAssetIdentity = {
  gameVersion: string;
  sideOfBall: string;
  playbook: string;
  formation: string;
  playName: string;
  assetId: string;
  assetPath: string;
};

function contextKey(
  gameVersion: string,
  sideOfBall: string,
  formation: string,
  playName: string,
): string {
  return [
    gameVersion.trim().toLowerCase(),
    sideOfBall.trim().toLowerCase(),
    formation.trim().toLowerCase(),
    normalizePlayName(playName),
  ].join("\0");
}

/**
 * Load trusted owned-asset identities from the generated manifest.
 * Air Force V1 mappings are excluded — only explicitly trusted playbooks qualify.
 */
export function loadTrustedAssetIndex(
  manifestPath = GENERATED_MANIFEST_PATH,
): Map<string, TrustedAssetIdentity[]> {
  const byHash = new Map<string, TrustedAssetIdentity[]>();
  if (!existsSync(manifestPath)) {
    return byHash;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };

  for (const entry of manifest.entries) {
    if (!TRUSTED_PLAYBOOKS.has(entry.playbook.trim())) {
      continue;
    }
    const identity: TrustedAssetIdentity = {
      gameVersion: entry.game_version,
      sideOfBall: entry.side_of_ball,
      playbook: entry.playbook,
      formation: entry.formation,
      playName: normalizePlayName(entry.play_name),
      assetId: entry.asset_id,
      assetPath: entry.asset_path,
    };
    const list = byHash.get(entry.asset_id.toLowerCase()) ?? [];
    list.push(identity);
    byHash.set(entry.asset_id.toLowerCase(), list);
  }

  return byHash;
}

/**
 * Resolve a crop hash to a canonical play when an identical trusted asset exists
 * for the same game version + side + formation, and the play is in this formation.
 */
export function resolveTrustedHash(
  assetId: string,
  reference: PlayArtReference,
  formation: string,
  canonicalPlays: string[],
  trustedIndex: Map<string, TrustedAssetIdentity[]>,
): TrustedAssetIdentity | null {
  const candidates = trustedIndex.get(assetId.toLowerCase()) ?? [];
  if (candidates.length === 0) return null;

  const allowed = new Set(canonicalPlays.map((p) => normalizePlayName(p)));
  const version = reference.gameVersion.toLowerCase();
  const side = reference.sideOfBall.toLowerCase();
  const formationKey = formation.trim().toLowerCase();

  for (const candidate of candidates) {
    if (candidate.gameVersion.trim().toLowerCase() !== version) continue;
    if (candidate.sideOfBall.trim().toLowerCase() !== side) continue;
    if (candidate.formation.trim().toLowerCase() !== formationKey) continue;
    if (!allowed.has(candidate.playName)) continue;
    return candidate;
  }

  return null;
}

export function trustedContextKey(
  identity: Pick<TrustedAssetIdentity, "gameVersion" | "sideOfBall" | "formation" | "playName">,
): string {
  return contextKey(
    identity.gameVersion,
    identity.sideOfBall,
    identity.formation,
    identity.playName,
  );
}
