import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GrindOption =
  | "whole_bean"
  | "espresso"
  | "filter"
  | "moka"
  | "french_press"
  | "aeropress";

export const GRIND_LABEL: Record<GrindOption, string> = {
  whole_bean: "Em grãos",
  espresso: "Espresso",
  filter: "Filtro / V60",
  moka: "Moka",
  french_press: "Prensa francesa",
  aeropress: "Aeropress",
};

export type CartItem = {
  variant_id: string;
  product_id: string;
  slug: string;
  name: string;
  producer_name: string | null;
  producer_id: string | null;
  cover_url: string | null;
  unit_price: number;
  quantity: number;
  grind_option: GrindOption;
  weight_grams: number | null;
  variant_label: string;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (variant_id: string) => void;
  setQty: (variant_id: string, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const idx = s.items.findIndex((i) => i.variant_id === item.variant_id);
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
            return { items: next };
          }
          return { items: [...s.items, item] };
        }),
      remove: (variant_id) =>
        set((s) => ({ items: s.items.filter((i) => i.variant_id !== variant_id) })),
      setQty: (variant_id, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.variant_id === variant_id ? { ...i, quantity: Math.max(1, qty) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
    }),
    {
      name: "cafezeira-cart",
      version: 3,
      migrate: (_persisted, version) => {
        if (version < 2) return { items: [] } as Partial<CartState>;
        if (version < 3) {
          const old = _persisted as any;
          return {
            items: (old.items ?? []).map((item: any) => ({
              ...item,
              producer_id: item.producer_id ?? null,
              variant_label: item.variant_label ??
                `${item.weight_grams ?? 250}g · ${GRIND_LABEL[item.grind_option as GrindOption] ?? item.grind_option ?? ""}`,
            })),
          } as Partial<CartState>;
        }
        return _persisted as Partial<CartState>;
      },
    },
  ),
);

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
