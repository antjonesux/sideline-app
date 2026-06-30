import { SkeletonBlock } from "@/components/shared/AppSkeleton";

export function PlaybookCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 md:flex md:items-center md:gap-4 md:rounded-2xl md:px-5 md:py-4"
      aria-hidden
    >
      <SkeletonBlock className="hidden h-10 w-10 shrink-0 rounded-xl md:block" />
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-5 w-2/3 max-w-xs md:h-[15px]" />
        <SkeletonBlock className="mt-1 h-4 w-40 md:mt-0.5 md:h-[13px]" />
      </div>
    </div>
  );
}
