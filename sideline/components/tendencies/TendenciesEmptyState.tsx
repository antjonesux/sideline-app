"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  playbookName: string;
};

export function TendenciesEmptyState({ playbookName }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 flex min-h-[280px] flex-col items-center justify-center p-6 text-center sm:px-8">
      <p className="max-w-md font-sans text-base font-normal text-slate-400">
        No games logged with the{" "}
        <span className="font-mono text-base font-medium text-white">{playbookName}</span> play sheet yet.
      </p>
      <Button asChild variant="default" className="mt-6 px-5 py-3 text-sm">
        <Link href="/film">Go to Film Room</Link>
      </Button>
    </div>
  );
}
