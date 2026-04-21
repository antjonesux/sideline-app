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
    return <p className="font-sans text-sm text-slate-500">No formations logged in this game.</p>;
  }

  return (
    <div className="app-card min-w-0 overflow-hidden">
      <DataTable
        columns={formationCols}
        rows={rows}
        getRowKey={(r) => r.formation}
        rowClassName="app-no-press-scale hover:bg-white/[0.02]"
        onRowClick={(r) => setOpen(open === r.formation ? null : r.formation)}
        renderAfterRow={(r) =>
          open === r.formation ? (
            <div className="min-w-0 border-t border-slate-800/80 bg-slate-800/50 p-4 dark:border-slate-800/80">
              <DataTable
                wrapperClassName="overflow-x-auto px-0"
                columns={driveCols}
                equalColumns
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
