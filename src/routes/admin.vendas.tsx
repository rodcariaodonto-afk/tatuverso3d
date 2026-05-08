import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/admin/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Admin Cafe EX" }] }),
  component: VendasPage,
});

type Tab = "resumo" | "analises";

function VendasPage() {
  const [tab, setTab] = useState<Tab>("resumo");
  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Vendas</h1>
          <div className="gold-divider mt-3" />
        </header>

        <div className="mt-8 inline-flex rounded-full border border-border bg-card p-1">
          {([
            { k: "resumo", l: "Resumo" },
            { k: "analises", l: "Análises" },
          ] as { k: Tab; l: string }[]).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="mt-8">{tab === "resumo" ? <ResumoTab onAnalyze={() => setTab("analises")} /> : <AnalisesTab />}</div>
      </div>
    </AdminShell>
  );
}

function rangeDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function fmtRange(s: Date, e: Date) {
  const f = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return `${f(s)} — ${f(e)}`;
}

function useOrders(start: Date, end: Date) {
  return useQuery({
    queryKey: ["admin-vendas", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, created_at, status, order_items(product_name, quantity, total_price)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ResumoTab({ onAnalyze }: { onAnalyze: () => void }) {
  const { start, end } = useMemo(() => rangeDays(7), []);
  const { data: orders = [], isLoading } = useOrders(start, end);

  const totals = useMemo(() => {
    const total = orders.reduce((s, o: any) => s + Number(o.total || 0), 0);
    const count = orders.length;
    const avg = count ? total / count : 0;
    return { total, count, avg };
  }, [orders]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {fmtRange(start, end)}
        </div>
        <button
          onClick={onAnalyze}
          className="text-sm font-semibold text-[var(--gold)] hover:underline"
        >
          Veja as análises de vendas →
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Vendas totais" value={formatBRL(totals.total)} />
        <Stat label="Total de pedidos" value={`${totals.count}`} />
        <Stat label="Valor médio do pedido" value={formatBRL(totals.avg)} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-primary">Pedidos recentes</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhum pedido no período selecionado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.slice(0, 20).map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {formatBRL(Number(o.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function AnalisesTab() {
  const [days, setDays] = useState(30);
  const { start, end } = useMemo(() => rangeDays(days), [days]);
  const { data: orders = [], isLoading } = useOrders(start, end);

  const series = useMemo(() => {
    const buckets = new Map<string, { date: string; total: number; count: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, total: 0, count: 0 });
    }
    for (const o of orders as any[]) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (b) {
        b.total += Number(o.total || 0);
        b.count += 1;
      }
    }
    return Array.from(buckets.values()).map((b) => ({
      ...b,
      label: new Date(b.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      avg: b.count ? b.total / b.count : 0,
    }));
  }, [orders, start, days]);

  const totals = useMemo(() => {
    const total = orders.reduce((s, o: any) => s + Number(o.total || 0), 0);
    const count = orders.length;
    return { total, count, avg: count ? total / count : 0 };
  }, [orders]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; qty: number }>();
    for (const o of orders as any[]) {
      for (const it of o.order_items ?? []) {
        const k = it.product_name ?? "—";
        const cur = map.get(k) ?? { name: k, revenue: 0, qty: 0 };
        cur.revenue += Number(it.total_price || 0);
        cur.qty += Number(it.quantity || 0);
        map.set(k, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {fmtRange(start, end)}
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <Card title="Vendas totais" value={formatBRL(totals.total)} className="mt-6">
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Total de pedidos" value={`${totals.count}`}>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Valor médio do pedido" value={formatBRL(totals.avg)}>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Vendas totais por produto" value="" className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : byProduct.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={byProduct.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}

function Card({ title, value, children, className }: { title: string; value?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 ${className ?? ""}`}>
      <div className="mb-4">
        <div className="mb-2 h-1 w-8 rounded bg-[var(--gold)]" />
        <p className="text-sm text-muted-foreground">{title}</p>
        {value ? <p className="font-display text-2xl text-primary">{value}</p> : null}
      </div>
      {children}
    </div>
  );
}
