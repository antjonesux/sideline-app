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
}: {
  title: string;
  className?: string;
  titleClassName?: string;
  trailing?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className={cn("flex items-center gap-4", className)}>
        <CallSheetMenuButton onClick={() => setMenuOpen(true)} />
        <h1 className={cn(`${appShellPageTitleClass} min-w-0 flex-1 truncate`, titleClassName)}>{title}</h1>
        {trailing}
      </header>
      <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
