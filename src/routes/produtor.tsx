import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { ProducerShell } from "@/components/producer/ProducerShell";

export const Route = createFileRoute("/produtor")({
  head: () => ({ meta: [{ title: "Painel do Produtor — TatuVerso3D" }] }),
  component: ProducerLayout,
});

function ProducerLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return path === "/produtor" ? <ProducerDashboard /> : <Outlet />;
}

function ProducerDashboard() {
  const { user } = useAuth();

  const { data: producer } = useQuery({
    queryKey: ["my-producer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("producers")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Active products count
  const { data: products } = useQuery({
    queryKey: ["my-products", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, status, price")
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Current month order items
  const { data: orderItems } = useQuery({
    queryKey: ["producer-orders-month", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, quantity, total_price, orders(status, created_at)")
        .eq("producer_id", producer!.id)
        .gte("created_at", firstOfMonth.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All-time order items for revenue
  const { data: allOrderItems } = useQuery({
    queryKey: ["producer-all-orders", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("total_price")
        .eq("producer_id", producer!.id);
      return data ?? [];
    },
  });

  const activeProducts = (products ?? []).filter((p) => p.status === "active").length;
  const monthlyRevenue = (orderItems ?? []).reduce(
    (sum, i: any) => sum + Number(i.total_price),
    0,
  );
  const totalRevenue = (allOrderItems ?? []).reduce(
    (sum, i: any) => sum + Number(i.total_price),
    0,
  );
  const commissionRate = producer?.commission_rate ? Number(producer.commission_rate) : 12;
  const netRevenue = totalRevenue * (1 - commissionRate / 100);

  return (
    <ProducerShell>
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="eyebrow">Painel do Produtor</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">
            {producer?.name ?? "Minha marca"}
          </h1>
          <div className="brand-divider mt-3" />
          {producer?.status && (
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                producer.status === "active"
                  ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {producer.status === "active"
                ? "Ativo"
                : producer.status === "pending_review"
                ? "Em curadoria"
                : producer.status}
            </span>
          )}
        </header>

        {/* Metrics */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Metric
            icon={Package}
            label="Cafés ativos"
            value={`${activeProducts}`}
            sub={`de ${products?.length ?? 0} cadastrados`}
          />
          <Metric
            icon={ShoppingCart}
            label="Vendas do mês"
            value={`${orderItems?.length ?? 0} itens`}
            sub={formatBRL(monthlyRevenue)}
          />
          <Metric
            icon={TrendingUp}
            label="Receita líquida total"
            value={formatBRL(netRevenue)}
            sub={`comissão ${commissionRate}%`}
          />
        </div>

        {/* Quick links */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { to: "/produtor/produtos", label: "Gerenciar cafés", desc: "Adicione e edite seus produtos" },
            { to: "/produtor/pedidos", label: "Ver pedidos", desc: "Acompanhe os pedidos dos seus clientes" },
            { to: "/produtor/perfil", label: "Editar perfil", desc: "Atualize os dados da sua marca" },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to as any}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition hover:border-[var(--brand-accent)]"
            >
              <div>
                <p className="font-semibold text-primary">{q.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{q.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[var(--brand-accent)]" />
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        {(orderItems ?? []).length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-primary">Pedidos deste mês</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Pedido</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(orderItems ?? []).map((i: any) => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{i.order_id?.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-right">{i.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(Number(i.total_price))}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs">
                          {(i as any).orders?.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </ProducerShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-[var(--brand-accent)]" />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
