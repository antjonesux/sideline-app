"use client";

const REQUIRED_COLS = [
  { key: "drive_number", desc: "Sequential drive number, starting at 1." },
  { key: "play_number", desc: "Global sequential play number, starting at 1." },
  { key: "quarter", desc: "1, 2, 3, 4, or OT" },
  { key: "down", desc: "1, 2, 3, or 4" },
  { key: "distance", desc: "Yards to go for a first down" },
  { key: "yard_line", desc: "OWN 25, OPP 40, or 50" },
  { key: "formation", desc: "Formation from your playbook" },
  { key: "play_name", desc: "Play name from your playbook" },
  { key: "result", desc: "GAIN, FIRST DOWN, TOUCHDOWN, …" },
  { key: "yards", desc: "Yards gained or lost" },
] as const;

const OPTIONAL_COLS = [
  { key: "score_context", desc: "TIED, AHEAD, BEHIND" },
  { key: "note", desc: "Free text, 60 chars max" },
  { key: "zone", desc: "Ball on field: left hash, right hash, middle (optional)" },
];

function downloadClientTemplate() {
  const headers = [
    "drive_number",
    "play_number",
    "quarter",
    "down",
    "distance",
    "yard_line",
    "formation",
    "play_name",
    "result",
    "yards",
    "score_context",
    "note",
  ];
  const rows = [
    "1,1,1,1,10,OWN 25,Gun Trips Open,PA BOOT OVER,GAIN,7,TIED,",
    "1,2,1,2,3,OWN 32,Gun Empty Base Flex,Y SHALLOW CROSS,FIRST DOWN,12,TIED,Beat cover 3",
    new Array(headers.length).fill("").join(","),
  ];
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sideline_game_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  /** Omit section title when nested in a larger layout. */
  embedded?: boolean;
  /** Show only the download button for compact layouts (e.g. modals). */
  compact?: boolean;
  /** Compact outlined button for header row (import step 1). */
  variant?: "default" | "headerInline";
};

export function TemplateDownload({ embedded, compact, variant = "default" }: Props) {
  if (variant === "headerInline") {
    return (
      <button
        type="button"
        onClick={() => downloadClientTemplate()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-600/80 bg-transparent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-emerald-400 transition-colors hover:bg-emerald-500/10 sm:w-auto"
      >
        <span aria-hidden>↓</span>
        Download Template
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {embedded ? null : <h3 className="app-section-title text-2xl">Download template</h3>}

      {compact ? null : (
        <>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLS.map((c) => (
              <span
                key={c.key}
                title={c.desc}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-emerald-200"
              >
                {c.key}
                <span className="text-emerald-500">✓</span>
              </span>
            ))}
            {OPTIONAL_COLS.map((c) => (
              <span
                key={c.key}
                title={c.desc}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-slate-400"
              >
                {c.key}
                <span className="text-slate-500">optional</span>
              </span>
            ))}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p>
              <span className="font-semibold text-slate-200">Valid results:</span> GAIN, FIRST DOWN, TOUCHDOWN, INCOMPLETE, SACK, LOSS, TURNOVER
              (INTERCEPTION), PUNT, NO GAIN, PENALTY
            </p>
            <p className="mt-2">
              <span className="font-semibold text-slate-200">Yard line format:</span> OWN 25, OPP 40, 50
            </p>
            <p className="mt-2 text-slate-400">
              Scenario and field zone are auto-derived on import — you do not enter them in the sheet.
            </p>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => downloadClientTemplate()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-emerald-600 bg-transparent py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-emerald-400 transition-colors hover:bg-emerald-500/10"
      >
        <span aria-hidden>↓</span>
        Download CSV Template
      </button>
    </div>
  );
}
