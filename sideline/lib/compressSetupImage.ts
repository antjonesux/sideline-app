const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_EDGE_PX = 1600;
const WEBP_QUALITY = 0.82;

export type CompressSetupImageErrorCode = "type" | "too_large";

export class CompressSetupImageError extends Error {
  readonly code: CompressSetupImageErrorCode;

  constructor(code: CompressSetupImageErrorCode, message: string) {
    super(message);
    this.name = "CompressSetupImageError";
    this.code = code;
  }
}

function isAcceptedType(file: File): boolean {
  if (ACCEPT_TYPES.has(file.type)) return true;
  const lower = file.name.trim().toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new CompressSetupImageError("type", "Could not read image"));
    };
    img.src = url;
  });
}

async function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", quality);
  });
  if (!blob) throw new CompressSetupImageError("type", "Could not encode image");
  return blob;
}

/**
 * Validate + resize (longest edge ≤ 1600px) + re-encode as WebP (~0.82).
 * Output must stay under the 5MB `play-setup-images` bucket limit.
 */
export async function compressSetupImage(file: File): Promise<File> {
  if (!isAcceptedType(file)) {
    throw new CompressSetupImageError("type", "Unsupported type");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new CompressSetupImageError("too_large", "File too large");
  }

  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CompressSetupImageError("type", "Could not process image");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = WEBP_QUALITY;
  let blob = await canvasToWebpBlob(canvas, quality);
  while (blob.size > MAX_OUTPUT_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToWebpBlob(canvas, quality);
  }
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new CompressSetupImageError("too_large", "Compressed image still too large");
  }

  const base = file.name.replace(/\.[^.]+$/, "").trim() || "setup";
  return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
}

export function isSetupImageAcceptable(file: File): CompressSetupImageErrorCode | null {
  if (!isAcceptedType(file)) return "type";
  if (file.size > MAX_INPUT_BYTES) return "too_large";
  return null;
}
