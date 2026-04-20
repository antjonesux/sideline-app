export function normalizePlayNameForComparison(name: string): string {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .toLowerCase();
}
