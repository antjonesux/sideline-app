#!/usr/bin/env node
/**
 * Play-art REVIEW operator tool — local keyboard-driven confirmation UI.
 *
 * Usage (from sideline/):
 *   npm run play-art:review -- --list
 *   npm run play-art:review -- --playbook=air-force
 *   npm run play-art:review -- --playbook=california
 *   npm run play-art:review -- --playbook=air-force --mode=diagnostic
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverIngestedPlaybooks,
  loadReviewData,
  parsePlaybookArg,
  printPlaybookList,
  referenceUrlForPlay,
  type LoadedReviewData,
  type ReviewCase,
} from "./cases";
import {
  createDiagnosticReport,
  createRng,
  printDiagnosticSummary,
  reportPathFor,
  resolveSkippedCases,
  sampleItems,
  writeDiagnosticReport,
  type DiagnosticCase,
  type DiagnosticCategory,
  type DiagnosticReport,
} from "./diagnostic";
import {
  overridesPathFor,
  undoOperatorConfirmation,
  writeOperatorConfirmation,
} from "./overrides-io";
import {
  caseKey,
  loadSessionState,
  progressFromState,
  saveSessionState,
  type ReviewSessionState,
} from "./state";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const REF_CACHE_ROOT = join(__dirname, "..", ".reference-cache");
const DEFAULT_PORT = 4300;
const MAX_PORT_TRIES = 20;
const DIAGNOSTIC_SAMPLE_SIZE = 30;

type LastAction =
  | {
      kind: "confirm";
      caseKey: string;
      formation: string;
      cropId: string;
      playName: string;
      wasNew: boolean;
      elapsedMs: number;
    }
  | {
      kind: "skip";
      caseKey: string;
      formation: string;
      cropId: string;
      reason: string;
      elapsedMs: number;
    };

type SessionRuntime = {
  data: LoadedReviewData;
  state: ReviewSessionState;
  lastAction: LastAction | null;
  caseStartedAt: number | null;
};

type DiagnosticLastAction = {
  caseKey: string;
  entry: DiagnosticReport["categorizations"][number];
};

type DiagnosticRuntime = {
  mode: "diagnostic";
  data: LoadedReviewData;
  queue: DiagnosticCase[];
  /** Cases still awaiting categorization (front = next). */
  remaining: DiagnosticCase[];
  report: DiagnosticReport;
  reportPath: string;
  lastAction: DiagnosticLastAction | null;
  finished: boolean;
};

type CliOptions = {
  playbook: string;
  port: number;
  mode: "review" | "diagnostic";
  seed: number | null;
  list: boolean;
};

function parseCli(argv: string[]): CliOptions {
  let playbook = "";
  let port = DEFAULT_PORT;
  let mode: "review" | "diagnostic" = "review";
  let seed: number | null = null;
  let list = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") {
      list = true;
    } else if (arg.startsWith("--playbook=")) {
      playbook = arg.slice("--playbook=".length);
    } else if (arg === "--playbook" && argv[i + 1]) {
      playbook = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--port=")) {
      port = Number(arg.slice("--port=".length));
    } else if (arg === "--port" && argv[i + 1]) {
      port = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--mode=")) {
      const raw = arg.slice("--mode=".length).trim().toLowerCase();
      if (raw === "diagnostic") mode = "diagnostic";
      else if (raw === "review" || raw === "") mode = "review";
      else {
        console.error(`Unknown mode "${raw}". Use --mode=review or --mode=diagnostic`);
        process.exit(1);
      }
    } else if (arg === "--mode" && argv[i + 1]) {
      const raw = argv[i + 1].trim().toLowerCase();
      if (raw === "diagnostic") mode = "diagnostic";
      else if (raw === "review") mode = "review";
      else {
        console.error(`Unknown mode "${raw}". Use --mode=review or --mode=diagnostic`);
        process.exit(1);
      }
      i += 1;
    } else if (arg.startsWith("--seed=")) {
      seed = Number(arg.slice("--seed=".length));
      if (!Number.isFinite(seed)) {
        console.error("Invalid --seed (expected number)");
        process.exit(1);
      }
    } else if (arg === "--seed" && argv[i + 1]) {
      seed = Number(argv[i + 1]);
      if (!Number.isFinite(seed)) {
        console.error("Invalid --seed (expected number)");
        process.exit(1);
      }
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  npm run play-art:review -- --list
  npm run play-art:review -- --playbook=<slug> [--port=4300]
  npm run play-art:review -- --playbook=<slug> --mode=diagnostic [--seed=42]

Playbook slugs are discovered from matching reports under scripts/play-art/reports/.`);
      process.exit(0);
    }
  }
  if (list) {
    return { playbook, port, mode, seed, list: true };
  }
  if (!playbook) {
    const available = discoverIngestedPlaybooks();
    if (available.length === 0) {
      console.error("Required: --playbook=<slug>");
      console.error("No playbooks have been ingested yet.");
      console.error("");
      console.error("Ingest a playbook first with:");
      console.error('  npm run play-art:ingest -- --source="path/to/{Name}.docx"');
    } else {
      console.error(
        `Required: --playbook=<slug> (available: ${available.map((p) => p.slug).join(", ")})`,
      );
      console.error("Or run with --list to see mapping counts.");
    }
    process.exit(1);
  }
  return { playbook, port, mode, seed, list: false };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

function sendText(res: ServerResponse, status: number, text: string, type: string): void {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control":
      type.includes("html") || type.includes("javascript") ? "no-store" : "public, max-age=60",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function contentTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function pendingCases(rt: SessionRuntime): ReviewCase[] {
  const reviewed = new Set(rt.state.reviewed);
  const skipped = new Set(rt.state.skipped.map((s) => caseKey(s.formation, s.cropId)));
  return rt.data.cases.filter((c) => !reviewed.has(c.caseKey) && !skipped.has(c.caseKey));
}

function findCase(rt: SessionRuntime, key: string): ReviewCase | undefined {
  return rt.data.cases.find((c) => c.caseKey === key);
}

function serializeCase(c: ReviewCase | DiagnosticCase) {
  return {
    caseKey: c.caseKey,
    cropId: c.cropId,
    cropPath: c.cropPath,
    cropSha256: c.cropSha256,
    formation: c.formation,
    candidates: c.candidates,
    reviewReason: c.reviewReason,
    formationPlays: c.formationPlays,
    originalSkipReason:
      "originalSkipReason" in c ? (c as DiagnosticCase).originalSkipReason : undefined,
  };
}

function diagnosticProgress(rt: DiagnosticRuntime) {
  const categorized = rt.report.categorizations.length;
  return {
    mode: "diagnostic" as const,
    total: rt.queue.length,
    categorized,
    remaining: rt.remaining.length,
    totalSkippedInState: rt.report.totalSkippedInState,
    summary: rt.report.summary,
  };
}

function cachePathForUrl(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex");
  return join(REF_CACHE_ROOT, "cfb27", "offense", `${hash}.jpg`);
}

async function ensureReferenceCached(url: string): Promise<Buffer | null> {
  if (!url) return null;
  const cachePath = cachePathForUrl(url);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, buffer);
    return buffer;
  } catch {
    return null;
  }
}

function serveStaticAndMedia(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  data: LoadedReviewData,
): boolean {
  const method = req.method ?? "GET";

  if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    sendText(res, 200, readFileSync(join(PUBLIC_DIR, "index.html"), "utf8"), "text/html; charset=utf-8");
    return true;
  }

  if (method === "GET" && (url.pathname === "/app.js" || url.pathname === "/styles.css")) {
    const file = join(PUBLIC_DIR, url.pathname.slice(1));
    sendText(res, 200, readFileSync(file, "utf8"), contentTypeFor(file));
    return true;
  }

  if (method === "GET" && url.pathname.startsWith("/crops/")) {
    const formation = url.searchParams.get("f") ?? "";
    const parts = url.pathname.split("/").filter(Boolean);
    const cropId = decodeURIComponent(parts[2] ?? "");
    const key = caseKey(formation, cropId);
    const buf = data.cropBytesByKey.get(key);
    if (!buf) {
      sendJson(res, 404, { error: "Crop not found" });
      return true;
    }
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
    return true;
  }

  return false;
}

async function serveReferenceProxy(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if ((req.method ?? "GET") !== "GET" || !url.pathname.startsWith("/refs/")) {
    return false;
  }
  const target = url.searchParams.get("url") ?? "";
  if (!target.startsWith("https://media.cfb.fan/")) {
    sendJson(res, 400, { error: "Invalid reference URL" });
    return true;
  }
  const cached = await ensureReferenceCached(target);
  if (cached) {
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(cached);
    return true;
  }
  res.writeHead(302, { Location: target });
  res.end();
  return true;
}

function createReviewApp(rt: SessionRuntime) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = req.method ?? "GET";

    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    try {
      if (serveStaticAndMedia(req, res, url, rt.data)) return;
      if (await serveReferenceProxy(req, res, url)) return;

      if (method === "GET" && url.pathname === "/api/progress") {
        sendJson(res, 200, {
          mode: "review",
          playbook: rt.data.displayName,
          playbookSlug: rt.data.playbook,
          overridesPath: overridesPathFor(rt.data.reference),
          ...progressFromState(rt.state, rt.data.cases.length),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/next") {
        const pending = pendingCases(rt);
        rt.caseStartedAt = Date.now();
        if (pending.length === 0) {
          sendJson(res, 200, {
            done: true,
            case: null,
            progress: progressFromState(rt.state, rt.data.cases.length),
            playbook: rt.data.displayName,
            mode: "review",
          });
          return;
        }
        sendJson(res, 200, {
          done: false,
          case: serializeCase(pending[0]),
          progress: progressFromState(rt.state, rt.data.cases.length),
          playbook: rt.data.displayName,
          mode: "review",
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/peek") {
        const pending = pendingCases(rt);
        const n = Math.min(3, Math.max(0, Number(url.searchParams.get("n") ?? "3")));
        sendJson(res, 200, { cases: pending.slice(0, n).map(serializeCase) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/confirm") {
        const body = JSON.parse(await readBody(req)) as {
          caseKey?: string;
          cropId?: string;
          formation?: string;
          playName?: string;
          candidateId?: string;
        };
        const key =
          body.caseKey ??
          (body.formation && body.cropId ? caseKey(body.formation, body.cropId) : "");
        const reviewCase = findCase(rt, key);
        if (!reviewCase) {
          sendJson(res, 400, { ok: false, error: `Unknown case: ${key}` });
          return;
        }
        const playName = body.playName || body.candidateId;
        if (!playName) {
          sendJson(res, 400, { ok: false, error: "playName (or candidateId) required" });
          return;
        }

        const result = writeOperatorConfirmation({
          reference: rt.data.reference,
          formation: reviewCase.formation,
          cropId: reviewCase.cropId,
          playName,
        });
        if (!result.ok) {
          sendJson(res, 500, { ok: false, error: result.error });
          return;
        }

        const elapsed =
          rt.caseStartedAt != null ? Math.max(0, Date.now() - rt.caseStartedAt) : 0;
        if (!rt.state.reviewed.includes(reviewCase.caseKey)) {
          rt.state.reviewed.push(reviewCase.caseKey);
        }
        rt.state.skipped = rt.state.skipped.filter(
          (s) => caseKey(s.formation, s.cropId) !== reviewCase.caseKey,
        );
        rt.state.totalTimeMs += elapsed;
        rt.state.reviewCount += 1;
        saveSessionState(rt.state);

        rt.lastAction = {
          kind: "confirm",
          caseKey: reviewCase.caseKey,
          formation: reviewCase.formation,
          cropId: reviewCase.cropId,
          playName,
          wasNew: result.created,
          elapsedMs: elapsed,
        };
        rt.caseStartedAt = Date.now();

        sendJson(res, 200, {
          ok: true,
          overridesPath: result.path,
          progress: progressFromState(rt.state, rt.data.cases.length),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/skip") {
        const body = JSON.parse(await readBody(req)) as {
          caseKey?: string;
          cropId?: string;
          formation?: string;
          reason?: string;
        };
        const key =
          body.caseKey ??
          (body.formation && body.cropId ? caseKey(body.formation, body.cropId) : "");
        const reviewCase = findCase(rt, key);
        if (!reviewCase) {
          sendJson(res, 400, { ok: false, error: `Unknown case: ${key}` });
          return;
        }
        const reason = (body.reason ?? "skipped").trim() || "skipped";
        const elapsed =
          rt.caseStartedAt != null ? Math.max(0, Date.now() - rt.caseStartedAt) : 0;

        rt.state.reviewed = rt.state.reviewed.filter((k) => k !== reviewCase.caseKey);
        rt.state.skipped = rt.state.skipped.filter(
          (s) => caseKey(s.formation, s.cropId) !== reviewCase.caseKey,
        );
        rt.state.skipped.push({
          cropId: reviewCase.cropId,
          formation: reviewCase.formation,
          reason,
        });
        rt.state.totalTimeMs += elapsed;
        saveSessionState(rt.state);

        rt.lastAction = {
          kind: "skip",
          caseKey: reviewCase.caseKey,
          formation: reviewCase.formation,
          cropId: reviewCase.cropId,
          reason,
          elapsedMs: elapsed,
        };
        rt.caseStartedAt = Date.now();

        sendJson(res, 200, {
          ok: true,
          progress: progressFromState(rt.state, rt.data.cases.length),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/undo") {
        const action = rt.lastAction;
        if (!action) {
          sendJson(res, 400, { ok: false, error: "Nothing to undo" });
          return;
        }

        if (action.kind === "confirm") {
          const undo = undoOperatorConfirmation({
            reference: rt.data.reference,
            formation: action.formation,
            cropId: action.cropId,
            expectedPlay: action.playName,
            wasNew: action.wasNew,
          });
          if (!undo.ok) {
            sendJson(res, 400, { ok: false, error: undo.error });
            return;
          }
          rt.state.reviewed = rt.state.reviewed.filter((k) => k !== action.caseKey);
          rt.state.totalTimeMs = Math.max(0, rt.state.totalTimeMs - action.elapsedMs);
          rt.state.reviewCount = Math.max(0, rt.state.reviewCount - 1);
        } else {
          rt.state.skipped = rt.state.skipped.filter(
            (s) => caseKey(s.formation, s.cropId) !== action.caseKey,
          );
          rt.state.totalTimeMs = Math.max(0, rt.state.totalTimeMs - action.elapsedMs);
        }

        saveSessionState(rt.state);
        rt.lastAction = null;
        rt.caseStartedAt = Date.now();
        const restored = findCase(rt, action.caseKey);
        sendJson(res, 200, {
          ok: true,
          case: restored ? serializeCase(restored) : null,
          progress: progressFromState(rt.state, rt.data.cases.length),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/quit") {
        saveSessionState(rt.state);
        sendJson(res, 200, {
          ok: true,
          progress: progressFromState(rt.state, rt.data.cases.length),
        });
        setTimeout(() => process.exit(0), 150);
        return;
      }

      if (method === "GET" && url.pathname === "/api/reference-url") {
        const formation = url.searchParams.get("formation") ?? "";
        const playName = url.searchParams.get("play") ?? "";
        sendJson(res, 200, {
          referenceUrl: referenceUrlForPlay(rt.data, formation, playName),
        });
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

function finishDiagnostic(rt: DiagnosticRuntime): void {
  if (rt.finished) return;
  rt.finished = true;
  rt.report.completedAt = new Date().toISOString();
  writeDiagnosticReport(rt.report, rt.reportPath);
  printDiagnosticSummary(rt.report, rt.reportPath);
}

function createDiagnosticApp(rt: DiagnosticRuntime) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = req.method ?? "GET";

    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    try {
      if (serveStaticAndMedia(req, res, url, rt.data)) return;
      if (await serveReferenceProxy(req, res, url)) return;

      if (method === "GET" && url.pathname === "/api/progress") {
        sendJson(res, 200, {
          playbook: rt.data.displayName,
          playbookSlug: rt.data.playbook,
          reportPath: rt.reportPath,
          ...diagnosticProgress(rt),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/next") {
        if (rt.remaining.length === 0) {
          finishDiagnostic(rt);
          sendJson(res, 200, {
            done: true,
            case: null,
            progress: diagnosticProgress(rt),
            playbook: rt.data.displayName,
            mode: "diagnostic",
          });
          return;
        }
        sendJson(res, 200, {
          done: false,
          case: serializeCase(rt.remaining[0]),
          progress: diagnosticProgress(rt),
          playbook: rt.data.displayName,
          mode: "diagnostic",
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/peek") {
        const n = Math.min(3, Math.max(0, Number(url.searchParams.get("n") ?? "3")));
        sendJson(res, 200, { cases: rt.remaining.slice(0, n).map(serializeCase) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/categorize") {
        const body = JSON.parse(await readBody(req)) as {
          caseKey?: string;
          category?: string;
          notes?: string;
        };
        const key = body.caseKey ?? "";
        const category = (body.category ?? "").toUpperCase() as DiagnosticCategory;
        if (!["F", "C", "A", "O"].includes(category)) {
          sendJson(res, 400, { ok: false, error: "category must be F, C, A, or O" });
          return;
        }
        const current = rt.remaining[0];
        if (!current || current.caseKey !== key) {
          sendJson(res, 400, {
            ok: false,
            error: `Expected case ${rt.remaining[0]?.caseKey ?? "(none)"}, got ${key}`,
          });
          return;
        }

        const entry = {
          cropId: current.cropId,
          matcherAssignedFormation: current.formation,
          topCandidates: current.candidates.map((c) => c.playName),
          category,
          notes: (body.notes ?? "").trim(),
        };
        rt.remaining.shift();
        rt.report.categorizations.push(entry);
        writeDiagnosticReport(rt.report, rt.reportPath);
        rt.lastAction = { caseKey: current.caseKey, entry };

        const done = rt.remaining.length === 0;
        if (done) finishDiagnostic(rt);

        sendJson(res, 200, {
          ok: true,
          progress: diagnosticProgress(rt),
          done,
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/undo") {
        const action = rt.lastAction;
        if (!action) {
          sendJson(res, 400, { ok: false, error: "Nothing to undo" });
          return;
        }
        const idx = rt.report.categorizations.findIndex(
          (c) =>
            c.cropId === action.entry.cropId &&
            c.matcherAssignedFormation === action.entry.matcherAssignedFormation &&
            c.category === action.entry.category,
        );
        if (idx >= 0) {
          rt.report.categorizations.splice(idx, 1);
        }
        const restored = rt.queue.find((c) => c.caseKey === action.caseKey);
        if (restored && !rt.remaining.some((c) => c.caseKey === action.caseKey)) {
          rt.remaining.unshift(restored);
        }
        rt.finished = false;
        rt.report.completedAt = null;
        writeDiagnosticReport(rt.report, rt.reportPath);
        rt.lastAction = null;
        sendJson(res, 200, {
          ok: true,
          case: restored ? serializeCase(restored) : null,
          progress: diagnosticProgress(rt),
          mode: "diagnostic",
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/quit") {
        finishDiagnostic(rt);
        sendJson(res, 200, {
          ok: true,
          progress: diagnosticProgress(rt),
        });
        setTimeout(() => process.exit(0), 150);
        return;
      }

      // Review-only endpoints stay unavailable in diagnostic mode.
      if (
        method === "POST" &&
        (url.pathname === "/api/confirm" || url.pathname === "/api/skip")
      ) {
        sendJson(res, 400, {
          ok: false,
          error: "Confirm/skip disabled in diagnostic mode — use F/C/A/O",
        });
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

async function listen(handler: (req: IncomingMessage, res: ServerResponse) => void, port: number) {
  return new Promise<number>((resolve, reject) => {
    let attempt = 0;
    const tryListen = () => {
      const tryPort = port + attempt;
      const server = createServer(handler);
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attempt < MAX_PORT_TRIES - 1) {
          attempt += 1;
          tryListen();
        } else {
          reject(err);
        }
      });
      server.listen(tryPort, "127.0.0.1", () => resolve(tryPort));
    };
    tryListen();
  });
}

async function mainReview(cli: CliOptions): Promise<void> {
  const playbook = parsePlaybookArg(cli.playbook);

  console.log(`Loading REVIEW cases for ${playbook}…`);
  const data = await loadReviewData(playbook);
  const overridesPath = overridesPathFor(data.reference);
  console.log(`Matching report: ${data.matchingReportPath}`);
  console.log(`Confirmation write path (matching-overrides): ${overridesPath}`);

  const state = loadSessionState(playbook);
  const caseKeySet = new Set(data.cases.map((c) => c.caseKey));
  // Drop stale resume keys after rematch (confirmed crops leave the REVIEW report).
  state.reviewed = state.reviewed.filter((k) => caseKeySet.has(k));
  state.skipped = state.skipped.filter((s) => caseKeySet.has(caseKey(s.formation, s.cropId)));
  saveSessionState(state);

  const rt: SessionRuntime = {
    data,
    state,
    lastAction: null,
    caseStartedAt: null,
  };

  const progress = progressFromState(state, data.cases.length);
  console.log(
    `Session: ${progress.reviewed} reviewed, ${progress.skipped} skipped, ${progress.remaining} remaining`,
  );

  const boundPort = await listen(createReviewApp(rt), cli.port);
  console.log(`\nReview UI: http://127.0.0.1:${boundPort}`);
  console.log("Keyboard: 1/2/3 confirm · Enter/#1 · S skip · N picker · ← undo · Q quit\n");
}

async function mainDiagnostic(cli: CliOptions): Promise<void> {
  const playbook = parsePlaybookArg(cli.playbook);

  console.log(`Loading REVIEW cases for ${playbook} (diagnostic mode)…`);
  const data = await loadReviewData(playbook);

  // Read-only — do not mutate or save session state.
  const state = loadSessionState(playbook);
  const resolved = resolveSkippedCases(state.skipped, data.cases);
  if (resolved.length === 0) {
    console.error(
      `No skipped cases resolve to current REVIEW output for ${playbook}. ` +
        `State has ${state.skipped.length} skipped; matching report has ${data.cases.length} REVIEW cases.`,
    );
    process.exit(1);
  }

  const rng = createRng(cli.seed ?? undefined);
  const sample = sampleItems(resolved, DIAGNOSTIC_SAMPLE_SIZE, rng);
  const report = createDiagnosticReport({
    playbook,
    sampleSize: sample.length,
    totalSkippedInState: state.skipped.length,
    seed: cli.seed,
  });
  const reportPath = reportPathFor(playbook, report.startedAt);
  writeDiagnosticReport(report, reportPath);

  const rt: DiagnosticRuntime = {
    mode: "diagnostic",
    data,
    queue: sample,
    remaining: [...sample],
    report,
    reportPath,
    lastAction: null,
    finished: false,
  };

  console.log(
    `Diagnostic sample: ${sample.length} of ${state.skipped.length} skipped` +
      (cli.seed != null ? ` (seed=${cli.seed})` : ""),
  );
  console.log(`Report: ${reportPath}`);
  console.log("Session state will NOT be modified.");

  const boundPort = await listen(createDiagnosticApp(rt), cli.port);
  console.log(`\nDiagnostic UI: http://127.0.0.1:${boundPort}`);
  console.log("Keyboard: F formation · C wrong top3 · A ambiguous · O other · ← undo · Q quit\n");
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  if (cli.list) {
    printPlaybookList();
    return;
  }
  if (cli.mode === "diagnostic") {
    await mainDiagnostic(cli);
  } else {
    await mainReview(cli);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
