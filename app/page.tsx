"use client";

import { SchemeCard } from "@/components/SchemeCard";
import { fetchSchemesWithCache } from "@/lib/fetchSchemes";
import { getStaticSchemes } from "@/lib/staticData";
import type { Scheme } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ["schemes"],
    queryFn: fetchSchemesWithCache,
    placeholderData: (): Scheme[] => getStaticSchemes(),
    staleTime: 30 * 60_000,
  });

  const schemes = data ?? getStaticSchemes();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/30 px-4 py-8 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          CFB26 · Coordinator mode
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-[var(--chalk)] md:text-6xl">
          The Sideline
        </h1>
        <p className="mt-4 max-w-xl font-mono text-sm text-[var(--chalk-muted)]">
          Scheme-based play calling. Pick your system. The call sheet leads.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-10">
        <h2 className="mb-6 font-display text-2xl text-[var(--chalk)]">
          Offensive schemes
        </h2>

        <ul className="grid gap-5 md:grid-cols-2">
          {schemes.map((scheme) => (
            <li key={scheme.id}>
              <SchemeCard scheme={scheme} />
            </li>
          ))}
        </ul>

        <footer className="mt-16 border-t border-white/10 pt-8 font-mono text-[11px] text-[var(--chalk-muted)]">
          First load caches scheme data in this browser for offline or unstable
          connections.
        </footer>
      </main>
    </div>
  );
}
