/** Pulsing placeholders matching app-card / list row shapes. */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`app-skeleton ${className}`} aria-hidden />;
}

export function GameDetailSkeleton() {
  return (
    <section className="space-y-4 pb-28" aria-busy="true" aria-label="Loading game">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-24" />
        <div className="flex justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-7 w-full max-w-md" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-20 shrink-0 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="app-card app-card-pad space-y-3">
          <div className="flex gap-3">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-40" />
        </div>
      ))}
    </section>
  );
}

export function TendenciesSectionSkeleton() {
  return (
    <div className="app-card app-card-pad space-y-3" aria-busy="true">
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-[92%] max-w-lg" />
      <SkeletonBlock className="h-4 w-[84%] max-w-md" />
    </div>
  );
}

export function PlaybookEditorSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading playbook">
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-9 w-64 max-w-full" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-2 lg:block">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-40 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-48" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="app-card app-card-pad flex gap-3">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NewGameFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading form">
      <SkeletonBlock className="h-9 w-56 max-w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="app-card app-card-pad space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
        <div className="app-card app-card-pad space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="app-card app-card-pad space-y-2 md:max-w-2xl">
        <SkeletonBlock className="h-3 w-36" />
        <SkeletonBlock className="h-10 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-28" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-12 rounded-lg" />
        <SkeletonBlock className="h-12 rounded-lg" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function ImportPreviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading preview">
      <SkeletonBlock className="h-9 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="app-card p-3 text-center">
            <SkeletonBlock className="mx-auto h-8 w-12" />
            <SkeletonBlock className="mx-auto mt-2 h-2 w-16" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-11 w-full rounded-lg" />
      <div className="app-card app-card-pad space-y-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} className="h-3 w-full max-w-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SkeletonBlock className="h-12 flex-1 rounded-lg sm:max-w-[200px]" />
        <SkeletonBlock className="h-12 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
