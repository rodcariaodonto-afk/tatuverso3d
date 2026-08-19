/** Schemas e verificação de admin usados pelas server functions de custo. */
import { z } from "zod";

export const costProductSchema = z.object({ product_id: z.string().uuid() });

export const costSaveSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        cost_price: z.number().nonnegative().max(9999999).nullable(),
      }),
    )
    .max(500),
});

export async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
    _user_id: context.userId,
  });
  if (error || !isAdmin) throw new Error("Acesso restrito a administradores.");
}
