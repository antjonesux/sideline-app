"use client";

import { useState } from "react";

/**
 * Featured play-art region for Add Play browse. On load failure, hides the `<img>`
 * but keeps the reserved aspect slot so row layout does not shift. When `src` is
 * null, renders nothing (text-only browse row).
 */
export function PlayArtImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-900/80"
      aria-hidden={failed}
    >
      {failed ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- remote cfb.fan art; no next/image domain allowlist
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
