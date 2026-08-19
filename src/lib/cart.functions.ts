import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const customizationSchema = z.object({
  field_id: z.string().uuid(),
  /** Valor escolhido pelo cliente. Nunca aceitamos preço vindo do navegador. */
  value: z.string().max(5000),
});

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.number().int().positive().max(999),
  customizations: z.array(customizationSchema).max(50).default([]),
});

const payloadSchema = z.object({ items: z.array(itemSchema).min(1).max(50) });

export type ValidatedCustomization = {
  field_id: string;
  label: string;
  field_type: string;
  value: string;
  price_adjustment: number;
};

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
  customization_data: ValidatedCustomization[];
};

const CUSTOM_BUCKET = "customization-uploads";

function optionValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: any) => (o && typeof o === "object" ? String(o.value ?? o.label ?? "") : String(o)))
    .filter(Boolean);
}

function optionLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: any) => (o && typeof o === "object" ? String(o.label ?? o.value ?? "") : String(o)))
    .filter(Boolean);
}

/**
 * Revalida o carrinho inteiramente no servidor:
 * preços, estoque e personalizações são recarregados do banco.
 * Nada de preço, acréscimo ou total enviado pelo navegador é aceito.
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

    // Usuário autenticado (opcional): necessário apenas para validar arquivos enviados.
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    const productIds = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products, error } = await supabase
      .from("products")
      .select(
        `id, name, price, status, made_to_order, production_time_days, sku, stock_quantity,
         track_inventory, allow_backorder,
         product_variants ( id, name, sku, price, stock_quantity, is_active ),
         product_customization_fields (
           id, label, field_type, is_required, is_active, min_length, max_length,
           price_adjustment, options
         )`,
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

      /* ── PERSONALIZAÇÃO: validação integral no servidor ───────────────── */
      const dbFields: any[] = (p.product_customization_fields ?? []).filter(
        (f: any) => f.is_active !== false,
      );
      const dbById = new Map(dbFields.map((f) => [f.id, f]));
      const sent = new Map<string, string>();

      for (const c of item.customizations) {
        const f = dbById.get(c.field_id);
        if (!f) throw new Error(`Personalização inválida em ${p.name}`);
        if (sent.has(c.field_id)) throw new Error(`Personalização duplicada em ${p.name}`);
        sent.set(c.field_id, c.value);
      }

      const customization_data: ValidatedCustomization[] = [];

      for (const f of dbFields) {
        const rawValue = sent.get(f.id);
        const value = (rawValue ?? "").trim();
        const filled = f.field_type === "checkbox" ? value === "true" : value.length > 0;

        if (!filled) {
          if (f.is_required) {
            throw new Error(`Personalização obrigatória não preenchida em ${p.name}: ${f.label}`);
          }
          continue;
        }

        switch (f.field_type) {
          case "short_text":
          case "long_text": {
            const min = f.min_length ?? 0;
            const max = f.max_length ?? (f.field_type === "short_text" ? 200 : 2000);
            if (value.length < min) throw new Error(`${f.label}: mínimo de ${min} caracteres`);
            if (value.length > max) throw new Error(`${f.label}: máximo de ${max} caracteres`);
            break;
          }
          case "number": {
            const n = Number(value);
            if (!Number.isFinite(n)) throw new Error(`${f.label}: informe um número válido`);
            if (f.min_length != null && n < Number(f.min_length))
              throw new Error(`${f.label}: valor mínimo ${f.min_length}`);
            if (f.max_length != null && n > Number(f.max_length))
              throw new Error(`${f.label}: valor máximo ${f.max_length}`);
            break;
          }
          case "select":
          case "color": {
            const allowed = [...optionValues(f.options), ...optionLabels(f.options)];
            if (allowed.length && !allowed.includes(value)) {
              throw new Error(`${f.label}: opção inválida`);
            }
            if (f.field_type === "color" && !allowed.length && !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
              throw new Error(`${f.label}: cor inválida`);
            }
            break;
          }
          case "checkbox": {
            if (value !== "true") throw new Error(`${f.label}: valor inválido`);
            break;
          }
          case "file":
          case "image": {
            if (!userId) throw new Error(`${f.label}: entre na sua conta para enviar arquivos`);
            const path = value.replace(/^\/+/, "").replace(`${CUSTOM_BUCKET}/`, "");
            if (!path.startsWith(`${userId}/`) || path.includes("..")) {
              throw new Error(`${f.label}: arquivo inválido`);
            }
            const folder = path.slice(0, path.lastIndexOf("/"));
            const file = path.slice(path.lastIndexOf("/") + 1);
            const { data: listed, error: listErr } = await supabase.auth
              ? await supabase.storage.from(CUSTOM_BUCKET).list(folder, { search: file, limit: 100 })
              : { data: null, error: null as any };
            if (listErr || !listed?.some((o: any) => o.name === file)) {
              throw new Error(`${f.label}: arquivo não encontrado para o seu usuário`);
            }
            break;
          }
          default:
            throw new Error(`${f.label}: tipo de campo não suportado`);
        }

        const adjustment = Number(f.price_adjustment ?? 0);
        unit += adjustment;
        customization_data.push({
          field_id: f.id,
          label: f.label,
          field_type: f.field_type,
          value,
          price_adjustment: adjustment,
        });
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
        customization_data,
      });
    }

    const subtotal = Number(items.reduce((s, i) => s + i.total_price, 0).toFixed(2));
    return { items, subtotal };
  });
