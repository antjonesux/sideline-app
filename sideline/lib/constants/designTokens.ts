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

/** Root `<main>` shell — pairs with `globals.css` `.app-shell-main` and `--app-shell-*` tokens. */
export const appShellMainClass = "app-shell-main";

/** Standard bordered app shell card — situation tiles, Coach View accordions, etc. */
export const appShellSurfaceCardClass = "rounded-xl border border-slate-700 bg-slate-900";

/** Hover affordance for interactive surface cards (situation tiles, accordion headers). */
export const appShellSurfaceCardHoverClass =
  "transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70";

/** Bordered auth surface — matches LoginForm Google OAuth control fill/border. */
export const authOAuthButtonClass =
  "border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100 focus-visible:border-emerald-600/60 focus-visible:ring-2 focus-visible:ring-emerald-500/25";

/** Full-width surface action on app shell pages (Settings sign out, Builder Browse Playbook). Pair with `Button variant="outline"`. */
export const appShellSurfaceActionButtonClass =
  "h-auto min-h-11 w-full rounded-xl border-slate-700 bg-slate-900 py-3 font-sans text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800/60 hover:text-white";

/** Uppercase field / section label — settings groups, form labels, builder section headers. */
export const appShellFieldLabelClass =
  "font-sans text-xs font-normal uppercase tracking-widest text-slate-500";

/** Standard bordered form input on app shell surfaces. */
export const appShellFormInputClass =
  "hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

/** Compact header action — Add Sheet, Edit. */
export const appShellHeaderActionButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

/** Constrained playbook workspace column — pairs with `.app-shell-workspace-inner` in `globals.css`. */
export const appShellWorkspaceInnerClass = "app-shell-workspace-inner w-full";

/** Builder workspace — slightly wider cap at `lg+` (`--app-shell-workspace-inner-wide-max-width`). */
export const appShellWorkspaceBuilderClass = "app-shell-workspace-inner app-shell-workspace-inner--builder w-full";

/** Desktop/tablet builder title — tighter than `appShellPageTitleClass`. */
export const appShellBuilderTitleClass =
  "font-sans text-2xl leading-tight font-bold uppercase tracking-[0.08em] text-white";

/** Workspace stat block label (situations / plays). */
export const appShellWorkspaceStatLabelClass =
  "font-sans text-[11px] font-medium uppercase tracking-wide text-slate-600";

/** Workspace stat block value. */
export const appShellWorkspaceStatValueClass = "font-sans text-[15px] font-semibold text-white";

/** Emerald primary header CTA — New Call Sheet on desktop/tablet home (matches landing Get started). */
export const appShellHeaderPrimaryCtaClass =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

/** Bordered browse control in builder header / situation toolbar. */
export const appShellBuilderBrowseButtonClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-sans text-xs font-medium transition-colors md:min-h-11 md:px-4 md:text-sm";

/** Emerald Add Situation control in builder toolbar row. */
export const appShellBuilderAddSituationClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 font-sans text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11 md:px-4 md:text-sm";

/** Situation detail workspace — constrained play-list column (Session 11). */
export const appShellSituationWorkspaceInnerClass =
  "app-shell-situation-workspace-inner mx-auto w-full max-w-[47.5rem]";

/** Situation workspace toolbar — Browse Playbook control. */
export const appShellSituationToolbarBrowseButtonClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-sans text-xs font-medium transition-colors md:min-h-11 md:px-4 md:text-sm";

/** Situation workspace — dashed add-play control below the play table. */
export const appShellSituationAddPlayButtonClass =
  "mt-2 flex w-full min-h-11 items-center justify-center rounded-xl border border-dashed border-slate-800 font-sans text-sm text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-12";

/** Browse / add-play side-rail panel title — matches Add Play drawer modal title scale. */
export const appShellBrowsePanelTitleClass =
  "font-display text-base font-bold uppercase tracking-[0.08em] text-white";

/** Browse / add-play side-rail panel subtitle — matches builder workspace meta copy. */
export const appShellBrowsePanelSubtitleClass = "mt-1 font-body text-xs text-slate-500";

/** Square bordered icon control — back chevron, menu. Use `IconBackButton` / `CallSheetMenuButton` in UI. */
export const appShellIconBackButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 p-0 font-sans text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

/** Formation tile in Play Sheet Add Play browse. */
export const playSheetFormationTileClass =
  "min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-center font-sans text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

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
