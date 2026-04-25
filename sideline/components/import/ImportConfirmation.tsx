"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        <h2 className="font-heading text-4xl font-bold uppercase tracking-wide text-white">{playCount} plays imported</h2>
        <p className="mx-auto mt-3 max-w-md font-body text-sm text-slate-400">
          Game data has been logged. Scenarios and field zones were auto-derived. Your analytics are ready.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:mx-auto sm:max-w-md">
        <Button asChild variant="secondary" className="w-full py-3 text-sm">
          <Link href={`/film/${sessionId}`}>View game summary</Link>
        </Button>
        <Button asChild variant="default" className="w-full py-3 text-sm">
          <Link href="/tendencies">View tendencies</Link>
        </Button>
      </div>
    </div>
  );
}
