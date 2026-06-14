import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { ProducerShell } from "@/components/producer/ProducerShell";

export const Route = createFileRoute("/produtor/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel do Produtor" }] }),
  component: ProducerPedidosPage,
});

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  preparing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

function ProducerPedidosPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: producer } = useQuery({
    queryKey: ["my-producer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("producers")
        .select("id")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: orderItems, isLoading } = useQuery({
    queryKey: ["producer-order-items", producer?.id, statusFilter],
    enabled: !!producer?.id,
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select(
          "id, product_name, quantity, unit_price, total_price, created_at, orders(id, status, payment_status, created_at, guest_name, guest_email, customer_id)",
        )
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await q;
      if (error) throw error;

      const items = (data ?? []) as any[];
      if (statusFilter === "all") return items;
      return items.filter((i) => i.orders?.status === statusFilter);
    },
  });

  const totalRevenue = (orderItems ?? []).reduce(
    (sum, i: any) => sum + Number(i.total_price),
    0,
  );

  return (
    <ProducerShell>
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="eyebrow">Marketplace</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Pedidos</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {orderItems?.length ?? 0} itens · {formatBRL(totalRevenue)} em vendas
          </p>
        </header>

        {/* Status filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["all", "pending", "paid", "preparing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground/70 hover:border-primary"
              }`}
            >
              {s === "all" ? "Todos" : (ORDER_STATUS_LABELS[s] ?? s)}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (orderItems ?? []).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Unitário</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orderItems ?? []).map((i: any) => {
                  const order = i.orders;
                  const status = order?.status ?? "pending";
                  return (
                    <tr key={i.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{order?.id?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">{i.product_name}</td>
                      <td className="px-4 py-3 text-right">{i.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(Number(i.unit_price))}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatBRL(Number(i.total_price))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[status] ?? ""}`}
                        >
                          {ORDER_STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProducerShell>
  );
}
