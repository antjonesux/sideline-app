import {
  CALL_SHEET_MENU_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
} from "@/lib/coachCopy";
import { isPlaySheetBuilderPath } from "@/lib/navigation/playSheetNav";
import { LayoutGrid, LogOut, Settings, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppShellSidebarNavItem = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

/** Tablet / desktop persistent sidebar — Session 09 approved destinations. */
export const APP_SHELL_SIDEBAR_NAV: AppShellSidebarNavItem[] = [
  { id: "call-sheets", href: "/playbook", label: CALL_SHEET_MENU_LABEL, icon: LayoutGrid },
  { id: "review", label: CALL_SHEET_VIEWER_MENU_REVIEW, icon: Video, comingSoon: true },
  { id: "settings", href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS, icon: Settings },
];

export function isAppShellSidebarNavActive(pathname: string, item: AppShellSidebarNavItem): boolean {
  if (item.comingSoon || !item.href) return false;
  if (item.href === "/playbook") return isPlaySheetBuilderPath(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Mobile bottom tab bar — unchanged Film / Play Sheet / Tendencies pillars. */
export const APP_SHELL_MOBILE_TABS = [
  { href: "/film", label: "Film Room", match: (pathname: string) => pathname.startsWith("/film") },
  {
    href: "/playbook",
    label: "Play Sheet",
    match: (pathname: string) => isPlaySheetBuilderPath(pathname),
  },
  { href: "/tendencies", label: "Tendencies", match: (pathname: string) => pathname.startsWith("/tendencies") },
] as const;

export const APP_SHELL_SIGN_OUT_LABEL = "Sign out";
