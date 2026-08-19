import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/produtores")({
  head: () => ({ meta: [{ title: "Produtores — Admin TatuVerso3D" }] }),
  component: ProdutoresAdminPage,
});

const STATUSES = ["pending_review", "active", "rejected", "suspended"] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type NewProducer = {
  name: string;
  slug: string;
  description: string;
  story: string;
  country: string;
  state: string;
  city: string;
  region: string;
  document: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  cover_url: string;
  certifications: string;
  commission_rate: string;
  status: string;
};

const EMPTY: NewProducer = {
  name: "", slug: "", description: "", story: "",
  country: "Brasil", state: "", city: "", region: "",
  document: "", contact_email: "", contact_phone: "",
  logo_url: "", cover_url: "", certifications: "",
  commission_rate: "12.00", status: "pending_review",
};

function ProdutoresAdminPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProducer>(EMPTY);
  const [saving, setSaving] = useState(false);

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

  const update = <K extends keyof NewProducer>(k: K, v: NewProducer[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name" && !f.slug) next.slug = slugify(String(v));
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload: any = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      description: form.description || null,
      story: form.story || null,
      country: form.country || "Brasil",
      state: form.state || null,
      city: form.city || null,
      region: form.region || null,
      document: form.document || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      certifications: form.certifications
        ? form.certifications.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      commission_rate: Number(form.commission_rate) || 12,
      status: form.status as any,
      owner_user_id: userRes.user?.id ?? null,
    };
    const { error } = await supabase.from("producers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Produtor cadastrado");
    setForm(EMPTY);
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["admin-produtores"] });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
  const inputCls = "rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Curadoria</p>
            <h1 className="mt-2 font-display text-4xl text-primary">Produtores</h1>
            <div className="brand-divider mt-3" />
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {showForm ? "Cancelar" : "+ Novo produtor"}
          </button>
        </header>

        {showForm && (
          <form onSubmit={submit} className="mt-6 rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-xl text-primary">Cadastrar produtor</h2>
            <p className="mt-1 text-xs text-muted-foreground">Preencha os dados do fornecedor. Campos com * são obrigatórios.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Nome / marca *">
                <input required className={inputCls} value={form.name} onChange={(e) => update("name", e.target.value)} />
              </Field>
              <Field label="Slug (URL)">
                <input className={inputCls} value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="auto a partir do nome" />
              </Field>
              <Field label="CNPJ / Documento">
                <input className={inputCls} value={form.document} onChange={(e) => update("document", e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={(e) => update("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Email de contato">
                <input type="email" className={inputCls} value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <input className={inputCls} value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
              </Field>

              <Field label="País">
                <input className={inputCls} value={form.country} onChange={(e) => update("country", e.target.value)} />
              </Field>
              <Field label="Estado (UF)">
                <input className={inputCls} value={form.state} onChange={(e) => update("state", e.target.value)} />
              </Field>
              <Field label="Cidade">
                <input className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)} />
              </Field>
              <Field label="Região">
                <input className={inputCls} value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Ex.: Cerrado Mineiro" />
              </Field>

              <Field label="Logo (URL)">
                <input className={inputCls} value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} />
              </Field>
              <Field label="Capa (URL)">
                <input className={inputCls} value={form.cover_url} onChange={(e) => update("cover_url", e.target.value)} />
              </Field>

              <Field label="Certificações (separadas por vírgula)">
                <input className={inputCls} value={form.certifications} onChange={(e) => update("certifications", e.target.value)} placeholder="orgânico, fair trade" />
              </Field>
              <Field label="Comissão (%)">
                <input type="number" step="0.01" className={inputCls} value={form.commission_rate} onChange={(e) => update("commission_rate", e.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Descrição curta">
                  <textarea rows={2} className={inputCls} value={form.description} onChange={(e) => update("description", e.target.value)} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="História do produtor">
                  <textarea rows={4} className={inputCls} value={form.story} onChange={(e) => update("story", e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? "Salvando…" : "Cadastrar produtor"}
              </button>
              <button type="button" onClick={() => { setForm(EMPTY); setShowForm(false); }} className="rounded-md border border-border px-5 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}

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
