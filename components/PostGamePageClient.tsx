"use client";

import { PostGameSummary } from "@/components/PostGameSummary";
import { useGameStore } from "@/store/gameStore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PostGamePageClient({
  schemeId,
  sheetId,
  defensiveLabel,
}: {
  schemeId: string;
  sheetId: string;
  defensiveLabel: string;
}) {
  const searchParams = useSearchParams();
  const s = searchParams.get("s");
  const events = useGameStore((x) => x.localTimelineEvents);

  if (!s) {
    return (
      <div className="min-h-screen px-4 py-16">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Missing session. Return to the live game screen and use End game.
        </p>
        <Link
          href={`/scheme/${schemeId}/playsheet/${sheetId}/game`}
          className="mt-4 inline-block font-mono text-sm text-[var(--accent-soft)]"
        >
          ← Live game
        </Link>
      </div>
    );
  }

  return (
    <PostGameSummary
      sessionId={s}
      events={events}
      schemeId={schemeId}
      sheetId={sheetId}
      defensiveLabel={defensiveLabel}
    />
  );
}
