import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartCustomization = {
  field_id: string;
  label: string;
  value: string;
  price_adjustment: number;
};

export type CartItem = {
  /** Chave única = produto + variação + personalizações escolhidas. */
  key: string;
  product_id: string;
  variant_id: string | null;
  slug: string;
  name: string;
  cover_url: string | null;
  /** Preço unitário já com acréscimos de variação e personalização. */
  unit_price: number;
  base_price: number;
  adjustments: number;
  quantity: number;
  variant_label: string | null;
  option_labels: string[];
  customizations: CartCustomization[];
  made_to_order: boolean;
  production_time_days: number | null;
  max_stock: number | null;
};

export function cartItemKey(
  product_id: string,
  variant_id: string | null,
  customizations: CartCustomization[],
) {
  const custom = customizations
    .slice()
    .sort((a, b) => a.field_id.localeCompare(b.field_id))
    .map((c) => `${c.field_id}=${c.value}`)
    .join("|");
  return `${product_id}::${variant_id ?? "-"}::${custom}`;
}

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  subtotal: () => number;
  maxProductionDays: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const key = cartItemKey(item.product_id, item.variant_id, item.customizations);
          const idx = s.items.findIndex((i) => i.key === key);
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
            return { items: next };
          }
          return { items: [...s.items, { ...item, key }] };
        }),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0),
      maxProductionDays: () =>
        get().items.reduce((acc, i) => Math.max(acc, i.production_time_days ?? 0), 0),
    }),
    { name: "tatuverso-cart", version: 2 },
  ),
);

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
