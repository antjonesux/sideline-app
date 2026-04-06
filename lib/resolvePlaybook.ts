/** Map scheme `cfb26_playbook` string to cfb26_plays.playbook row value. */
export function playbookFromSchemeField(cfb26Playbook: string | null | undefined): string {
  if (!cfb26Playbook) return "Washington State";
  const parts = cfb26Playbook.split(/\s*\/\s*/).map((p) => p.trim());
  const ws = parts.find((p) => /washington state/i.test(p));
  if (ws) return "Washington State";
  const last = parts[parts.length - 1];
  return last || "Washington State";
}
