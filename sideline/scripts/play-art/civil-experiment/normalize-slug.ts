/**
 * Civil.GG slug normalization — baseline only (lowercase + strip spaces).
 * No punctuation / hyphen special-cases; catalog failures from the hit-rate run.
 */
export function normalizeSlug(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "");
}

/**
 * Derive Civil "formation set" from Sideline full formation name + type.
 * Seed stores "Gun Bunch Ace Offset" with type "Gun"; Civil uses set "Bunch Ace Offset".
 */
export function formationSetFromFullName(
  formation: string,
  formationType: string,
): string {
  const form = formation.trim();
  const type = formationType.trim();
  if (!type) return form;
  if (form.toLowerCase().startsWith(type.toLowerCase())) {
    return form.slice(type.length).trim();
  }
  return form;
}
