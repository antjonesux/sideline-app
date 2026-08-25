/**
 * Civil.GG URL hit-rate experiment against 465 verified USC mappings.
 *
 * Usage (from sideline/):
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/civil-experiment/test-hit-rate.ts
 *
 * Optional:
 *   --limit N     Cap requests (default: all USC trusted mappings)
 *   --delay-ms N  Delay between HEADs (default: 100)
 *   --skip-fetch  Rebuild reports from existing hit-rate-results.json
 *
 * Does not modify matcher/ingest/manifest. HEAD only — no image downloads.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { normalizePlayName } from "../../../lib/utils";
import type { TeamPlaybookSeed } from "../../../lib/seed/types";
import { importSeedModule } from "../build-reference";
import { TRUSTED_PLAYBOOKS } from "../trusted-hash";
import type { PlayArtManifestRecord } from "../types";
import { buildCivilUrl } from "./build-civil-url";
import {
  formationSetFromFullName,
} from "./normalize-slug";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDELINE_ROOT = join(__dirname, "..", "..", "..");
const MANIFEST_PATH = join(SIDELINE_ROOT, "lib", "generated", "play-art-manifest.json");
const REPORTS_DIR = join(__dirname, "reports");
const RESULTS_JSON = join(REPORTS_DIR, "hit-rate-results.json");
const FAILURE_MD = join(REPORTS_DIR, "failure-patterns.md");
const REPORT_MD = join(REPORTS_DIR, "hit-rate-report.md");
const MANUAL_MD = join(REPORTS_DIR, "manual-verification.md");
const MANUAL_SAMPLE_JSON = join(REPORTS_DIR, "manual-verification-sample.json");

const REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_DELAY_MS = 100;
const SEED_SLUG = "cfb27-usc";

export type HitResultKind = "hit" | "miss" | "error";

export type HitRateRow = {
  playName: string;
  formation: string;
  formationType: string;
  formationSet: string;
  url: string;
  statusCode: number | null;
  timeMs: number;
  result: HitResultKind;
  errorMessage?: string;
};

export type HitRateSummary = {
  totalTested: number;
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  missStatusNote: string;
  results: HitRateRow[];
};

type UscMapping = {
  playName: string;
  formation: string;
  formationType: string;
  formationSet: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]): { limit: number | null; delayMs: number; skipFetch: boolean } {
  let limit: number | null = null;
  let delayMs = DEFAULT_DELAY_MS;
  let skipFetch = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit" && argv[i + 1]) {
      limit = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--delay-ms" && argv[i + 1]) {
      delayMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--skip-fetch") {
      skipFetch = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Civil.GG URL hit-rate experiment (USC trusted mappings).

Usage (from sideline/):
  NODE_PATH=./node_modules npx tsx ./scripts/play-art/civil-experiment/test-hit-rate.ts
  ... --limit 20
  ... --delay-ms 100
  ... --skip-fetch
`);
      process.exit(0);
    }
  }
  return { limit, delayMs, skipFetch };
}

function loadFormationTypeIndex(seed: TeamPlaybookSeed): Map<string, string> {
  const map = new Map<string, string>();
  for (const formation of seed.formations) {
    map.set(formation.formation.trim().toLowerCase(), formation.formationType.trim());
  }
  return map;
}

function loadUscTrustedMappings(seed: TeamPlaybookSeed): UscMapping[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  const typeByFormation = loadFormationTypeIndex(seed);
  const mappings: UscMapping[] = [];

  for (const entry of manifest.entries) {
    if (!TRUSTED_PLAYBOOKS.has(entry.playbook.trim())) continue;
    if (entry.playbook.trim() !== "USC") continue;

    const formation = entry.formation.trim();
    const formationType = typeByFormation.get(formation.toLowerCase());
    if (!formationType) {
      throw new Error(`No formationType in seed for USC formation: ${formation}`);
    }
    const formationSet = formationSetFromFullName(formation, formationType);
    mappings.push({
      playName: normalizePlayName(entry.play_name),
      formation,
      formationType,
      formationSet,
    });
  }

  return mappings;
}

function classifyStatus(statusCode: number | null): HitResultKind {
  if (statusCode === 200) return "hit";
  // Civil's public bucket returns 400 (not 404) for missing objects.
  if (statusCode === 404 || statusCode === 400) return "miss";
  return "error";
}

async function headUrl(url: string): Promise<{ statusCode: number | null; timeMs: number; errorMessage?: string }> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return {
      statusCode: res.status,
      timeMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: null,
      timeMs: Math.round(performance.now() - started),
      errorMessage: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runHitRate(
  mappings: UscMapping[],
  delayMs: number,
): Promise<HitRateSummary> {
  const results: HitRateRow[] = [];
  let hits = 0;
  let misses = 0;
  let errors = 0;

  for (let i = 0; i < mappings.length; i += 1) {
    const m = mappings[i];
    const url = buildCivilUrl(m.playName, m.formationType, m.formationSet, "27");
    const { statusCode, timeMs, errorMessage } = await headUrl(url);
    const result = classifyStatus(statusCode);
    if (result === "hit") hits += 1;
    else if (result === "miss") misses += 1;
    else errors += 1;

    results.push({
      playName: m.playName,
      formation: m.formation,
      formationType: m.formationType,
      formationSet: m.formationSet,
      url,
      statusCode,
      timeMs,
      result,
      ...(errorMessage ? { errorMessage } : {}),
    });

    if ((i + 1) % 25 === 0 || i + 1 === mappings.length) {
      console.log(
        `[${i + 1}/${mappings.length}] hits=${hits} misses=${misses} errors=${errors}`,
      );
    }

    if (i + 1 < mappings.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const totalTested = results.length;
  return {
    totalTested,
    hits,
    misses,
    errors,
    hitRate: totalTested === 0 ? 0 : hits / totalTested,
    missStatusNote:
      "Civil Supabase public bucket returns HTTP 400 (not 404) for missing objects; both counted as miss.",
    results,
  };
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${((100 * n) / d).toFixed(1)}%`;
}

function playCharacteristics(playName: string): string[] {
  const tags: string[] = [];
  if (/\d/.test(playName)) tags.push("Contains number");
  if (/-/.test(playName)) tags.push("Contains hyphen");
  if (/[&']/.test(playName)) tags.push("Contains & or apostrophe");
  if (/\bvs\b/i.test(playName)) tags.push('Contains "vs"');
  if (/\brpo\b/i.test(playName)) tags.push('Contains "RPO"');
  if (/\bpa\b/i.test(playName)) tags.push('Contains "PA"');
  if (/\bmtn\b/i.test(playName)) tags.push('Contains "MTN"');
  if (/\s/.test(playName) === false) tags.push("Single token (no spaces)");
  if (tags.length === 0) tags.push("Plain alphabetic name");
  return tags;
}

function formationCharacteristics(formation: string, formationSet: string): string[] {
  const tags: string[] = [];
  if (/-/.test(formation) || /-/.test(formationSet)) tags.push("Formation contains hyphen");
  if (/\d/.test(formation)) tags.push("Formation contains number");
  return tags;
}

type BucketStats = { hits: number; misses: number; errors: number; total: number };

function bump(map: Map<string, BucketStats>, key: string, result: HitResultKind): void {
  const cur = map.get(key) ?? { hits: 0, misses: 0, errors: 0, total: 0 };
  cur.total += 1;
  if (result === "hit") cur.hits += 1;
  else if (result === "miss") cur.misses += 1;
  else cur.errors += 1;
  map.set(key, cur);
}

function formatBucketLines(map: Map<string, BucketStats>, minTotal = 1): string[] {
  return [...map.entries()]
    .filter(([, s]) => s.total >= minTotal)
    .sort((a, b) => {
      const rateA = a[1].hits / a[1].total;
      const rateB = b[1].hits / b[1].total;
      if (rateA !== rateB) return rateA - rateB;
      return b[1].misses - a[1].misses;
    })
    .map(([key, s]) => {
      return `- ${key}: ${s.hits} hits / ${s.misses} misses` +
        (s.errors ? ` / ${s.errors} errors` : "") +
        ` (${pct(s.hits, s.total)} hit, n=${s.total})`;
    });
}

function writeFailurePatterns(summary: HitRateSummary): void {
  const byType = new Map<string, BucketStats>();
  const bySet = new Map<string, BucketStats>();
  const byPlayChar = new Map<string, BucketStats>();
  const byFormChar = new Map<string, BucketStats>();

  for (const row of summary.results) {
    bump(byType, row.formationType, row.result);
    bump(bySet, `${row.formationType} / ${row.formationSet}`, row.result);
    for (const tag of playCharacteristics(row.playName)) {
      bump(byPlayChar, tag, row.result);
    }
    for (const tag of formationCharacteristics(row.formation, row.formationSet)) {
      bump(byFormChar, tag, row.result);
    }
  }

  const misses = summary.results.filter((r) => r.result === "miss");
  const notable = misses.slice(0, 25).map((r) => {
    const hints: string[] = [];
    if (/-/.test(r.playName) || /-/.test(r.formationSet)) hints.push("hyphen");
    if (/\d/.test(r.playName)) hints.push("number in play");
    if (/\b(mtn|rpo|pa)\b/i.test(r.playName)) hints.push("prefix word");
    const hint = hints.length ? ` (${hints.join(", ")})` : "";
    return `- "${r.playName}" / "${r.formation}" → ${r.statusCode ?? "null"}${hint}\n  ${r.url}`;
  });

  const md = `# Failure patterns — Civil.GG USC hit-rate

Generated from ${summary.totalTested} verified USC mappings.
Misses use status ${"400/404"} (Civil returns **400** for missing public objects).

## By formation type

${formatBucketLines(byType).join("\n")}

## By formation set

${formatBucketLines(bySet).join("\n")}

## By play name characteristic

${formatBucketLines(byPlayChar).join("\n")}

## By formation name characteristic

${formatBucketLines(byFormChar).length ? formatBucketLines(byFormChar).join("\n") : "- (none tagged)"}

## Notable individual failures

${notable.length ? notable.join("\n") : "- (no misses)"}

## Miss count

- Total misses: ${summary.misses}
- Total errors: ${summary.errors}
`;

  writeFileSync(FAILURE_MD, md, "utf8");
}

function recommendationFor(hitRate: number): {
  label: "strategic asset" | "useful complement" | "not worth pursuing";
  next: string;
} {
  if (hitRate > 0.9) {
    return {
      label: "strategic asset",
      next: "Recommend follow-up session to design Civil integration architecture (construct URL when identity is known; fall back to matcher on miss).",
    };
  }
  if (hitRate >= 0.6) {
    return {
      label: "useful complement",
      next: "Recommend follow-up session to test Civil against Air Force + investigate slug exception patterns from failure-patterns.md.",
    };
  }
  return {
    label: "not worth pursuing",
    next: "Document findings and close the experiment; URL convention too fragile for production reliance.",
  };
}

function writeHitRateReport(summary: HitRateSummary): void {
  const hitPct = pct(summary.hits, summary.totalTested);
  const missPct = pct(summary.misses, summary.totalTested);
  const rec = recommendationFor(summary.hitRate);
  const byType = new Map<string, BucketStats>();
  const byPlayChar = new Map<string, BucketStats>();
  for (const row of summary.results) {
    bump(byType, row.formationType, row.result);
    for (const tag of playCharacteristics(row.playName)) {
      bump(byPlayChar, tag, row.result);
    }
  }
  const topTypeFails = formatBucketLines(byType).slice(0, 5);
  const topPlayFails = formatBucketLines(byPlayChar)
    .filter((line) => !line.includes("100.0% hit"))
    .slice(0, 5);

  const md = `# Civil.GG URL Hit-Rate Experiment — Results

## Summary
- Total tested: ${summary.totalTested}
- Hits: ${summary.hits} (${hitPct})
- Misses: ${summary.misses} (${missPct})
- Errors: ${summary.errors}
- Note: ${summary.missStatusNote}

## Recommendation
Based on the thresholds established in the session brief:
- >90% hit rate: Civil is a strategic asset — consider architectural integration
- 60-90% hit rate: Civil is a useful complement — worth integrating as additional source
- <60% hit rate: URL convention too fragile — likely not worth pursuing

Actual hit rate: ${hitPct} → recommendation: **${rec.label}**

## Failure patterns

### Top formation-type gaps
${topTypeFails.join("\n") || "- (none)"}

### Top play-name characteristic gaps
${topPlayFails.join("\n") || "- (none)"}

Full catalog: \`failure-patterns.md\`

## Manual verification
See \`manual-verification.md\` (10 random hits opened in browser).

Fill after visual QA:
- 10/10 verified hits returned the correct image? (yes/no)
- Any wrong images? (details)

## Next steps
${rec.next}
`;

  writeFileSync(REPORT_MD, md, "utf8");
}

/** Deterministic pick of 10 hit URLs for manual browser verification. */
function pickManualSample(summary: HitRateSummary, count = 10): HitRateRow[] {
  const hits = summary.results.filter((r) => r.result === "hit");
  if (hits.length === 0) return [];
  // Stable shuffle from play+formation hash so re-runs keep the same sample.
  const ranked = [...hits].sort((a, b) => {
    const ka = `${a.formation}\0${a.playName}`;
    const kb = `${b.formation}\0${b.playName}`;
    let ha = 0;
    let hb = 0;
    for (let i = 0; i < ka.length; i += 1) ha = (ha * 31 + ka.charCodeAt(i)) >>> 0;
    for (let i = 0; i < kb.length; i += 1) hb = (hb * 31 + kb.charCodeAt(i)) >>> 0;
    return ha - hb;
  });
  const step = Math.max(1, Math.floor(ranked.length / count));
  const sample: HitRateRow[] = [];
  for (let i = 0; i < ranked.length && sample.length < count; i += step) {
    sample.push(ranked[i]);
  }
  while (sample.length < count && sample.length < ranked.length) {
    sample.push(ranked[sample.length]);
  }
  return sample.slice(0, count);
}

function writeManualVerificationStub(summary: HitRateSummary): HitRateRow[] {
  const sample = pickManualSample(summary, 10);
  writeFileSync(MANUAL_SAMPLE_JSON, `${JSON.stringify(sample, null, 2)}\n`, "utf8");

  const rows = sample
    .map((r, i) => {
      return `### ${i + 1}. ${r.playName} / ${r.formation}

- URL: ${r.url}
- formationType: ${r.formationType}
- formationSet: ${r.formationSet}
- verified: _(pending)_
- notes:
`;
    })
    .join("\n");

  const md = `# Manual verification — Civil.GG hit sample

10 deterministic hits from the USC run (stable selection). Open each URL and confirm the WebP matches the play name + formation shell.

${rows}

## Summary

- 10/10 correct? _(pending)_
- Wrong images: _(pending)_
`;

  writeFileSync(MANUAL_MD, md, "utf8");
  return sample;
}

async function main(): Promise<void> {
  const { limit, delayMs, skipFetch } = parseArgs(process.argv.slice(2));
  mkdirSync(REPORTS_DIR, { recursive: true });

  let summary: HitRateSummary;

  if (skipFetch) {
    if (!existsSync(RESULTS_JSON)) {
      throw new Error(`--skip-fetch requires ${RESULTS_JSON}`);
    }
    summary = JSON.parse(readFileSync(RESULTS_JSON, "utf8")) as HitRateSummary;
    console.log(`Loaded ${summary.totalTested} results from disk`);
  } else {
    const seed = await importSeedModule(SEED_SLUG);
    let mappings = loadUscTrustedMappings(seed);
    console.log(`Loaded ${mappings.length} USC trusted mappings from manifest + seed`);
    if (limit != null && Number.isFinite(limit) && limit > 0) {
      mappings = mappings.slice(0, limit);
      console.log(`Limited to ${mappings.length} URLs`);
    }
    if (mappings.length > 500) {
      throw new Error(`Refusing to test ${mappings.length} URLs (session cap 500)`);
    }
    summary = await runHitRate(mappings, delayMs);
    writeFileSync(RESULTS_JSON, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.log(`Wrote ${RESULTS_JSON}`);
  }

  writeFailurePatterns(summary);
  writeHitRateReport(summary);
  const sample = writeManualVerificationStub(summary);

  console.log("\n=== Hit-rate summary ===");
  console.log(`Total: ${summary.totalTested}`);
  console.log(`Hits: ${summary.hits} (${pct(summary.hits, summary.totalTested)})`);
  console.log(`Misses: ${summary.misses}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Recommendation: ${recommendationFor(summary.hitRate).label}`);
  console.log(`Manual sample URLs: ${sample.length} → ${MANUAL_MD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
