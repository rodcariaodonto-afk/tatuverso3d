import { create } from "zustand";
import { Link } from "@tanstack/react-router";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { useCart, formatBRL, GRIND_LABEL } from "@/lib/cart-store";

type DrawerState = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export const useCartDrawer = create<DrawerState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const setOpen = useCartDrawer((s) => s.setOpen);
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const subtotal = useCart((s) => s.subtotal());

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-display text-lg text-primary">Seu carrinho</h2>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 opacity-30" />
            <p className="text-sm">Seu carrinho está vazio.</p>
            <Link
              to="/catalogo"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-border overflow-auto px-5">
              {items.map((it) => (
                <div key={it.variant_id} className="flex gap-3 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                    {it.cover_url && <img src={it.cover_url} alt={it.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <Link
                      to="/cafe/$slug"
                      params={{ slug: it.slug }}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {it.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {it.weight_grams ? `${it.weight_grams}g · ` : ""}
                      {GRIND_LABEL[it.grind_option]}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-border">
                        <button onClick={() => setQty(it.variant_id, it.quantity - 1)} className="px-2 text-sm">−</button>
                        <span className="w-6 text-center text-xs font-semibold">{it.quantity}</span>
                        <button onClick={() => setQty(it.variant_id, it.quantity + 1)} className="px-2 text-sm">+</button>
                      </div>
                      <p className="text-sm font-semibold text-primary">{formatBRL(it.unit_price * it.quantity)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(it.variant_id)}
                    aria-label="Remover"
                    className="self-start text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <footer className="border-t border-border bg-[var(--sand)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">Subtotal</span>
                <span className="font-display text-2xl text-primary">{formatBRL(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Frete e cupons calculados no checkout.</p>
              <Link
                to="/carrinho"
                onClick={() => setOpen(false)}
                className="mt-4 flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              >
                Finalizar compra
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 w-full rounded-full border border-border bg-card px-5 py-2 text-xs text-foreground hover:border-primary"
              >
                Continuar comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
