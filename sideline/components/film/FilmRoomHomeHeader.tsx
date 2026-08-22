"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import {
  APP_SHELL_NEW_GAME_LABEL,
  FILM_ROOM_HOME_TITLE,
  filmRoomHomeCountLabel,
} from "@/lib/coachCopy";
import { appShellHeaderPrimaryCtaClass, appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { Plus } from "lucide-react";
import Link from "next/link";

export function FilmRoomHomeHeader({
  gameCount,
  newGameHref = "/film/new",
}: {
  gameCount?: number;
  newGameHref?: string;
}) {
  const countLabel = gameCount !== undefined ? filmRoomHomeCountLabel(gameCount) : null;

  return (
    <div className={appShellWorkspaceInnerClass}>
      <AppShellMenuHeader
        title={FILM_ROOM_HOME_TITLE}
        className="md:items-start md:justify-between md:gap-6"
        titleClassName="md:text-[2rem] md:leading-none md:tracking-tight"
        trailing={
          <Link href={newGameHref} className={`${appShellHeaderPrimaryCtaClass} hidden md:inline-flex`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {APP_SHELL_NEW_GAME_LABEL}
          </Link>
        }
      />
      {countLabel ? (
        <p className="mt-2 hidden font-body text-sm text-slate-500 md:block">{countLabel}</p>
      ) : null}
    </div>
  );
}
