import { createClient } from "npm:@supabase/supabase-js@2";
import { json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Mapeamento de status MP → status interno
const MP_PAYMENT_STATUS: Record<string, string> = {
  approved: "paid",
  authorized: "authorized",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "failed",
  cancelled: "failed",
  refunded: "refunded",
  charged_back: "refunded",
};

const MP_ORDER_STATUS: Record<string, string> = {
  paid: "processing",
  authorized: "processing",
  pending: "pending",
  failed: "cancelled",
  refunded: "cancelled",
};

Deno.serve(async (req) => {
  // MP envia GET para validar a URL + POST com o evento
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") ?? "default";

    // Valida assinatura MP (opcional em sandbox, obrigatório em produção)
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id") ?? "";

    const body = await req.json();

    // MP envia notificações de tipo "payment" ou "merchant_order"
    if (body.type !== "payment") {
      return json({ received: true });
    }

    const paymentId = String(body.data?.id ?? "");
    if (!paymentId) return json({ received: true });

    // Busca credenciais do tenant
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("mp_access_token, mp_environment")
      .eq("tenant_id", tenantId)
      .single();

    if (!settings?.mp_access_token) {
      console.error("mp-webhook: credenciais não encontradas para tenant", tenantId);
      return json({ received: true });
    }

    // Valida assinatura HMAC (se webhook secret configurado)
    const webhookSecret = Deno.env.get("MP_WEBHOOK_SECRET");
    if (webhookSecret && xSignature) {
      const valid = await validateSignature(xSignature, xRequestId, paymentId, webhookSecret);
      if (!valid) {
        console.warn("mp-webhook: assinatura inválida");
        return err("Assinatura inválida", 401);
      }
    }

    // Busca detalhes do pagamento na API do MP
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${settings.mp_access_token}` } },
    );

    if (!mpRes.ok) {
      console.error("mp-webhook: erro ao buscar pagamento", mpRes.status);
      return json({ received: true });
    }

    const payment = await mpRes.json();
    const orderId: string | undefined = payment.external_reference;
    const paymentStatus: string = payment.status ?? "unknown";
    const internalPaymentStatus = MP_PAYMENT_STATUS[paymentStatus] ?? "pending";
    const internalOrderStatus = MP_ORDER_STATUS[internalPaymentStatus] ?? "pending";

    if (!orderId) {
      console.warn("mp-webhook: external_reference ausente no pagamento", paymentId);
      return json({ received: true });
    }

    // Atualiza o pedido
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        payment_status: internalPaymentStatus as any,
        status: internalOrderStatus as any,
        payment_reference: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error("mp-webhook: erro ao atualizar pedido", updateErr.message);
    } else {
      console.log(
        `mp-webhook: pedido ${orderId} atualizado → payment=${internalPaymentStatus} status=${internalOrderStatus}`,
      );

      // Registra no histórico de status
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        to_status: internalOrderStatus as any,
        notes: `MP payment ${paymentId} → ${paymentStatus}`,
      });
    }

    return json({ received: true });
  } catch (e: any) {
    console.error("mp-webhook error:", e.message);
    // Retorna 200 para MP não retentar (evita loop de notificações)
    return json({ received: true, error: e.message });
  }
});

// ── Validação de assinatura HMAC-SHA256 ───────────────────────────────────────

async function validateSignature(
  xSignature: string,
  requestId: string,
  dataId: string,
  secret: string,
): Promise<boolean> {
  try {
    // Formato: ts=1234567890,v1=<hash>
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => p.split("=") as [string, string]),
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-date:${ts};`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === v1;
  } catch {
    return false;
  }
}
