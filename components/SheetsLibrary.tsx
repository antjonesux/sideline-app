"use client";

import type { PlaySheetListItem } from "@/lib/playSheetTypes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export function SheetsLibrary() {
  const qc = useQueryClient();
  const [dupName, setDupName] = useState<{ id: string; name: string } | null>(
    null,
  );

  const { data: sheets = [], isPending } = useQuery({
    queryKey: ["playsheets-all"],
    queryFn: async () => {
      const res = await fetch("/api/playsheets");
      if (!res.ok) return [];
      return (await res.json()) as PlaySheetListItem[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/playsheets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playsheets-all"] }),
  });

  const dup = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch("/api/playsheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFrom: id, name }),
      });
      if (!res.ok) throw new Error("dup failed");
      return (await res.json()) as { id: string; offensive_scheme_id: string };
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["playsheets-all"] });
      setDupName(null);
      window.location.href = `/scheme/${created.offensive_scheme_id}/playsheet/${created.id}`;
    },
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-white/10 bg-black/30 px-4 py-6 md:px-10">
        <Link href="/" className="font-mono text-xs text-[var(--accent-soft)]">
          ← Home
        </Link>
        <h1 className="mt-3 font-display text-3xl text-[var(--chalk)]">
          Play sheets library
        </h1>
        <p className="mt-2 font-mono text-sm text-[var(--chalk-muted)]">
          Saved call sheets by matchup. Tap to open, duplicate to iterate, delete
          to clean up.
        </p>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-8 md:px-10">
        {isPending ? (
          <p className="font-mono text-sm text-[var(--chalk-muted)]">
            Loading…
          </p>
        ) : null}
        {!isPending && sheets.length === 0 ? (
          <p className="font-mono text-sm text-[var(--chalk-muted)]">
            No sheets yet. Build one from a game plan.
          </p>
        ) : null}
        {sheets.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              href={`/scheme/${s.offensive_scheme_id}/playsheet/${s.id}`}
              className="group flex-1"
            >
              <p className="font-display text-lg text-[var(--chalk)] group-hover:text-[var(--accent-soft)]">
                {s.name}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--chalk-muted)]">
                {s.play_count} plays · vs {s.defensive_scheme}
                {s.opponent_team ? ` · ${s.opponent_team}` : ""}
              </p>
              {s.updated_at ? (
                <p className="mt-0.5 font-mono text-[10px] text-[var(--chalk-muted)]">
                  Updated {new Date(s.updated_at).toLocaleString()}
                </p>
              ) : null}
            </Link>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setDupName({
                    id: s.id,
                    name: `${s.name} (copy)`,
                  })
                }
                className="rounded border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase text-[var(--chalk-muted)]"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Delete this play sheet?")
                  ) {
                    del.mutate(s.id);
                  }
                }}
                className="rounded border border-red-500/30 px-3 py-1.5 font-mono text-[10px] uppercase text-red-300/90"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </main>

      {dupName ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/15 bg-[var(--bg)] p-6">
            <h2 className="font-display text-lg text-[var(--chalk)]">
              Duplicate sheet
            </h2>
            <input
              type="text"
              value={dupName.name}
              onChange={(e) =>
                setDupName((d) => (d ? { ...d, name: e.target.value } : d))
              }
              className="mt-4 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--chalk)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDupName(null)}
                className="rounded border border-white/15 px-3 py-2 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  dup.mutate({
                    id: dupName.id,
                    name: dupName.name.trim() || "Copy",
                  })
                }
                className="rounded border border-[var(--accent)]/40 px-3 py-2 font-mono text-xs text-[var(--accent-soft)]"
              >
                Create copy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
