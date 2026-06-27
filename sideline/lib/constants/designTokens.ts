// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens
// Single source of truth for design tokens.
// Components can reference this file for canonical style decisions.
export const tokens = {
  colors: {
    pageBg: "bg-slate-950",
    surfaceBg: "bg-slate-900",
    cardBg: "bg-slate-900",
    cardHover: "bg-slate-800",
    borderBase: "border-slate-700",
    borderMuted: "border-slate-800",
    borderActive: "border-emerald-500",
    textPrimary: "text-slate-100",
    textSecondary: "text-slate-400",
    textMuted: "text-slate-500",
    textDisabled: "text-slate-600",
    accentGreen: "text-emerald-400",
    accentAmber: "text-amber-400",
    accentRed: "text-red-400",
    accentBlue: "text-blue-400",
    driveLabel: "text-amber-400",
    activeTab: "text-emerald-400",
  },
  typography: {
    display: "font-display",
    body: "font-sans",
    mono: "font-mono",
    pageTitle: "text-xl font-bold uppercase tracking-[0.1em] text-slate-100",
    sectionLabel: "text-xs font-semibold font-mono text-slate-500 uppercase tracking-widest",
    cardTitle: "text-sm font-semibold text-slate-100",
    dataValue: "text-sm font-mono text-slate-100",
    mutedMeta: "text-xs font-mono text-slate-500",
    badge: "text-xs font-medium font-mono uppercase tracking-wide",
  },
  spacing: {
    cardPadding: "px-4 py-3",
    modalPadding: "px-4",
    rowGap: "gap-3",
    sectionGap: "gap-4",
  },
  radius: {
    card: "rounded-xl",
    badge: "rounded-full",
    input: "rounded-lg",
    btn: "rounded-lg",
  },
} as const;

/**
 * Stacking for fixed / portaled UI. Keep in sync with `BottomTabNav` (`z-40`) and
 * Film hand-rolled logger / Add Play shells (`filmBackdrop` / `filmShell`).
 * Radix portaled menus must sit above `filmShell` or clicks hit the backdrop instead.
 */
/** Bottom CTA strip for modals / bottom sheets — consistent horizontal padding and safe-area inset. */
export const modalCtaFooterClass =
  "flex shrink-0 gap-3 border-t border-slate-800 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-5 sm:pb-6";

/** Primary dialog / sheet title — matches destructive confirm + playbook dialogs. */
export const modalDialogTitleClass =
  "font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100";

/** App shell page titles — matches landing wordmark typography (Barlow bold uppercase; no glow). */
export const appShellPageTitleClass =
  "font-sans text-3xl leading-none font-bold uppercase tracking-[1.08px] text-white sm:text-4xl";

/** Standard bordered app shell card — situation tiles, Coach View accordions, etc. */
export const appShellSurfaceCardClass = "rounded-xl border border-slate-700 bg-slate-900";

/** Hover affordance for interactive surface cards (situation tiles, accordion headers). */
export const appShellSurfaceCardHoverClass =
  "transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70";

/** Full-width surface action on app shell pages (Settings sign out, Builder Browse Playbook). Pair with `Button variant="outline"`. */
export const appShellSurfaceActionButtonClass =
  "h-auto min-h-11 w-full rounded-xl border-slate-700 bg-slate-900 py-3 font-sans text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800/60 hover:text-white";

/** Compact bordered back control — use `IconBackButton` / `BackNavLink` in UI. */
export const appShellIconBackButtonClass =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

/** Formation tile in Play Sheet Add Play browse. */
export const playSheetFormationTileClass =
  "min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-center font-sans text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

/** Green status badge for the user's active play sheet (list + viewer switcher). */
export const playSheetActiveBadgeClass =
  "inline-flex shrink-0 items-center rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-300";

/** Full-width primary CTA on app shell pages (Play Sheet home create). */
export const appShellPrimaryCtaButtonClass =
  "h-auto min-h-11 w-full rounded-xl bg-white py-3 font-sans text-sm font-semibold text-slate-950 hover:bg-slate-100";

export const overlayZ = {
  bottomNav: "z-40",
  /** Tendencies playbook / opponent menus (`usePortalDropdown` path). */
  tendenciesPortalMenu: "z-[70]",
  toastHost: "z-[120]",
  filmBackdrop: "z-[200]",
  filmShell: "z-[201]",
  /** Radix `Dialog` overlay + panel (and settings / playbook sheets in the same band). */
  radixDialog: "z-[220]",
  /** One step above `radixDialog` backdrop so sheet content receives hits first. */
  sheetShell: "z-[221]",
  /** Radix `Select` / `DropdownMenu` content portaled to `document.body`. */
  radixPortalMenu: "z-[230]",
} as const;
