"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicPlaybookCard } from "@/components/marketing/PublicPlaybookCard";
import { stripFormationCategoryPrefix } from "@/lib/stripFormationCategoryPrefix";
import type {
  PublicGlobalSearchData,
  PublicSearchFormationResult,
  PublicSearchPlayResult,
} from "@/lib/publicPlaybooksServer";
import { cn } from "@/lib/utils";

const DEFAULT_VISIBLE = 5;

function sideQuery(side: "offense" | "defense"): string {
  return side === "defense" ? "?side=defense" : "";
}

function SearchSection({
  title,
  total,
  children,
  expanded,
  onToggle,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (total === 0) return null;

  return (
    <section className="mt-10 first:mt-0 sm:mt-12">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-2">{children}</ul>
      {total > DEFAULT_VISIBLE ? (
        <button
          type="button"
          className="mt-3 font-body text-sm text-emerald-400 hover:text-emerald-300"
          onClick={onToggle}
        >
          {expanded ? "Show less" : `See all ${total}`}
        </button>
      ) : null}
    </section>
  );
}

function FormationSearchCard({ item }: { item: PublicSearchFormationResult }) {
  const displayName = stripFormationCategoryPrefix(item.name, item.category);
  const href = `/playbooks/${encodeURIComponent(item.playbook)}/${encodeURIComponent(item.name)}${sideQuery(item.side_of_ball)}`;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex min-h-[3.25rem] flex-col justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 transition-colors",
          "hover:border-emerald-600/50 hover:bg-slate-800/70",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
        )}
      >
        <span className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-slate-100">
          {displayName}
        </span>
        <span className="mt-0.5 font-body text-xs text-slate-500">{item.playbook}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-600">{item.category}</span>
      </Link>
    </li>
  );
}

function PlaySearchCard({ item }: { item: PublicSearchPlayResult }) {
  const href = `/playbooks/${encodeURIComponent(item.playbook)}/${encodeURIComponent(item.formation)}/${encodeURIComponent(item.name)}${sideQuery(item.side_of_ball)}`;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex min-h-[3.25rem] flex-col justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 transition-colors",
          "hover:border-emerald-600/50 hover:bg-slate-800/70",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
        )}
      >
        <span className="font-mono text-sm font-medium uppercase tracking-wide text-slate-100">{item.name}</span>
        <span className="mt-0.5 font-body text-xs text-slate-500">
          {item.formation} · {item.playbook}
        </span>
      </Link>
    </li>
  );
}

type PublicGlobalSearchResultsProps = {
  query: string;
  data: PublicGlobalSearchData;
};

export function PublicGlobalSearchResults({ query, data }: PublicGlobalSearchResultsProps) {
  const [expandedPlaybooks, setExpandedPlaybooks] = useState(false);
  const [expandedFormations, setExpandedFormations] = useState(false);
  const [expandedPlays, setExpandedPlays] = useState(false);

  const hasAny =
    data.playbooks.length > 0 || data.formations.length > 0 || data.plays.length > 0;

  if (!hasAny) {
    return (
      <p className="font-body text-sm text-slate-400" role="status">
        No results for &lsquo;{query}&rsquo;
      </p>
    );
  }

  const visiblePlaybooks = expandedPlaybooks
    ? data.playbooks
    : data.playbooks.slice(0, DEFAULT_VISIBLE);
  const visibleFormations = expandedFormations
    ? data.formations
    : data.formations.slice(0, DEFAULT_VISIBLE);
  const visiblePlays = expandedPlays ? data.plays : data.plays.slice(0, DEFAULT_VISIBLE);

  return (
    <>
      <SearchSection
        title="Playbooks"
        total={data.playbooks.length}
        expanded={expandedPlaybooks}
        onToggle={() => setExpandedPlaybooks((v) => !v)}
      >
        {visiblePlaybooks.map((item) => (
          <li key={`${item.side_of_ball}:${item.name}`}>
            <PublicPlaybookCard name={item.name} side={item.side_of_ball} />
          </li>
        ))}
      </SearchSection>

      <SearchSection
        title="Formations"
        total={data.formations.length}
        expanded={expandedFormations}
        onToggle={() => setExpandedFormations((v) => !v)}
      >
        {visibleFormations.map((item) => (
          <FormationSearchCard
            key={`${item.side_of_ball}:${item.playbook}:${item.name}`}
            item={item}
          />
        ))}
      </SearchSection>

      <SearchSection
        title="Plays"
        total={data.plays.length}
        expanded={expandedPlays}
        onToggle={() => setExpandedPlays((v) => !v)}
      >
        {visiblePlays.map((item) => (
          <PlaySearchCard
            key={`${item.side_of_ball}:${item.playbook}:${item.formation}:${item.name}`}
            item={item}
          />
        ))}
      </SearchSection>
    </>
  );
}

type PublicWithinPlaybookSearchResultsProps = {
  query: string;
  playbookId: string;
  side: "offense" | "defense";
  formations: PublicSearchFormationResult[];
  plays: PublicSearchPlayResult[];
};

export function PublicWithinPlaybookSearchResults({
  query,
  playbookId,
  side,
  formations,
  plays,
}: PublicWithinPlaybookSearchResultsProps) {
  const [expandedFormations, setExpandedFormations] = useState(false);
  const [expandedPlays, setExpandedPlays] = useState(false);

  const scopedFormations = formations.map((f) => ({ ...f, playbook: playbookId, side_of_ball: side }));
  const scopedPlays = plays.map((p) => ({ ...p, playbook: playbookId, side_of_ball: side }));

  const hasAny = scopedFormations.length > 0 || scopedPlays.length > 0;

  if (!hasAny) {
    return (
      <p className="font-body text-sm text-slate-400" role="status">
        No results for &lsquo;{query}&rsquo;
      </p>
    );
  }

  const visibleFormations = expandedFormations
    ? scopedFormations
    : scopedFormations.slice(0, DEFAULT_VISIBLE);
  const visiblePlays = expandedPlays ? scopedPlays : scopedPlays.slice(0, DEFAULT_VISIBLE);

  return (
    <>
      <SearchSection
        title="Formations"
        total={scopedFormations.length}
        expanded={expandedFormations}
        onToggle={() => setExpandedFormations((v) => !v)}
      >
        {visibleFormations.map((item) => (
          <FormationSearchCard key={`${item.playbook}:${item.name}`} item={item} />
        ))}
      </SearchSection>

      <SearchSection
        title="Plays"
        total={scopedPlays.length}
        expanded={expandedPlays}
        onToggle={() => setExpandedPlays((v) => !v)}
      >
        {visiblePlays.map((item) => (
          <PlaySearchCard key={`${item.formation}:${item.name}`} item={item} />
        ))}
      </SearchSection>
    </>
  );
}

export function filterWithinPlaybookSearch(
  queryRaw: string,
  catalog: {
    formationGroups: { category: string; formations: string[] }[];
    plays: { play_name: string; formation: string; category: string }[];
  },
): { formations: PublicSearchFormationResult[]; plays: PublicSearchPlayResult[] } {
  const q = queryRaw.trim().toLowerCase();
  if (q.length < 2) {
    return { formations: [], plays: [] };
  }

  const formationSeen = new Set<string>();
  const formations: PublicSearchFormationResult[] = [];

  for (const group of catalog.formationGroups) {
    for (const formation of group.formations) {
      const display = stripFormationCategoryPrefix(formation, group.category);
      const haystack = `${formation} ${display} ${group.category}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      const key = formation.toLowerCase();
      if (formationSeen.has(key)) continue;
      formationSeen.add(key);
      formations.push({
        name: formation,
        playbook: "",
        category: group.category,
        side_of_ball: "offense",
      });
    }
  }

  const playSeen = new Set<string>();
  const plays: PublicSearchPlayResult[] = [];

  for (const play of catalog.plays) {
    if (!play.play_name.toLowerCase().includes(q)) continue;
    const key = `${play.formation.toLowerCase()}\t${play.play_name.toLowerCase()}`;
    if (playSeen.has(key)) continue;
    playSeen.add(key);
    plays.push({
      name: play.play_name,
      formation: play.formation,
      playbook: "",
      side_of_ball: "offense",
    });
  }

  formations.sort((a, b) => a.name.localeCompare(b.name));
  plays.sort((a, b) => a.name.localeCompare(b.name) || a.formation.localeCompare(b.formation));

  return { formations, plays };
}
