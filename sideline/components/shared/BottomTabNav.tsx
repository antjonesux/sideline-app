"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import Link from "next/link";
import { ChartNoAxesCombined, ClipboardList, Video } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";

const tabs = [
  {
    href: "/film",
    label: "Film Room",
    icon: <Video className="h-5 w-5" aria-hidden />,
  },
  {
    href: "/playbook",
    label: "Play Sheet",
    icon: <ClipboardList className="h-5 w-5" aria-hidden />,
  },
  {
    href: "/tendencies",
    label: "Tendencies",
    icon: <ChartNoAxesCombined className="h-5 w-5" aria-hidden />,
  },
];

export default function BottomTabNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onboardingChrome = useMemo(() => {
    if (pathname === "/") return true;
    if (pathname.startsWith("/qa/onboarding")) return true;
    if (pathname === "/playbook" && searchParams.get("onboarding") === "1") return true;
    if (pathname.startsWith("/playbook/") && searchParams.get("onboarding") === "1") return true;
    if (pathname.startsWith("/film/") && searchParams.get("guided") === "1") return true;
    return false;
  }, [pathname, searchParams]);

  /** Chrome flags for full-bleed / reduced-inset shells (see globals.css). */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (onboardingChrome) root.setAttribute("data-onboarding-chrome", "true");
    else root.removeAttribute("data-onboarding-chrome");
    if (pathname === "/landing") root.setAttribute("data-marketing-chrome", "true");
    else root.removeAttribute("data-marketing-chrome");
    return () => {
      root.removeAttribute("data-onboarding-chrome");
      root.removeAttribute("data-marketing-chrome");
    };
  }, [onboardingChrome, pathname]);

  if (onboardingChrome) return null;

  if (
    pathname === "/login" ||
    pathname === "/landing" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth/") ||
    pathname === "/reset-password"
  )
    return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Main navigation"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                title={tab.label}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 font-sans text-xs font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}
              >
                <span aria-hidden className="text-current">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
