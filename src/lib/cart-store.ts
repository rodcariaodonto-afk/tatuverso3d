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
  product_id: string;
  slug: string;
  name: string;
  producer_name: string | null;
  cover_url: string | null;
  unit_price: number;
  quantity: number;
  grind_option: GrindOption;
  weight_grams: number | null;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (product_id: string, grind_option: GrindOption) => void;
  setQty: (product_id: string, grind_option: GrindOption, qty: number) => void;
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
          const idx = s.items.findIndex(
            (i) => i.product_id === item.product_id && i.grind_option === item.grind_option,
          );
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
            return { items: next };
          }
          return { items: [...s.items, item] };
        }),
      remove: (product_id, grind_option) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.product_id === product_id && i.grind_option === grind_option),
          ),
        })),
      setQty: (product_id, grind_option, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.product_id === product_id && i.grind_option === grind_option
              ? { ...i, quantity: Math.max(1, qty) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
    }),
    { name: "cafezeira-cart" },
  ),
);

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
