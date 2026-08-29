"use client";

import Link from "next/link";
import { PlayArtImage } from "@/components/playbook/PlayArtImage";
import { PUBLIC_PLAYBOOK_GAME_VERSION } from "@/lib/publicPlaybooksServer";
import { resolvePlayArtUrl } from "@/lib/playArtUrl";
import type { CatalogSideOfBall } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PublicPlayTileProps = {
  href: string;
  playbook: string;
  formation: string;
  formationType: string;
  playName: string;
  sideOfBall: CatalogSideOfBall;
};

export function PublicPlayTile({
  href,
  playbook,
  formation,
  formationType,
  playName,
  sideOfBall,
}: PublicPlayTileProps) {
  const art = resolvePlayArtUrl({
    playbook,
    formation,
    formationType,
    playName,
    gameVersion: PUBLIC_PLAYBOOK_GAME_VERSION,
    side: sideOfBall,
  });

  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[10rem] flex-col rounded-xl border border-slate-700 bg-slate-900 p-3 transition-colors",
        "hover:border-emerald-600/50 hover:bg-slate-800/70",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
      )}
    >
      <div className="min-w-0">
        <PlayArtImage src={art?.src ?? null} source={art?.source} alt={playName} />
      </div>
      <div className="mt-3 flex min-w-0 flex-1 flex-col items-center justify-center text-center">
        <span className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
          {playName}
        </span>
      </div>
    </Link>
  );
}
