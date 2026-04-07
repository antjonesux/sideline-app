"use client";

import Link from "next/link";
import { useLiveGameStore } from "@/store/liveGameStore";

export default function HomePage() {
  const sessionId = useLiveGameStore((s) => s.sessionId);
  const loggedCount = useLiveGameStore((s) => s.loggedPlays.length);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-5xl tracking-wide text-white">The Sideline</h1>
      <p className="mt-2 text-sm text-slate-400">Live play tracker for CFB26.</p>
      <div className="mt-6 space-y-3">
        {sessionId ? (
          <Link href={`/game/${sessionId}`} className="flex w-full items-center justify-between rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white">
            Resume Game <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{loggedCount} plays</span>
          </Link>
        ) : (
          <Link href="/setup" className="block w-full rounded-xl bg-emerald-700 px-4 py-3 text-center font-semibold text-white">
            Start New Game
          </Link>
        )}
        <Link href="/playsheets" className="block w-full rounded-xl border border-slate-700 px-4 py-3 text-center text-slate-200">
          My Play Sheets
        </Link>
        <Link href="/tendencies" className="block w-full rounded-xl border border-slate-700 px-4 py-3 text-center text-slate-200">
          My Tendencies
        </Link>
      </div>
    </main>
  );
}
