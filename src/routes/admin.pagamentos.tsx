import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getPaymentEvent,
  listPaymentEvents,
  reprocessPaymentEvent,
} from "@/lib/payments-admin.functions";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus } from "@/lib/orders.shared";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Eventos de pagamento — Admin TatuVerso3D" },
      {
        name: "description",
        content: "Acompanhe notificações do provedor de pagamento e reprocesse eventos com erro.",
      },
    ],
  }),
  component: PaymentEventsPage,
});

function PaymentEventsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPaymentEvents);
  const detail = useServerFn(getPaymentEvent);
  const reprocess = useServerFn(reprocessPaymentEvent);

  const [onlyErrors, setOnlyErrors] = useState(false);
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["payment-events", onlyErrors, onlyUnprocessed, search],
    queryFn: () =>
      list({
        data: {
          only_errors: onlyErrors,
          only_unprocessed: onlyUnprocessed,
          search: search.trim() || null,
          limit: 80,
        },
      }),
  });

  const selectedEvent = useQuery({
    queryKey: ["payment-event", selected],
    enabled: !!selected,
    queryFn: () => detail({ data: { event_id: selected! } }),
  });

  const reprocessMutation = useMutation({
    mutationFn: (eventId: string) => reprocess({ data: { event_id: eventId } }),
    onSuccess: (r: any) => {
      toast.success(`Reprocessado: ${r.result?.provider_status ?? "ok"}`);
      qc.invalidateQueries({ queryKey: ["payment-events"] });
      qc.invalidateQueries({ queryKey: ["payment-event"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao reprocessar."),
  });

  const rows = (events.data ?? []) as any[];

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-2 font-display text-3xl text-primary">Eventos de pagamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Notificações recebidas do provedor. O reprocessamento sempre reconsulta a API — o corpo salvo
            nunca é usado como fonte de verdade.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por id do pagamento"
            className="w-64 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
            Somente com erro
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyUnprocessed}
              onChange={(e) => setOnlyUnprocessed(e.target.checked)}
            />
            Não processados
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            {events.isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Carregando eventos…</p>
            ) : rows.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Nenhum evento encontrado.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Recebido</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ev) => (
                    <tr key={ev.id} className="border-t border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-xs">{ev.event_type ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{ev.provider_payment_id ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {ev.process_error ? (
                          <span className="rounded-full bg-destructive/15 px-2 py-1 text-destructive">Erro</span>
                        ) : ev.processed_at ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-700">
                            Processado
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-700">Pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(ev.id)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => reprocessMutation.mutate(ev.id)}
                            disabled={reprocessMutation.isPending || !ev.provider_payment_id}
                            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                          >
                            Reprocessar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <aside className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-lg text-primary">Detalhe do evento</h2>
            {!selected ? (
              <p className="mt-3 text-sm text-muted-foreground">Selecione um evento para ver o payload.</p>
            ) : selectedEvent.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
            ) : selectedEvent.isError ? (
              <p className="mt-3 text-sm text-destructive">
                {(selectedEvent.error as any)?.message ?? "Falha ao carregar."}
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Assinatura:{" "}
                  {(selectedEvent.data as any).event.signature_valid ? "válida" : "inválida"}
                </p>
                {(selectedEvent.data as any).event.process_error ? (
                  <p className="text-destructive">{(selectedEvent.data as any).event.process_error}</p>
                ) : null}
                {(selectedEvent.data as any).order ? (
                  <p>
                    Pedido{" "}
                    <Link
                      to="/admin/pedidos/$id"
                      params={{ id: (selectedEvent.data as any).order.id }}
                      className="font-semibold text-accent hover:underline"
                    >
                      #{(selectedEvent.data as any).order.id.slice(0, 8)}
                    </Link>{" "}
                    · {ORDER_STATUS_LABEL[(selectedEvent.data as any).order.status as OrderStatus]} ·{" "}
                    {PAYMENT_STATUS_LABEL[(selectedEvent.data as any).order.payment_status] ??
                      (selectedEvent.data as any).order.payment_status}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Sem pedido vinculado.</p>
                )}
                <pre className="max-h-80 overflow-auto rounded-md bg-[var(--surface-soft)] p-3 font-mono text-[11px] text-primary">
                  {JSON.stringify((selectedEvent.data as any).event.payload, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
