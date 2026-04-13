export default function FilmLoading() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-slate-800" />
      </div>
      <ul className="space-y-4">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="animate-pulse space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="h-4 w-3/4 rounded bg-slate-700" />
              <div className="h-3 w-1/2 rounded bg-slate-700" />
              <div className="h-3 w-1/4 rounded bg-slate-700" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
