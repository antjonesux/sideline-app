"use client";

import { EditPlaybookModal } from "@/components/playbook/EditPlaybookModal";
import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import type { PlaybookSummary } from "@/lib/types";
import { COULDNT_DELETE } from "@/lib/coachCopy";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

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
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
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
          <p className="mt-1 truncate font-body text-sm text-slate-500 md:mt-0.5 md:text-[13px]">
            {item.scheme || `Built from ${item.cfb26_playbook} playbook`}
          </p>
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
        <DropdownMenuItem className={`${menuItemClass} text-red-300`} onSelect={() => setDeleteOpen(true)}>
          Delete
        </DropdownMenuItem>
      </CardKebabMenu>

      <EditPlaybookModal
        playbook={item}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
          router.refresh();
        }}
      />

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
