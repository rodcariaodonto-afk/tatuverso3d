import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.object({ product_id: z.string().uuid() });

const saveSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        cost_price: z.number().nonnegative().max(9999999).nullable(),
      }),
    )
    .max(500),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
    _user_id: context.userId,
  });
  if (error || !isAdmin) throw new Error("Acesso restrito a administradores.");
}

/** Preço de custo das variações — visível somente para administradores. */
export const getVariantCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
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
  .inputValidator((input: unknown) => saveSchema.parse(input))
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
