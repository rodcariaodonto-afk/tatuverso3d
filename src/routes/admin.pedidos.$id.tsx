import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/cart-store";
import {
  adminAddTrackingEvent,
  adminGetOrder,
  adminResyncPayment,
  adminSaveShipment,
  adminSetItemProduction,
  adminUpdateOrderStatus,
} from "@/lib/orders-admin.functions";
import { refundPayment as refundPaymentFn } from "@/lib/payments-admin.functions";
import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_LABEL,
  PRODUCTION_STATUSES,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders.shared";

export const Route = createFileRoute("/admin/pedidos/$id")({
  head: () => ({ meta: [{ title: "Detalhe do pedido — Admin TatuVerso3D" }] }),
  component: OrderDetailPage,
});

const inputCls =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getOrder = useServerFn(adminGetOrder);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const setProduction = useServerFn(adminSetItemProduction);
  const saveShipment = useServerFn(adminSaveShipment);
  const addEvent = useServerFn(adminAddTrackingEvent);
  const resync = useServerFn(adminResyncPayment);
  const refundPayment = useServerFn(refundPaymentFn);

  const detail = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => getOrder({ data: { order_id: id } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-order", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const [note, setNote] = useState("");

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateStatus({ data: { order_id: id, status, note: note || null } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      setNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar."),
  });

  const resyncMutation = useMutation({
    mutationFn: () => resync({ data: { order_id: id } }),
    onSuccess: (r: any) => {
      toast.success(`Pagamento reconciliado: ${r.results.join(" | ")}`);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao reconsultar."),
  });

  const [refundAmount, setRefundAmount] = useState<Record<string, string>>({});
  const [refundReason, setRefundReason] = useState<Record<string, string>>({});

  const refundMutation = useMutation({
    mutationFn: (vars: { payment_id: string; amount: number | null; reason: string }) =>
      refundPayment({ data: vars }),
    onSuccess: (r: any) => {
      toast.success(r.full ? "Estorno total concluído" : "Estorno parcial concluído");
      setRefundAmount({});
      setRefundReason({});
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao estornar."),
  });

  if (detail.isLoading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Carregando pedido…</p>
      </AdminShell>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">{(detail.error as any)?.message ?? "Pedido não encontrado."}</p>
      </AdminShell>
    );
  }

  const { order, items, history, shipments, payments, customer, reservations } = detail.data as any;
  const address = (order.shipping_address ?? {}) as Record<string, any>;
  const shippingSnapshot = (order.shipping_snapshot ?? {}) as Record<string, any>;
  const nextStatuses = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <Link to="/admin/pedidos" className="text-xs font-semibold text-accent hover:underline">
          ← Voltar para pedidos
        </Link>
        <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Pedido</p>
            <h1 className="mt-2 font-display text-3xl text-primary">#{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">
              Criado em {new Date(order.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs ${orderStatusTone(order.status)}`}>
              {ORDER_STATUS_LABEL[order.status as OrderStatus]}
            </span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-primary">
              Pagamento: {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
            </span>
          </div>
        </header>

        {order.status === "paid" && items.some((it: any) => it.production_status === "pending") && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
            <p className="text-sm font-semibold text-accent">Pronto para produção</p>
            <p className="text-xs text-primary">
              Pagamento confirmado. Use o painel "Itens e produção" abaixo para iniciar a impressão item a item.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Panel title="Itens e produção">
              <ul className="divide-y divide-border">
                {items.map((item: any) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onSave={async (production_status, production_notes) => {
                      try {
                        await setProduction({ data: { item_id: item.id, production_status, production_notes } });
                        toast.success("Item atualizado");
                        refresh();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Falha ao atualizar item.");
                      }
                    }}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="Envio e rastreio">
              <ShipmentEditor
                shipments={shipments}
                onSave={async (payload) => {
                  try {
                    await saveShipment({ data: { ...payload, order_id: id } });
                    toast.success("Envio salvo");
                    refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Falha ao salvar envio.");
                  }
                }}
                onAddEvent={async (payload) => {
                  try {
                    await addEvent({ data: payload });
                    toast.success("Evento registrado");
                    refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Falha ao registrar evento.");
                  }
                }}
              />
            </Panel>

            <Panel title="Histórico de status">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem histórico.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h: any) => (
                    <li key={h.id} className="text-sm">
                      <span className="font-semibold text-primary">
                        {h.from_status ? `${ORDER_STATUS_LABEL[h.from_status as OrderStatus]} → ` : ""}
                        {ORDER_STATUS_LABEL[h.to_status as OrderStatus] ?? h.to_status}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("pt-BR")}
                      </span>
                      {h.notes ? <p className="text-xs text-muted-foreground">{h.notes}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Mudar status">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Observação interna (opcional)"
                rows={2}
                className={inputCls}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {nextStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Pedido em estado final.</p>
                ) : (
                  nextStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(s)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {ORDER_STATUS_LABEL[s]}
                    </button>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Cliente">
              <p className="text-sm text-primary">{customer?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{customer?.email ?? ""}</p>
              <p className="text-xs text-muted-foreground">{customer?.phone ?? ""}</p>
              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-semibold text-primary">Entrega</p>
                <p>
                  {address["street"] ?? ""} {address["number"] ?? ""} {address["complement"] ?? ""}
                </p>
                <p>
                  {address["neighborhood"] ?? ""} — {address["city"] ?? ""}/{address["state"] ?? ""}
                </p>
                <p>CEP {address["postal_code"] ?? "—"}</p>
                {shippingSnapshot["name"] ? (
                  <p className="mt-2">
                    Método: {shippingSnapshot["name"]} · {shippingSnapshot["delivery_days"] ?? "?"} dia(s)
                  </p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Valores">
              <Row label="Subtotal" value={formatBRL(Number(order.subtotal))} />
              <Row label="Desconto" value={`- ${formatBRL(Number(order.discount_total))}`} />
              <Row label="Frete" value={formatBRL(Number(order.shipping_total))} />
              <Row label="Total" value={formatBRL(Number(order.total))} strong />
            </Panel>

            <Panel title="Pagamentos">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tentativa registrada.</p>
              ) : (
                <ul className="space-y-3">
                  {payments.map((p: any) => {
                    const refunded = Number(p.refunded_amount ?? 0);
                    const remaining = Number((Number(p.amount) - refunded).toFixed(2));
                    const refundable = (p.status === "paid" || p.status === "authorized") && remaining > 0;
                    return (
                      <li key={p.id} className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{p.method ?? p.provider}</span> ·{" "}
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                        {p.provider_status ? ` (${p.provider_status})` : ""} · {formatBRL(Number(p.amount))}
                        {p.failure_reason ? <p className="text-destructive">{p.failure_reason}</p> : null}
                        {refunded > 0 ? (
                          <p className="mt-1 text-primary">
                            Estornado: {formatBRL(refunded)}
                            {p.refund_reason ? ` · ${p.refund_reason}` : ""}
                          </p>
                        ) : null}
                        {refundable ? (
                          <div className="mt-2 space-y-2">
                            <input
                              value={refundAmount[p.id] ?? ""}
                              onChange={(e) => setRefundAmount((s) => ({ ...s, [p.id]: e.target.value }))}
                              placeholder={`Valor (vazio = total ${remaining.toFixed(2)})`}
                              inputMode="decimal"
                              className={inputCls}
                            />
                            <input
                              value={refundReason[p.id] ?? ""}
                              onChange={(e) => setRefundReason((s) => ({ ...s, [p.id]: e.target.value }))}
                              placeholder="Motivo do estorno (obrigatório)"
                              className={inputCls}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const reason = (refundReason[p.id] ?? "").trim();
                                if (reason.length < 3) {
                                  toast.error("Informe o motivo do estorno.");
                                  return;
                                }
                                const raw = (refundAmount[p.id] ?? "").trim().replace(",", ".");
                                const amount = raw ? Number(raw) : null;
                                if (raw && (!Number.isFinite(amount!) || amount! <= 0)) {
                                  toast.error("Valor de estorno inválido.");
                                  return;
                                }
                                if (
                                  !confirm(
                                    `Confirmar estorno de ${formatBRL(amount ?? remaining)} no Mercado Pago?`,
                                  )
                                )
                                  return;
                                refundMutation.mutate({ payment_id: p.id, amount, reason });
                              }}
                              disabled={refundMutation.isPending}
                              className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                            >
                              Estornar no provedor
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => resyncMutation.mutate()}
                disabled={resyncMutation.isPending}
                className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
              >
                Reconsultar provedor
              </button>
            </Panel>

            <Panel title="Reservas de estoque">
              {reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem reservas.</p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {reservations.map((r: any) => (
                    <li key={r.id}>
                      {r.quantity} un · {r.status} · expira {new Date(r.expires_at).toLocaleString("pt-BR")}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-lg text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-primary" : "text-primary"}>{value}</span>
    </div>
  );
}

function ItemRow({
  item,
  onSave,
}: {
  item: any;
  onSave: (status: (typeof PRODUCTION_STATUSES)[number], notes: string | null) => void;
}) {
  const [status, setStatus] = useState(item.production_status ?? "pending");
  const [notes, setNotes] = useState(item.production_notes ?? "");

  useEffect(() => {
    setStatus(item.production_status ?? "pending");
    setNotes(item.production_notes ?? "");
  }, [item.production_status, item.production_notes]);

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">
            {item.quantity}× {item.product_name}
            {item.variant_name_snapshot ? ` — ${item.variant_name_snapshot}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.sku_snapshot ? `SKU ${item.sku_snapshot} · ` : ""}
            {formatBRL(Number(item.unit_price))} un · total {formatBRL(Number(item.total_price))}
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-primary">
          {PRODUCTION_LABEL[item.production_status] ?? item.production_status}
        </span>
      </div>

      {item.customizations?.length ? (
        <ul className="mt-2 space-y-1 rounded-md bg-[var(--surface-soft)] p-3 text-xs text-primary">
          {item.customizations.map((c: any, idx: number) => (
            <li key={idx}>
              <span className="font-semibold">{c.label ?? c.field_id}:</span>{" "}
              {c.signed_url ? (
                <a href={c.signed_url} target="_blank" rel="noreferrer" className="text-accent underline">
                  Baixar arquivo
                </a>
              ) : (
                String(c.value ?? "—")
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs"
        >
          {PRODUCTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PRODUCTION_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas de produção"
          className="min-w-[180px] flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => onSave(status as (typeof PRODUCTION_STATUSES)[number], notes || null)}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
        >
          Salvar
        </button>
      </div>
    </li>
  );
}

function ShipmentEditor({
  shipments,
  onSave,
  onAddEvent,
}: {
  shipments: any[];
  onSave: (payload: any) => void;
  onAddEvent: (payload: any) => void;
}) {
  const existing = shipments[0] ?? null;
  const [carrier, setCarrier] = useState(existing?.carrier ?? "");
  const [service, setService] = useState(existing?.service ?? "");
  const [code, setCode] = useState(existing?.tracking_code ?? "");
  const [url, setUrl] = useState(existing?.tracking_url ?? "");
  const [eta, setEta] = useState(existing?.estimated_delivery_at ?? "");
  const [markShipped, setMarkShipped] = useState(!existing?.shipped_at);

  const [evStatus, setEvStatus] = useState("in_transit");
  const [evDesc, setEvDesc] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evDelivered, setEvDelivered] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Transportadora" className={inputCls} />
        <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Serviço" className={inputCls} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de rastreio" className={inputCls} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL de rastreio (https://…)" className={inputCls} />
        <input type="date" value={eta ?? ""} onChange={(e) => setEta(e.target.value)} className={inputCls} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={markShipped} onChange={(e) => setMarkShipped(e.target.checked)} />
          Marcar como enviado
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          onSave({
            shipment_id: existing?.id ?? null,
            carrier: carrier || null,
            service: service || null,
            tracking_code: code || null,
            tracking_url: url || null,
            estimated_delivery_at: eta || null,
            mark_shipped: markShipped,
          })
        }
        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        Salvar envio
      </button>

      {existing ? (
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-semibold text-primary">Eventos de rastreio</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(existing.events ?? []).length === 0 ? (
              <li>Nenhum evento.</li>
            ) : (
              existing.events.map((e: any) => (
                <li key={e.id}>
                  {new Date(e.occurred_at).toLocaleString("pt-BR")} · {e.status}
                  {e.description ? ` — ${e.description}` : ""}
                  {e.location ? ` (${e.location})` : ""}
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input value={evStatus} onChange={(e) => setEvStatus(e.target.value)} placeholder="Status" className={inputCls} />
            <input value={evDesc} onChange={(e) => setEvDesc(e.target.value)} placeholder="Descrição" className={inputCls} />
            <input value={evLocation} onChange={(e) => setEvLocation(e.target.value)} placeholder="Local" className={inputCls} />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={evDelivered} onChange={(e) => setEvDelivered(e.target.checked)} />
              Marcar entregue
            </label>
            <button
              type="button"
              onClick={() =>
                onAddEvent({
                  shipment_id: existing.id,
                  status: evStatus,
                  description: evDesc || null,
                  location: evLocation || null,
                  occurred_at: null,
                  mark_delivered: evDelivered,
                })
              }
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
            >
              Registrar evento
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}