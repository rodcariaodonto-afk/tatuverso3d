import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { isValidCPF } from "./shipping.shared";

const PIX_MINUTES = 30;

const payerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().max(60).optional(),
  last_name: z.string().max(60).optional(),
  document: z.string().min(11).max(18),
});

const startPaymentSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("pix"),
    order_id: z.string().uuid(),
    payer: payerSchema,
  }),
  z.object({
    method: z.literal("card"),
    order_id: z.string().uuid(),
    payer: payerSchema,
    token: z.string().min(10),
    installments: z.number().int().min(1).max(12),
    payment_method_id: z.string().min(2),
    issuer_id: z.string().nullable().optional(),
  }),
]);

/** Chave pública do provedor — única credencial que o navegador pode ver. */
export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const publicKey = process.env["MERCADOPAGO_PUBLIC_KEY"] ?? null;
  return {
    provider: "mercadopago" as const,
    public_key: publicKey,
    enabled: !!publicKey && !!process.env["MERCADOPAGO_ACCESS_TOKEN"],
    methods: { pix: true, card: true },
    pix_expiration_minutes: PIX_MINUTES,
  };
});

function baseUrl() {
  const req = getRequest();
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Cria o pagamento. O valor vem sempre do pedido no banco. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startPaymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const doc = data.payer.document.replace(/\D/g, "");
    if (!isValidCPF(doc)) throw new Error("CPF inválido");

    const { createMpPayment, mapPaymentStatus } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, customer_id, total, payment_status, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.customer_id !== context.userId) throw new Error("Pedido não encontrado");
    if (order.payment_status === "paid") throw new Error("Este pedido já foi pago");
    if (order.status === "cancelled") throw new Error("Este pedido foi cancelado");

    const amount = Number(order.total);
    if (!(amount > 0)) throw new Error("Valor do pedido inválido");

    const idempotencyKey = `${order.id}:${data.method}:${Date.now()}`;
    const notificationUrl = `${baseUrl()}/api/public/webhooks/mercadopago`;

    const mp = await createMpPayment({
      amount,
      description: `Pedido TatuVerso3D ${order.id.slice(0, 8)}`,
      externalReference: order.id,
      idempotencyKey,
      notificationUrl,
      payer: {
        email: data.payer.email,
        first_name: data.payer.first_name,
        last_name: data.payer.last_name,
        identification: { type: "CPF", number: doc },
      },
      ...(data.method === "pix"
        ? { pix: { expiresInMinutes: PIX_MINUTES } }
        : {
            card: {
              token: data.token,
              installments: data.installments,
              payment_method_id: data.payment_method_id,
              issuer_id: data.issuer_id ?? null,
            },
          }),
    });

    const status = mapPaymentStatus(String(mp.status));
    const td = mp.point_of_interaction?.transaction_data;

    await supabaseAdmin.from("payments").upsert(
      {
        order_id: order.id,
        provider: "mercadopago",
        provider_payment_id: String(mp.id),
        idempotency_key: idempotencyKey,
        amount,
        status,
        provider_status: String(mp.status),
        method: data.method,
        installments: data.method === "card" ? data.installments : 1,
        payer_document: doc.slice(-4),
        failure_reason: status === "failed" ? (mp.status_detail ?? null) : null,
        qr_code: td?.qr_code ?? null,
        qr_code_base64: td?.qr_code_base64 ?? null,
        ticket_url: td?.ticket_url ?? null,
        expires_at: mp.date_of_expiration ?? null,
        raw_payload: JSON.parse(JSON.stringify(mp)) as Json,
      },
      { onConflict: "provider,provider_payment_id" },
    );

    await supabaseAdmin
      .from("orders")
      .update({ payment_provider: "mercadopago", payment_reference: String(mp.id) })
      .eq("id", order.id);

    if (status === "paid" || status === "failed") {
      const { syncPaymentFromProvider } = await import("./payments-sync.server");
      await syncPaymentFromProvider(mp.id, mp);
    }

    return {
      payment_id: String(mp.id),
      method: data.method,
      status,
      provider_status: String(mp.status),
      detail: (mp.status_detail as string | null) ?? null,
      qr_code: td?.qr_code ?? null,
      qr_code_base64: td?.qr_code_base64 ?? null,
      ticket_url: td?.ticket_url ?? null,
      expires_at: mp.date_of_expiration ?? null,
      amount,
    };
  });

/** Consulta o pagamento do próprio pedido e reconcilia com o provedor. */
export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id, status, payment_status, total, payment_reference")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.customer_id !== context.userId) throw new Error("Pedido não encontrado");

    if (order.payment_reference && order.payment_status !== "paid") {
      try {
        const { syncPaymentFromProvider } = await import("./payments-sync.server");
        await syncPaymentFromProvider(order.payment_reference);
      } catch {
        /* provedor indisponível: devolve o último estado conhecido */
      }
    }

    const { data: fresh } = await context.supabase
      .from("orders")
      .select("id, status, payment_status, total, production_days, shipping_snapshot")
      .eq("id", data.order_id)
      .maybeSingle();

    const { data: payment } = await context.supabase
      .from("payments")
      .select("status, provider_status, method, qr_code, qr_code_base64, ticket_url, expires_at, failure_reason")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { order: fresh, payment };
  });

/** Cancela um pedido não pago e devolve o estoque reservado. */
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id, payment_status")
      .eq("id", data.order_id)
      .maybeSingle();
    const isAdmin = (await context.supabase.rpc("is_admin", { _user_id: context.userId })).data;
    if (!order || (order.customer_id !== context.userId && !isAdmin)) {
      throw new Error("Pedido não encontrado");
    }
    if (order.payment_status === "paid") throw new Error("Pedido pago não pode ser cancelado aqui");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("release_stock", { _order_id: order.id, _reason: "cancelled" });
    await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return { ok: true };
  });
