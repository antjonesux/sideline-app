import { appShellPageTitleClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

/** Compact app mark — green backslash + white Sideline (pull-out menu). */
export function AppCompactWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", appShellPageTitleClass, className)} aria-hidden>
      <span className="text-emerald-500">{"\\"}</span>
      <span>Sideline</span>
    </span>
  );
}
