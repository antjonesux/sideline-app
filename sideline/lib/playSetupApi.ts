import {
  parseCatalogSideOfBall,
  type CatalogGameVersion,
  type CatalogSideOfBall,
} from "@/lib/constants";
import {
  COULDNT_FINISH_THAT,
  PLAY_SETUP_BAD_IMAGE,
  PLAY_SETUP_NOTES_TOO_LONG,
  PLAY_SETUP_TITLE_REQUIRED,
  PLAY_SETUP_TITLE_TOO_LONG,
} from "@/lib/coachCopy";
import {
  PLAY_SETUP_IMAGES_BUCKET,
  PLAY_SETUP_NOTES_MAX,
  PLAY_SETUP_SIGNED_URL_SECONDS,
  PLAY_SETUP_TITLE_MAX,
  buildPlaySetupKey,
} from "@/lib/playSetupKey";
import type { PlayIdentity, PlaySetup } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAY_SETUP_SELECT_COLUMNS =
  "id, game_version, side_of_ball, playbook, formation, play_name, play_key, title, notes, image_path, sort_order, created_at, updated_at";

export type PlaySetupRow = {
  id: string;
  game_version: string;
  side_of_ball: CatalogSideOfBall;
  playbook: string;
  formation: string;
  play_name: string;
  play_key: string;
  title: string;
  notes: string;
  image_path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Strict catalog version for play-setup APIs — unknown values 400, no silent default. */
export function requireCatalogGameVersion(raw: string | null | undefined): CatalogGameVersion | null {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === "cfb26" || v === "26") return "cfb26";
  if (v === "cfb27" || v === "27") return "cfb27";
  return null;
}

export function parsePlayIdentityFields(raw: {
  game_version?: unknown;
  side_of_ball?: unknown;
  playbook?: unknown;
  formation?: unknown;
  play_name?: unknown;
}): { identity: PlayIdentity } | { error: string } {
  const gameVersionRaw = typeof raw.game_version === "string" ? raw.game_version.trim() : "";
  const game_version = requireCatalogGameVersion(gameVersionRaw);
  const side = parseCatalogSideOfBall(
    typeof raw.side_of_ball === "string" ? raw.side_of_ball : "",
  );
  const playbook = typeof raw.playbook === "string" ? raw.playbook.trim() : "";
  const formation = typeof raw.formation === "string" ? raw.formation.trim() : "";
  const play_name = typeof raw.play_name === "string" ? raw.play_name.trim() : "";

  if (!game_version || !side || !playbook || !formation || !play_name) {
    return { error: "game_version, side_of_ball, playbook, formation, and play_name are required" };
  }

  return {
    identity: {
      game_version,
      side_of_ball: side,
      playbook,
      formation,
      play_name,
    },
  };
}

export function parsePlayIdentityFromSearchParams(
  params: URLSearchParams,
): { identity: PlayIdentity } | { error: string } {
  return parsePlayIdentityFields({
    game_version: params.get("game_version"),
    side_of_ball: params.get("side_of_ball"),
    playbook: params.get("playbook"),
    formation: params.get("formation"),
    play_name: params.get("play_name"),
  });
}

export function validateSetupTitle(raw: unknown): { title: string } | { error: string } {
  if (typeof raw !== "string") return { error: PLAY_SETUP_TITLE_REQUIRED };
  const title = raw.trim();
  if (!title) return { error: PLAY_SETUP_TITLE_REQUIRED };
  if (title.length > PLAY_SETUP_TITLE_MAX) return { error: PLAY_SETUP_TITLE_TOO_LONG };
  return { title };
}

export function validateSetupNotes(raw: unknown): { notes: string } | { error: string } {
  if (raw === undefined || raw === null) return { notes: "" };
  if (typeof raw !== "string") return { error: PLAY_SETUP_NOTES_TOO_LONG };
  const notes = raw.trim();
  if (notes.length > PLAY_SETUP_NOTES_MAX) return { error: PLAY_SETUP_NOTES_TOO_LONG };
  return { notes };
}

/**
 * image_path must be exactly `{uid}/{setupId}/{filename}` (one file segment) or null.
 * Rejects nested folders so account cleanup can list one level under each setup id.
 */
export function validateSetupImagePath(
  userId: string,
  setupId: string,
  raw: unknown,
): { image_path: string | null } | { error: string } {
  if (raw === null) return { image_path: null };
  if (typeof raw !== "string") return { error: PLAY_SETUP_BAD_IMAGE };
  const path = raw.trim();
  if (!path) return { image_path: null };
  const prefix = `${userId}/${setupId}/`;
  if (!path.startsWith(prefix)) return { error: PLAY_SETUP_BAD_IMAGE };
  const fileName = path.slice(prefix.length);
  if (!fileName || fileName.includes("/") || fileName.includes("..") || fileName.includes("\\")) {
    return { error: PLAY_SETUP_BAD_IMAGE };
  }
  return { image_path: path };
}

export async function signSetupImageUrl(
  supabase: SupabaseClient,
  imagePath: string | null | undefined,
): Promise<string | null> {
  if (!imagePath) return null;
  const { data, error } = await supabase.storage
    .from(PLAY_SETUP_IMAGES_BUCKET)
    .createSignedUrl(imagePath, PLAY_SETUP_SIGNED_URL_SECONDS);
  if (error) {
    console.error("play setup signed URL:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function toPlaySetup(
  supabase: SupabaseClient,
  row: PlaySetupRow,
): Promise<PlaySetup> {
  const image_url = await signSetupImageUrl(supabase, row.image_path);
  return {
    id: row.id,
    game_version: row.game_version,
    side_of_ball: row.side_of_ball,
    playbook: row.playbook,
    formation: row.formation,
    play_name: row.play_name,
    play_key: row.play_key,
    title: row.title,
    notes: row.notes,
    image_path: row.image_path,
    image_url,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function removeSetupStorageObject(
  supabase: SupabaseClient,
  imagePath: string | null | undefined,
): Promise<{ error: string | null }> {
  if (!imagePath) return { error: null };
  const { error } = await supabase.storage.from(PLAY_SETUP_IMAGES_BUCKET).remove([imagePath]);
  if (error) {
    console.error("play setup storage remove:", error);
    return { error: COULDNT_FINISH_THAT };
  }
  return { error: null };
}

/**
 * Account deletion: remove setup images for a user.
 * 1) Delete paths recorded on `play_setups.image_path` (authoritative).
 * 2) List `{userId}/{setupId}/{file}` under the bucket prefix and remove leftovers.
 */
export async function deleteAllPlaySetupImagesForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ error: unknown | null }> {
  const bucket = PLAY_SETUP_IMAGES_BUCKET;
  const pageSize = 100;
  const pathSet = new Set<string>();

  const { data: rows, error: rowsErr } = await admin
    .from("play_setups")
    .select("image_path")
    .eq("user_id", userId)
    .not("image_path", "is", null);

  if (rowsErr) return { error: rowsErr };
  for (const row of rows ?? []) {
    const path = String((row as { image_path?: string | null }).image_path ?? "").trim();
    if (path) pathSet.add(path);
  }

  let rootOffset = 0;
  for (;;) {
    const { data: level1, error: listErr } = await admin.storage.from(bucket).list(userId, {
      limit: pageSize,
      offset: rootOffset,
    });
    if (listErr) return { error: listErr };
    const entries = level1 ?? [];
    if (entries.length === 0) break;

    for (const entry of entries) {
      const name = entry.name?.trim();
      if (!name) continue;

      let childOffset = 0;
      let sawChildren = false;
      for (;;) {
        const { data: children, error: childErr } = await admin.storage
          .from(bucket)
          .list(`${userId}/${name}`, { limit: pageSize, offset: childOffset });
        if (childErr) return { error: childErr };
        const batch = children ?? [];
        if (batch.length === 0) break;
        sawChildren = true;
        for (const file of batch) {
          const fileName = file.name?.trim();
          if (fileName) pathSet.add(`${userId}/${name}/${fileName}`);
        }
        if (batch.length < pageSize) break;
        childOffset += pageSize;
      }

      if (!sawChildren) {
        pathSet.add(`${userId}/${name}`);
      }
    }

    if (entries.length < pageSize) break;
    rootOffset += pageSize;
  }

  const paths = [...pathSet];
  for (let i = 0; i < paths.length; i += pageSize) {
    const chunk = paths.slice(i, i + pageSize);
    if (chunk.length === 0) continue;
    const { error: removeErr } = await admin.storage.from(bucket).remove(chunk);
    if (removeErr) return { error: removeErr };
  }

  return { error: null };
}

export function playKeyForIdentity(identity: PlayIdentity): string {
  return buildPlaySetupKey(identity);
}
