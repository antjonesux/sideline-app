"use client";

type CriticalFlowName =
  | "film_game_detail_load"
  | "film_logger_open_with_sheet"
  | "film_submit_to_next_play";

type FlowStatus = "ok" | "error" | "cancelled" | "skipped";

type FlowContext = Record<string, string | number | boolean | null | undefined>;

type ActiveFlow = {
  id: string;
  name: CriticalFlowName;
  startedAt: number;
  context?: FlowContext;
};

export type CriticalFlowEvent = {
  id: string;
  flow: CriticalFlowName;
  status: FlowStatus;
  durationMs: number;
  startedAtMs: number;
  endedAtMs: number;
  context?: FlowContext;
  details?: FlowContext;
};

declare global {
  interface Window {
    __sidelinePerfEvents?: CriticalFlowEvent[];
  }
}

const activeFlows = new Map<string, ActiveFlow>();

/** Cap stored events so long sessions do not grow memory unbounded. */
const MAX_PERF_EVENTS = 300;

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function emitPerfEvent(event: CriticalFlowEvent) {
  if (typeof window === "undefined") return;
  const arr = window.__sidelinePerfEvents ?? [];
  arr.push(event);
  if (arr.length > MAX_PERF_EVENTS) {
    arr.splice(0, arr.length - MAX_PERF_EVENTS);
  }
  window.__sidelinePerfEvents = arr;
  window.dispatchEvent(new CustomEvent<CriticalFlowEvent>("sideline:perf", { detail: event }));
  if (process.env.NODE_ENV !== "production") {
    console.debug("[sideline:perf]", event);
  }
}

export function startCriticalFlow(flow: CriticalFlowName, context?: FlowContext): string {
  const id = `${flow}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  activeFlows.set(id, { id, name: flow, startedAt: nowMs(), context });
  return id;
}

export function endCriticalFlow(
  flowId: string,
  status: FlowStatus = "ok",
  details?: FlowContext,
): CriticalFlowEvent | null {
  const active = activeFlows.get(flowId);
  if (!active) return null;

  activeFlows.delete(flowId);
  const endedAt = nowMs();
  const event: CriticalFlowEvent = {
    id: active.id,
    flow: active.name,
    status,
    durationMs: Math.max(0, endedAt - active.startedAt),
    startedAtMs: active.startedAt,
    endedAtMs: endedAt,
    context: active.context,
    details,
  };
  emitPerfEvent(event);
  return event;
}
