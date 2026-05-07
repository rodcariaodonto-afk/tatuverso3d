import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { formatBRL, useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Cafezeira" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  const shipping = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 19.9;
  const total = subtotal + shipping;

  const [recipient, setRecipient] = useState("");
  const [postal, setPostal] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      toast.info("Faça login para finalizar a compra");
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (orderId) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--farm)]" />
        <h1 className="mt-4 font-display text-4xl text-primary">Pedido confirmado!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Recebemos seu pedido <span className="font-mono text-primary">#{orderId.slice(0, 8)}</span>. Em
          breve você receberá um email com os detalhes.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          (Pagamento simulado — em produção será conectado a Mercado Pago / Stripe.)
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/minha-conta" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Meus pedidos
          </Link>
          <Link to="/catalogo" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary">
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-3xl">Seu carrinho está vazio</h1>
        <Link to="/catalogo" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const shippingAddress = { recipient, postal, street, number, city, state, country: "Brasil" };
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          status: "paid",
          payment_status: "paid",
          payment_provider: "simulated",
          payment_reference: `SIM-${Date.now()}`,
          subtotal,
          shipping_total: shipping,
          discount_total: 0,
          total,
          shipping_address: shippingAddress,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Fetch producer ids
      const productIds = items.map((i) => i.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, producer_id")
        .in("id", productIds);
      const producerMap = new Map((products ?? []).map((p) => [p.id, p.producer_id]));

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        producer_id: producerMap.get(i.product_id)!,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.unit_price * i.quantity,
        grind_option: i.grind_option,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clear();
      setOrderId(order.id);
    } catch (err: any) {
      toast.error("Erro ao processar pedido", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <h1 className="font-display text-4xl text-primary md:text-5xl">Checkout</h1>
      <div className="gold-divider mt-3" />

      <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Endereço de entrega</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Destinatário" value={recipient} onChange={setRecipient} required />
              <Field label="CEP" value={postal} onChange={setPostal} required />
              <Field label="Rua" value={street} onChange={setStreet} required className="sm:col-span-2" />
              <Field label="Número" value={number} onChange={setNumber} required />
              <Field label="Cidade" value={city} onChange={setCity} required />
              <Field label="Estado" value={state} onChange={setState} required />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Pagamento</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Por enquanto trabalhamos com pagamento simulado para fins de demonstração. Mercado Pago,
              Stripe e Pix serão habilitados em breve.
            </p>
            <div className="mt-4 rounded-md bg-[var(--sand)] p-4 text-sm text-foreground/80">
              💳 Pagamento simulado · ao confirmar, seu pedido entra como pago.
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-[var(--sand)] p-6">
          <h2 className="font-display text-xl text-primary">Seu pedido</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={`${i.product_id}-${i.grind_option}`} className="flex justify-between">
                <span className="pr-2 text-foreground/85">
                  {i.quantity}× {i.name}
                </span>
                <span>{formatBRL(i.unit_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-primary">Total</span>
            <span className="font-display text-2xl text-primary">{formatBRL(total)}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Processando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
