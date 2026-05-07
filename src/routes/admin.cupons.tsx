import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/cupons")({
  head: () => ({ meta: [{ title: "Cupons — Admin Cafezeira" }] }),
  component: CuponsPage,
});

function CuponsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent",
    discount_value: 10,
    min_order_total: 0,
    max_uses: "",
    expires_at: "",
    is_active: true,
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-cupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = async () => {
    if (!form.code) return toast.error("Informe o código");
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_total: Number(form.min_order_total) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Cupom criado");
    setOpen(false);
    setForm({ code: "", description: "", discount_type: "percent", discount_value: 10, min_order_total: 0, max_uses: "", expires_at: "", is_active: true });
    qc.invalidateQueries({ queryKey: ["admin-cupons"] });
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("coupons").update({ is_active: !is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-cupons"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cupom excluído");
    qc.invalidateQueries({ queryKey: ["admin-cupons"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Marketing</p>
            <h1 className="mt-2 font-display text-4xl text-primary">Cupons</h1>
            <div className="gold-divider mt-3" />
          </div>
          <button onClick={() => setOpen(true)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            + Novo cupom
          </button>
        </header>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (coupons ?? []).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Nenhum cupom criado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Desconto</th>
                  <th className="px-4 py-3 text-left">Mín. pedido</th>
                  <th className="px-4 py-3 text-left">Usos</th>
                  <th className="px-4 py-3 text-left">Validade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(coupons ?? []).map((c: any) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-primary">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">R$ {Number(c.min_order_total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.used_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(c.id, c.is_active)} className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? "bg-[var(--farm)]/20 text-[var(--farm)]" : "bg-muted text-muted-foreground"}`}>
                        {c.is_active ? "ativo" : "inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(c.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
            <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-display text-2xl text-primary">Novo cupom</h2>
              <div className="mt-6 space-y-4">
                <Input label="Código" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
                <Input label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
                    <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option value="percent">Percentual</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <Input label="Valor" type="number" value={String(form.discount_value)} onChange={(v) => setForm({ ...form, discount_value: Number(v) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Mín. pedido (R$)" type="number" value={String(form.min_order_total)} onChange={(v) => setForm({ ...form, min_order_total: Number(v) })} />
                  <Input label="Máx. usos" type="number" value={form.max_uses} onChange={(v) => setForm({ ...form, max_uses: v })} />
                </div>
                <Input label="Expira em" type="date" value={form.expires_at} onChange={(v) => setForm({ ...form, expires_at: v })} />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm">Cancelar</button>
                <button onClick={create} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Criar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
