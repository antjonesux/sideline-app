"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/film", label: "Film", icon: "🎞" },
  { href: "/playbook", label: "Playbook", icon: "📋" },
  { href: "/tendencies", label: "Tendencies", icon: "📊" },
];

export default function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 px-2 py-2">
      <ul className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center rounded-lg px-2 py-1 text-xs ${active ? "text-emerald-400" : "text-slate-500"}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
