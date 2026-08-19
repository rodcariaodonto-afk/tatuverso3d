import { createFileRoute } from "@tanstack/react-router";

/** Webhook do Mercado Pago: assinatura verificada, idempotente e sem confiar no corpo. */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: any = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const url = new URL(request.url);
        const dataId =
          body?.data?.id != null
            ? String(body.data.id)
            : (url.searchParams.get("data.id") ?? url.searchParams.get("id"));
        const type = String(body?.type ?? body?.topic ?? url.searchParams.get("type") ?? "");

        const { verifyMpSignature } = await import("@/lib/payments.server");
        const valid = await verifyMpSignature({
          signatureHeader: request.headers.get("x-signature"),
          requestId: request.headers.get("x-request-id"),
          dataId,
        });
        if (!valid) return new Response("invalid signature", { status: 401 });
        if (!dataId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const eventId = String(body?.id ?? `${type}:${dataId}:${request.headers.get("x-request-id") ?? ""}`);

        const { error: insertErr } = await supabaseAdmin.from("payment_events").insert({
          provider: "mercadopago",
          event_id: eventId,
          event_type: type || null,
          provider_payment_id: dataId,
          payload: body,
          signature_valid: true,
        });
        if (insertErr) {
          // Já processado (índice único) — responde 200 para não gerar reenvio.
          if (insertErr.code === "23505") return new Response("duplicate");
          return new Response("storage error", { status: 500 });
        }

        if (!type.includes("payment")) {
          await supabaseAdmin
            .from("payment_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("provider", "mercadopago")
            .eq("event_id", eventId);
          return new Response("ignored");
        }

        try {
          const { syncPaymentFromProvider } = await import("@/lib/payments-sync.server");
          await syncPaymentFromProvider(dataId);
          await supabaseAdmin
            .from("payment_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("provider", "mercadopago")
            .eq("event_id", eventId);
          return new Response("ok");
        } catch (e) {
          await supabaseAdmin
            .from("payment_events")
            .update({ process_error: e instanceof Error ? e.message : String(e) })
            .eq("provider", "mercadopago")
            .eq("event_id", eventId);
          // 500 faz o provedor reenviar a notificação.
          return new Response("processing error", { status: 500 });
        }
      },
    },
  },
});
