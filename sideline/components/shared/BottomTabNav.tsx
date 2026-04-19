"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/film", label: "Film Room", icon: "🎞" },
  { href: "/playbook", label: "Game Plan", icon: "📋" },
  { href: "/tendencies", label: "Tendencies", icon: "📊" },
];

export default function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
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
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
