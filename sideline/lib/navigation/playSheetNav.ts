import { resolveSafeNextPath } from "@/lib/navigation/loginHref";

/** Play Sheet builder routes (list, create, editor). */
export function isPlaySheetBuilderPath(pathname: string): boolean {
  if (pathname === "/playbook") return true;
  if (!pathname.startsWith("/playbook/")) return false;
  if (pathname === "/playbook/view" || pathname.startsWith("/playbook/view/")) return false;
  return true;
}

export function isPlaySheetListPath(pathname: string): boolean {
  return pathname === "/playbook";
}

export function isPlaySheetNewPath(pathname: string): boolean {
  return pathname === "/playbook/new";
}

/** Play sheet editor id from `/playbook/[id]` — excludes list, create, and coach view routes. */
export function playSheetIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/playbook/")) return null;
  const segment = pathname.slice("/playbook/".length).split("/")[0];
  if (!segment || segment === "new" || segment === "view") return null;
  return segment;
}

function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/** Play sheet editor href with optional return path, situation, and onboarding flags. */
export function playbookEditorHref(
  sheetId: string,
  opts?: { from?: string | null; situation?: string | null; onboarding?: boolean },
): string {
  const params = new URLSearchParams();
  if (isSafeInternalPath(opts?.from)) params.set("from", opts.from);
  if (opts?.situation?.trim()) params.set("situation", opts.situation.trim());
  if (opts?.onboarding) params.set("onboarding", "1");
  const qs = params.toString();
  return qs ? `/playbook/${sheetId}?${qs}` : `/playbook/${sheetId}`;
}

/** Back target for the play sheet editor list header (respects `?from=` when safe). */
export function playbookEditorListBackHref(from: string | null | undefined): string {
  return resolveSafeNextPath(from, "/playbook");
}
