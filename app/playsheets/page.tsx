import Link from "next/link";

export default function PlaySheetsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-4xl">My Play Sheets</h1>
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">Power Spread Base Sheet</p>
          <p className="text-xs text-slate-500">15 scenarios</p>
          <Link href="/playsheet/base" className="mt-2 inline-block rounded bg-slate-700 px-3 py-1 text-xs">Open</Link>
        </div>
        <Link href="/playsheet/new" className="inline-block rounded-lg bg-emerald-700 px-4 py-2">Create New</Link>
      </div>
    </main>
  );
}
