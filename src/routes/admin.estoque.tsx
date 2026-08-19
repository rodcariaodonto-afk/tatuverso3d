import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminAdjustStock, adminListMovements, adminLowStock } from "@/lib/inventory-admin.functions";
import { MOVEMENT_LABEL } from "@/lib/orders.shared";

export const Route = createFileRoute("/admin/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Admin TatuVerso3D" }] }),
  component: EstoquePage,
});

const inputCls =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function EstoquePage() {
  const qc = useQueryClient();
  const listMovements = useServerFn(adminListMovements);
  const lowStock = useServerFn(adminLowStock);
  const adjust = useServerFn(adminAdjustStock);

  const [type, setType] = useState("");

  const movements = useQuery({
    queryKey: ["admin-movements", type],
    queryFn: () => listMovements({ data: { movement_type: type || null, limit: 150 } as any }),
  });
  const low = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => lowStock({ data: undefined as never }),
  });

  const [form, setForm] = useState({
    product_id: "",
    variant_id: "",
    movement_type: "in" as "in" | "out" | "adjust",
    quantity: 1,
    reason: "",
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjust({
        data: {
          product_id: form.product_id,
          variant_id: form.variant_id || null,
          movement_type: form.movement_type,
          quantity: Number(form.quantity),
          reason: form.reason,
        },
      }),
    onSuccess: (r: any) => {
      toast.success(`Estoque ajustado: ${r.previous} → ${r.resulting}`);
      setForm((f) => ({ ...f, quantity: 1, reason: "" }));
      qc.invalidateQueries({ queryKey: ["admin-movements"] });
      qc.invalidateQueries({ queryKey: ["admin-low-stock"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao ajustar estoque."),
  });

  const lowProducts = low.data?.products ?? [];
  const lowVariants = low.data?.variants ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Estoque</h1>
          <div className="brand-divider mt-3" />
        </header>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg text-primary">Alertas de estoque baixo</h2>
          {low.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
          ) : lowProducts.length === 0 && lowVariants.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Tudo dentro do limite configurado.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {lowProducts.map((p: any) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="text-primary">{p.name}</span>
                  <span className="text-xs text-destructive">
                    {p.stock_quantity} un (limite {p.low_stock_threshold}) · id {p.id.slice(0, 8)}
                  </span>
                </li>
              ))}
              {lowVariants.map((v: any) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <span className="text-primary">
                    {v.products?.name} — {v.name ?? v.sku ?? "variação"}
                  </span>
                  <span className="text-xs text-destructive">
                    {v.stock_quantity} un (limite {v.low_stock_threshold}) · id {v.id.slice(0, 8)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg text-primary">Ajuste manual</h2>
          <p className="text-xs text-muted-foreground">
            Todo ajuste é registrado no histórico com autor e motivo.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <input
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              placeholder="ID do produto"
              className={inputCls}
            />
            <input
              value={form.variant_id}
              onChange={(e) => setForm({ ...form, variant_id: e.target.value })}
              placeholder="ID da variação (opcional)"
              className={inputCls}
            />
            <select
              value={form.movement_type}
              onChange={(e) => setForm({ ...form, movement_type: e.target.value as any })}
              className={inputCls}
            >
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
              <option value="adjust">Definir total</option>
            </select>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className={inputCls}
            />
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Motivo"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            disabled={adjustMutation.isPending || !form.product_id || form.reason.trim().length < 3}
            onClick={() => adjustMutation.mutate()}
            className="mt-3 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Aplicar ajuste
          </button>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-primary">Movimentações</h2>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
              <option value="">Todos os tipos</option>
              {Object.entries(MOVEMENT_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
            {movements.isLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (movements.data ?? []).length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma movimentação.</div>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Antes → Depois</th>
                    <th className="px-4 py-3 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(movements.data ?? []).map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {m.products?.name ?? "—"}
                        {m.product_variants?.name ? ` — ${m.product_variants.name}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs">{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}</td>
                      <td className="px-4 py-3 text-right">{m.quantity}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {m.previous_quantity ?? "—"} → {m.resulting_quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.reason ?? m.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}