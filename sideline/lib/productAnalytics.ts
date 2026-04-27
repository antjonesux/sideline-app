"use client";

/**
 * Lightweight product analytics (launch-plan funnel), aligned with `perfInstrumentation` patterns:
 * buffer on `window`, `CustomEvent("sideline:product")`, dev console line.
 * Downstream (PostHog, GTM) can subscribe to the event or read the buffer.
 */

export type ProductAnalyticsEventName =
  | "game_created"
  | "first_play"
  | "ten_plays"
  | "full_game"
  | "tendencies_viewed"
  | "return_session"
  | "on_sheet_call_made"
  /** Fires on successful log when the play was chosen from an app-curated path (not unguided browser search). See emit site for first-pass definition. */
  | "play_call_changed_based_on_app_data";

export type ProductAnalyticsEvent = {
  name: ProductAnalyticsEventName;
  atMs: number;
  context?: Record<string, string | number | boolean | null | undefined>;
};

declare global {
  interface Window {
    __sidelineProductEvents?: ProductAnalyticsEvent[];
  }
}

const MAX_EVENTS = 300;
const DEDUPE = new Map<string, number>();

function nowMs() {
  return Date.now();
}

function pushEvent(event: ProductAnalyticsEvent) {
  if (typeof window === "undefined") return;
  const arr = window.__sidelineProductEvents ?? [];
  arr.push(event);
  if (arr.length > MAX_EVENTS) {
    arr.splice(0, arr.length - MAX_EVENTS);
  }
  window.__sidelineProductEvents = arr;
  window.dispatchEvent(new CustomEvent<ProductAnalyticsEvent>("sideline:product", { detail: event }));
  if (process.env.NODE_ENV !== "production") {
    console.debug("[sideline:product]", event);
  }
}

type EmitOpts = {
  /** Deduplicate rapid repeats (e.g. React strict mode double-mount). */
  dedupeKey?: string;
  dedupeWindowMs?: number;
};

export function emitProductEvent(
  name: ProductAnalyticsEventName,
  context?: ProductAnalyticsEvent["context"],
  opts?: EmitOpts,
) {
  if (typeof window === "undefined") return;
  if (opts?.dedupeKey) {
    const windowMs = opts.dedupeWindowMs ?? 2000;
    const k = `${name}:${opts.dedupeKey}`;
    const t = DEDUPE.get(k) ?? 0;
    if (nowMs() - t < windowMs) return;
    DEDUPE.set(k, nowMs());
  }
  pushEvent({ name, atMs: nowMs(), context });
}

/** First pass: return = a later browser session after at least one prior app open in this browser (localStorage). */
const LS_EVER_LAUNCHED = "sideline:product:ever_launched_v1";
const SS_RETURN_EMITTED = "sideline:product:return_session_emitted_v1";

export function tryEmitReturnSession(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (sessionStorage.getItem(SS_RETURN_EMITTED) === "1") return;
    const hadPriorLaunch = localStorage.getItem(LS_EVER_LAUNCHED) === "1";
    localStorage.setItem(LS_EVER_LAUNCHED, "1");
    if (hadPriorLaunch) {
      sessionStorage.setItem(SS_RETURN_EMITTED, "1");
      emitProductEvent("return_session", {});
    }
  } catch {
    /* ignore */
  }
}

const LS_MILESTONE_PREFIX = "sideline:product:milestone:";

function milestoneKey(suffix: string, gameId: string) {
  return `${LS_MILESTONE_PREFIX}${suffix}:${gameId}`;
}

export function wasMilestoneFired(suffix: "first_play" | "ten_plays" | "full_game", gameId: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    return localStorage.getItem(milestoneKey(suffix, gameId)) === "1";
  } catch {
    return true;
  }
}

export function markMilestoneFired(suffix: "first_play" | "ten_plays" | "full_game", gameId: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(milestoneKey(suffix, gameId), "1");
  } catch {
    /* ignore */
  }
}
