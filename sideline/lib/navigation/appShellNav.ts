import {
  APP_SHELL_TENDENCIES_MENU_LABEL,
  CALL_SHEET_MENU_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  APP_SHELL_SCHEMES_MENU_LABEL,
} from "@/lib/coachCopy";
import { isFilmRoomBetaUser } from "@/lib/featureFlags";
import { isPlaySheetBuilderPath } from "@/lib/navigation/playSheetNav";
import { isSchemeBuilderPath } from "@/lib/navigation/schemeNav";
import { BookOpen, ClipboardList, Headset, LineChart, Settings, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppShellSidebarNavItem = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  /** Renders a visual separator after this item in the sidebar / drawer. */
  separatorAfter?: boolean;
};

/** Hamburger / sidebar destinations — call sheets, schemes, film room, playbooks, tendencies, settings. */
export const APP_SHELL_SIDEBAR_NAV: AppShellSidebarNavItem[] = [
  { id: "call-sheets", href: "/playbook", label: CALL_SHEET_MENU_LABEL, icon: ClipboardList },
  { id: "schemes", href: "/schemes", label: APP_SHELL_SCHEMES_MENU_LABEL, icon: Headset },
  { id: "review", href: "/film", label: CALL_SHEET_VIEWER_MENU_REVIEW, icon: Video },
  { id: "playbooks", href: "/playbooks", label: "Playbooks", icon: BookOpen, separatorAfter: true },
  { id: "my-tendencies", href: "/tendencies", label: APP_SHELL_TENDENCIES_MENU_LABEL, icon: LineChart },
  { id: "settings", href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS, icon: Settings },
];

/** Sidebar / drawer nav for the current user — Film Room + My Tendencies omitted unless beta-listed. */
export function getAppShellSidebarNav(userId: string | undefined | null): AppShellSidebarNavItem[] {
  if (isFilmRoomBetaUser(userId)) return APP_SHELL_SIDEBAR_NAV;
  return APP_SHELL_SIDEBAR_NAV.filter((item) => item.id !== "review" && item.id !== "my-tendencies");
}

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
