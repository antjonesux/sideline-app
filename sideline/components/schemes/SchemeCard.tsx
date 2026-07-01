"use client";

import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  COULDNT_DELETE,
  SCHEME_CARD_DEFENSE_LABEL,
  SCHEME_CARD_OFFENSE_LABEL,
  SCHEME_CARD_SIDE_UNATTACHED,
  SCHEME_DELETED_TOAST,
} from "@/lib/coachCopy";
import type { SchemeSummary } from "@/lib/types";
import { useToastStore } from "@/store/toastStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { schemeListQueryKey } from "@/lib/schemeListQuery";

const menuItemClass =
  "flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none";

function schemeInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function SchemeSideRow({ label, sheetName }: { label: string; sheetName: string | null }) {
  return (
    <p className="font-body text-sm text-slate-500 md:text-[13px]">
      <span className="text-slate-400">{label}:</span>{" "}
      <span className={sheetName ? "text-slate-300" : "text-slate-600"}>
        {sheetName ?? SCHEME_CARD_SIDE_UNATTACHED}
      </span>
    </p>
  );
}

export function SchemeCard({ item }: { item: SchemeSummary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  async function confirmDeleteScheme() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/schemes/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        addToast(COULDNT_DELETE, "error");
        return;
      }
      setDeleteOpen(false);
      setMenuOpen(false);
      addToast(SCHEME_DELETED_TOAST, "success");
      await queryClient.invalidateQueries({ queryKey: schemeListQueryKey });
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Link
        href={`/schemes/${item.id}`}
        className="group block rounded-xl border border-slate-800 bg-slate-900 p-4 pr-14 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] md:flex md:items-start md:gap-4 md:rounded-2xl md:px-5 md:py-4 md:pr-16"
      >
        <div
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 font-heading text-[15px] font-bold text-emerald-400 md:flex"
          aria-hidden
        >
          {schemeInitial(item.name)}
        </div>

        <div className="min-w-0 flex-1 space-y-2 md:space-y-1.5">
          <h2 className="min-w-0 truncate font-sans text-base font-semibold text-white md:text-[15px] md:leading-tight">
            {item.name}
          </h2>
          {item.description ? (
            <p className="line-clamp-2 font-body text-sm text-slate-500 md:text-[13px]">{item.description}</p>
          ) : null}
          <div className="space-y-0.5">
            <SchemeSideRow label={SCHEME_CARD_OFFENSE_LABEL} sheetName={item.offense_call_sheet_name} />
            <SchemeSideRow label={SCHEME_CARD_DEFENSE_LABEL} sheetName={item.defense_call_sheet_name} />
          </div>
        </div>
      </Link>

      <CardKebabMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        ariaLabel="Scheme actions"
        className="md:top-1/2 md:-translate-y-1/2"
      >
        <DropdownMenuItem className={menuItemClass} asChild>
          <Link href={`/schemes/${item.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className={`${menuItemClass} text-red-300`} onSelect={() => setDeleteOpen(true)}>
          Delete
        </DropdownMenuItem>
      </CardKebabMenu>

      <ConfirmDestructiveModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete scheme"
        confirmLabel="Delete scheme"
        message={
          <>
            Removes <strong className="font-semibold text-white">{item.name}</strong>. Your call sheets stay in My Call
            Sheets. Can&apos;t be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={confirmDeleteScheme}
      />
    </>
  );
}
