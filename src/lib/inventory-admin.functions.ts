/** Estoque na operação: histórico, ajuste manual auditado e alerta de estoque baixo. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const adminListMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        product_id: z.string().uuid().nullable().default(null),
        variant_id: z.string().uuid().nullable().default(null),
        movement_type: z.string().max(40).nullable().default(null),
        limit: z.number().int().min(1).max(300).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("inventory_movements")
      .select(
        "id, product_id, variant_id, movement_type, quantity, previous_quantity, resulting_quantity, reason, notes, order_id, created_at, products(name), product_variants(name, sku)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.product_id) q = q.eq("product_id", data.product_id);
    if (data.variant_id) q = q.eq("variant_id", data.variant_id);
    if (data.movement_type) q = q.eq("movement_type", data.movement_type);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminAdjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable().default(null),
        movement_type: z.enum(["in", "out", "adjust"]),
        quantity: z.number().int().min(1).max(100000),
        reason: z.string().trim().min(3, "Descreva o motivo.").max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = data.variant_id ? "product_variants" : "products";
    const id = data.variant_id ?? data.product_id;

    const { data: row, error } = await supabaseAdmin
      .from(table)
      .select("id, stock_quantity")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto ou variação não encontrado.");

    const previous = Number(row.stock_quantity ?? 0);
    const resulting =
      data.movement_type === "in"
        ? previous + data.quantity
        : data.movement_type === "out"
          ? Math.max(0, previous - data.quantity)
          : data.quantity;

    const { error: updErr } = await supabaseAdmin
      .from(table)
      .update({ stock_quantity: resulting })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);

    const { error: movErr } = await supabaseAdmin.from("inventory_movements").insert({
      product_id: data.product_id,
      variant_id: data.variant_id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      previous_quantity: previous,
      resulting_quantity: resulting,
      reason: data.reason,
      reference_type: "manual_adjustment",
      created_by: context.userId,
    });
    if (movErr) throw new Error(movErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "inventory.manual_adjustment",
      entity_type: table,
      entity_id: id,
      details: { previous, resulting, movement_type: data.movement_type, reason: data.reason },
    });

    return { ok: true, previous, resulting };
  });

export const adminLowStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: products }, { data: variants }] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, slug, stock_quantity, reserved_quantity, low_stock_threshold, track_inventory")
        .neq("status", "archived")
        .limit(500),
      supabaseAdmin
        .from("product_variants")
        .select("id, product_id, name, sku, stock_quantity, reserved_quantity, low_stock_threshold, is_active, products(name)")
        .eq("is_active", true)
        .limit(500),
    ]);

    const lowProducts = (products ?? []).filter(
      (p: any) => p.track_inventory && Number(p.stock_quantity) <= Number(p.low_stock_threshold ?? 0),
    );
    const lowVariants = (variants ?? []).filter(
      (v: any) => Number(v.stock_quantity) <= Number(v.low_stock_threshold ?? 0),
    );

    return { products: lowProducts, variants: lowVariants };
  });