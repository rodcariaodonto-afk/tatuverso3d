import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/produtores")({
  head: () => ({ meta: [{ title: "Produtores — Admin Cafezeira" }] }),
  component: ProdutoresAdminPage,
});

const STATUSES = ["pending_review", "active", "rejected", "suspended"] as const;

function ProdutoresAdminPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: producers, isLoading } = useQuery({
    queryKey: ["admin-produtores", filter],
    queryFn: async () => {
      let q = supabase
        .from("producers")
        .select("id, name, slug, region, state, country, contact_email, contact_phone, status, created_at")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("producers").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produtor atualizado");
    qc.invalidateQueries({ queryKey: ["admin-produtores"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="eyebrow">Curadoria</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Produtores</h1>
          <div className="gold-divider mt-3" />
        </header>

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mt-6 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <option value="all">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Produtor</th>
                  <th className="px-4 py-3 text-left">Origem</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(producers ?? []).map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{p.name}</p>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{[p.region, p.state, p.country].filter(Boolean).join(" · ")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <p>{p.contact_email ?? "—"}</p>
                      <p>{p.contact_phone ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/produtores/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Ver página →</a>
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
