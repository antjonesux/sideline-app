import { SkeletonBlock } from "@/components/shared/AppSkeleton";

export function PublicPlaybookDetailSkeleton() {
  return (
    <div className="mt-10 space-y-10" aria-busy="true" aria-label="Loading formations">
      {[0, 1, 2].map((section) => (
        <div key={section}>
          <SkeletonBlock className="h-4 w-28" />
          <div className="mt-4 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="min-h-[3.25rem] w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
