"use client";

import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function AppShellMenuHeader({
  title,
  className,
  titleClassName,
  trailing,
  showMenu = true,
}: {
  title: string;
  className?: string;
  titleClassName?: string;
  trailing?: React.ReactNode;
  /** Hamburger drawer — mobile only; tablet/desktop use the persistent sidebar. */
  showMenu?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className={cn("flex items-center gap-4", className)}>
        {showMenu ? (
          <CallSheetMenuButton className="md:hidden" onClick={() => setMenuOpen(true)} />
        ) : null}
        <h1 className={cn(`${appShellPageTitleClass} min-w-0 flex-1 truncate`, titleClassName)}>{title}</h1>
        {trailing}
      </header>
      {showMenu ? <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} /> : null}
    </>
  );
}
