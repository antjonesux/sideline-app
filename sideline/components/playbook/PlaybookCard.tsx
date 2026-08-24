"use client";

import { EditPlaybookModal } from "@/components/playbook/EditPlaybookModal";
import { AddToSchemeModal } from "@/components/schemes/AddToSchemeModal";
import { CallSheetMetadataRow } from "@/components/playbook/CallSheetMetadataRow";
import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { useCatalogPlaybookMeta } from "@/hooks/useCatalogPlaybooks";
import { usePlaySheetDisplayMeta } from "@/hooks/usePlaySheetDisplayMeta";
import { callSheetDetailsMetadataLabels, catalogMetaForSheet } from "@/lib/playbookUtils";
import { playbookListQueryKey } from "@/lib/playbookListQuery";
import type { PlaybookSummary } from "@/lib/types";
import { COULDNT_DELETE, ADD_TO_SCHEME_MENU_LABEL } from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const menuItemClass =
  "flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none";

function sheetInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function PlaybookCard({ item }: { item: PlaybookSummary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addToSchemeOpen, setAddToSchemeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { data: catalogMeta } = useCatalogPlaybookMeta(item.playbook);
  const { data: sheetMeta } = usePlaySheetDisplayMeta(item);

  const metadataLabels = callSheetDetailsMetadataLabels(
    catalogMetaForSheet(catalogMeta ?? null, sheetMeta?.game_version ?? item.game_version),
    sheetMeta?.scheme ?? item.scheme,
    sheetMeta?.playbook ?? item.playbook,
  );

  async function confirmDeletePlaybook() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/playbook/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        addToast(COULDNT_DELETE, "error");
        return;
      }
      setDeleteOpen(false);
      setMenuOpen(false);
      addToast("Play sheet removed.", "success");
      await queryClient.invalidateQueries({ queryKey: playbookListQueryKey });
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Link
        href={`/playbook/${item.id}`}
        className="group block rounded-xl border border-slate-800 bg-slate-900 p-4 pr-14 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] md:flex md:items-center md:gap-4 md:rounded-2xl md:px-5 md:py-4 md:pr-16"
      >
        <div
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 font-heading text-[15px] font-bold text-emerald-400 md:flex"
          aria-hidden
        >
          {sheetInitial(item.name)}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="min-w-0 truncate font-sans text-base font-semibold text-white md:text-[15px] md:leading-tight">
            {item.name}
          </h2>
          <CallSheetMetadataRow
            labels={metadataLabels}
            className="mt-1 font-body text-sm text-slate-500 md:mt-0.5 md:text-[13px]"
          />
        </div>
      </Link>

      <CardKebabMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        ariaLabel="Play sheet actions"
        className="md:top-1/2 md:-translate-y-1/2"
      >
        <DropdownMenuItem className={menuItemClass} onSelect={() => setEditOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClass}
          onSelect={() => {
            setMenuOpen(false);
            setAddToSchemeOpen(true);
          }}
        >
          {ADD_TO_SCHEME_MENU_LABEL}
        </DropdownMenuItem>
        <DropdownMenuItem className={`${menuItemClass} text-red-300`} onSelect={() => setDeleteOpen(true)}>
          Delete
        </DropdownMenuItem>
      </CardKebabMenu>

      <EditPlaybookModal
        playbook={{
          ...item,
          game_version: sheetMeta?.game_version ?? item.game_version,
          scheme: sheetMeta?.scheme ?? item.scheme,
          playbook: sheetMeta?.playbook ?? item.playbook,
        }}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: playbookListQueryKey });
          router.refresh();
        }}
      />

      {addToSchemeOpen ? (
        <AddToSchemeModal
          open={addToSchemeOpen}
          onClose={() => setAddToSchemeOpen(false)}
          callSheet={item}
          sideOfBall={catalogMeta?.side_of_ball ?? "offense"}
        />
      ) : null}

      <ConfirmDestructiveModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete play sheet"
        confirmLabel="Delete play sheet"
        message={
          <>
            Drops <strong className="font-semibold text-white">{item.name}</strong> and every play on it. Can&apos;t be
            undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={confirmDeletePlaybook}
      />
    </>
  );
}
