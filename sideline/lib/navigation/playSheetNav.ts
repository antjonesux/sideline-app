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
