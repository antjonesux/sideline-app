/**
 * Preprocessing for VTracer input (prototype only).
 * Diagram crop matches matcher V2/V3 region on 626×355 play cards.
 */
import sharp from "sharp";

/** Same region as `V2_DIAGRAM_REGION` in image-similarity-v2.ts (not imported — keep prototype isolated). */
export const DIAGRAM_REGION = {
  left: 40,
  top: 72,
  width: 546,
  height: 250,
} as const;

export type PreprocessMode =
  /** Crop + quantize + optional upscale; keep field/template background. */
  | "full"
  /** Crop + upscale + near-white background → transparent (ink emphasis). */
  | "ink";

export type PreprocessOptions = {
  mode?: PreprocessMode;
  /** Target palette size for sharp.palette() / PNG quantization. */
  colors?: number;
  /** Upscale factor before tracing (1 = no upscale). */
  scale?: number;
  /** Near-white threshold for ink mode (0–255). */
  inkBgThreshold?: number;
};

export type PreprocessResult = {
  buffer: Buffer;
  width: number;
  height: number;
  mode: PreprocessMode;
  colors: number;
  scale: number;
};

function diagramRegionForSize(width: number, height: number) {
  if (width === 626 && height === 355) {
    return { ...DIAGRAM_REGION };
  }
  return {
    left: Math.round(width * (DIAGRAM_REGION.left / 626)),
    top: Math.round(height * (DIAGRAM_REGION.top / 355)),
    width: Math.max(1, Math.round(width * (DIAGRAM_REGION.width / 626))),
    height: Math.max(1, Math.round(height * (DIAGRAM_REGION.height / 355))),
  };
}

/**
 * Crop to diagram region, optionally make near-white transparent (ink mode),
 * quantize palette, and Lanczos-upscale.
 */
export async function preprocessPlayArt(
  inputPath: string,
  options: PreprocessOptions = {},
): Promise<PreprocessResult> {
  const mode: PreprocessMode = options.mode ?? "full";
  const colors = options.colors ?? 12;
  const scale = options.scale ?? 2;
  const inkBgThreshold = options.inkBgThreshold ?? 245;

  const meta = await sharp(inputPath).metadata();
  const width = meta.width ?? 626;
  const height = meta.height ?? 355;
  const region = diagramRegionForSize(width, height);

  let pipeline = sharp(inputPath).extract({
    left: region.left,
    top: region.top,
    width: region.width,
    height: region.height,
  });

  if (mode === "ink") {
    const { data, info } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const out = Buffer.from(data);
    for (let i = 0; i < out.length; i += 4) {
      const r = out[i]!;
      const g = out[i + 1]!;
      const b = out[i + 2]!;
      if (r >= inkBgThreshold && g >= inkBgThreshold && b >= inkBgThreshold) {
        out[i + 3] = 0;
      }
    }

    pipeline = sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    });
  }

  if (scale !== 1) {
    const targetW = Math.round(region.width * scale);
    const targetH = Math.round(region.height * scale);
    pipeline = pipeline.resize(targetW, targetH, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    });
  }

  // Palette quantization via PNG with limited colors (sharp uses libimagequant when available).
  const buffer = await pipeline
    .png({
      palette: true,
      colors,
      quality: 100,
      effort: 10,
    })
    .toBuffer();

  const outMeta = await sharp(buffer).metadata();

  return {
    buffer,
    width: outMeta.width ?? Math.round(region.width * scale),
    height: outMeta.height ?? Math.round(region.height * scale),
    mode,
    colors,
    scale,
  };
}
