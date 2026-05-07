import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin Cafezeira" }] }),
  component: PedidosPage,
});

const STATUSES = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled", "refunded"] as const;

function PedidosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, customer_id, status, payment_status, total, subtotal, shipping_total, created_at, order_items(id, product_name, quantity, total_price)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pedido atualizado");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const filtered = (orders ?? []).filter((o: any) =>
    !search || o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Pedidos</h1>
          <div className="gold-divider mt-3" />
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <option value="all">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID..."
            className="flex-1 min-w-[200px] rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Pagamento</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-primary">{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p className="text-xs">{o.order_items?.length ?? 0} item(s)</p>
                      <p className="line-clamp-1 text-xs">{o.order_items?.map((i: any) => i.product_name).join(", ")}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatBRL(Number(o.total))}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{o.payment_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
