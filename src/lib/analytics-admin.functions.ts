/** Consultas agregadas do painel de analytics (somente administradores). */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export type AnalyticsReport = {
  summary: {
    visitors: number;
    sessions: number;
    pageviews: number;
    clicks: number;
    avg_session_seconds: number;
    bounce_rate: number;
    purchases: number;
    revenue_cents: number;
  };
  series: { day: string; visitors: number; pageviews: number; sessions: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  sources: { source: string; sessions: number; visitors: number }[];
  campaigns: { campaign: string; medium: string; sessions: number }[];
  devices: { device: string; sessions: number }[];
  browsers: { browser: string; sessions: number }[];
  clicks: { element_id: string; label: string; clicks: number; visitors: number }[];
  funnel: {
    visits: number;
    product_views: number;
    add_to_carts: number;
    checkouts: number;
    purchases: number;
  };
  top_products: { product_id: string; name: string; views: number; add_to_carts: number }[];
};

export const adminAnalyticsReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const to = new Date();
    const from = new Date(to.getTime() - data.days * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(from.getTime() - data.days * 24 * 60 * 60 * 1000);

    const call = async (a: Date, b: Date) => {
      const { data: rows, error } = await supabaseAdmin.rpc("analytics_report" as never, {
        _from: a.toISOString(),
        _to: b.toISOString(),
      } as never);
      if (error) throw new Error(error.message);
      return rows as unknown as AnalyticsReport;
    };

    const [current, previous] = await Promise.all([call(from, to), call(prevFrom, from)]);
    return { current, previous: previous.summary, days: data.days };
  });
