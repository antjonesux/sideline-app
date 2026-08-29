"use client";

import type { PlayArtSource } from "@/lib/playArtUrl";
import { ImageOff } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";

const PLAY_ART_PLACEHOLDER_COPY = "No image available";

/**
 * Featured play-art region for Add Play browse. Preserves the aspect slot when art is
 * missing or fails to load so row layout does not shift. When `src` is null, shows a
 * coach-facing placeholder instead of attempting a load.
 *
 * Owned Sideline art (`source: "owned"`) shows a centered low-opacity watermark
 * overlay at render time — not baked into the asset.
 */
export function PlayArtImage({
  src,
  source,
  alt,
}: {
  src: string | null;
  source?: PlayArtSource;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showPlaceholder = !src || failed;

  const blockImageSave = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  if (showPlaceholder) {
    return (
      <div
        className="@container relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 select-none [-webkit-touch-callout:none]"
        aria-label={PLAY_ART_PLACEHOLDER_COPY}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <ImageOff className="h-8 w-8 shrink-0 text-slate-600" aria-hidden />
          <p className="font-body text-xs text-slate-500">{PLAY_ART_PLACEHOLDER_COPY}</p>
        </div>
      </div>
    );
  }

  const showWatermark = source === "owned" && !failed;

  return (
    <div
      className="@container relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-900/80 select-none [-webkit-touch-callout:none]"
      onContextMenu={blockImageSave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- owned /play-art paths and remote cfb.fan URLs */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain select-none [-webkit-user-drag:none]"
        onContextMenu={blockImageSave}
        onDragStart={blockImageSave}
        onError={() => setFailed(true)}
      />
      {showWatermark ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
          aria-hidden
        >
          <span className="block text-center font-sans font-extrabold uppercase leading-none tracking-[0.2em] text-white opacity-[0.05] text-[length:calc(85cqw/8.8)]">
            SIDELINE.PRO
          </span>
        </div>
      ) : null}
    </div>
  );
}
