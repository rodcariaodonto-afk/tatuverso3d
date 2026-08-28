import { createFileRoute } from "@tanstack/react-router";

/** Job agendado: consolida o resumo diário de analytics e apaga eventos com mais de 90 dias. */
export const Route = createFileRoute("/api/public/jobs/analytics-rollup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accepted = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
        ].filter((v): v is string => !!v);
        const provided = request.headers.get("apikey") ?? "";
        if (!accepted.length || !accepted.includes(provided)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("analytics_rollup" as never, { _days: 3 } as never);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, days_updated: data ?? 0 });
      },
    },
  },
});
