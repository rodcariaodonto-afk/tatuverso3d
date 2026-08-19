/** Cotação de frete — arquitetura de provedores, executa só no servidor. */
import type { RevalidatedCart } from "./cart.server";
import type { ShippingQuoteOption } from "./shipping.shared";

export type QuoteContext = {
  cart: RevalidatedCart;
  postalCode: string;
  state: string | null;
  settings: any;
  methods: any[];
};

export type ProviderQuote = Omit<ShippingQuoteOption, "quote_id" | "expires_at">;

export interface ShippingProvider {
  code: string;
  quote(ctx: QuoteContext): Promise<ProviderQuote[]>;
}

function regionMatches(regions: string[] | null, state: string | null) {
  if (!regions || regions.length === 0) return true;
  if (!state) return false;
  return regions.map((r) => r.toUpperCase()).includes(state.toUpperCase());
}

function applyMarkup(price: number, settings: any) {
  const pct = Number(settings?.shipping_markup_percent ?? 0);
  return Number((price * (1 + pct / 100)).toFixed(2));
}

/** Métodos configurados pelo administrador (tabela fixa, faixas e frete grátis). */
export const manualProvider: ShippingProvider = {
  code: "manual",
  async quote({ cart, settings, methods, state }) {
    const out: ProviderQuote[] = [];
    const freeMin = settings?.free_shipping_min_total;
    const globalFree =
      cart.all_free_shipping || (freeMin != null && cart.subtotal >= Number(freeMin));

    for (const m of methods) {
      if (m.kind === "pickup") continue;
      if (!regionMatches(m.regions, state)) continue;
      if (m.min_order_total != null && cart.subtotal < Number(m.min_order_total)) continue;
      if (m.max_order_total != null && cart.subtotal > Number(m.max_order_total)) continue;

      const methodFree =
        m.kind === "free" ||
        globalFree ||
        (m.free_above_total != null && cart.subtotal >= Number(m.free_above_total));
      const price = methodFree ? 0 : applyMarkup(Number(m.price ?? 0), settings);

      out.push({
        provider: "manual",
        method_code: m.code,
        name: methodFree && m.kind !== "free" ? `${m.name} (frete grátis)` : m.name,
        carrier: m.description ?? null,
        service: m.name,
        price,
        delivery_days:
          Number(m.delivery_days ?? 5) + Number(settings?.handling_days ?? 0),
        production_days: cart.production_days,
        is_pickup: false,
      });
    }
    return out;
  },
};

/** Retirada no local definido pelo administrador. */
export const pickupProvider: ShippingProvider = {
  code: "pickup",
  async quote({ settings, cart }) {
    if (!settings?.local_pickup_enabled) return [];
    return [
      {
        provider: "pickup",
        method_code: "local_pickup",
        name: settings.local_pickup_label || "Retirar no local",
        carrier: null,
        service: settings.local_pickup_address ?? null,
        price: 0,
        delivery_days: Number(settings?.handling_days ?? 1),
        production_days: cart.production_days,
        is_pickup: true,
      },
    ];
  },
};

/**
 * Melhor Envio — implementado e desligado até a credencial sandbox existir.
 * Nunca cai para frete grátis quando a API falha: apenas não oferece opção.
 */
export const melhorEnvioProvider: ShippingProvider = {
  code: "melhor_envio",
  async quote({ settings, cart, postalCode }) {
    const token = process.env["MELHOR_ENVIO_TOKEN"];
    if (!settings?.melhor_envio_enabled || !token) return [];
    const base = settings.melhor_envio_sandbox
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "TatuVerso3D (contato@tatuverso3d.com.br)",
        },
        body: JSON.stringify({
          from: { postal_code: settings.origin_postal_code },
          to: { postal_code: postalCode },
          package: {
            weight: cart.package.weight_grams / 1000,
            width: cart.package.width_cm,
            height: cart.package.height_cm,
            length: cart.package.length_cm,
          },
          options: { insurance_value: cart.subtotal, receipt: false, own_hand: false },
        }),
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data: any = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((s: any) => !s.error && s.price)
        .map((s: any) => ({
          provider: "melhor_envio",
          method_code: `me_${s.id}`,
          name: `${s.company?.name ?? "Transportadora"} ${s.name}`,
          carrier: s.company?.name ?? null,
          service: s.name ?? null,
          price: applyMarkup(Number(s.price), settings),
          delivery_days:
            Number(s.delivery_time ?? 0) + Number(settings?.handling_days ?? 0),
          production_days: cart.production_days,
          is_pickup: false,
        }));
    } catch {
      return [];
    }
  },
};

export const providers: ShippingProvider[] = [
  manualProvider,
  pickupProvider,
  melhorEnvioProvider,
];

export async function quoteAllProviders(ctx: QuoteContext): Promise<ProviderQuote[]> {
  const results = await Promise.all(providers.map((p) => p.quote(ctx).catch(() => [])));
  return results.flat().sort((a, b) => a.price - b.price || a.delivery_days - b.delivery_days);
}

/** Hash estável do carrinho — invalida cotação quando o carrinho muda. */
export function cartHash(cart: RevalidatedCart): string {
  const base = cart.items
    .map(
      (i) =>
        `${i.product_id}:${i.variant_id ?? "-"}:${i.quantity}:${i.unit_price}:${i.customization_data
          .map((c) => `${c.field_id}=${c.value}`)
          .join(",")}`,
    )
    .sort()
    .join("|");
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `${cart.items.length}-${cart.subtotal}-${(h >>> 0).toString(36)}`;
}
