"use client";

import { useState } from "react";

/**
 * Fixed-size play-art thumb. On load failure, hides the `<img>` but keeps the
 * reserved slot so row layout does not shift. When `src` is null, renders nothing
 * (text-only browse row).
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
    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-900/80" aria-hidden={failed}>
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
