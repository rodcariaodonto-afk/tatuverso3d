import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EVENT_TYPES = [
  "pageview",
  "click",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

const eventSchema = z.object({
  event_type: z.enum(EVENT_TYPES),
  visitor_id: z.string().min(1).max(64),
  session_id: z.string().min(1).max(64),
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  element_id: z.string().max(120).optional(),
  element_label: z.string().max(160).optional(),
  product_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  value_cents: z.number().int().min(0).max(100_000_000).optional(),
  duration_ms: z.number().int().min(0).max(3_600_000).optional(),
  screen_width: z.number().int().min(0).max(20_000).optional(),
});

const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(40) });

function parseUA(ua: string, screenWidth?: number) {
  const s = ua.toLowerCase();
  const isTablet = /ipad|tablet|playbook|silk/.test(s) || (/android/.test(s) && !/mobile/.test(s));
  const isMobile = /iphone|ipod|android.*mobile|windows phone|mobile safari/.test(s);
  let device_type = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";
  if (!ua && typeof screenWidth === "number") {
    device_type = screenWidth < 640 ? "mobile" : screenWidth < 1024 ? "tablet" : "desktop";
  }

  let browser = "Outro";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/samsungbrowser/.test(s)) browser = "Samsung";
  else if (/chrome|crios/.test(s)) browser = "Chrome";
  else if (/firefox|fxios/.test(s)) browser = "Firefox";
  else if (/safari/.test(s)) browser = "Safari";

  let os = "Outro";
  if (/windows/.test(s)) os = "Windows";
  else if (/iphone|ipad|ipod|ios/.test(s)) os = "iOS";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/android/.test(s)) os = "Android";
  else if (/linux/.test(s)) os = "Linux";

  return { device_type, browser, os };
}

function referrerHost(referrer?: string, selfHost?: string) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (selfHost && host === selfHost.replace(/^www\./, "")) return null;
    return host;
  } catch {
    return null;
  }
}

/** Recebe lotes de eventos anônimos do site. Nunca grava IP nem dado pessoal. */
export const Route = createFileRoute("/api/public/analytics/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 40_000) return new Response("payload too large", { status: 413 });

        let parsed;
        try {
          parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return new Response("invalid payload", { status: 400 });
        }

        const ua = request.headers.get("user-agent") ?? "";
        // O IP é usado apenas para derivar país/região pelos headers do edge e nunca é gravado.
        const country = request.headers.get("cf-ipcountry") ?? null;
        const region = request.headers.get("cf-region") ?? null;
        const selfHost = (() => {
          try {
            return new URL(request.url).hostname;
          } catch {
            return undefined;
          }
        })();

        const rows = parsed.events.map((e) => {
          const { device_type, browser, os } = parseUA(ua, e.screen_width);
          return {
            visitor_id: e.visitor_id,
            session_id: e.session_id,
            event_type: e.event_type,
            path: e.path ?? null,
            referrer: e.referrer ?? null,
            referrer_host: referrerHost(e.referrer, selfHost),
            utm_source: e.utm_source ?? null,
            utm_medium: e.utm_medium ?? null,
            utm_campaign: e.utm_campaign ?? null,
            device_type,
            browser,
            os,
            country,
            region,
            element_id: e.element_id ?? null,
            element_label: e.element_label ?? null,
            product_id: e.product_id ?? null,
            order_id: e.order_id ?? null,
            value_cents: e.value_cents ?? null,
            duration_ms: e.duration_ms ?? null,
          };
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("analytics_events").insert(rows as never);
        if (error) return Response.json({ ok: false }, { status: 500 });
        return Response.json({ ok: true, received: rows.length });
      },
    },
  },
});
