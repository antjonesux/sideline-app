/**
 * Deterministic defense video slug expansion for compact OBS filenames.
 *
 * Source videos may omit hyphens in formation prefixes (335-tite → 3-3-5-tite).
 * Only returns candidates — caller must verify exact seed module exists.
 * Never picks nearest catalog; fail-closed when no candidate resolves.
 */
export function defenseVideoSlugCandidates(playbookSlug: string): string[] {
  const slug = playbookSlug.trim().toLowerCase().replace(/^-+|-+$/g, "");
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const v = value.trim().toLowerCase();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };

  push(slug);

  if (slug === "multiple") {
    // Defense Multiple must resolve before offensive Multiple seed collision.
    return ["multiple-def", slug].filter((v, i, arr) => arr.indexOf(v) === i);
  }

  const match = slug.match(/^(\d{2,3})(?:-(.+))?$/);
  if (match) {
    const digits = match[1];
    const suffix = match[2];
    let expanded: string | null = null;
    if (digits.length === 2) {
      expanded = `${digits[0]}-${digits[1]}`;
    } else if (digits.length === 3) {
      expanded = `${digits[0]}-${digits[1]}-${digits[2]}`;
    }
    if (expanded) {
      push(suffix ? `${expanded}-${suffix}` : expanded);
    }
  }

  return out;
}
