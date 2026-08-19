/** Operação de pedidos no painel. Toda escrita passa por aqui, nunca pelo navegador. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_TRANSITIONS, PRODUCTION_STATUSES, type OrderStatus } from "./orders.shared";

const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(ORDER_STATUSES).nullable().default(null),
        payment_status: z.enum(["pending", "authorized", "paid", "failed", "refunded"]).nullable().default(null),
        from: z.string().nullable().default(null),
        to: z.string().nullable().default(null),
        search: z.string().max(120).nullable().default(null),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("orders")
      .select(
        "id, customer_id, status, payment_status, subtotal, shipping_total, discount_total, total, created_at, shipping_snapshot, order_items(id, product_name, quantity, production_status)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status) q = q.eq("status", data.status);
    if (data.payment_status) q = q.eq("payment_status", data.payment_status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((o) => o.customer_id).filter(Boolean))) as string[];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const withCustomer = (rows ?? []).map((o) => ({
      ...o,
      customer: byId.get(o.customer_id) ?? null,
    }));

    const term = data.search?.trim().toLowerCase();
    if (!term) return withCustomer;
    return withCustomer.filter(
      (o) =>
        o.id.toLowerCase().includes(term) ||
        (o.customer?.email ?? "").toLowerCase().includes(term) ||
        (o.customer?.full_name ?? "").toLowerCase().includes(term),
    );
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildOrderDetail } = await import("./orders.server");
    return buildOrderDetail(supabaseAdmin, data.order_id, { includeInternal: true });
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
        note: z.string().max(500).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado.");

    const current = order.status as OrderStatus;
    if (current === data.status) return { ok: true, status: current };
    if (!ALLOWED_TRANSITIONS[current]?.includes(data.status)) {
      throw new Error(`Transição inválida: ${current} → ${data.status}.`);
    }

    const patch: { status: OrderStatus; payment_status?: "refunded" } = { status: data.status };

    if (data.status === "cancelled") {
      await supabaseAdmin.rpc("release_stock", { _order_id: order.id, _reason: "cancelled_by_admin" });
    }
    if (data.status === "refunded") {
      patch.payment_status = "refunded";
    }

    const { error: updErr } = await supabaseAdmin.from("orders").update(patch).eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    // O gatilho grava o histórico; completamos com autor e observação.
    const { data: last } = await supabaseAdmin
      .from("order_status_history")
      .select("id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.id) {
      await supabaseAdmin
        .from("order_status_history")
        .update({ changed_by: context.userId, notes: data.note })
        .eq("id", last.id);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "order.status_changed",
      entity_type: "orders",
      entity_id: order.id,
      details: { from: current, to: data.status, note: data.note },
    });

    return { ok: true, status: data.status };
  });

export const adminSetItemProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        production_status: z.enum(PRODUCTION_STATUSES),
        production_notes: z.string().max(500).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("order_items")
      .update({ production_status: data.production_status, production_notes: data.production_notes })
      .eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminProductionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("order_items")
      .select(
        "id, order_id, product_name, variant_name_snapshot, quantity, production_status, production_notes, orders!inner(id, status, created_at, production_days)",
      )
      .in("production_status", ["pending", "in_production"])
      .in("orders.status", ["paid", "preparing"])
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        shipment_id: z.string().uuid().nullable().default(null),
        carrier: z.string().trim().max(80).nullable().default(null),
        service: z.string().trim().max(80).nullable().default(null),
        tracking_code: z.string().trim().max(80).nullable().default(null),
        tracking_url: z.string().trim().url().max(400).nullable().default(null),
        estimated_delivery_at: z.string().max(20).nullable().default(null),
        mark_shipped: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado.");

    const payload = {
      order_id: data.order_id,
      carrier: data.carrier,
      service: data.service,
      tracking_code: data.tracking_code,
      tracking_url: data.tracking_url,
      estimated_delivery_at: data.estimated_delivery_at || null,
      status: data.mark_shipped ? "shipped" : "pending",
      shipped_at: data.mark_shipped ? new Date().toISOString() : null,
    };

    let shipmentId = data.shipment_id;
    if (shipmentId) {
      const { error } = await supabaseAdmin.from("shipments").update(payload).eq("id", shipmentId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("shipments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      shipmentId = created.id;
    }

    if (data.mark_shipped) {
      await supabaseAdmin.from("tracking_events").insert({
        shipment_id: shipmentId!,
        status: "shipped",
        description: "Pedido despachado pela TatuVerso3D",
        occurred_at: new Date().toISOString(),
      });
      const current = order.status as OrderStatus;
      if (ALLOWED_TRANSITIONS[current]?.includes("shipped")) {
        await supabaseAdmin.from("orders").update({ status: "shipped" }).eq("id", order.id);
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "order.shipment_saved",
      entity_type: "shipments",
      entity_id: shipmentId,
      details: { order_id: data.order_id, tracking_code: data.tracking_code },
    });

    return { ok: true, shipment_id: shipmentId };
  });

export const adminAddTrackingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        shipment_id: z.string().uuid(),
        status: z.string().trim().min(2).max(60),
        description: z.string().trim().max(300).nullable().default(null),
        location: z.string().trim().max(120).nullable().default(null),
        occurred_at: z.string().nullable().default(null),
        mark_delivered: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: shipment } = await supabaseAdmin
      .from("shipments")
      .select("id, order_id")
      .eq("id", data.shipment_id)
      .maybeSingle();
    if (!shipment) throw new Error("Envio não encontrado.");

    const occurred = data.occurred_at ? new Date(data.occurred_at).toISOString() : new Date().toISOString();
    const { error } = await supabaseAdmin.from("tracking_events").insert({
      shipment_id: data.shipment_id,
      status: data.status,
      description: data.description,
      location: data.location,
      occurred_at: occurred,
    });
    if (error) throw new Error(error.message);

    if (data.mark_delivered) {
      await supabaseAdmin
        .from("shipments")
        .update({ status: "delivered", delivered_at: occurred })
        .eq("id", data.shipment_id);
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", shipment.order_id)
        .maybeSingle();
      const current = (order?.status ?? "pending") as OrderStatus;
      if (order && ALLOWED_TRANSITIONS[current]?.includes("delivered")) {
        await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "order.tracking_event",
      entity_type: "shipments",
      entity_id: data.shipment_id,
      details: { status: data.status, delivered: data.mark_delivered },
    });

    return { ok: true };
  });

/** Reconsulta o provedor e reconcilia pedido, pagamento e estoque. */
export const adminResyncPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("provider_payment_id")
      .eq("order_id", data.order_id)
      .not("provider_payment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!payments?.length) throw new Error("Este pedido ainda não tem pagamento registrado.");

    const { syncPaymentFromProvider } = await import("./payments-sync.server");
    const results: string[] = [];
    for (const p of payments) {
      try {
        const r = await syncPaymentFromProvider(p.provider_payment_id as string);
        results.push(`${p.provider_payment_id}: ${r.provider_status}`);
      } catch (err) {
        results.push(`${p.provider_payment_id}: falha ao consultar`);
      }
    }
    return { ok: true, results };
  });