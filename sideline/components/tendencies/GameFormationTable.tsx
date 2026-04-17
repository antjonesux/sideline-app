"use client";

import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns, type DrivePlayTableRow } from "@/components/shared/drivePlayTableColumns";
import { formationAggTableColumns, type FormationAggRow } from "@/components/tendencies/formationAggTableColumns";
import { useMemo, useState } from "react";

type PlayRow = DrivePlayTableRow & { id: string };

type FormationAgg = FormationAggRow & {
  play_rows: PlayRow[];
};

type Props = {
  rows: FormationAgg[];
};

export function GameFormationTable({ rows }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const driveCols = useMemo(() => drivePlayTableColumns(), []);
  const formationCols = useMemo(() => formationAggTableColumns(open), [open]);

  if (rows.length === 0) {
    return <p className="font-body text-sm text-slate-500">No formations logged this game.</p>;
  }

  return (
    <div className="app-card overflow-hidden">
      <DataTable
        columns={formationCols}
        rows={rows}
        getRowKey={(r) => r.formation}
        rowClassName="app-no-press-scale hover:bg-white/[0.02]"
        onRowClick={(r) => setOpen(open === r.formation ? null : r.formation)}
        renderAfterRow={(r) =>
          open === r.formation ? (
            <div className="border-t border-slate-800/80 bg-slate-950/40 px-3 py-2 dark:border-slate-800/80">
              <DataTable
                wrapperClassName="overflow-x-auto px-0"
                columns={driveCols}
                rows={r.play_rows}
                getRowKey={(p) => p.id}
              />
            </div>
          ) : null
        }
      />
    </div>
  );
}
