"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconBackButton } from "@/components/shared/IconBackButton";
import {
  BUILDER_DELETE_SITUATION,
  BUILDER_SITUATION_DESC_PLACEHOLDER,
  BUILDER_SITUATION_NAME_PLACEHOLDER,
} from "@/lib/coachCopy";
import {
  getSituationColor,
  SITUATION_PRESET_COLORS,
  SITUATION_PRESET_ICONS,
} from "@/lib/constants";
import {
  appShellFieldLabelClass,
  appShellFormInputClass,
  modalCtaFooterClass,
  overlayZ,
} from "@/lib/constants/designTokens";
import { getSituationIcon } from "@/lib/situationIcons";
import { useScrollLock } from "@/lib/useScrollLock";
import { cn } from "@/lib/utils";
import { FormEvent, useEffect, useMemo, useState } from "react";

export type SituationFormValues = {
  name: string;
  description: string;
  icon: string | null;
  color: string;
};

function SituationFormFields({
  name,
  setName,
  description,
  setDescription,
  icon,
  setIcon,
  color,
  setColor,
  activeColor,
}: {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  icon: string | null;
  setIcon: (value: string | null) => void;
  color: string;
  setColor: (value: string) => void;
  activeColor: ReturnType<typeof getSituationColor>;
}) {
  return (
    <>
      <label className="block space-y-1">
        <span className={cn(appShellFieldLabelClass, "mb-1 block")}>Name</span>
        <input
          type="text"
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={BUILDER_SITUATION_NAME_PLACEHOLDER}
          className={appShellFormInputClass}
          autoComplete="off"
        />
      </label>

      <label className="block space-y-1">
        <span className={cn(appShellFieldLabelClass, "mb-1 block")}>Description</span>
        <input
          type="text"
          maxLength={60}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={BUILDER_SITUATION_DESC_PLACEHOLDER}
          className={appShellFormInputClass}
          autoComplete="off"
        />
      </label>

      <div className="space-y-2">
        <span className={cn(appShellFieldLabelClass, "block")}>Icon</span>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            aria-pressed={icon === null}
            onClick={() => setIcon(null)}
            className={cn(
              "flex h-11 items-center justify-center rounded-lg border font-body text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/25",
              icon === null
                ? cn("border-emerald-500", activeColor.bg, activeColor.text)
                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600",
            )}
          >
            Aa
          </button>
          {SITUATION_PRESET_ICONS.map((iconName) => {
            const Icon = getSituationIcon(iconName);
            const selected = icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                aria-pressed={selected}
                aria-label={iconName}
                onClick={() => setIcon(iconName)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/25",
                  selected
                    ? cn("border-emerald-500", activeColor.bg, activeColor.text)
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600",
                )}
              >
                {Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className={cn(appShellFieldLabelClass, "block")}>Color</span>
        <div className="grid grid-cols-6 gap-3">
          {SITUATION_PRESET_COLORS.map((preset) => {
            const selected = color === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={selected}
                aria-label={preset.label}
                onClick={() => setColor(preset.key)}
                className={cn(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/25",
                  selected && "ring-2 ring-white ring-offset-2 ring-offset-slate-900",
                )}
              >
                <span className={cn("h-6 w-6 rounded-full", preset.swatch)} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SituationFormFooter({
  mode,
  busy,
  canSubmit,
  onClose,
  onDelete,
}: {
  mode: "create" | "edit";
  busy?: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn(modalCtaFooterClass, mode === "edit" && onDelete ? "flex-col gap-3 sm:flex-col" : undefined)}>
      <div className="flex w-full gap-2">
        <Button type="button" variant="secondary" className="min-h-11 flex-1" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="default" className="min-h-11 flex-1" disabled={!canSubmit || busy}>
          {busy ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      </div>
      {mode === "edit" && onDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="w-full py-2 font-body text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          {BUILDER_DELETE_SITUATION}
        </button>
      ) : null}
    </div>
  );
}

export function SituationFormModal({
  open,
  mode,
  presentation = "modal",
  initialValues,
  usedColors,
  busy,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  presentation?: "modal" | "page";
  initialValues: SituationFormValues;
  usedColors: string[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (values: SituationFormValues) => void | Promise<void>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [icon, setIcon] = useState<string | null>(initialValues.icon);
  const [color, setColor] = useState(initialValues.color);

  useScrollLock(open && presentation === "page");

  useEffect(() => {
    if (!open) return;
    setName(initialValues.name);
    setDescription(initialValues.description);
    setIcon(initialValues.icon);
    setColor(initialValues.color);
  }, [open, initialValues]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedName.length <= 30 &&
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= 60 &&
    Boolean(color);

  const activeColor = getSituationColor(color);

  const defaultColor = useMemo(() => {
    const used = new Set(usedColors);
    return SITUATION_PRESET_COLORS.find((c) => !used.has(c.key))?.key ?? SITUATION_PRESET_COLORS[7].key;
  }, [usedColors]);

  useEffect(() => {
    if (open && mode === "create" && !initialValues.color) {
      setColor(defaultColor);
    }
  }, [open, mode, initialValues.color, defaultColor]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    await onSubmit({
      name: trimmedName,
      description: trimmedDescription,
      icon,
      color,
    });
  }

  const title = mode === "create" ? "New situation" : "Edit situation";
  const subtitle =
    mode === "create"
      ? "Add a custom bucket for plays on your call sheet."
      : "Update the name, description, icon, or color.";

  const formBody = (
    <SituationFormFields
      name={name}
      setName={setName}
      description={description}
      setDescription={setDescription}
      icon={icon}
      setIcon={setIcon}
      color={color}
      setColor={setColor}
      activeColor={activeColor}
    />
  );

  const formFooter = (
    <SituationFormFooter
      mode={mode}
      busy={busy}
      canSubmit={canSubmit}
      onClose={onClose}
      onDelete={onDelete}
    />
  );

  if (presentation === "page") {
    if (!open) return null;

    return (
      <div
        className={cn("fixed inset-0 flex flex-col bg-slate-950", overlayZ.filmShell)}
        role="dialog"
        aria-modal
        aria-labelledby="situation-form-page-title"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-3">
          <IconBackButton
            aria-label="Back to situation"
            onClick={() => {
              if (!busy) onClose();
            }}
          />
          <div className="min-w-0">
            <h2
              id="situation-form-page-title"
              className="font-display text-base font-bold uppercase tracking-[0.08em] text-white"
            >
              {title}
            </h2>
            <p className="mt-0.5 font-body text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">{formBody}</div>
          {formFooter}
        </form>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[90vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-xl border-slate-700 bg-slate-900 p-0 text-slate-100 sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg [&>button]:text-slate-400 [&>button]:hover:text-white"
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader className="sticky top-0 z-10 space-y-0 border-b border-slate-800 bg-slate-900 px-4 py-4 text-left sm:px-6 sm:text-left">
          <DialogTitle className="pr-10 text-left font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-left font-body text-sm text-slate-400">{subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">{formBody}</div>
          {formFooter}
        </form>
      </DialogContent>
    </Dialog>
  );
}
