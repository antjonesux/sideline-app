import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { cardPositions, pixelRect, type VideoCropProfile } from "./crop-profile";
import type { StableScreen } from "./types";

function whichFfmpeg(): string {
  for (const candidate of ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]) {
    const probe = spawnSync(candidate, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error("ffmpeg is required for video preparation (brew install ffmpeg).");
}

function whichFfprobe(): string {
  for (const candidate of ["ffprobe", "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"]) {
    const probe = spawnSync(candidate, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error("ffprobe is required for video preparation (brew install ffmpeg).");
}

export type VideoProbe = {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
};

export function probeVideo(videoPath: string): VideoProbe {
  const ffprobe = whichFfprobe();
  const result = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,avg_frame_rate,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      videoPath,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  const parsed = JSON.parse(result.stdout) as {
    streams?: Array<{
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      duration?: string;
    }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`ffprobe: missing video stream dimensions for ${videoPath}`);
  }
  const durationSec = Number(stream.duration ?? parsed.format?.duration ?? NaN);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error(`ffprobe: invalid duration for ${videoPath}`);
  }
  let fps = 30;
  const rate = stream.avg_frame_rate ?? "30/1";
  const [num, den] = rate.split("/").map(Number);
  if (num > 0 && den > 0) fps = num / den;
  return {
    durationSec,
    width: stream.width,
    height: stream.height,
    fps,
  };
}

export function formatTimestamp(sec: number): string {
  const totalMs = Math.round(sec * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")}.` +
    `${String(ms).padStart(3, "0")}`
  );
}

/** Prior diagnostic gate (~0.5s). Holds under this count as short-hold recoveries. */
export const PRIOR_MIN_HOLD_SEC = 0.5;

/**
 * Fingerprint three play-card regions. Primary change/dedupe signal —
 * not whole-frame similarity (same formation layout must not collapse pages).
 */
export async function threeCardFingerprint(
  imagePath: string,
  profile: VideoCropProfile,
): Promise<{ hash: string; bytes: Buffer }> {
  const { data, info } = await sharp(imagePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const parts: Buffer[] = [];
  for (const pos of cardPositions()) {
    const rect = pixelRect(info.width, info.height, profile.cards[pos]);
    const card = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extract(rect)
      .resize(96, 56, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
    parts.push(card);
  }
  const bytes = Buffer.concat(parts);
  return { hash: createHash("sha256").update(bytes).digest("hex"), bytes };
}

export function fingerprintDistance(a: Buffer, b: Buffer): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 1;
  let diff = 0;
  for (let i = 0; i < n; i += 1) diff += Math.abs(a[i] - b[i]);
  return diff / n;
}

/** Lightweight Laplacian-ish sharpness on the three-card band. */
export async function cardBandSharpness(
  imagePath: string,
  profile: VideoCropProfile,
): Promise<number> {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width ?? profile.frameWidth;
  const h = meta.height ?? profile.frameHeight;
  const left = pixelRect(w, h, profile.cards.left);
  const right = pixelRect(w, h, profile.cards.right);
  const band = {
    left: left.left,
    top: left.top,
    width: right.left + right.width - left.left,
    height: left.height,
  };
  const { data, info } = await sharp(imagePath)
    .extract(band)
    .grayscale()
    .resize(160, 48, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < info.height - 1; y += 1) {
    for (let x = 1; x < info.width - 1; x += 1) {
      const i = y * info.width + x;
      const lap =
        -4 * data[i] +
        data[i - 1] +
        data[i + 1] +
        data[i - info.width] +
        data[i + info.width];
      sum += lap;
      sumSq += lap * lap;
      n += 1;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export type StableDetectResult = {
  /** Stage A broad candidates (pre Stage B validation). */
  candidates: StableScreen[];
  sampleCount: number;
  sampleFps: number;
  broadRuns: number;
  shortHoldCandidates: number;
  duplicateScreensRemoved: number;
};

type Fingerprint = { hash: string; bytes: Buffer };

/**
 * Stage A — broad candidate recovery.
 *
 * Dense sampling + three-card fingerprint plateaus. Accepts short holds
 * (including single-sample plateaus flanked by different fingerprints).
 * Does NOT accept candidates as final — Stage B validates.
 */
export async function detectStableScreens(input: {
  videoPath: string;
  profile: VideoCropProfile;
  samplesDir: string;
  framesDir: string;
  sampleFps?: number;
  fingerprintMatchThreshold?: number;
}): Promise<StableDetectResult> {
  const ffmpeg = whichFfmpeg();
  const sampleFps = input.sampleFps ?? 8;
  const fingerprintMatchThreshold = input.fingerprintMatchThreshold ?? 4;

  if (existsSync(input.samplesDir)) {
    rmSync(input.samplesDir, { recursive: true, force: true });
  }
  if (existsSync(input.framesDir)) {
    rmSync(input.framesDir, { recursive: true, force: true });
  }
  mkdirSync(input.samplesDir, { recursive: true });
  mkdirSync(input.framesDir, { recursive: true });

  const samplePattern = join(input.samplesDir, "sample-%06d.png");
  const extract = spawnSync(
    ffmpeg,
    ["-y", "-i", input.videoPath, "-vf", `fps=${sampleFps}`, "-q:v", "3", samplePattern],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (extract.status !== 0) {
    throw new Error(
      `ffmpeg sample extract failed: ${(extract.stderr || extract.stdout || "").trim()}`,
    );
  }

  const sampleFiles = readdirSync(input.samplesDir)
    .filter((n) => n.startsWith("sample-") && n.endsWith(".png"))
    .sort();
  if (sampleFiles.length === 0) {
    throw new Error("No sample frames extracted from video");
  }

  console.log(`  fingerprinting ${sampleFiles.length} samples @ ${sampleFps}fps…`);
  const prints: Fingerprint[] = [];
  for (const name of sampleFiles) {
    prints.push(await threeCardFingerprint(join(input.samplesDir, name), input.profile));
  }

  const sameAs = (i: number, j: number): boolean => {
    if (prints[i].hash === prints[j].hash) return true;
    return fingerprintDistance(prints[i].bytes, prints[j].bytes) <= fingerprintMatchThreshold;
  };

  type Run = { start: number; end: number; hash: string };
  const allRuns: Run[] = [];
  let runStart = 0;
  for (let i = 1; i < prints.length; i += 1) {
    if (!sameAs(i, i - 1)) {
      allRuns.push({ start: runStart, end: i - 1, hash: prints[runStart].hash });
      runStart = i;
    }
  }
  allRuns.push({
    start: runStart,
    end: prints.length - 1,
    hash: prints[runStart].hash,
  });

  // Stage A: keep every plateau of length ≥ 1 that is a real content change
  // (differs from adjacent plateaus). Single-sample plateaus = short holds.
  const broadRuns: Run[] = [];
  for (let ri = 0; ri < allRuns.length; ri += 1) {
    const run = allRuns[ri];
    const len = run.end - run.start + 1;
    const prev = ri > 0 ? allRuns[ri - 1] : null;
    const next = ri + 1 < allRuns.length ? allRuns[ri + 1] : null;
    const differsFromPrev =
      !prev ||
      fingerprintDistance(prints[run.start].bytes, prints[prev.start].bytes) >
        fingerprintMatchThreshold;
    const differsFromNext =
      !next ||
      fingerprintDistance(prints[run.start].bytes, prints[next.start].bytes) >
        fingerprintMatchThreshold;
    if (len >= 2) {
      broadRuns.push(run);
      continue;
    }
    // Single-sample plateau: only if clearly between different neighbors
    // (or at edge after a change). Filters pure noise flicker.
    if (differsFromPrev && differsFromNext) {
      broadRuns.push(run);
    }
  }

  // Dedupe by three-card fingerprint (operator backtrack).
  const kept: Run[] = [];
  let duplicateScreensRemoved = 0;
  for (const run of broadRuns) {
    let dup = false;
    for (const prev of kept) {
      if (
        prev.hash === run.hash ||
        fingerprintDistance(prints[prev.start].bytes, prints[run.start].bytes) <=
          fingerprintMatchThreshold
      ) {
        dup = true;
        break;
      }
    }
    if (dup) {
      duplicateScreensRemoved += 1;
      continue;
    }
    kept.push(run);
  }

  const candidates: StableScreen[] = [];
  let shortHoldCandidates = 0;

  for (let i = 0; i < kept.length; i += 1) {
    const run = kept[i];
    const durationSec = (run.end - run.start + 1) / sampleFps;
    const shortHold = durationSec < PRIOR_MIN_HOLD_SEC;
    if (shortHold) shortHoldCandidates += 1;

    // Score each sample in the run: prefer high sharpness + low neighbor motion.
    let bestIdx = run.start + Math.max(0, Math.floor((run.end - run.start) * 0.75));
    let bestScore = -Infinity;
    for (let idx = run.start; idx <= run.end; idx += 1) {
      const path = join(input.samplesDir, sampleFiles[idx]);
      const sharp = await cardBandSharpness(path, input.profile);
      let motion = 0;
      if (idx > run.start) {
        motion += fingerprintDistance(prints[idx].bytes, prints[idx - 1].bytes);
      }
      if (idx < run.end) {
        motion += fingerprintDistance(prints[idx].bytes, prints[idx + 1].bytes);
      }
      // Prefer late/middle of run slightly (avoid transition onset).
      const lateBias = (idx - run.start) / Math.max(1, run.end - run.start);
      const score = sharp - motion * 40 + lateBias * 5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }

    const timestampSec = bestIdx / sampleFps;
    const frameName = `candidate-${String(i + 1).padStart(4, "0")}.png`;
    const framePath = join(input.framesDir, frameName);
    const grab = spawnSync(
      ffmpeg,
      [
        "-y",
        "-ss",
        Math.max(0, timestampSec).toFixed(3),
        "-i",
        input.videoPath,
        "-frames:v",
        "1",
        "-update",
        "1",
        framePath,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    if (grab.status !== 0 || !existsSync(framePath)) {
      throw new Error(
        `ffmpeg full-res frame extract failed at ${timestampSec.toFixed(3)}s: ` +
          `${(grab.stderr || grab.stdout || "").trim()}`,
      );
    }

    const samplePath = join(input.samplesDir, sampleFiles[bestIdx]);
    const sharpnessScore = await cardBandSharpness(framePath, input.profile);
    let localMotionScore = 0;
    if (bestIdx > 0) {
      localMotionScore += fingerprintDistance(prints[bestIdx].bytes, prints[bestIdx - 1].bytes);
    }
    if (bestIdx + 1 < prints.length) {
      localMotionScore += fingerprintDistance(prints[bestIdx].bytes, prints[bestIdx + 1].bytes);
    }

    candidates.push({
      screenIndex: i + 1,
      timestampSec,
      timestampLabel: formatTimestamp(timestampSec),
      samplePath,
      framePath,
      stableDurationSec: durationSec,
      shortHold,
      fingerprintHash: prints[run.start].hash,
      sharpnessScore,
      localMotionScore,
    });
  }

  writeFileSync(
    join(input.framesDir, "_detection.json"),
    `${JSON.stringify(
      {
        stage: "A_broad_candidates",
        sampleFps,
        fingerprintMatchThreshold,
        priorMinHoldSec: PRIOR_MIN_HOLD_SEC,
        sampleCount: sampleFiles.length,
        allRuns: allRuns.length,
        broadRuns: broadRuns.length,
        shortHoldCandidates,
        duplicateScreensRemoved,
        candidates: candidates.map((s) => ({
          screenIndex: s.screenIndex,
          timestampSec: s.timestampSec,
          stableDurationSec: s.stableDurationSec,
          shortHold: s.shortHold,
          sharpnessScore: s.sharpnessScore,
          fingerprintHash: s.fingerprintHash,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    candidates,
    sampleCount: sampleFiles.length,
    sampleFps,
    broadRuns: broadRuns.length,
    shortHoldCandidates,
    duplicateScreensRemoved,
  };
}

export function readFileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
