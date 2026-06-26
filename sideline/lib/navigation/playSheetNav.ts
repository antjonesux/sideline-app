/** Call Sheet viewer — read-only sideline reference surface. */
export const PLAY_SHEET_VIEWER_PATH = "/playbook/view";

export function isPlaySheetViewerPath(pathname: string): boolean {
  return pathname === PLAY_SHEET_VIEWER_PATH;
}

/** Builder list, create, and editor routes (not the viewer). */
export function isPlaySheetBuilderPath(pathname: string): boolean {
  if (pathname === "/playbook") return true;
  if (!pathname.startsWith("/playbook/")) return false;
  return !isPlaySheetViewerPath(pathname);
}
