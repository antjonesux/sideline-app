import type { PublicFormationGroup } from "@/lib/publicPlaybooksServer";
import { stripFormationCategoryPrefix } from "@/lib/stripFormationCategoryPrefix";

type PublicFormationListProps = {
  groups: PublicFormationGroup[];
};

/** Pass 1: formations are display-only. Pass 2 wires click-through to formation detail. */
export function PublicFormationList({ groups }: PublicFormationListProps) {
  if (groups.length === 0) {
    return (
      <p className="mt-8 font-body text-sm text-slate-400" role="status">
        No formations found for this playbook.
      </p>
    );
  }

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
              return (
                <li
                  key={formation}
                  className="flex min-h-[3.25rem] cursor-default items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-heading text-sm font-bold uppercase tracking-[0.08em] text-slate-200"
                >
                  {displayName}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
