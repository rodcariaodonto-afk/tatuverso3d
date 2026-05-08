import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Leads B2B — Admin Café EX" }] }),
  component: LeadsPage,
});

const STATUSES = ["new", "contacted", "in_proposal", "won", "lost", "archived"] as const;

function LeadsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", filter],
    queryFn: async () => {
      let q = supabase.from("b2b_leads").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("b2b_leads").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead atualizado");
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
  };

  const saveNotes = async (id: string, notes: string) => {
    const { error } = await supabase.from("b2b_leads").update({ internal_notes: notes }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notas salvas");
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="eyebrow">Comercial B2B</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Leads · Private Label</h1>
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
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left">Quantidade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(leads ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{l.company_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{l.contact_name}</p>
                      <p className="text-xs">{l.email}{l.phone ? ` · ${l.phone}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.estimated_quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(l)} className="text-xs font-semibold text-primary hover:underline">Detalhes →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl text-primary">{selected.company_name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.contact_name} · {selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-2xl text-muted-foreground">×</button>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <Field label="Telefone" value={selected.phone} />
                <Field label="Quantidade" value={selected.estimated_quantity} />
                <Field label="Embalagem" value={selected.packaging_preference} />
                <Field label="Tem marca?" value={selected.has_brand ? "Sim" : "Não"} />
                <Field label="Prazo" value={selected.desired_deadline} />
                <Field label="Finalidade" value={selected.purpose} full />
                <Field label="Observações" value={selected.notes} full />
              </dl>
              <div className="mt-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas internas</label>
                <textarea
                  defaultValue={selected.internal_notes ?? ""}
                  onBlur={(e) => saveNotes(selected.id, e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <a href={`mailto:${selected.email}`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Responder</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ label, value, full }: { label: string; value: any; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value || "—"}</dd>
    </div>
  );
}
