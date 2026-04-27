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

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const days = Math.floor(diff / (86400 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} wk ago`;
  return new Date(iso).toLocaleDateString();
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
      <Link href={`/playbook/${item.id}`} className="block rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70">
        <div className="flex items-start justify-between gap-2 pr-14">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-white">{item.name}</h2>
        </div>
        <p className="mt-1 font-body text-sm text-slate-400">Built from {item.cfb26_playbook} playbook</p>
        <p className="mt-2 font-body text-xs text-slate-500">
          {item.scenario_filled}/{item.scenario_total} scenarios filled · {item.play_count} calls
        </p>
        <p className="mt-1 font-body text-[11px] text-slate-600">Last edited {formatRelative(item.updated_at)}</p>
      </Link>

      <CardKebabMenu open={menuOpen} onOpenChange={setMenuOpen} ariaLabel="Play sheet actions">
        <DropdownMenuItem className="flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none" onSelect={() => setEditOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-red-300 transition-colors hover:bg-slate-800 rounded-none" onSelect={() => setDeleteOpen(true)}>
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
