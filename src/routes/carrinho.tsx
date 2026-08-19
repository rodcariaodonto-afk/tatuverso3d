import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from "lucide-react";
import { formatBRL, GRIND_LABEL, useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — TatuVerso3D" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());

  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 19.9;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 text-center md:px-6">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl text-primary">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece pela curadoria do mês ou descubra seu perfil no quiz sensorial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/catalogo" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Ver catálogo
          </Link>
          <Link to="/quiz" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary">
            Fazer quiz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <h1 className="font-display text-4xl text-primary md:text-5xl">Carrinho</h1>
      <div className="brand-divider mt-3" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((i) => (
            <li key={i.variant_id} className="flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {i.cover_url && <img src={i.cover_url} alt={i.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.producer_name}</p>
                <Link
                  to="/cafe/$slug"
                  params={{ slug: i.slug }}
                  className="font-display text-lg text-primary hover:underline"
                >
                  {i.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {GRIND_LABEL[i.grind_option]} · {i.weight_grams ?? 250}g
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => setQty(i.variant_id, i.quantity - 1)} className="px-2 py-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                    <button onClick={() => setQty(i.variant_id, i.quantity + 1)} className="px-2 py-1">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(i.variant_id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-primary">
                  {formatBRL(i.unit_price * i.quantity)}
                </p>
                <p className="text-xs text-muted-foreground">{formatBRL(i.unit_price)} / un</p>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-border bg-[var(--surface-soft)] p-6">
          <h2 className="font-display text-xl text-primary">Resumo</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete estimado</dt>
              <dd>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</dd>
            </div>
            {shipping === 0 && subtotal > 0 && (
              <p className="text-xs text-[var(--brand-primary)]">🎉 Você ganhou frete grátis!</p>
            )}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm font-semibold text-primary">Total</span>
            <span className="font-display text-2xl font-semibold text-primary">{formatBRL(total)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            Finalizar compra <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/catalogo"
            className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
