"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { PLAY_SHEETS_HOME_TITLE } from "@/lib/coachCopy";

export function PlaySheetHomeHeader() {
  return <AppShellMenuHeader title={PLAY_SHEETS_HOME_TITLE} />;
}
