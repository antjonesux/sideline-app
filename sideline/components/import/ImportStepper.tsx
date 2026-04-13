const STEPS = ["Setup", "Template", "Upload", "Preview", "Done"];

export function ImportStepper({ step }: { step: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              active
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : done
                  ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-500/90"
                  : "border-slate-700 bg-slate-900 text-slate-500"
            }`}
          >
            <span className="font-mono text-[10px] opacity-80">{n}</span>
            <span className="font-mono">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
