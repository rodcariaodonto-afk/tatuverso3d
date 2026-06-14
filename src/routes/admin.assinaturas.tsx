import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Assinaturas — Admin Café EX" }] }),
  component: AssinaturasAdminPage,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  paused: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  pending: "Pendente",
  paused: "Pausada",
  cancelled: "Cancelada",
};

function AssinaturasAdminPage() {
  const qc = useQueryClient();

  const { data: subs, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, status, mp_payment_status, started_at, cancelled_at, created_at, mp_preapproval_id, customer_id, subscription_plans(name, monthly_price, cycle)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Calcula MRR e métricas
  const active = (subs ?? []).filter((s) => s.status === "active");
  const mrr = active.reduce((sum, s) => sum + Number(s.subscription_plans?.monthly_price ?? 0), 0);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: status as any,
        ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Assinatura atualizada");
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Clube</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Assinaturas</h1>
          <div className="gold-divider mt-3" />
        </header>

        {/* Metrics */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <TrendingUp className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">MRR</p>
            <p className="mt-1 font-display text-3xl text-primary">{formatBRL(mrr)}</p>
            <p className="mt-1 text-xs text-muted-foreground">receita recorrente mensal</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Assinaturas ativas</p>
            <p className="mt-2 font-display text-3xl text-primary">{active.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total cadastrado</p>
            <p className="mt-2 font-display text-3xl text-primary">{subs?.length ?? 0}</p>
          </div>
        </div>

        {/* Table */}
        <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (subs ?? []).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma assinatura encontrada.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Plano</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Início</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(subs ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{s.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{s.subscription_plans?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.subscription_plans?.cycle ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatBRL(Number(s.subscription_plans?.monthly_price ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[s.status] ?? ""}`}
                      >
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.started_at
                        ? new Date(s.started_at).toLocaleDateString("pt-BR")
                        : new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {s.status === "active" && (
                          <button
                            onClick={() => updateStatus(s.id, "paused")}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                          >
                            Pausar
                          </button>
                        )}
                        {s.status === "paused" && (
                          <button
                            onClick={() => updateStatus(s.id, "active")}
                            className="rounded-full border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Reativar
                          </button>
                        )}
                        {s.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(s.id, "cancelled")}
                            className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
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
