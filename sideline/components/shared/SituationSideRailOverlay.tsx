"use client";

import { IconBackButton } from "@/components/shared/IconBackButton";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { responsiveOverlayInnerCardClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SituationSideRailOverlayProps = {
  open: boolean;
  onClose: () => void;
  backAriaLabel?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  children: ReactNode;
};

/** Mobile / narrow play logger + add-play overlay shell (matches Add Play drawer chrome). */
export function SituationSideRailOverlay({
  open,
  onClose,
  backAriaLabel = "Back",
  title,
  subtitle,
  titleClassName,
  children,
}: SituationSideRailOverlayProps) {
  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      mobileVariant="full-drawer"
      maxWidth="4xl"
      contentClassName="md:max-h-[85vh] md:overflow-hidden"
    >
      <div className={responsiveOverlayInnerCardClass}>
        <div className="flex shrink-0 items-center gap-3 px-4 py-3">
          <IconBackButton data-no-press aria-label={backAriaLabel} onClick={onClose} />
          <div className="min-w-0 flex-1">
            <h2
              className={cn(
                titleClassName ?? "font-display text-base font-bold uppercase text-white",
                !subtitle && "truncate",
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="truncate font-body text-xs text-slate-400">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
