import { SkeletonBlock } from "@/components/shared/AppSkeleton";

export function PlaybookCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4" aria-hidden>
      <SkeletonBlock className="h-5 w-2/3 max-w-xs" />
      <SkeletonBlock className="mt-1 h-4 w-40" />
    </div>
  );
}
