import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/cart-store";
import { adminListOrders, adminPendingProductionQueue, adminProductionQueue } from "@/lib/orders-admin.functions";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_LABEL,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders.shared";

export const Route = createFileRoute("/admin/pedidos/")({
  component: PedidosListPage,
});

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
const PAYMENTS = ["pending", "authorized", "paid", "failed", "refunded"] as const;

const inputCls =
  "rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function PedidosListPage() {
  const [tab, setTab] = useState<"orders" | "production" | "awaiting">("orders");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const listOrders = useServerFn(adminListOrders);
  const listQueue = useServerFn(adminProductionQueue);
  const listAwaiting = useServerFn(adminPendingProductionQueue);

  const filters = useMemo(
    () => ({
      status: (status || null) as OrderStatus | null,
      payment_status: (paymentStatus || null) as any,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      search: search.trim() || null,
      limit: 100,
    }),
    [status, paymentStatus, from, to, search],
  );

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () => listOrders({ data: filters }),
    enabled: tab === "orders",
  });

  const queueQuery = useQuery({
    queryKey: ["admin-production-queue"],
    queryFn: () => listQueue({ data: undefined as never }),
    enabled: tab === "production",
  });

  const awaitingQuery = useQuery({
    queryKey: ["admin-awaiting-production"],
    queryFn: () => listAwaiting({ data: undefined as never }),
    enabled: tab === "awaiting",
  });

  const orders = ordersQuery.data ?? [];
  const totals = orders.reduce(
    (acc, o: any) => {
      acc.count += 1;
      if (o.payment_status === "paid") acc.revenue += Number(o.total ?? 0);
      if (o.status === "pending") acc.pending += 1;
      if (o.status === "paid" || o.status === "preparing") acc.production += 1;
      return acc;
    },
    { count: 0, revenue: 0, pending: 0, production: 0 },
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Pedidos</h1>
          <div className="brand-divider mt-3" />
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["orders", "Pedidos"],
              ["awaiting", `Aguardando produção ${awaitingQuery.data?.length ? `(${awaitingQuery.data.length})` : ""}`],
              ["production", "Fila de produção"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                tab === key ? "bg-primary text-primary-foreground" : "bg-[var(--surface-soft)] text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Pedidos listados" value={String(totals.count)} />
              <SummaryCard label="Receita paga" value={formatBRL(totals.revenue)} />
              <SummaryCard label="Aguardando pagamento" value={String(totals.pending)} />
              <SummaryCard label="Em produção" value={String(totals.production)} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="">Todos os status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputCls}>
                <option value="">Todo pagamento</option>
                {PAYMENTS.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID, nome ou e-mail"
                className={inputCls}
              />
            </div>

            <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
              {ordersQuery.isLoading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
              ) : (
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Pedido</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Itens</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Pagamento</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o: any) => (
                      <tr key={o.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-primary">{o.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleString("pt-BR")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-primary">{o.customer?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{o.customer?.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <p className="text-xs">{o.order_items?.length ?? 0} item(s)</p>
                          <p className="line-clamp-1 text-xs">
                            {o.order_items?.map((i: any) => i.product_name).join(", ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">
                          {formatBRL(Number(o.total))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs">
                            {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${orderStatusTone(o.status)}`}>
                            {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/admin/pedidos/$id"
                            params={{ id: o.id }}
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === "awaiting" && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            {awaitingQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (awaitingQuery.data ?? []).length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhum pedido pago aguardando início de produção.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(awaitingQuery.data ?? []).map((o: any) => (
                  <li key={o.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        Pedido #{o.id.slice(0, 8)} · {formatBRL(Number(o.total))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.customer?.full_name ?? "—"} · {o.customer?.email ?? ""}
                      </p>
                      <p className="mt-1 text-xs text-accent">
                        {o.pending_count} item(s) pendente(s):{" "}
                        {o.pending_items.map((i: any) => `${i.quantity}× ${i.product_name}`).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pago em {new Date(o.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Link
                      to="/admin/pedidos/$id"
                      params={{ id: o.id }}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Produzir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "production" && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            {queueQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (queueQuery.data ?? []).length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Nada na fila de produção.</div>
            ) : (
              <ul className="divide-y divide-border">
                {(queueQuery.data ?? []).map((it: any) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {it.quantity}× {it.product_name}
                        {it.variant_name_snapshot ? ` — ${it.variant_name_snapshot}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pedido {it.order_id.slice(0, 8)} · {PRODUCTION_LABEL[it.production_status] ?? it.production_status}
                      </p>
                    </div>
                    <Link
                      to="/admin/pedidos/$id"
                      params={{ id: it.order_id }}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Abrir pedido
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-primary">{value}</p>
    </div>
  );
}
