import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores");
}

const settingsSchema = z.object({
  origin_postal_code: z.string().optional().nullable(),
  origin_street: z.string().optional().nullable(),
  origin_number: z.string().optional().nullable(),
  origin_neighborhood: z.string().optional().nullable(),
  origin_city: z.string().optional().nullable(),
  origin_state: z.string().optional().nullable(),
  handling_days: z.coerce.number().int().min(0).max(60),
  free_shipping_min_total: z.coerce.number().min(0).nullable(),
  shipping_markup_percent: z.coerce.number().min(0).max(200),
  local_pickup_enabled: z.boolean(),
  local_pickup_label: z.string().optional().nullable(),
  local_pickup_address: z.string().optional().nullable(),
  local_pickup_instructions: z.string().optional().nullable(),
  melhor_envio_enabled: z.boolean(),
  melhor_envio_sandbox: z.boolean(),
});

const methodSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(80),
  description: z.string().optional().nullable(),
  kind: z.enum(["flat", "free", "pickup"]),
  price: z.coerce.number().min(0),
  free_above_total: z.coerce.number().min(0).nullable(),
  delivery_days: z.coerce.number().int().min(0).max(120),
  regions: z.array(z.string().length(2)).nullable(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export const getShippingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: settings }, { data: methods }] = await Promise.all([
      context.supabase.from("shipping_settings").select("*").eq("id", true).maybeSingle(),
      context.supabase.from("shipping_methods").select("*").order("sort_order"),
    ]);
    return { settings, methods: methods ?? [] };
  });

export const saveShippingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("shipping_settings")
      .upsert({ id: true, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveShippingMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => methodSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("shipping_methods")
      .upsert({ provider: "manual", ...data }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShippingMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("shipping_methods").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
