/** Preview-only scenario labels (CSV import step 4). */
export function deriveScenarioForPreview(down: number, distance: number): string {
  if (down === 1) return "1st Down";
  if (down === 2 && distance <= 3) return "2nd & Short";
  if (down === 2 && distance <= 7) return "2nd & Medium";
  if (down === 2) return "2nd & Long";
  if (down === 3 && distance <= 3) return "3rd & Short";
  if (down === 3 && distance <= 6) return "3rd & Medium";
  if (down === 3) return "3rd & Long";
  if (down === 4) return "4th Down";
  return "1st Down";
}

/** Preview-only field zone labels (matches import UX spec). */
export function deriveFieldZoneForPreview(yardLine: string): string {
  const normalized = yardLine.toUpperCase().trim();
  const num = parseInt(normalized.replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(num)) return "MIDFIELD";
  if (normalized.includes("OWN") && num <= 10) return "BACKED UP";
  if (normalized.includes("OPP") && num <= 5) return "GOAL LINE";
  if (normalized.includes("OPP") && num <= 20) return "RED ZONE";
  if (normalized.includes("OPP") && num <= 40) return "OPP TERRITORY";
  return "MIDFIELD";
}
