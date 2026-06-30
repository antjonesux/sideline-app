"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  responsiveOverlayDialogContentClass,
  type ResponsiveOverlayMaxWidth,
  overlayZ,
} from "@/lib/constants/designTokens";
import { useMdUp } from "@/lib/useMdUp";
import { useScrollLock } from "@/lib/useScrollLock";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type DialogContentPassthrough = Omit<
  ComponentPropsWithoutRef<typeof DialogContent>,
  "className" | "children"
>;

export type ResponsiveOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * `bottom-sheet` — Radix dialog with bottom-anchored mobile sheet (New Call Sheet pattern).
   * `full-drawer` — custom full-viewport shell on mobile; centered dialog at `md+`.
   */
  mobileVariant?: "bottom-sheet" | "full-drawer";
  maxWidth?: ResponsiveOverlayMaxWidth;
  busy?: boolean;
  /** When false, backdrop / escape / close control do not dismiss. */
  dismissible?: boolean;
  hideCloseButton?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  dialogContentProps?: DialogContentPassthrough;
};

/**
 * Responsive authenticated overlay — drawer on mobile, centered modal at `md+`.
 * Share form/content as `children`; only presentation changes by breakpoint.
 */
export function ResponsiveOverlay({
  open,
  onClose,
  children,
  mobileVariant = "bottom-sheet",
  maxWidth = "lg",
  busy = false,
  dismissible = true,
  hideCloseButton = false,
  contentClassName,
  overlayClassName,
  dialogContentProps,
}: ResponsiveOverlayProps) {
  const mdUp = useMdUp();

  useScrollLock(open && mobileVariant === "full-drawer" && !mdUp);

  const handleOpenChange = (next: boolean) => {
    if (!next && (busy || !dismissible)) return;
    if (!next) onClose();
  };

  if (open && mobileVariant === "full-drawer" && !mdUp) {
    return (
      <>
        <div
          className={cn("fixed inset-0 bg-black/60", overlayZ.filmBackdrop, overlayClassName)}
          aria-hidden
          onClick={() => {
            if (!busy && dismissible) onClose();
          }}
        />
        <div
          className={cn("fixed inset-0 flex flex-col bg-slate-950", overlayZ.filmShell, contentClassName)}
          role="dialog"
          aria-modal
        >
          {children}
        </div>
      </>
    );
  }

  const {
    onPointerDownOutside,
    onEscapeKeyDown,
    ...restDialogContentProps
  } = dialogContentProps ?? {};

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton={hideCloseButton}
        overlayClassName={overlayClassName}
        className={cn(responsiveOverlayDialogContentClass(maxWidth), contentClassName)}
        onPointerDownOutside={(e) => {
          if (busy || !dismissible) e.preventDefault();
          onPointerDownOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          if (busy || !dismissible) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        {...restDialogContentProps}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
