import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart-store";
import { getMyOrder } from "@/lib/orders.functions";
import { cancelOrder } from "@/lib/payments.functions";
import {
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE,
  PAYMENT_STATUS_LABEL,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders.shared";

export const Route = createFileRoute("/minha-conta/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do pedido — TatuVerso3D" },
      { name: "description", content: "Acompanhe o status, a produção e o rastreio do seu pedido TatuVerso3D." },
      { property: "og:title", content: "Detalhe do pedido — TatuVerso3D" },
      { property: "og:description", content: "Acompanhe seu pedido TatuVerso3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrderPage,
});

function MyOrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getMyOrder);
  const cancel = useServerFn(cancelOrder);

  const detail = useQuery({
    queryKey: ["my-order", id],
    queryFn: () => fetchOrder({ data: { order_id: id } }),
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { order_id: id } as any }),
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      qc.invalidateQueries({ queryKey: ["my-order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível cancelar."),
  });

  if (detail.isLoading) {
    return <div className="container mx-auto px-4 py-16 text-sm text-muted-foreground">Carregando pedido…</div>;
  }
  if (detail.isError || !detail.data) {
    return (
      <div className="container mx-auto px-4 py-16">
        <p className="text-sm text-destructive">Pedido não encontrado.</p>
        <Link to="/minha-conta" className="mt-4 inline-block text-sm font-semibold text-primary underline">
          Voltar para minha conta
        </Link>
      </div>
    );
  }

  const { order, items, shipments } = detail.data as any;
  const address = (order.shipping_address ?? {}) as Record<string, any>;
  const snapshot = (order.shipping_snapshot ?? {}) as Record<string, any>;
  const cancelled = order.status === "cancelled" || order.status === "refunded";
  const currentStep = ORDER_TIMELINE.indexOf(order.status as OrderStatus);
  const canPay = order.status === "pending" && order.payment_status !== "paid";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:px-6">
      <Link to="/minha-conta" className="text-xs font-semibold text-primary underline">
        ← Minha conta
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pedido</p>
          <h1 className="mt-2 font-display text-3xl text-primary md:text-4xl">#{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground">
            Feito em {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusTone(order.status)}`}>
          {ORDER_STATUS_LABEL[order.status as OrderStatus]}
        </span>
      </header>

      {!cancelled ? (
        <ol className="mt-8 grid gap-3 sm:grid-cols-5">
          {ORDER_TIMELINE.map((step, idx) => {
            const done = idx <= currentStep;
            return (
              <li key={step} className="flex flex-col gap-2">
                <span className={`h-1.5 rounded-full ${done ? "bg-[var(--brand-accent)]" : "bg-border"}`} />
                <span className={`text-xs ${done ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  {ORDER_STATUS_LABEL[step]}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Este pedido está {ORDER_STATUS_LABEL[order.status as OrderStatus].toLowerCase()}.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {canPay ? (
          <>
            <button
              type="button"
              onClick={() => navigate({ to: "/pagamento/$orderId", params: { orderId: order.id } })}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Retomar pagamento
            </button>
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/80 disabled:opacity-60"
            >
              Cancelar pedido
            </button>
          </>
        ) : null}
      </div>

      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-xl text-primary">Itens</h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((item: any) => (
            <li key={item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {item.quantity}× {item.product_name}
                    {item.variant_name_snapshot ? ` — ${item.variant_name_snapshot}` : ""}
                  </p>
                  {item.customizations?.length ? (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {item.customizations.map((c: any, i: number) => (
                        <li key={i}>
                          {c.label ?? c.field_id}:{" "}
                          {c.signed_url ? (
                            <a href={c.signed_url} target="_blank" rel="noreferrer" className="underline">
                              arquivo enviado
                            </a>
                          ) : (
                            String(c.value ?? "—")
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-primary">{formatBRL(Number(item.total_price))}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <Line label="Subtotal" value={formatBRL(Number(order.subtotal))} />
          <Line label="Desconto" value={`- ${formatBRL(Number(order.discount_total))}`} />
          <Line label="Frete" value={formatBRL(Number(order.shipping_total))} />
          <Line label="Total" value={formatBRL(Number(order.total))} strong />
          <p className="pt-2 text-xs text-muted-foreground">
            Pagamento: {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-xl text-primary">Entrega</h2>
          <p className="mt-2 text-sm text-foreground/80">
            {address["street"] ?? ""} {address["number"] ?? ""} {address["complement"] ?? ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {address["neighborhood"] ?? ""} — {address["city"] ?? ""}/{address["state"] ?? ""}
          </p>
          <p className="text-sm text-muted-foreground">CEP {address["postal_code"] ?? "—"}</p>
          {snapshot["name"] ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {snapshot["name"]} · prazo estimado {snapshot["delivery_days"] ?? "?"} dia(s) após produção (
              {order.production_days} dia(s)).
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-xl text-primary">Rastreio</h2>
          {shipments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Ainda não despachado.</p>
          ) : (
            shipments.map((s: any) => (
              <div key={s.id} className="mt-3">
                <p className="text-sm text-primary">
                  {s.carrier ?? "Transportadora"} {s.tracking_code ? `· ${s.tracking_code}` : ""}
                </p>
                {s.tracking_url ? (
                  <a href={s.tracking_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                    Acompanhar no site da transportadora
                  </a>
                ) : null}
                <ul className="mt-3 space-y-2 border-l border-border pl-3">
                  {(s.events ?? []).length === 0 ? (
                    <li className="text-xs text-muted-foreground">Sem eventos registrados.</li>
                  ) : (
                    s.events.map((e: any) => (
                      <li key={e.id} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{e.status}</span> ·{" "}
                        {new Date(e.occurred_at).toLocaleString("pt-BR")}
                        {e.description ? <p>{e.description}</p> : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-primary" : "text-foreground/80"}>{value}</span>
    </div>
  );
}