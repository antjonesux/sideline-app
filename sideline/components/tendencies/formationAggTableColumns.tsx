import type { DataTableColumn } from "@/components/shared/DataTable";

export type FormationAggRow = {
  formation: string;
  plays: number;
  avg_yards: number;
  success_rate: number;
};

export function formationAggTableColumns(
  openFormation: string | null,
): DataTableColumn<FormationAggRow>[] {
  return [
    {
      key: "formation",
      header: "FORMATION",
      width: "min-w-[140px]",
      render: (r) => <span className="truncate font-sans text-sm text-slate-200 dark:text-slate-200">{r.formation}</span>,
    },
    {
      key: "plays",
      header: "PLAYS",
      width: "w-[60px]",
      render: (r) => <span className="font-mono text-sm tabular-nums text-slate-300">{r.plays}</span>,
    },
    {
      key: "avg_yds",
      header: "AVG YDS",
      width: "w-[70px]",
      render: (r) => <span className="font-mono text-sm tabular-nums text-slate-300">{r.avg_yards}</span>,
    },
    {
      key: "success",
      header: "SUCCESS",
      width: "w-[70px]",
      render: (r) => <span className="font-mono text-sm tabular-nums text-slate-300">{r.success_rate}%</span>,
    },
    {
      key: "expand",
      header: "",
      width: "w-10",
      render: (r) => {
        const isOpen = openFormation === r.formation;
        return (
          <span className="inline-flex items-center justify-start text-slate-500" aria-hidden>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        );
      },
    },
  ];
}
