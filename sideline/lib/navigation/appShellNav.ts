import {
  APP_SHELL_TENDENCIES_MENU_LABEL,
  CALL_SHEET_MENU_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  APP_SHELL_SCHEMES_MENU_LABEL,
} from "@/lib/coachCopy";
import { isPlaySheetBuilderPath } from "@/lib/navigation/playSheetNav";
import { isSchemeBuilderPath } from "@/lib/navigation/schemeNav";
import {
  BookOpen,
  ClipboardList,
  Headset,
  LineChart,
  Settings,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { DiscordIcon } from "@/components/shared/DiscordIcon";

export type AppShellNavIcon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export type AppShellSidebarNavItem = {
  id: string;
  href?: string;
  label: string;
  icon: AppShellNavIcon;
  comingSoon?: boolean;
  /** Opens in a new tab; never shows active state. */
  external?: boolean;
  /** Renders a visual separator after this item in the sidebar / drawer. */
  separatorAfter?: boolean;
};

/** Hamburger / sidebar destinations — playbooks, call sheets, schemes, film room, tendencies, settings. */
export const APP_SHELL_SIDEBAR_NAV: AppShellSidebarNavItem[] = [
  { id: "playbooks", href: "/playbooks", label: "Playbooks", icon: BookOpen, separatorAfter: true },
  { id: "call-sheets", href: "/playbook", label: CALL_SHEET_MENU_LABEL, icon: ClipboardList },
  { id: "schemes", href: "/schemes", label: APP_SHELL_SCHEMES_MENU_LABEL, icon: Headset },
  { id: "review", href: "/film", label: CALL_SHEET_VIEWER_MENU_REVIEW, icon: Video },
  { id: "my-tendencies", href: "/tendencies", label: APP_SHELL_TENDENCIES_MENU_LABEL, icon: LineChart },
  {
    id: "discord",
    href: "https://discord.gg/a9TeQggFqF",
    label: "Follow on Discord",
    icon: DiscordIcon,
    external: true,
  },
  { id: "settings", href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS, icon: Settings },
];

/**
 * Sidebar / drawer nav for the current user.
 * Currently a passthrough of the full nav — kept for future filter extensibility.
 */
export function getAppShellSidebarNav(_userId?: string | null): AppShellSidebarNavItem[] {
  return APP_SHELL_SIDEBAR_NAV;
}

export function isAppShellSidebarNavActive(pathname: string, item: AppShellSidebarNavItem): boolean {
  if (item.external || item.comingSoon || !item.href) return false;
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
