/** Lets one dropdown open close all other registered menus (e.g. drive card kebabs). */
const closers = new Set<() => void>();

/** Returns unregister function for useEffect cleanup. */
export function registerDropdownMenuCloser(close: () => void): () => void {
  closers.add(close);
  return () => {
    closers.delete(close);
  };
}

export function closeAllDropdownMenusExcept(except: () => void): void {
  for (const c of closers) {
    if (c !== except) c();
  }
}

/** Close every registered menu (e.g. before opening a full-screen modal). */
export function closeAllDropdownMenus(): void {
  for (const c of closers) c();
}
