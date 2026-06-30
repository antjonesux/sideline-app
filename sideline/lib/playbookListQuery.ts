import type { PlaybookListResponse, PlaybookSummary } from "@/lib/types";

export const playbookListQueryKey = ["playbooks", "list"] as const;

function coercePlaybookList(payload: unknown): PlaybookSummary[] {
  if (Array.isArray(payload)) return payload as PlaybookSummary[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.playbooks)) return o.playbooks as PlaybookSummary[];
    if (Array.isArray(o.data)) return o.data as PlaybookSummary[];
  }
  return [];
}

export function coercePlaybookListResponse(payload: unknown): PlaybookListResponse {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    return {
      playbooks: coercePlaybookList(o),
      active_call_sheet_id: typeof o.active_call_sheet_id === "string" ? o.active_call_sheet_id : null,
    };
  }
  return { playbooks: coercePlaybookList(payload), active_call_sheet_id: null };
}

export async function fetchPlaybookList(): Promise<PlaybookListResponse> {
  const res = await fetch("/api/playbook");
  const j = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load play sheets");
  return coercePlaybookListResponse(j);
}
