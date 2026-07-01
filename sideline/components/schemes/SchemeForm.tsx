"use client";

import { SchemeCallSheetPickers } from "@/components/schemes/SchemeCallSheetPicker";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { Button } from "@/components/ui/button";
import {
  COULDNT_DELETE,
  COULDNT_LOAD,
  COULDNT_SAVE,
  SCHEME_DELETED_TOAST,
  SCHEME_FORM_CREATE_CTA,
  SCHEME_FORM_CREATE_SUBTITLE,
  SCHEME_FORM_CREATE_TITLE,
  SCHEME_FORM_DELETE_SCHEME_CONFIRM,
  SCHEME_FORM_DELETE_SCHEME_MESSAGE,
  SCHEME_FORM_DELETE_SCHEME_TITLE,
  SCHEME_FORM_DESCRIPTION_LABEL,
  SCHEME_FORM_DESCRIPTION_PLACEHOLDER,
  SCHEME_FORM_EDIT_SUBTITLE,
  SCHEME_FORM_EDIT_TITLE,
  SCHEME_FORM_NAME_LABEL,
  SCHEME_FORM_NAME_PLACEHOLDER,
  SCHEME_FORM_NOTE_LABEL,
  SCHEME_FORM_NOTE_PLACEHOLDER,
  SCHEME_FORM_SAVE_CTA,
  SCHEME_FORM_VALIDATION_SHEET_REQUIRED,
} from "@/lib/coachCopy";
import { modalDialogTitleClass } from "@/lib/constants/designTokens";
import { fetchSchemeDetail, schemeDetailQueryKey } from "@/lib/schemeDetailQuery";
import { schemeListQueryKey } from "@/lib/schemeListQuery";
import type { SchemeCallSheetInput } from "@/lib/schemeApiHelpers";
import { useToastStore } from "@/store/toastStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const fieldClass =
  "hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

const labelClass = "mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500";

type Mode = "create" | "edit";

function buildCallSheetsPayload(
  offenseSheetId: string | null,
  defenseSheetId: string | null,
): SchemeCallSheetInput[] {
  const callSheets: SchemeCallSheetInput[] = [];
  if (offenseSheetId) callSheets.push({ call_sheet_id: offenseSheetId, side_of_ball: "offense" });
  if (defenseSheetId) callSheets.push({ call_sheet_id: defenseSheetId, side_of_ball: "defense" });
  return callSheets;
}

export function SchemeForm({ mode, schemeId }: { mode: Mode; schemeId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [offenseOverride, setOffenseOverride] = useState<string | null | undefined>(undefined);
  const [defenseOverride, setDefenseOverride] = useState<string | null | undefined>(undefined);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [deleteSchemeOpen, setDeleteSchemeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldsHydrated, setFieldsHydrated] = useState(mode === "create");

  const isEdit = mode === "edit" && Boolean(schemeId);

  const { data: scheme, isLoading, error } = useQuery({
    queryKey: schemeDetailQueryKey(schemeId ?? ""),
    queryFn: () => fetchSchemeDetail(schemeId!),
    enabled: isEdit,
  });

  const offenseAttached = scheme?.call_sheets.find((entry) => entry.side_of_ball === "offense");
  const defenseAttached = scheme?.call_sheets.find((entry) => entry.side_of_ball === "defense");
  const offenseSheetId =
    offenseOverride !== undefined ? offenseOverride : (offenseAttached?.call_sheet_id ?? null);
  const defenseSheetId =
    defenseOverride !== undefined ? defenseOverride : (defenseAttached?.call_sheet_id ?? null);
  const pickersReady = mode === "create" || Boolean(scheme);

  useEffect(() => {
    if (!isEdit || !scheme) return;
    setName(scheme.name);
    setDescription(scheme.description ?? "");
    setNote(scheme.note ?? "");
    setOffenseOverride(undefined);
    setDefenseOverride(undefined);
    setFieldsHydrated(true);
  }, [isEdit, scheme]);

  const title = isEdit ? SCHEME_FORM_EDIT_TITLE : SCHEME_FORM_CREATE_TITLE;
  const subtitle = isEdit ? SCHEME_FORM_EDIT_SUBTITLE : SCHEME_FORM_CREATE_SUBTITLE;
  const submitLabel = isEdit ? SCHEME_FORM_SAVE_CTA : SCHEME_FORM_CREATE_CTA;
  const canSubmit = name.trim().length > 0 && fieldsHydrated && !busy;

  async function confirmDeleteScheme() {
    if (!isEdit || !schemeId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/schemes/${schemeId}`, { method: "DELETE" });
      if (!res.ok) {
        addToast(COULDNT_DELETE, "error");
        return;
      }
      setDeleteSchemeOpen(false);
      await queryClient.invalidateQueries({ queryKey: schemeListQueryKey });
      addToast(SCHEME_DELETED_TOAST, "success");
      router.push("/schemes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveScheme(callSheets: SchemeCallSheetInput[]) {
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      note: note.trim() || null,
      call_sheets: callSheets,
    };

    const res = await fetch(isEdit ? `/api/schemes/${schemeId}` : "/api/schemes", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = (await res.json()) as { data?: { id: string }; error?: string };
    if (!res.ok || j.error) {
      addToast(typeof j.error === "string" ? j.error : COULDNT_SAVE, "error");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: schemeListQueryKey });
    if (isEdit && schemeId) {
      await queryClient.invalidateQueries({ queryKey: schemeDetailQueryKey(schemeId) });
    }

    const nextId = isEdit ? schemeId! : j.data?.id;
    addToast(isEdit ? "Saved." : "Scheme created.", "success");
    router.push(nextId ? `/schemes/${nextId}` : "/schemes");
    router.refresh();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const callSheets = buildCallSheetsPayload(offenseSheetId, defenseSheetId);
    if (callSheets.length === 0) {
      if (isEdit) {
        setSheetError(null);
        setDeleteSchemeOpen(true);
        return;
      }
      setSheetError(SCHEME_FORM_VALIDATION_SHEET_REQUIRED);
      return;
    }
    setSheetError(null);

    setBusy(true);
    try {
      await saveScheme(callSheets);
    } finally {
      setBusy(false);
    }
  }

  if (isEdit && isLoading) {
    return (
      <section className="space-y-6">
        <BackNavLink href="/schemes" />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
          <p className="font-body text-sm text-slate-500">Loading scheme…</p>
        </div>
      </section>
    );
  }

  if (isEdit && (error || !scheme)) {
    return (
      <section className="space-y-6">
        <BackNavLink href="/schemes" />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6" role="alert">
          <p className="font-sans text-sm text-red-200">{COULDNT_LOAD}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <BackNavLink href={isEdit && schemeId ? `/schemes/${schemeId}` : "/schemes"} />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <header className="space-y-2">
            <h1 className={modalDialogTitleClass}>{title}</h1>
            <p className="font-body text-sm text-slate-400">{subtitle}</p>
          </header>

          <div className="space-y-5">
            <label className="block space-y-1">
              <span className={labelClass}>{SCHEME_FORM_NAME_LABEL}</span>
              <input
                className={fieldClass}
                placeholder={SCHEME_FORM_NAME_PLACEHOLDER}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>{SCHEME_FORM_DESCRIPTION_LABEL}</span>
              <textarea
                className={`${fieldClass} min-h-[5rem] resize-y`}
                placeholder={SCHEME_FORM_DESCRIPTION_PLACEHOLDER}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>{SCHEME_FORM_NOTE_LABEL}</span>
              <textarea
                className={`${fieldClass} min-h-[5rem] resize-y`}
                placeholder={SCHEME_FORM_NOTE_PLACEHOLDER}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </label>

            <SchemeCallSheetPickers
              offenseSheetId={offenseSheetId}
              defenseSheetId={defenseSheetId}
              onOffenseChange={(id) => {
                setOffenseOverride(id);
                setSheetError(null);
              }}
              onDefenseChange={(id) => {
                setDefenseOverride(id);
                setSheetError(null);
              }}
              disabled={!pickersReady}
              offensePinnedSheet={
                offenseAttached
                  ? { id: offenseAttached.call_sheet_id, name: offenseAttached.call_sheet.name }
                  : null
              }
              defensePinnedSheet={
                defenseAttached
                  ? { id: defenseAttached.call_sheet_id, name: defenseAttached.call_sheet.name }
                  : null
              }
            />

            {sheetError ? (
              <p className="font-body text-sm text-red-300" role="alert">
                {sheetError}
              </p>
            ) : null}
          </div>

          <Button type="submit" variant="default" className="min-h-11 w-full py-3 text-sm" disabled={!canSubmit}>
            {busy ? (isEdit ? "Saving…" : "Creating…") : submitLabel}
          </Button>
        </form>
      </div>

      <ConfirmDestructiveModal
        open={deleteSchemeOpen}
        onClose={() => setDeleteSchemeOpen(false)}
        title={SCHEME_FORM_DELETE_SCHEME_TITLE}
        confirmLabel={SCHEME_FORM_DELETE_SCHEME_CONFIRM}
        message={
          <>
            {SCHEME_FORM_DELETE_SCHEME_MESSAGE}
            {name.trim() ? (
              <>
                {" "}
                <strong className="font-semibold text-white">{name.trim()}</strong> will be removed.
              </>
            ) : null}
          </>
        }
        busy={busy}
        onConfirm={confirmDeleteScheme}
      />
    </section>
  );
}
