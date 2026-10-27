"use client";

import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlaySetupMutations } from "@/hooks/usePlaySetups";
import {
  COULDNT_SAVE,
  PLAY_SETUP_CREATED_IMAGE_FAILED,
  PLAY_SETUP_DELETE_ACTION,
  PLAY_SETUP_DELETE_CONFIRM_BODY,
  PLAY_SETUP_DELETE_CONFIRM_TITLE,
  PLAY_SETUP_EDIT_TITLE,
  PLAY_SETUP_IMAGE_ADD,
  PLAY_SETUP_IMAGE_FIELD,
  PLAY_SETUP_IMAGE_HINT,
  PLAY_SETUP_IMAGE_REMOVE,
  PLAY_SETUP_IMAGE_REPLACE,
  PLAY_SETUP_IMAGE_TOO_LARGE_BODY,
  PLAY_SETUP_IMAGE_TOO_LARGE_TITLE,
  PLAY_SETUP_IMAGE_TRY_AGAIN,
  PLAY_SETUP_IMAGE_TYPE_BODY,
  PLAY_SETUP_IMAGE_TYPE_TITLE,
  PLAY_SETUP_NEW_TITLE,
  PLAY_SETUP_NOTES_FIELD,
  PLAY_SETUP_NOTES_PLACEHOLDER,
  PLAY_SETUP_NOTES_TOO_LONG,
  PLAY_SETUP_SAVE,
  PLAY_SETUP_SAVED,
  PLAY_SETUP_TITLE_FIELD,
  PLAY_SETUP_TITLE_PLACEHOLDER,
  PLAY_SETUP_TITLE_REQUIRED,
  PLAY_SETUP_TITLE_TOO_LONG,
  PLAY_SETUP_UPDATED,
  PLAY_SETUP_YOUR_IMAGE_LABEL,
  PLAY_SETUP_DELETED,
} from "@/lib/coachCopy";
import {
  appShellFieldLabelClass,
  appShellFormInputClass,
  modalCtaFooterClass,
  overlayZ,
} from "@/lib/constants/designTokens";
import {
  CompressSetupImageError,
  compressSetupImage,
  isSetupImageAcceptable,
} from "@/lib/compressSetupImage";
import { PLAY_SETUP_IMAGES_BUCKET, PLAY_SETUP_NOTES_MAX, PLAY_SETUP_TITLE_MAX } from "@/lib/playSetupKey";
import { createClient } from "@/lib/supabase/client";
import type { PlayIdentity, PlaySetup } from "@/lib/types";
import { cn, normalizePlayName } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import { useEffect, useId, useRef, useState } from "react";

type ImageUiState =
  | { kind: "empty" }
  | { kind: "existing"; url: string; path: string }
  | { kind: "local"; file: File; previewUrl: string }
  | { kind: "uploading"; fileName: string; percent: number }
  | { kind: "error"; code: "type" | "too_large"; file: File | null };

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function validateTitle(raw: string): string | null {
  const title = raw.trim();
  if (!title) return PLAY_SETUP_TITLE_REQUIRED;
  if (title.length > PLAY_SETUP_TITLE_MAX) return PLAY_SETUP_TITLE_TOO_LONG;
  return null;
}

function validateNotes(raw: string): string | null {
  if (raw.trim().length > PLAY_SETUP_NOTES_MAX) return PLAY_SETUP_NOTES_TOO_LONG;
  return null;
}

export function PlaySetupEditor({
  open,
  onClose,
  identity,
  setup,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  identity: PlayIdentity;
  /** `null` = create mode. */
  setup: PlaySetup | null;
  onSaved: (setup: PlaySetup, wasCreate: boolean) => void;
  onDeleted: (setupId: string) => void;
}) {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const { createSetup, updateSetup, deleteSetup } = usePlaySetupMutations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputId = useId();
  const notesInputId = useId();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [imageState, setImageState] = useState<ImageUiState>({ kind: "empty" });
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [workingSetup, setWorkingSetup] = useState<PlaySetup | null>(setup);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isEdit = Boolean(workingSetup);

  useEffect(() => {
    if (!open) return;
    setWorkingSetup(setup);
    setTitle(setup?.title ?? "");
    setNotes(setup?.notes ?? "");
    setTitleError(null);
    setNotesError(null);
    setRemoveExistingImage(false);
    setBusy(false);
    setDeleteOpen(false);
    if (setup?.image_url && setup.image_path) {
      setImageState({ kind: "existing", url: setup.image_url, path: setup.image_path });
    } else {
      setImageState({ kind: "empty" });
    }
  }, [open, setup]);

  useEffect(() => {
    return () => {
      if (imageState.kind === "local") URL.revokeObjectURL(imageState.previewUrl);
    };
  }, [imageState]);

  const metaLine = `${normalizePlayName(identity.play_name)} · ${identity.playbook}`;

  function clearLocalPreview(prev: ImageUiState) {
    if (prev.kind === "local") URL.revokeObjectURL(prev.previewUrl);
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    const code = isSetupImageAcceptable(file);
    if (code) {
      setImageState({ kind: "error", code, file });
      return;
    }
    setImageState((prev) => {
      clearLocalPreview(prev);
      return { kind: "local", file, previewUrl: URL.createObjectURL(file) };
    });
    setRemoveExistingImage(false);
  }

  async function uploadImageForSetup(setupId: string, file: File): Promise<string> {
    if (!user?.id) throw new Error(COULDNT_SAVE);
    setImageState({ kind: "uploading", fileName: file.name, percent: 12 });
    const compressed = await compressSetupImage(file);
    setImageState({ kind: "uploading", fileName: compressed.name, percent: 45 });

    const supabase = createClient();
    const objectName = `${crypto.randomUUID()}.webp`;
    const path = `${user.id}/${setupId}/${objectName}`;

    setImageState({ kind: "uploading", fileName: compressed.name, percent: 70 });
    const { error } = await supabase.storage.from(PLAY_SETUP_IMAGES_BUCKET).upload(path, compressed, {
      contentType: "image/webp",
      upsert: false,
    });
    if (error) throw new Error(COULDNT_SAVE);
    setImageState({ kind: "uploading", fileName: compressed.name, percent: 100 });
    return path;
  }

  async function retryImageUpload() {
    const file =
      imageState.kind === "error"
        ? imageState.file
        : imageState.kind === "local"
          ? imageState.file
          : null;
    if (!workingSetup || !user?.id || !file) {
      fileInputRef.current?.click();
      return;
    }
    setBusy(true);
    try {
      const path = await uploadImageForSetup(workingSetup.id, file);
      const updated = await updateSetup.mutateAsync({
        id: workingSetup.id,
        identity,
        image_path: path,
      });
      setWorkingSetup(updated);
      if (updated.image_url && updated.image_path) {
        setImageState({ kind: "existing", url: updated.image_url, path: updated.image_path });
      } else {
        setImageState({ kind: "empty" });
      }
      addToast(PLAY_SETUP_UPDATED, "success");
      onSaved(updated, false);
      onClose();
    } catch (err) {
      const code =
        err instanceof CompressSetupImageError
          ? err.code
          : isSetupImageAcceptable(file) ?? "type";
      setImageState({
        kind: "error",
        code: code === "too_large" ? "too_large" : "type",
        file,
      });
      addToast(PLAY_SETUP_CREATED_IMAGE_FAILED, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const tErr = validateTitle(title);
    const nErr = validateNotes(notes);
    setTitleError(tErr);
    setNotesError(nErr);
    if (tErr || nErr) return;

    setBusy(true);
    try {
      if (!workingSetup) {
        const created = await createSetup.mutateAsync({
          ...identity,
          title: title.trim(),
          notes: notes.trim(),
        });
        setWorkingSetup(created);

        if (imageState.kind === "local") {
          const pendingFile = imageState.file;
          try {
            const path = await uploadImageForSetup(created.id, pendingFile);
            const updated = await updateSetup.mutateAsync({
              id: created.id,
              identity,
              image_path: path,
            });
            addToast(PLAY_SETUP_SAVED, "success");
            onSaved(updated, true);
            onClose();
            return;
          } catch (err) {
            const code =
              err instanceof CompressSetupImageError
                ? err.code
                : (isSetupImageAcceptable(pendingFile) ?? "type");
            setImageState({
              kind: "error",
              code: code === "too_large" ? "too_large" : "type",
              file: pendingFile,
            });
            addToast(PLAY_SETUP_CREATED_IMAGE_FAILED, "error");
            onSaved(created, true);
            return;
          }
        }

        addToast(PLAY_SETUP_SAVED, "success");
        onSaved(created, true);
        onClose();
        return;
      }

      const patch: {
        id: string;
        identity: PlayIdentity;
        title: string;
        notes: string;
        image_path?: string | null;
      } = {
        id: workingSetup.id,
        identity,
        title: title.trim(),
        notes: notes.trim(),
      };

      if (imageState.kind === "local") {
        const path = await uploadImageForSetup(workingSetup.id, imageState.file);
        patch.image_path = path;
      } else if (removeExistingImage) {
        patch.image_path = null;
      }

      const updated = await updateSetup.mutateAsync(patch);
      addToast(PLAY_SETUP_UPDATED, "success");
      onSaved(updated, false);
      onClose();
    } catch (err) {
      if (imageState.kind === "local" || imageState.kind === "uploading") {
        const file = imageState.kind === "local" ? imageState.file : null;
        if (err instanceof CompressSetupImageError) {
          setImageState({ kind: "error", code: err.code, file });
        }
      }
      addToast(err instanceof Error ? err.message : COULDNT_SAVE, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!workingSetup) return;
    setBusy(true);
    try {
      await deleteSetup.mutateAsync({ id: workingSetup.id, identity });
      addToast(PLAY_SETUP_DELETED, "success");
      setDeleteOpen(false);
      onDeleted(workingSetup.id);
      onClose();
    } catch {
      /* toast from mutation */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ResponsiveOverlay
        open={open}
        onClose={onClose}
        busy={busy}
        hideCloseButton
        maxWidth="2xl"
        contentClassName={cn(
          "max-h-[100dvh] md:max-h-[90vh] md:!max-w-[620px]",
          overlayZ.sheetShell,
        )}
        overlayClassName={overlayZ.sheetShell}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {metaLine}
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">
                {isEdit ? PLAY_SETUP_EDIT_TITLE : PLAY_SETUP_NEW_TITLE}
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
            <div className="space-y-2">
              <label htmlFor={titleInputId} className={appShellFieldLabelClass}>
                {PLAY_SETUP_TITLE_FIELD}
              </label>
              <input
                id={titleInputId}
                type="text"
                value={title}
                maxLength={PLAY_SETUP_TITLE_MAX + 10}
                placeholder={PLAY_SETUP_TITLE_PLACEHOLDER}
                className={appShellFormInputClass}
                disabled={busy}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(validateTitle(e.target.value));
                }}
                onBlur={() => setTitleError(validateTitle(title))}
              />
              {titleError ? (
                <p className="font-body text-xs text-red-300" role="alert">
                  {titleError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor={notesInputId} className={appShellFieldLabelClass}>
                {PLAY_SETUP_NOTES_FIELD}
              </label>
              <textarea
                id={notesInputId}
                value={notes}
                rows={5}
                maxLength={PLAY_SETUP_NOTES_MAX + 50}
                placeholder={PLAY_SETUP_NOTES_PLACEHOLDER}
                className={cn(appShellFormInputClass, "min-h-[7.5rem] resize-y")}
                disabled={busy}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (notesError) setNotesError(validateNotes(e.target.value));
                }}
                onBlur={() => setNotesError(validateNotes(notes))}
              />
              {notesError ? (
                <p className="font-body text-xs text-red-300" role="alert">
                  {notesError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className={appShellFieldLabelClass}>{PLAY_SETUP_IMAGE_FIELD}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {imageState.kind === "empty" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-600 bg-slate-950/50 px-4 py-8 text-center transition-colors hover:border-emerald-600/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  <span className="font-body text-sm text-slate-200">{PLAY_SETUP_IMAGE_ADD}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {PLAY_SETUP_IMAGE_HINT}
                  </span>
                </button>
              ) : null}

              {imageState.kind === "uploading" ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="truncate font-body text-sm text-slate-200">{imageState.fileName}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{ width: `${imageState.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-400">{imageState.percent}%</p>
                </div>
              ) : null}

              {imageState.kind === "local" || imageState.kind === "existing" ? (
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
                  <div className="border-b border-slate-800 px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {PLAY_SETUP_YOUR_IMAGE_LABEL}
                    </p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview / signed setup URL */}
                  <img
                    src={imageState.kind === "local" ? imageState.previewUrl : imageState.url}
                    alt=""
                    className="max-h-48 w-full object-contain bg-slate-900"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                    <p className="min-w-0 truncate font-body text-xs text-slate-400">
                      {imageState.kind === "local"
                        ? `${imageState.file.name} · ${formatBytes(imageState.file.size)}`
                        : "Uploaded"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="font-sans text-xs font-medium uppercase tracking-wide text-emerald-400 hover:text-emerald-300"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {PLAY_SETUP_IMAGE_REPLACE}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="font-sans text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-red-300"
                        onClick={() => {
                          setImageState((prev) => {
                            clearLocalPreview(prev);
                            return { kind: "empty" };
                          });
                          if (workingSetup?.image_path) setRemoveExistingImage(true);
                        }}
                      >
                        {PLAY_SETUP_IMAGE_REMOVE}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {imageState.kind === "error" ? (
                <div className="rounded-xl border border-red-500/40 bg-slate-950/60 p-4 text-center">
                  <p className="font-heading text-sm font-bold uppercase tracking-wide text-red-200">
                    {imageState.code === "too_large"
                      ? PLAY_SETUP_IMAGE_TOO_LARGE_TITLE
                      : PLAY_SETUP_IMAGE_TYPE_TITLE}
                  </p>
                  <p className="mt-1 font-body text-sm text-slate-400">
                    {imageState.code === "too_large"
                      ? PLAY_SETUP_IMAGE_TOO_LARGE_BODY
                      : PLAY_SETUP_IMAGE_TYPE_BODY}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-emerald-400 hover:text-emerald-300"
                    onClick={() => void retryImageUpload()}
                  >
                    {PLAY_SETUP_IMAGE_TRY_AGAIN}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className={cn(modalCtaFooterClass, isEdit ? "justify-between" : "justify-end")}>
            {isEdit ? (
              <button
                type="button"
                disabled={busy}
                className="font-sans text-sm font-medium text-red-300 hover:text-red-200 disabled:opacity-50"
                onClick={() => setDeleteOpen(true)}
              >
                {PLAY_SETUP_DELETE_ACTION}
              </button>
            ) : null}
            <div className="flex flex-1 justify-end gap-3">
              <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                {busy ? "Saving…" : PLAY_SETUP_SAVE}
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveOverlay>

      <ConfirmDestructiveModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={PLAY_SETUP_DELETE_CONFIRM_TITLE}
        message={PLAY_SETUP_DELETE_CONFIRM_BODY}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
