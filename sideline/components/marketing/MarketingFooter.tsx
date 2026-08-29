import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { DiscordIcon } from "@/components/shared/DiscordIcon";

const FOOTER_LINKS: {
  label: string;
  href: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  {
    label: "Follow on Discord",
    href: "https://discord.gg/a9TeQggFqF",
    icon: DiscordIcon,
  },
];

const footerLinkClass = "inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link href="/landing" className="min-w-0 shrink">
          <AppCompactWordmark className="text-2xl sm:text-3xl" />
          <span className="sr-only">The Sideline</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
          {FOOTER_LINKS.map((link) => {
            const Icon = link.icon;
            const label = (
              <>
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                {link.label}
              </>
            );

            if (link.href.startsWith("/")) {
              return (
                <Link key={link.label} href={link.href} className={footerLinkClass}>
                  {label}
                </Link>
              );
            }

            return (
              <a
                key={link.label}
                href={link.href}
                className={footerLinkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            );
          })}
        </nav>

        <p className="font-mono text-xs text-slate-500">© 2026 The Sideline</p>
      </div>
    </footer>
  );
}
