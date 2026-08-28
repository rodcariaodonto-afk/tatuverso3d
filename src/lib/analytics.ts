/**
 * Analytics próprio (first-party) do TatuVerso3D.
 * Sem cookies, sem dados pessoais: apenas um identificador anônimo aleatório
 * guardado no navegador do visitante.
 */

export type AnalyticsEventType =
  | "pageview"
  | "click"
  | "product_view"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase";

export type AnalyticsPayload = {
  path?: string;
  referrer?: string;
  element_id?: string;
  element_label?: string;
  product_id?: string;
  order_id?: string;
  value_cents?: number;
  duration_ms?: number;
};

const VISITOR_KEY = "tv3d_vid";
const SESSION_KEY = "tv3d_sid";
const SESSION_TS_KEY = "tv3d_sid_ts";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ENDPOINT = "/api/public/analytics/collect";

type QueuedEvent = AnalyticsPayload & {
  event_type: AnalyticsEventType;
  visitor_id: string;
  session_id: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  screen_width?: number;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPath: string | null = null;

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function trackingDisabled(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { doNotTrack?: string; msDoNotTrack?: string };
  const dnt = nav.doNotTrack ?? (window as any).doNotTrack ?? nav.msDoNotTrack;
  if (dnt === "1" || dnt === "yes") return true;
  if (window.location.pathname.startsWith("/admin")) return true;
  return false;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  try {
    const now = Date.now();
    const ts = Number(sessionStorage.getItem(SESSION_TS_KEY) ?? 0);
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id || !ts || now - ts > SESSION_TIMEOUT_MS) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return id;
  } catch {
    return "anon";
  }
}

function currentUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") ?? undefined,
      utm_medium: p.get("utm_medium") ?? undefined,
      utm_campaign: p.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

function flush(useBeacon = false) {
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.slice(0, 40) });
  queue = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* silencioso: analytics nunca quebra a loja */
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(false), 1500);
}

export function trackEvent(type: AnalyticsEventType, payload: AnalyticsPayload = {}) {
  if (trackingDisabled()) return;
  queue.push({
    event_type: type,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    path: payload.path ?? window.location.pathname,
    referrer: payload.referrer ?? document.referrer ?? undefined,
    screen_width: window.innerWidth,
    ...currentUtm(),
    ...payload,
  });
  scheduleFlush();
}

export function trackPageview(path?: string) {
  if (trackingDisabled()) return;
  const p = path ?? window.location.pathname;
  if (lastPath === p) return;
  lastPath = p;

  trackEvent("pageview", { path: p });
}

export function trackClick(elementId: string, label?: string) {
  trackEvent("click", { element_id: elementId, element_label: label });
}

/** Listener global: qualquer elemento com data-track vira um evento de clique. */
export function initAnalytics() {
  if (typeof window === "undefined" || trackingDisabled()) return () => {};

  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest?.("[data-track]") as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute("data-track") ?? "";
    if (!id) return;
    const text = (el.textContent ?? "").trim().slice(0, 80);
    const label = el.getAttribute("data-track-label") ?? (text || undefined);
    trackClick(id, label ?? undefined);
  };

  const onHide = () => {
    flush(true);
  };

  document.addEventListener("click", onClick, { capture: true });
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });

  return () => {
    document.removeEventListener("click", onClick, { capture: true });
    window.removeEventListener("pagehide", onHide);
  };
}
