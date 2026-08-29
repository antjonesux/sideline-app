import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type PublicBreadcrumbItem = {
  label: string;
  href?: string;
};

export function PublicPlaybooksBreadcrumb({ items }: { items: PublicBreadcrumbItem[] }) {
  return (
    <nav className="font-mono text-xs uppercase tracking-wide text-slate-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />
              ) : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-slate-300">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "min-w-0 truncate text-slate-400" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
