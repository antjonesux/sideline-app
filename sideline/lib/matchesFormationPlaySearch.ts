/** Case-insensitive: every whitespace-separated term must appear in formation or play name (combined). */
export function matchesFormationPlaySearch(query: string, formation: string, playName: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const combined = `${formation} ${playName}`.toLowerCase();
  return terms.every((term) => combined.includes(term));
}
