import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { displayNameToTeamSlug } from "./lib/slug-utils";
import type { PlayArtReference, PlayArtSourceDiscoveryResult, PlayArtSourceDiscoveryStatus } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SOURCE_ROOT = join(__dirname, "source");
export const SEED_PLAYBOOKS_DIR = join(__dirname, "..", "..", "lib", "seed", "playbooks");
export const SOURCE_ALIASES_PATH = join(__dirname, "source-aliases.json");

export type PlaybookCatalogEntry = {
  seedSlug: string;
  team: string;
  sideOfBall: "offense" | "defense";
  gameVersion: "cfb26" | "cfb27";
  normalizedTeam: string;
};

/** Conservative name normalization for source ↔ catalog matching. */
export function normalizeSourceName(raw: string): string {
  return raw
    .trim()
    .replace(/\.docx$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s&.'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function seedSlugFromFileName(fileName: string): string {
  return fileName.replace(/\.ts$/i, "");
}

/**
 * Load CFB27 playbook catalog from seed modules (team field + file slug).
 * Does not maintain a second team list.
 */
export function loadPlaybookCatalog(seedDir: string = SEED_PLAYBOOKS_DIR): PlaybookCatalogEntry[] {
  if (!existsSync(seedDir)) {
    throw new Error(`Seed playbooks directory not found: ${seedDir}`);
  }

  const entries: PlaybookCatalogEntry[] = [];
  for (const fileName of readdirSync(seedDir)) {
    if (!fileName.startsWith("cfb27-") || !fileName.endsWith(".ts")) {
      continue;
    }
    const raw = readFileSync(join(seedDir, fileName), "utf8");
    const teamMatch = raw.match(/\bteam:\s*['\"]([^'\"]+)['\"]/);
    const sideMatch = raw.match(/\bsideOfBall:\s*['\"](offense|defense)['\"]/);
    const versionMatch = raw.match(/\bgameVersion:\s*['\"](cfb26|cfb27)['\"]/);
    if (!teamMatch || !sideMatch) {
      continue;
    }
    const team = teamMatch[1];
    const sideOfBall = sideMatch[1] as "offense" | "defense";
    const gameVersion = (versionMatch?.[1] ?? "cfb27") as "cfb26" | "cfb27";
    entries.push({
      seedSlug: seedSlugFromFileName(fileName),
      team,
      sideOfBall,
      gameVersion,
      normalizedTeam: normalizeSourceName(team),
    });
  }
  return entries;
}

export function loadSourceAliases(aliasPath: string = SOURCE_ALIASES_PATH): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(aliasPath)) {
    return map;
  }
  const parsed = JSON.parse(readFileSync(aliasPath, "utf8")) as Record<string, string>;
  for (const [from, to] of Object.entries(parsed)) {
    if (typeof from === "string" && typeof to === "string" && from.trim() && to.trim()) {
      map.set(normalizeSourceName(from), to.trim());
    }
  }
  return map;
}

/** Recursively collect .docx paths under source root. */
export function discoverSourceDocxFiles(sourceRoot: string = SOURCE_ROOT): string[] {
  if (!existsSync(sourceRoot)) {
    return [];
  }
  const results: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile() && extname(entry.name).toLowerCase() === ".docx") {
        results.push(full);
      }
    }
  }

  walk(sourceRoot);
  return results.sort((a, b) => a.localeCompare(b));
}

function candidateLabelsFromBasename(basenameNoExt: string): string[] {
  const labels = [basenameNoExt];
  const structured = basenameNoExt.match(/^cfb\d+-(offense|defense)-(.+)$/i);
  if (structured) {
    const teamPart = structured[2].replace(/-/g, " ").trim();
    if (teamPart) labels.push(teamPart);
  }
  return labels;
}

function findCatalogMatches(
  label: string,
  catalog: PlaybookCatalogEntry[],
): PlaybookCatalogEntry[] {
  const normalized = normalizeSourceName(label);
  if (!normalized) return [];

  const byTeam = catalog.filter((entry) => entry.normalizedTeam === normalized);
  if (byTeam.length > 0) return byTeam;

  const bySlug = catalog.filter(
    (entry) => normalizeSourceName(entry.seedSlug) === normalized || entry.seedSlug === label.trim(),
  );
  return bySlug;
}

export function resolveSourceDocx(
  sourcePath: string,
  catalog: PlaybookCatalogEntry[],
  aliases: Map<string, string>,
  sourceRoot: string = SOURCE_ROOT,
): PlayArtSourceDiscoveryResult {
  const fileName = basename(sourcePath);
  const basenameNoExt = fileName.replace(/\.docx$/i, "");
  const rel = relative(sourceRoot, sourcePath);

  const labels = candidateLabelsFromBasename(basenameNoExt);
  let status: PlayArtSourceDiscoveryStatus = "UNRESOLVED";
  let aliasTarget: string | undefined;
  let matchLabel = labels[0] ?? basenameNoExt;

  for (const label of labels) {
    const alias = aliases.get(normalizeSourceName(label));
    if (alias) {
      aliasTarget = alias;
      matchLabel = alias;
      status = "ALIAS";
      break;
    }
  }

  if (status !== "ALIAS") {
    matchLabel = labels[0] ?? basenameNoExt;
  }

  const matches =
    status === "ALIAS"
      ? findCatalogMatches(matchLabel, catalog)
      : labels.flatMap((label) => findCatalogMatches(label, catalog));

  // Deduplicate by seed slug
  const unique = new Map<string, PlaybookCatalogEntry>();
  for (const match of matches) {
    unique.set(match.seedSlug, match);
  }
  const candidates = [...unique.values()];

  if (candidates.length === 1) {
    const hit = candidates[0];
    return {
      sourcePath: rel || sourcePath,
      fileName,
      basename: basenameNoExt,
      status: status === "ALIAS" ? "ALIAS" : "MATCH",
      resolvedSeed: hit.seedSlug,
      resolvedPlaybook: hit.team,
      aliasTarget,
    };
  }

  if (candidates.length > 1) {
    return {
      sourcePath: rel || sourcePath,
      fileName,
      basename: basenameNoExt,
      status: "AMBIGUOUS",
      candidates: candidates.map((c) => `${c.seedSlug} (${c.team})`),
      aliasTarget,
    };
  }

  return {
    sourcePath: rel || sourcePath,
    fileName,
    basename: basenameNoExt,
    status: status === "ALIAS" ? "UNRESOLVED" : "UNRESOLVED",
    aliasTarget,
  };
}

export function discoverAndResolveSources(options?: {
  sourceRoot?: string;
  seedDir?: string;
  aliasPath?: string;
}): PlayArtSourceDiscoveryResult[] {
  const sourceRoot = options?.sourceRoot ?? SOURCE_ROOT;
  const catalog = loadPlaybookCatalog(options?.seedDir ?? SEED_PLAYBOOKS_DIR);
  const aliases = loadSourceAliases(options?.aliasPath ?? SOURCE_ALIASES_PATH);
  const files = discoverSourceDocxFiles(sourceRoot);
  return files.map((path) => resolveSourceDocx(path, catalog, aliases, sourceRoot));
}

/**
 * Resolve seed module slug from a canonical reference (team display name → catalog seed file).
 * Falls back to displayNameToTeamSlug when the catalog has no unique match (e.g. scheme playbooks).
 */
export function resolveSeedSlugFromPlaybookReference(reference: PlayArtReference): string {
  const catalog = loadPlaybookCatalog();
  const normalized = normalizeSourceName(reference.playbook);
  const hits = catalog.filter(
    (entry) =>
      entry.gameVersion === reference.gameVersion &&
      entry.sideOfBall === reference.sideOfBall &&
      entry.normalizedTeam === normalized,
  );

  if (hits.length === 1) {
    return hits[0].seedSlug;
  }

  const derivedSlug = `${reference.gameVersion}-${displayNameToTeamSlug(reference.playbook)}`;
  if (hits.length > 1) {
    const exact = hits.find((entry) => entry.seedSlug === derivedSlug);
    if (exact) {
      return exact.seedSlug;
    }
  }

  return derivedSlug;
}
