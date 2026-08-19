import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, costProductSchema, costSaveSchema } from "./admin-costs.shared";

/** Preço de custo das variações — visível somente para administradores. */
export const getVariantCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => costProductSchema.parse(input))
  .handler(async ({ data, context }): Promise<Record<string, number | null>> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("product_variants")
      .select("id, cost_price")
      .eq("product_id", data.product_id);
    if (error) throw new Error(error.message);
    const out: Record<string, number | null> = {};
    for (const r of rows ?? []) out[r.id] = r.cost_price != null ? Number(r.cost_price) : null;
    return out;
  });

/** Grava o preço de custo das variações — somente administradores. */
export const saveVariantCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => costSaveSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    await assertAdmin(context as any);
    if (!data.items.length) return { updated: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let updated = 0;
    for (const item of data.items) {
      const { error } = await supabaseAdmin
        .from("product_variants")
        .update({ cost_price: item.cost_price })
        .eq("id", item.variant_id);
      if (error) throw new Error(error.message);
      updated += 1;
    }
    return { updated };
  });
