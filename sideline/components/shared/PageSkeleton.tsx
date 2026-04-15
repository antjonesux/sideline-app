import { SkeletonBlock } from "@/components/shared/AppSkeleton";

/** Film room list shell — shared loading UI for /film, /playbook, and /tendencies. */
export function FilmRoomSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading film room">
      <div className="space-y-4">
        <SkeletonBlock className="h-9 w-52 max-w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="app-card app-card-pad space-y-2">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-3 w-full max-w-xs" />
          </div>
          <div className="app-card app-card-pad space-y-2">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-3 w-full max-w-sm" />
          </div>
        </div>
        <div className="border-b border-slate-700" aria-hidden />
      </div>
      <ul className="space-y-4">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="app-card app-card-pad space-y-3">
              <SkeletonBlock className="h-4 w-3/4 max-w-md" />
              <SkeletonBlock className="h-8 w-40 max-w-[50%]" />
              <div className="flex gap-4 pt-1">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
