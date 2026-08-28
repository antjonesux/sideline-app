import Link from "next/link";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";

const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link href="/landing" className="min-w-0 shrink">
          <AppCompactWordmark className="text-2xl sm:text-3xl" />
          <span className="sr-only">The Sideline</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
          {FOOTER_LINKS.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <p className="font-mono text-xs text-slate-500">© 2026 The Sideline</p>
      </div>
    </footer>
  );
}
