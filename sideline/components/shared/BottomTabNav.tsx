"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/film",
    label: "Film Room",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 5v14M16 5v14M3 10h5M3 14h5M16 10h5M16 14h5" />
      </svg>
    ),
  },
  {
    href: "/playbook",
    label: "Game Plan",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6M9 13h6" />
      </svg>
    ),
  },
  {
    href: "/tendencies",
    label: "Tendencies",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </svg>
    ),
  },
];

export default function BottomTabNav() {
  const pathname = usePathname();

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
