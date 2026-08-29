import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { IconBackButton } from "@/components/shared/IconBackButton";

export type PublicBreadcrumbItem = {
  label: string;
  href?: string;
};

/** Signed-out trails prepend Home → /landing; signed-in trails start at Playbooks (call sheets is app home). */
export function publicPlaybooksBreadcrumbTrail(
  signedIn: boolean,
  trail: PublicBreadcrumbItem[],
): PublicBreadcrumbItem[] {
  if (signedIn) return trail;
  return [{ label: "Home", href: "/landing" }, ...trail];
}

function getMobileBackTarget(items: PublicBreadcrumbItem[]): { href: string; label: string } | null {
  if (items.length <= 1) return null;
  for (let i = items.length - 2; i >= 0; i--) {
    const item = items[i];
    if (item.href) {
      return { href: item.href, label: item.label };
    }
  }
  return null;
}

export function PublicPlaybooksBreadcrumb({ items }: { items: PublicBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  const back = getMobileBackTarget(items);

  return (
    <>
      {back ? (
        <div className="md:hidden">
          <IconBackButton href={back.href} aria-label={`Back to ${back.label}`} />
        </div>
      ) : null}

      <nav
        className="hidden font-mono text-xs uppercase tracking-wide text-slate-500 md:block"
        aria-label="Breadcrumb"
      >
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
    </>
  );
}
