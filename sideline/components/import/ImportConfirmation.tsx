"use client";

import Link from "next/link";

type Props = {
  playCount: number;
  sessionId: string;
};

export function ImportConfirmation({ playCount, sessionId }: Props) {
  return (
    <div className="space-y-8 py-6 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-500/10">
        <svg className="size-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="font-display text-4xl tracking-wide text-white">{playCount} Plays Imported</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          Game data has been logged. Scenarios and field zones were auto-derived. Your analytics are ready.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:mx-auto sm:max-w-md">
        <Link
          href={`/film/${sessionId}`}
          className="rounded-lg border border-slate-600 py-3 font-mono text-sm text-slate-200 hover:bg-slate-800"
        >
          View Game Summary
        </Link>
        <Link
          href="/tendencies"
          className="rounded-lg bg-emerald-500/20 py-3 font-mono text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          View Tendencies →
        </Link>
      </div>
    </div>
  );
}
