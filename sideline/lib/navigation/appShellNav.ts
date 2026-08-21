import {
  CALL_SHEET_MENU_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  APP_SHELL_SCHEMES_MENU_LABEL,
} from "@/lib/coachCopy";
import { isPlaySheetBuilderPath } from "@/lib/navigation/playSheetNav";
import { isSchemeBuilderPath } from "@/lib/navigation/schemeNav";
import { ClipboardList, Layers, Settings, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppShellSidebarNavItem = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

/** Hamburger drawer destinations — call sheets, schemes, review (soon), and settings. */
export const APP_SHELL_SIDEBAR_NAV: AppShellSidebarNavItem[] = [
  { id: "call-sheets", href: "/playbook", label: CALL_SHEET_MENU_LABEL, icon: ClipboardList },
  { id: "schemes", href: "/schemes", label: APP_SHELL_SCHEMES_MENU_LABEL, icon: Layers },
  { id: "review", label: CALL_SHEET_VIEWER_MENU_REVIEW, icon: Video, comingSoon: true },
  { id: "settings", href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS, icon: Settings },
];

export function isAppShellSidebarNavActive(pathname: string, item: AppShellSidebarNavItem): boolean {
  if (item.comingSoon || !item.href) return false;
  if (item.href === "/playbook") return isPlaySheetBuilderPath(pathname);
  if (item.href === "/schemes") return isSchemeBuilderPath(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Mobile bottom tab bar (disabled) — Play Sheet only when re-enabled. */
export const APP_SHELL_MOBILE_TABS = [
  {
    href: "/playbook",
    label: "Play Sheet",
    match: (pathname: string) => isPlaySheetBuilderPath(pathname),
  },
] as const;

export const APP_SHELL_SIGN_OUT_LABEL = "Sign out";
