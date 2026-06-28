import { SkeletonBlock, TendenciesWhatsWorkingBodySkeleton } from "@/components/shared/AppSkeleton";
import { PlaybookCardSkeleton } from "@/components/playbook/PlaybookCardSkeleton";

function AppShellMenuHeaderSkeleton({ trailing = false }: { trailing?: boolean }) {
  return (
    <header className="flex items-center gap-4">
      <SkeletonBlock className="size-8 shrink-0 rounded-lg" />
      <SkeletonBlock className="h-9 flex-1 max-w-[12rem] sm:max-w-[14rem]" />
      {trailing ? <SkeletonBlock className="h-9 w-24 shrink-0 rounded-lg" /> : null}
    </header>
  );
}

function FilmGameCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
      <SkeletonBlock className="h-5 w-3/4 max-w-md" />
      <SkeletonBlock className="h-3 w-48 max-w-full" />
      <SkeletonBlock className="h-8 w-36 max-w-[50%]" />
      <div className="flex gap-3 pt-1">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  );
}

function TendenciesTabsSkeleton() {
  return (
    <div className="grid grid-cols-2 border-b border-slate-800" aria-hidden>
      <SkeletonBlock className="h-12 w-full rounded-none" />
      <SkeletonBlock className="h-12 w-full rounded-none" />
    </div>
  );
}

function TendenciesFiltersSkeleton() {
  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2" aria-hidden>
      <SkeletonBlock className="h-11 w-28 shrink-0 rounded-full" />
      <SkeletonBlock className="h-11 w-32 shrink-0 rounded-full" />
      <SkeletonBlock className="h-11 w-36 shrink-0 rounded-full" />
    </div>
  );
}

/** Film room list — header, optional new-game card, game cards. */
export function FilmRoomSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading film room">
      <header className="space-y-4">
        <AppShellMenuHeaderSkeleton />
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-3 w-full max-w-xs" />
          </div>
        </div>
        <div className="border-b border-slate-700" aria-hidden />
      </header>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <FilmGameCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Play sheets home — header with create action and play sheet cards. */
export function PlaySheetHomeSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading play sheets">
      <AppShellMenuHeaderSkeleton trailing />
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <PlaybookCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tendencies home — header, tabs, filters, and default tab body. */
export function TendenciesHomeSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading tendencies">
      <AppShellMenuHeaderSkeleton />
      <TendenciesTabsSkeleton />
      <div className="space-y-8 pt-3">
        <TendenciesFiltersSkeleton />
        <TendenciesWhatsWorkingBodySkeleton />
      </div>
    </section>
  );
}
