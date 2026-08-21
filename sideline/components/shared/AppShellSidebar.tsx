"use client";

import { usePlaybookList } from "@/hooks/usePlaybookList";
import { useSchemeList } from "@/hooks/useSchemeList";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  APP_SHELL_CALL_SHEETS_EMPTY,
  APP_SHELL_CALL_SHEETS_LOAD_ERROR,
  APP_SHELL_NEW_CALL_SHEET_LABEL,
  APP_SHELL_NEW_SCHEME_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW_SOON,
} from "@/lib/coachCopy";
import {
  appShellNavItemActiveClass,
  appShellNavItemClass,
} from "@/lib/constants/designTokens";
import {
  APP_SHELL_SIDEBAR_NAV,
  APP_SHELL_SIGN_OUT_LABEL,
  isAppShellSidebarNavActive,
  type AppShellSidebarNavItem,
} from "@/lib/navigation/appShellNav";
import {
  isPlaySheetBuilderPath,
  isPlaySheetListPath,
  isPlaySheetNewPath,
  playSheetIdFromPath,
} from "@/lib/navigation/playSheetNav";
import {
  isSchemeBuilderPath,
  isSchemeListPath,
  isSchemeNewPath,
  schemeIdFromPath,
} from "@/lib/navigation/schemeNav";
import { cn } from "@/lib/utils";
import { ChevronDown, LayoutGrid, LogOut, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";

const navItemClass = cn("group flex w-full items-center gap-3", appShellNavItemClass);

const subNavItemClass =
  "flex w-full items-center gap-2 rounded-lg py-2 pl-9 pr-3 font-body text-sm font-medium transition-colors";

const navItemActiveClass = appShellNavItemActiveClass;
const navItemInactiveClass = "text-slate-400 hover:bg-slate-900/80 hover:text-white";
const subNavItemInactiveClass = "text-slate-500 hover:bg-slate-900/60 hover:text-slate-300";

const groupToggleClass =
  "flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60";

function NavActiveDot() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />;
}

function SidebarNavGroupToggle({
  expanded,
  label,
  controlsId,
  onToggle,
}: {
  expanded: boolean;
  label: string;
  controlsId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={groupToggleClass}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      onClick={onToggle}
    >
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
          !expanded && "-rotate-90",
        )}
        aria-hidden
      />
    </button>
  );
}

function SidebarNavItem({
  item,
  active,
  onNavigate,
}: {
  item: AppShellSidebarNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
      {item.comingSoon ? (
        <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 font-sans text-[10px] font-medium leading-none text-slate-500">
          {CALL_SHEET_VIEWER_MENU_REVIEW_SOON}
        </span>
      ) : null}
      {active ? <NavActiveDot /> : null}
    </>
  );

  const className = cn(
    navItemClass,
    item.comingSoon
      ? "cursor-default text-slate-600"
      : active
        ? navItemActiveClass
        : navItemInactiveClass,
  );

  if (item.comingSoon || !item.href) {
    return (
      <span className={className} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

function CallSheetsNavGroup() {
  const pathname = usePathname();
  const { data, isLoading, isError } = usePlaybookList();
  const sheets = data?.playbooks ?? [];
  const activeSheetId = playSheetIdFromPath(pathname);
  const listActive = isPlaySheetListPath(pathname);
  const newActive = isPlaySheetNewPath(pathname);
  const callSheetsItem = APP_SHELL_SIDEBAR_NAV.find((item) => item.id === "call-sheets");
  const Icon = callSheetsItem?.icon ?? LayoutGrid;
  const label = callSheetsItem?.label ?? "Call Sheets";
  const [expanded, setExpanded] = useState(true);
  const submenuId = useId();
  // When collapsed, surface section active on the header so nested routes stay visible.
  const headerActive = expanded ? listActive : isPlaySheetBuilderPath(pathname);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href="/playbook"
          className={cn(
            navItemClass,
            "min-w-0 flex-1",
            headerActive ? navItemActiveClass : navItemInactiveClass,
          )}
          aria-current={headerActive ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {headerActive ? <NavActiveDot /> : null}
        </Link>
        <SidebarNavGroupToggle
          expanded={expanded}
          label={label}
          controlsId={submenuId}
          onToggle={() => setExpanded((open) => !open)}
        />
      </div>

      {expanded ? (
        <div
          id={submenuId}
          className="flex flex-col gap-0.5 pb-1"
          role="group"
          aria-label={`${label} submenu`}
        >
          {isLoading ? (
            <div className="space-y-1.5 py-1 pl-9 pr-3" aria-hidden>
              <div className="h-8 animate-pulse rounded-md bg-slate-900/80" />
              <div className="h-8 animate-pulse rounded-md bg-slate-900/60" />
            </div>
          ) : null}

          {!isLoading && isError ? (
            <p className="px-3 py-1.5 pl-9 font-sans text-[11px] text-red-300/80">
              {APP_SHELL_CALL_SHEETS_LOAD_ERROR}
            </p>
          ) : null}

          {!isLoading && !isError && sheets.length === 0 ? (
            <p className="px-3 py-1.5 pl-9 font-sans text-[11px] text-slate-600">
              {APP_SHELL_CALL_SHEETS_EMPTY}
            </p>
          ) : null}

          {!isLoading && !isError
            ? sheets.map((sheet) => {
                const active = activeSheetId === sheet.id;
                return (
                  <Link
                    key={sheet.id}
                    href={`/playbook/${sheet.id}`}
                    className={cn(
                      subNavItemClass,
                      active ? navItemActiveClass : subNavItemInactiveClass,
                    )}
                    aria-current={active ? "page" : undefined}
                    title={sheet.name}
                  >
                    <span className="min-w-0 flex-1 truncate">{sheet.name}</span>
                    {active ? <NavActiveDot /> : null}
                  </Link>
                );
              })
            : null}

          <Link
            href="/playbook/new"
            className={cn(subNavItemClass, newActive ? navItemActiveClass : subNavItemInactiveClass)}
            aria-current={newActive ? "page" : undefined}
          >
            <Plus
              className={cn("h-3.5 w-3.5 shrink-0", newActive ? "text-white" : "text-slate-500")}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{APP_SHELL_NEW_CALL_SHEET_LABEL}</span>
            {newActive ? <NavActiveDot /> : null}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SchemesNavGroup() {
  const pathname = usePathname();
  const { data, isLoading } = useSchemeList();
  const schemes = data ?? [];
  const activeSchemeId = schemeIdFromPath(pathname);
  const listActive = isSchemeListPath(pathname);
  const newActive = isSchemeNewPath(pathname);
  const schemesItem = APP_SHELL_SIDEBAR_NAV.find((item) => item.id === "schemes");
  const Icon = schemesItem?.icon ?? LayoutGrid;
  const label = schemesItem?.label ?? "Schemes";
  const [expanded, setExpanded] = useState(true);
  const submenuId = useId();
  // When collapsed, surface section active on the header so nested routes stay visible.
  const headerActive = expanded ? listActive : isSchemeBuilderPath(pathname);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href="/schemes"
          className={cn(
            navItemClass,
            "min-w-0 flex-1",
            headerActive ? navItemActiveClass : navItemInactiveClass,
          )}
          aria-current={headerActive ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {headerActive ? <NavActiveDot /> : null}
        </Link>
        <SidebarNavGroupToggle
          expanded={expanded}
          label={label}
          controlsId={submenuId}
          onToggle={() => setExpanded((open) => !open)}
        />
      </div>

      {expanded ? (
        <div
          id={submenuId}
          className="flex flex-col gap-0.5 pb-1"
          role="group"
          aria-label={`${label} submenu`}
        >
          {isLoading ? (
            <div className="space-y-1.5 py-1 pl-9 pr-3" aria-hidden>
              <div className="h-8 animate-pulse rounded-md bg-slate-900/80" />
              <div className="h-8 animate-pulse rounded-md bg-slate-900/60" />
            </div>
          ) : null}

          {!isLoading
            ? schemes.map((scheme) => {
                const active = activeSchemeId === scheme.id;
                return (
                  <Link
                    key={scheme.id}
                    href={`/schemes/${scheme.id}`}
                    className={cn(
                      subNavItemClass,
                      active ? navItemActiveClass : subNavItemInactiveClass,
                    )}
                    aria-current={active ? "page" : undefined}
                    title={scheme.name}
                  >
                    <span className="min-w-0 flex-1 truncate">{scheme.name}</span>
                    {active ? <NavActiveDot /> : null}
                  </Link>
                );
              })
            : null}

          <Link
            href="/schemes/new"
            className={cn(subNavItemClass, newActive ? navItemActiveClass : subNavItemInactiveClass)}
            aria-current={newActive ? "page" : undefined}
          >
            <Plus
              className={cn("h-3.5 w-3.5 shrink-0", newActive ? "text-white" : "text-slate-500")}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{APP_SHELL_NEW_SCHEME_LABEL}</span>
            {newActive ? <NavActiveDot /> : null}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SidebarSignOutButton({ icon: Icon }: { icon: LucideIcon }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    const { error } = await signOut();
    if (!error) router.push("/landing");
    else setBusy(false);
  }

  return (
    <button
      type="button"
      className={cn(navItemClass, "text-slate-400 hover:bg-slate-900/80 hover:text-white disabled:opacity-60")}
      disabled={busy}
      onClick={() => void handleSignOut()}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{busy ? "Signing out…" : APP_SHELL_SIGN_OUT_LABEL}</span>
    </button>
  );
}

/** Persistent left navigation for tablet (`md`) and desktop — approved Session 09 shell. */
export function AppShellSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const secondaryNav = APP_SHELL_SIDEBAR_NAV.filter(
    (item) => item.id !== "call-sheets" && item.id !== "schemes",
  );

  return (
    <aside
      className={cn(
        "app-shell-sidebar sticky top-0 hidden h-dvh w-[var(--app-shell-sidebar-width)] shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex",
        className,
      )}
      aria-label="Application navigation"
    >
      <div className="shrink-0 px-4 pb-4 pt-5">
        <AppCompactWordmark className="text-2xl sm:text-2xl" />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        <CallSheetsNavGroup />
        <SchemesNavGroup />

        {secondaryNav.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={isAppShellSidebarNavActive(pathname, item)}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800/80 px-3 py-3">
        <SidebarSignOutButton icon={LogOut} />
      </div>
    </aside>
  );
}
