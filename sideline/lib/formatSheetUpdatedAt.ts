/** Coach-facing relative time for play sheet list cards. */
export function formatSheetUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const updated = new Date(iso);
  if (Number.isNaN(updated.getTime())) return null;

  const diffMs = Date.now() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return updated.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
