/** PostgREST `.ilike` pattern for case-insensitive exact match on `playbooks.playbook`. */
export function playbookIlikeExactPattern(playbook: string): string {
  return playbook
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
