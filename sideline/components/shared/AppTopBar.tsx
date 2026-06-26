import Link from "next/link";
import { appShellIconBackButtonClass } from "@/lib/constants/designTokens";

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 -mr-1.5 text-slate-500 transition-colors hover:text-slate-300"
    >
      <svg className="h-[0.55em] w-[0.55em] min-h-5 min-w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </Link>
  );
}

/** Bordered menu control — links to Settings (Play Sheet home header). */
export function AppShellMenuLink({ href = "/settings", ariaLabel = "Menu" }: { href?: string; ariaLabel?: string }) {
  return (
    <Link href={href} aria-label={ariaLabel} className={appShellIconBackButtonClass}>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </Link>
  );
}
