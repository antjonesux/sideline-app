import type { PlaybookSummary } from "@/lib/types";
import Link from "next/link";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const days = Math.floor(diff / (86400 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} wk ago`;
  return new Date(iso).toLocaleDateString();
}

export function PlaybookCard({ item }: { item: PlaybookSummary }) {
  return (
    <Link
      href={`/playbook/${item.id}`}
      className="app-card-interactive block hover:border-emerald-600/50"
    >
      <h2 className="font-heading text-lg font-bold tracking-wide text-white">{item.name}</h2>
      <p className="mt-1 font-body text-sm text-slate-400">{item.cfb26_playbook} playbook</p>
      <p className="mt-2 font-body text-xs text-slate-500">
        {item.scenario_filled}/{item.scenario_total} scenarios filled · {item.play_count} plays
      </p>
      <p className="mt-1 font-body text-[11px] text-slate-600">Last edited {formatRelative(item.updated_at)}</p>
    </Link>
  );
}
