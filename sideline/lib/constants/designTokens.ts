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
