/** Revalidação de carrinho — executa somente no servidor. */
import {
  ALLOWED_UPLOAD_MIME,
  CUSTOM_BUCKET,
  MAX_UPLOAD_BYTES,
  optionLabels,
  optionValues,
} from "./cart-validation";
import type { ValidatedCartItem, ValidatedCustomization } from "./cart-validation";

export type CartPayload = {
  items: Array<{
    product_id: string;
    variant_id: string | null;
    quantity: number;
    customizations: Array<{ field_id: string; value: string }>;
  }>;
};

export type RevalidatedCart = {
  items: ValidatedCartItem[];
  subtotal: number;
  /** Maior prazo de produção do carrinho, em dias. */
  production_days: number;
  /** Peso total e pacote agregados para cotação de frete. */
  package: {
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    separate_packages: number;
  };
  /** Verdadeiro quando todos os itens têm frete grátis marcado. */
  all_free_shipping: boolean;
};

function publicClient() {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    }),
  );
}

/**
 * Recarrega produtos, variações e campos de personalização do banco e recalcula
 * tudo. Nenhum preço, acréscimo, total ou prazo vindo do navegador é aceito.
 */
export async function revalidateCart(
  data: CartPayload,
  token: string | null,
): Promise<RevalidatedCart> {
  const supabase = await publicClient();

  let userId: string | null = null;
  let userClient: any = null;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    userId = userData.user?.id ?? null;
    if (userId) {
      const { createClient } = await import("@supabase/supabase-js");
      userClient = createClient(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_PUBLISHABLE_KEY"]!,
        {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        },
      );
    }
  }

  const productIds = [...new Set(data.items.map((i) => i.product_id))];
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `id, name, price, status, made_to_order, production_time_days, sku, stock_quantity,
       track_inventory, allow_backorder,
       shipping_weight_grams, shipping_length_cm, shipping_width_cm, shipping_height_cm,
       requires_separate_package, free_shipping, shipping_additional_days, weight_grams,
       product_variants ( id, name, sku, price, stock_quantity, is_active,
         shipping_weight_grams, shipping_length_cm, shipping_width_cm, shipping_height_cm,
         requires_separate_package, free_shipping, shipping_additional_days ),
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

  let weight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let heightSum = 0;
  let separate = 0;
  let allFree = true;
  let productionDays = 0;

  for (const item of data.items) {
    const p: any = byId.get(item.product_id);
    if (!p) throw new Error("Produto indisponível no carrinho");

    let unit = Number(p.price);
    let variantName: string | null = null;
    let sku: string | null = p.sku ?? null;
    let ship: any = p;

    if (item.variant_id) {
      const v = (p.product_variants ?? []).find((x: any) => x.id === item.variant_id);
      if (!v || v.is_active === false) throw new Error(`Variação indisponível: ${p.name}`);
      unit = Number(v.price);
      variantName = v.name ?? null;
      sku = v.sku ?? sku;
      ship = {
        shipping_weight_grams: v.shipping_weight_grams ?? p.shipping_weight_grams ?? p.weight_grams,
        shipping_length_cm: v.shipping_length_cm ?? p.shipping_length_cm,
        shipping_width_cm: v.shipping_width_cm ?? p.shipping_width_cm,
        shipping_height_cm: v.shipping_height_cm ?? p.shipping_height_cm,
        requires_separate_package: v.requires_separate_package || p.requires_separate_package,
        free_shipping: v.free_shipping || p.free_shipping,
        shipping_additional_days: Math.max(
          Number(v.shipping_additional_days ?? 0),
          Number(p.shipping_additional_days ?? 0),
        ),
      };
      if (
        p.track_inventory &&
        !p.allow_backorder &&
        !p.made_to_order &&
        v.stock_quantity < item.quantity
      ) {
        throw new Error(`Estoque insuficiente: ${p.name}`);
      }
    } else if (
      p.track_inventory &&
      !p.allow_backorder &&
      !p.made_to_order &&
      p.stock_quantity < item.quantity
    ) {
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
          if (!userId || !userClient)
            throw new Error(`${f.label}: entre na sua conta para enviar arquivos`);
          const path = value.replace(/^\/+/, "").replace(`${CUSTOM_BUCKET}/`, "");
          if (!path.startsWith(`${userId}/`) || path.includes("..")) {
            throw new Error(`${f.label}: arquivo inválido`);
          }
          const folder = path.slice(0, path.lastIndexOf("/"));
          const file = path.slice(path.lastIndexOf("/") + 1);
          const { data: listed, error: listErr } = await userClient.storage
            .from(CUSTOM_BUCKET)
            .list(folder, { search: file, limit: 100 });
          const found: any = listed?.find((o: any) => o.name === file);
          if (listErr || !found) {
            throw new Error(`${f.label}: arquivo não encontrado para o seu usuário`);
          }
          const size = Number(found.metadata?.size ?? 0);
          const mime = String(found.metadata?.mimetype ?? "");
          if (size > MAX_UPLOAD_BYTES) throw new Error(`${f.label}: arquivo acima de 10 MB`);
          if (mime && !ALLOWED_UPLOAD_MIME.includes(mime)) {
            throw new Error(`${f.label}: tipo de arquivo não permitido`);
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

    /* ── Agregação do pacote e prazos ─────────────────────────────────── */
    const unitWeight = Number(ship.shipping_weight_grams ?? p.weight_grams ?? 150);
    weight += unitWeight * item.quantity;
    maxLength = Math.max(maxLength, Number(ship.shipping_length_cm ?? 16));
    maxWidth = Math.max(maxWidth, Number(ship.shipping_width_cm ?? 12));
    heightSum += Number(ship.shipping_height_cm ?? 4) * item.quantity;
    if (ship.requires_separate_package) separate += item.quantity;
    if (!ship.free_shipping) allFree = false;
    productionDays = Math.max(
      productionDays,
      Number(p.production_time_days ?? 0) + Number(ship.shipping_additional_days ?? 0),
    );
  }

  const subtotal = Number(items.reduce((s, i) => s + i.total_price, 0).toFixed(2));
  return {
    items,
    subtotal,
    production_days: productionDays,
    package: {
      weight_grams: Math.max(50, Math.round(weight)),
      length_cm: Math.max(11, maxLength),
      width_cm: Math.max(11, maxWidth),
      height_cm: Math.max(2, Math.round(heightSum)),
      separate_packages: separate,
    },
    all_free_shipping: allFree && items.length > 0,
  };
}
