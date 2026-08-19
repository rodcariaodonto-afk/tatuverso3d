import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.number().int().positive().max(999),
  customization_field_ids: z.array(z.string().uuid()).default([]),
});

const payloadSchema = z.object({ items: z.array(itemSchema).min(1) });

export type ValidatedCartItem = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  made_to_order: boolean;
  production_time_days: number | null;
};

/**
 * Recalcula os preços do carrinho no servidor a partir do banco.
 * Nunca confia no preço enviado pelo navegador.
 */
export const validateCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }): Promise<{ items: ValidatedCartItem[]; subtotal: number }> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const productIds = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products, error } = await supabase
      .from("products")
      .select(
        `id, name, price, status, made_to_order, production_time_days, sku, stock_quantity,
         track_inventory, allow_backorder,
         product_variants ( id, name, sku, price, stock_quantity, is_active ),
         product_customization_fields ( id, price_adjustment, is_active )`,
      )
      .in("id", productIds)
      .eq("status", "active");
    if (error) throw new Error(error.message);

    const byId = new Map((products ?? []).map((p: any) => [p.id, p]));
    const items: ValidatedCartItem[] = [];

    for (const item of data.items) {
      const p: any = byId.get(item.product_id);
      if (!p) throw new Error("Produto indisponível no carrinho");

      let unit = Number(p.price);
      let variantName: string | null = null;
      let sku: string | null = p.sku ?? null;

      if (item.variant_id) {
        const v = (p.product_variants ?? []).find((x: any) => x.id === item.variant_id);
        if (!v || v.is_active === false) throw new Error(`Variação indisponível: ${p.name}`);
        unit = Number(v.price);
        variantName = v.name ?? null;
        sku = v.sku ?? sku;
        if (p.track_inventory && !p.allow_backorder && !p.made_to_order && v.stock_quantity < item.quantity) {
          throw new Error(`Estoque insuficiente: ${p.name}`);
        }
      } else if (p.track_inventory && !p.allow_backorder && !p.made_to_order && p.stock_quantity < item.quantity) {
        throw new Error(`Estoque insuficiente: ${p.name}`);
      }

      for (const fieldId of item.customization_field_ids) {
        const f = (p.product_customization_fields ?? []).find((x: any) => x.id === fieldId);
        if (f && f.is_active !== false) unit += Number(f.price_adjustment ?? 0);
      }

      const total = Number((unit * item.quantity).toFixed(2));
      items.push({
        product_id: p.id,
        variant_id: item.variant_id,
        product_name: p.name,
        variant_name: variantName,
        sku,
        unit_price: Number(unit.toFixed(2)),
        quantity: item.quantity,
        total_price: total,
        made_to_order: !!p.made_to_order,
        production_time_days: p.production_time_days ?? null,
      });
    }

    const subtotal = Number(items.reduce((s, i) => s + i.total_price, 0).toFixed(2));
    return { items, subtotal };
  });
