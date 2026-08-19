/** Pedidos na área do cliente. RLS garante que o usuário só veja os próprios. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, status, payment_status, total, created_at, shipping_snapshot, order_items(id, product_name, variant_name_snapshot, quantity)",
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: owned, error } = await context.supabase
      .from("orders")
      .select("id")
      .eq("id", data.order_id)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!owned) throw new Error("Pedido não encontrado.");

    const { buildOrderDetail } = await import("./orders.server");
    return buildOrderDetail(context.supabase, data.order_id, { includeInternal: false });
  });