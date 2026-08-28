import { SkeletonBlock } from "@/components/shared/AppSkeleton";

export function PublicPlaybookHomeSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading playbooks">
      {[0, 1, 2].map((section) => (
        <div key={section}>
          <SkeletonBlock className="h-4 w-48" />
          <div className="mt-4 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="min-h-[5.75rem] w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
