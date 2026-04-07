import Link from "next/link";

export default function NewPlaySheetPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-4xl">Play Sheet Editor</h1>
      <p className="mt-2 text-slate-400">Use setup flow to auto-generate a new Power Spread base sheet.</p>
      <Link href="/setup" className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2">Go to Setup</Link>
    </main>
  );
}
