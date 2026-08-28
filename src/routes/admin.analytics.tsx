import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminAnalyticsReport } from "@/lib/analytics-admin.functions";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin TatuVerso3D" }] }),
  component: AnalyticsPage,
});

const RANGES = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function pct(a: number, b: number) {
  if (!b) return a > 0 ? 100 : 0;
  return ((a - b) / b) * 100;
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
}

function fmtDuration(seconds: number) {
  const s = Math.round(seconds || 0);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function StatCard({
  label,
  value,
  delta,
  invertDelta,
}: {
  label: string;
  value: string;
  delta?: number;
  invertDelta?: boolean;
}) {
  const good = delta === undefined ? true : invertDelta ? delta <= 0 : delta >= 0;
  const Icon = (delta ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl text-primary">{value}</p>
      {delta !== undefined && Number.isFinite(delta) && (
        <p
          className={`mt-1 inline-flex items-center gap-1 text-xs ${
            good ? "text-emerald-500" : "text-destructive"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {Math.abs(delta).toFixed(1)}% vs. período anterior
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bars({
  rows,
}: {
  rows: { label: string; value: number; hint?: string }[];
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Ainda sem dados neste período.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="relative overflow-hidden rounded-md bg-muted/40 px-3 py-2">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--brand-accent)]/20"
            style={{ width: `${(r.value / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {fmtInt(r.value)}
              {r.hint ? <span className="ml-2 text-xs text-muted-foreground">{r.hint}</span> : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const run = useServerFn(adminAnalyticsReport);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: () => run({ data: { days } }),
    staleTime: 60_000,
  });

  const cur = data?.current;
  const prev = data?.previous;
  const funnel = cur?.funnel;

  const funnelSteps = funnel
    ? [
        { label: "Visitou o site", value: funnel.visits },
        { label: "Viu um produto", value: funnel.product_views },
        { label: "Adicionou ao carrinho", value: funnel.add_to_carts },
        { label: "Iniciou checkout", value: funnel.checkouts },
        { label: "Pagou", value: funnel.purchases },
      ]
    : [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administração</p>
            <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Analytics</h1>
            <div className="brand-divider mt-3" />
            <p className="mt-3 text-sm text-muted-foreground">
              Visitas, navegação, cliques e funil de venda — dados próprios, sem cookies de terceiros.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setDays(r.days)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    days === r.days
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => void refetch()}
              className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground"
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {error && (
          <p className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error).message}
          </p>
        )}

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Carregando métricas…</p>}

        {cur && prev && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Visitantes únicos"
                value={fmtInt(cur.summary.visitors)}
                delta={pct(cur.summary.visitors, prev.visitors)}
              />
              <StatCard
                label="Sessões"
                value={fmtInt(cur.summary.sessions)}
                delta={pct(cur.summary.sessions, prev.sessions)}
              />
              <StatCard
                label="Páginas vistas"
                value={fmtInt(cur.summary.pageviews)}
                delta={pct(cur.summary.pageviews, prev.pageviews)}
              />
              <StatCard
                label="Duração média da sessão"
                value={fmtDuration(cur.summary.avg_session_seconds)}
                delta={pct(cur.summary.avg_session_seconds, prev.avg_session_seconds)}
              />
              <StatCard
                label="Taxa de rejeição"
                value={`${(cur.summary.bounce_rate * 100).toFixed(1)}%`}
                delta={pct(cur.summary.bounce_rate, prev.bounce_rate)}
                invertDelta
              />
              <StatCard
                label="Taxa de conversão"
                value={`${
                  cur.summary.sessions
                    ? ((cur.summary.purchases / cur.summary.sessions) * 100).toFixed(2)
                    : "0.00"
                }%`}
              />
            </div>

            <div className="mt-6">
              <Panel title="Visitantes e páginas por dia">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cur.series}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="visitors"
                        name="Visitantes"
                        stroke="var(--brand-accent)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="pageviews"
                        name="Páginas vistas"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <div className="mt-6">
              <Panel title="Funil de venda">
                {funnelSteps[0]?.value ? (
                  <ul className="space-y-3">
                    {funnelSteps.map((step, i) => {
                      const base = funnelSteps[0]!.value || 1;
                      const prevStep = i > 0 ? funnelSteps[i - 1]!.value : null;
                      const conv = prevStep ? (step.value / (prevStep || 1)) * 100 : null;
                      return (
                        <li key={step.label}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{step.label}</span>
                            <span className="tabular-nums font-semibold">
                              {fmtInt(step.value)}
                              {conv !== null && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {conv.toFixed(1)}%
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-[var(--brand-accent)]"
                              style={{ width: `${Math.min((step.value / base) * 100, 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                    <li className="pt-2 text-sm text-muted-foreground">
                      Receita atribuída no período:{" "}
                      <strong className="text-foreground">
                        {formatBRL(cur.summary.revenue_cents / 100)}
                      </strong>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda sem dados neste período.</p>
                )}
              </Panel>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Páginas mais vistas">
                <Bars
                  rows={cur.top_pages.map((p) => ({
                    label: p.path,
                    value: p.views,
                    hint: `${fmtInt(p.visitors)} visit.`,
                  }))}
                />
              </Panel>

              <Panel title="Origem do tráfego">
                <Bars
                  rows={cur.sources.map((s) => ({ label: s.source, value: s.sessions }))}
                />
              </Panel>

              <Panel title="Cliques mais frequentes">
                <Bars
                  rows={cur.clicks.map((c) => ({
                    label: c.label || c.element_id,
                    value: c.clicks,
                  }))}
                />
              </Panel>

              <Panel title="Produtos mais vistos">
                <Bars
                  rows={cur.top_products.map((p) => ({
                    label: p.name,
                    value: p.views,
                    hint: `${fmtInt(p.add_to_carts)} no carrinho`,
                  }))}
                />
              </Panel>

              <Panel title="Dispositivos">
                <Bars rows={cur.devices.map((d) => ({ label: d.device, value: d.sessions }))} />
              </Panel>

              <Panel title="Navegadores">
                <Bars rows={cur.browsers.map((b) => ({ label: b.browser, value: b.sessions }))} />
              </Panel>

              {cur.campaigns.length > 0 && (
                <Panel title="Campanhas (UTM)">
                  <Bars
                    rows={cur.campaigns.map((c) => ({
                      label: `${c.campaign} · ${c.medium}`,
                      value: c.sessions,
                    }))}
                  />
                </Panel>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
