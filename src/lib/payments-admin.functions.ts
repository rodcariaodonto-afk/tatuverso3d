/** Operação de pagamentos no painel: eventos do provedor e estorno. Somente admin. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_TRANSITIONS, type OrderStatus } from "./orders.shared";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const listPaymentEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        only_errors: z.boolean().default(false),
        only_unprocessed: z.boolean().default(false),
        search: z.string().trim().max(80).nullable().default(null),
        limit: z.number().int().min(1).max(200).default(80),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("payment_events")
      .select(
        "id, provider, event_id, event_type, provider_payment_id, signature_valid, processed_at, process_error, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.only_errors) q = q.not("process_error", "is", null);
    if (data.only_unprocessed) q = q.is("processed_at", null);
    if (data.search) q = q.ilike("provider_payment_id", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPaymentEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("payment_events")
      .select("*")
      .eq("id", data.event_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Evento não encontrado.");

    let order: { id: string; status: string; payment_status: string } | null = null;
    if (row.provider_payment_id) {
      const { data: pay } = await supabaseAdmin
        .from("payments")
        .select("order_id")
        .eq("provider_payment_id", row.provider_payment_id)
        .maybeSingle();
      if (pay?.order_id) {
        const { data: o } = await supabaseAdmin
          .from("orders")
          .select("id, status, payment_status")
          .eq("id", pay.order_id)
          .maybeSingle();
        order = (o as any) ?? null;
      }
    }
    return { event: row, order };
  });

/** Reprocessa reconsultando o provedor — o payload salvo nunca é fonte de verdade. */
export const reprocessPaymentEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("payment_events")
      .select("id, provider_payment_id")
      .eq("id", data.event_id)
      .maybeSingle();
    if (!row) throw new Error("Evento não encontrado.");
    if (!row.provider_payment_id) throw new Error("Evento sem identificador de pagamento.");

    const { syncPaymentFromProvider } = await import("./payments-sync.server");
    try {
      const result = await syncPaymentFromProvider(row.provider_payment_id);
      await supabaseAdmin
        .from("payment_events")
        .update({ processed_at: new Date().toISOString(), process_error: null })
        .eq("id", row.id);
      await supabaseAdmin.from("audit_logs").insert({
        actor_user_id: context.userId,
        action: "payment.event_reprocessed",
        entity_type: "payment_events",
        entity_id: row.id,
        details: { provider_payment_id: row.provider_payment_id, result },
      });
      return { ok: true, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("payment_events").update({ process_error: message }).eq("id", row.id);
      throw new Error(`Falha ao reprocessar: ${message}`);
    }
  });

/** Estorno real no Mercado Pago (total ou parcial). */
export const refundPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        payment_id: z.string().uuid(),
        amount: z.number().positive().max(1_000_000).nullable().default(null),
        reason: z.string().trim().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, provider, provider_payment_id, amount, status, refunded_amount")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!payment) throw new Error("Pagamento não encontrado.");
    if (payment.provider !== "mercadopago") throw new Error("Provedor não suporta estorno automático.");
    if (!payment.provider_payment_id) throw new Error("Pagamento sem identificador no provedor.");
    if (payment.status !== "paid" && payment.status !== "authorized") {
      throw new Error("Só é possível estornar um pagamento aprovado.");
    }

    const total = Number(payment.amount);
    const already = Number(payment.refunded_amount ?? 0);
    const remaining = Number((total - already).toFixed(2));
    if (remaining <= 0) throw new Error("Este pagamento já foi totalmente estornado.");

    const amount = data.amount == null ? remaining : Number(data.amount.toFixed(2));
    if (amount > remaining) {
      throw new Error(`Valor acima do disponível para estorno (${remaining.toFixed(2)}).`);
    }

    const { refundMpPayment } = await import("./payments.server");
    const idempotencyKey = `refund:${payment.id}:${amount}`;
    const refund = await refundMpPayment({
      paymentId: payment.provider_payment_id,
      amount: amount < remaining ? amount : null,
      idempotencyKey,
    });

    const newRefunded = Number((already + amount).toFixed(2));
    const isFull = newRefunded >= total - 0.009;

    await supabaseAdmin
      .from("payments")
      .update({
        refunded_amount: newRefunded,
        refund_reason: data.reason,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Reconcilia com o estado real do provedor.
    const { syncPaymentFromProvider } = await import("./payments-sync.server");
    try {
      await syncPaymentFromProvider(payment.provider_payment_id);
    } catch {
      /* o estorno já foi aceito; a reconciliação pode ser refeita no painel */
    }

    if (isFull && payment.order_id) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", payment.order_id)
        .maybeSingle();
      if (order) {
        const current = order.status as OrderStatus;
        const patch: Record<string, unknown> = { payment_status: "refunded" };
        if (ALLOWED_TRANSITIONS[current]?.includes("refunded")) patch["status"] = "refunded";
        await supabaseAdmin.from("orders").update(patch).eq("id", order.id);
        await supabaseAdmin.rpc("release_stock", { _order_id: order.id, _reason: "refunded" });
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: isFull ? "payment.refunded_full" : "payment.refunded_partial",
      entity_type: "payments",
      entity_id: payment.id,
      details: {
        order_id: payment.order_id,
        amount,
        refunded_total: newRefunded,
        reason: data.reason,
        provider_refund_id: refund?.id ?? null,
      },
    });

    return { ok: true, refunded_amount: newRefunded, full: isFull };
  });
