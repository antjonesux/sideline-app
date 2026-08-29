import type { PublicFormationGroup } from "@/lib/publicPlaybooksServer";
import { stripFormationCategoryPrefix } from "@/lib/stripFormationCategoryPrefix";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PublicFormationListProps = {
  groups: PublicFormationGroup[];
  playbookId: string;
  side?: "offense" | "defense" | null;
};

export function PublicFormationList({ groups, playbookId, side }: PublicFormationListProps) {
  if (groups.length === 0) {
    return (
      <p className="mt-8 font-body text-sm text-slate-400" role="status">
        No formations found for this playbook.
      </p>
    );
  }

  const sideQs = side === "defense" ? "?side=defense" : "";

  return (
    <div className="mt-10 space-y-10">
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
            {group.category}
          </h2>
          <ul className="mt-4 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {group.formations.map((formation) => {
              const displayName = stripFormationCategoryPrefix(formation, group.category);
              const href = `/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formation)}${sideQs}`;
              return (
                <li key={formation}>
                  <Link
                    href={href}
                    className={cn(
                      "flex min-h-[3.25rem] items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-heading text-sm font-bold uppercase tracking-[0.08em] text-slate-200 transition-colors",
                      "hover:border-emerald-600/50 hover:bg-slate-800/70",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                    )}
                  >
                    {displayName}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
