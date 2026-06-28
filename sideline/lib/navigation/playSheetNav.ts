/** Play Sheet builder routes (list, create, editor). */
export function isPlaySheetBuilderPath(pathname: string): boolean {
  if (pathname === "/playbook") return true;
  if (!pathname.startsWith("/playbook/")) return false;
  if (pathname === "/playbook/view" || pathname.startsWith("/playbook/view/")) return false;
  return true;
}
