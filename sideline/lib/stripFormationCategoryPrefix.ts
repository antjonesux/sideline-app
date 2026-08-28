/**
 * Display helper: strip a formation category prefix when the catalog name
 * redundantly includes it (e.g. category "Pistol", name "Pistol Empty Tight Stack").
 */
export function stripFormationCategoryPrefix(formationName: string, categoryName: string): string {
  const formation = formationName.trim();
  const category = categoryName.trim();
  if (!formation || !category) return formation;

  const prefix = `${category} `;
  if (formation.toLowerCase().startsWith(prefix.toLowerCase())) {
    const stripped = formation.slice(prefix.length).trim();
    return stripped || formation;
  }
  return formation;
}
