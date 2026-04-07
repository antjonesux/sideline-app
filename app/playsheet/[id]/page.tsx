export default function ExistingPlaySheetPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-4xl">Play Sheet {params.id}</h1>
      <p className="mt-2 text-slate-400">Editor route scaffolded for scenario tabs and add/reorder/delete flow.</p>
    </main>
  );
}
