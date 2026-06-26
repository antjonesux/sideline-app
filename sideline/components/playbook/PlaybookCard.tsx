"use client";

import { EditPlaybookModal } from "@/components/playbook/EditPlaybookModal";
import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import type { PlaybookSummary } from "@/lib/types";
import {
  COULDNT_DELETE,
  COULDNT_SAVE,
  PLAY_SHEET_ACTIVE_BADGE,
  PLAY_SHEET_ALREADY_ACTIVE,
  PLAY_SHEET_SET_ACTIVE,
  PLAY_SHEET_SET_ACTIVE_DONE,
} from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const menuItemClass =
  "flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none";

export function PlaybookCard({
  item,
  isActive = false,
}: {
  item: PlaybookSummary;
  isActive?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [activeBusy, setActiveBusy] = useState(false);
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

  async function setAsActive() {
    if (isActive) {
      addToast(PLAY_SHEET_ALREADY_ACTIVE, "warning");
      setMenuOpen(false);
      return;
    }
    setActiveBusy(true);
    try {
      const res = await fetch("/api/playbook/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_sheet_id: item.id }),
      });
      if (!res.ok) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      setMenuOpen(false);
      addToast(PLAY_SHEET_SET_ACTIVE_DONE, "success");
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
    } finally {
      setActiveBusy(false);
    }
  }

  return (
    <>
      <Link
        href={`/playbook/${item.id}`}
        className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-600 hover:bg-slate-800/60"
      >
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <h2 className="truncate font-sans text-base font-semibold text-white">{item.name}</h2>
            <p className="mt-1 truncate font-body text-sm text-slate-500">{item.scheme}</p>
            {isActive ? (
              <span className="mt-2 inline-flex rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {PLAY_SHEET_ACTIVE_BADGE}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <CardKebabMenu open={menuOpen} onOpenChange={setMenuOpen} ariaLabel="Play sheet actions">
        <DropdownMenuItem className={menuItemClass} onSelect={() => setEditOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClass}
          disabled={activeBusy}
          onSelect={() => {
            void setAsActive();
          }}
        >
          {PLAY_SHEET_SET_ACTIVE}
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
