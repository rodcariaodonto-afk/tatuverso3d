import { createFileRoute } from "@tanstack/react-router";

/** Job agendado: devolve ao estoque as reservas vencidas de pedidos não pagos. */
export const Route = createFileRoute("/api/public/jobs/expire-reservations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("expire_stock_reservations");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, released_orders: data ?? 0 });
      },
    },
  },
});
