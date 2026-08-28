"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { Button } from "@/components/ui/button";
import { authOAuthButtonClass } from "@/lib/constants/designTokens";
import { buildLoginHref } from "@/lib/navigation/loginHref";
import { cn } from "@/lib/utils";

const BROWSE_PLAYBOOKS_HREF = "/playbooks";

function NavSeparator({ className }: { className?: string }) {
  return <span className={cn("shrink-0 bg-slate-700", className)} aria-hidden />;
}

function isBrowsePlaybooksActive(pathname: string): boolean {
  return pathname === "/playbooks" || pathname.startsWith("/playbooks/");
}

export function MarketingNav({ nextFromUrl }: { nextFromUrl?: string }) {
  const pathname = usePathname();
  const browseActive = isBrowsePlaybooksActive(pathname);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const signInHref = buildLoginHref({ next: nextFromUrl });
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const browsePlaybooksClass = cn(
    authOAuthButtonClass,
    browseActive &&
      "border-emerald-600/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-600/60 hover:bg-emerald-500/15 hover:text-emerald-100",
  );

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-slate-800 bg-slate-950/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/landing" className="min-w-0 shrink">
          <AppCompactWordmark className="text-2xl sm:text-3xl" />
          <span className="sr-only">The Sideline</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="default" className={cn("hidden md:inline-flex", browsePlaybooksClass)} asChild>
            <Link href={BROWSE_PLAYBOOKS_HREF} aria-current={browseActive ? "page" : undefined}>
              Playbooks
            </Link>
          </Button>
          <NavSeparator className="hidden h-6 w-px md:block" />
          <Button variant="outline" size="default" className={cn("hidden md:inline-flex", authOAuthButtonClass)} asChild>
            <Link href={signInHref}>Sign In</Link>
          </Button>
          <Button size="default" className="hidden md:inline-flex" asChild>
            <Link href={getStartedHref}>Get Started</Link>
          </Button>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-b border-slate-700/50 bg-slate-950/98 px-6 pb-5 pt-2 md:hidden">
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="default" className={browsePlaybooksClass} asChild>
              <Link
                href={BROWSE_PLAYBOOKS_HREF}
                onClick={() => setOpen(false)}
                aria-current={browseActive ? "page" : undefined}
              >
                Playbooks
              </Link>
            </Button>
            <NavSeparator className="h-px w-full" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="default" className={authOAuthButtonClass} asChild>
                <Link href={signInHref} onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button size="default" asChild>
                <Link href={getStartedHref} onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
