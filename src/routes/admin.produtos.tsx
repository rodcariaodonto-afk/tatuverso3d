import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/cart-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Admin · Cafés — Cafe EX" }] }),
  component: AdminProductsLayout,
});

function AdminProductsLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return path === "/admin/produtos" ? <AdminProductsPage /> : <Outlet />;
}

type Tab = "products" | "categories" | "reviews";

function AdminProductsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("products");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administração</p>
            <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Cafés</h1>
            <div className="gold-divider mt-3" />
          </div>
          {tab === "products" && (
            <Link
              to="/admin/produtos/novo"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Novo café
            </Link>
          )}
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          {([
            ["products", "Cafés"],
            ["categories", "Categorias"],
            ["reviews", "Avaliações"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "products" && <ProductsList />}
          {tab === "categories" && <CategoriesPanel />}
          {tab === "reviews" && <ReviewsPanel />}
        </div>
      </div>
    </AdminShell>
  );
}

function ProductsList() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["admin-products", q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, status, stock_quantity, cover_url, producers(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const duplicate = async (id: string) => {
    const { data: src } = await supabase.from("products").select("*, product_variants(*)").eq("id", id).maybeSingle();
    if (!src) return toast.error("Produto não encontrado");
    const { product_variants, id: _id, created_at, updated_at, published_at, ...rest } = src as any;
    const { data: created, error } = await supabase
      .from("products")
      .insert({ ...rest, name: `${rest.name} (cópia)`, slug: `${rest.slug}-copia-${Date.now().toString(36)}`, status: "draft" })
      .select("id")
      .single();
    if (error || !created) return toast.error(error?.message ?? "Erro ao duplicar");
    if (product_variants?.length) {
      await supabase.from("product_variants").insert(
        product_variants.map((v: any) => {
          const { id, created_at, updated_at, ...vrest } = v;
          return { ...vrest, product_id: created.id };
        }),
      );
    }
    toast.success("Café duplicado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const archive = async (id: string, name: string) => {
    if (!confirm(`Arquivar "${name}"? Ele deixará de aparecer no catálogo.`)) return;
    const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Arquivado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <>
      <div className="flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Café</th>
              <th className="px-4 py-3 text-left">Produtor</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                    <span className="font-medium text-primary">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.producers?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                <td className="px-4 py-3 text-right">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <Link to="/admin/produtos/$id/editar" params={{ id: p.id }} className="text-xs font-semibold text-primary hover:underline">Editar</Link>
                  <button onClick={() => duplicate(p.id)} className="text-xs font-semibold text-foreground/70 hover:underline">Duplicar</button>
                  <button onClick={() => archive(p.id, p.name)} className="text-xs font-semibold text-destructive hover:underline">Arquivar</button>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Nenhum café encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CategoriesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", sort_order: 0 });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, product_categories(count)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const reset = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", image_url: "", sort_order: 0 });
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Categoria atualizada" : "Categoria criada");
    reset();
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remover categoria "${name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  const startEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? 0,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-right">Ordem</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Carregando…</td></tr>}
            {(categories ?? []).map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-primary">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 text-right">{c.sort_order ?? 0}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => startEdit(c)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Pencil className="h-3 w-3" /> Editar</button>
                  <button onClick={() => remove(c.id, c.name)} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"><Trash2 className="h-3 w-3" /> Remover</button>
                </td>
              </tr>
            ))}
            {!isLoading && (categories ?? []).length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Nenhuma categoria ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-lg text-primary">{editing ? "Editar categoria" : "Nova categoria"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Imagem (URL)</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Ordem</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{editing ? "Salvar" : "Criar"}</button>
            {editing && <button onClick={reset} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*, products(name, slug, cover_url)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending") query = query.eq("is_approved", false);
      if (filter === "approved") query = query.eq("is_approved", true);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = async (id: string, approve: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_approved: approve }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Aprovada" : "Ocultada");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover avaliação?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {([
          ["all", "Todas"],
          ["pending", "Pendentes"],
          ["approved", "Aprovadas"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === k ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carregando…</div>}

      <div className="space-y-3">
        {(reviews ?? []).map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {r.products?.cover_url ? (
                  <img src={r.products.cover_url} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted" />
                )}
                <div>
                  <div className="font-semibold text-primary">{r.products?.name ?? "—"}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {r.title && <div className="mt-2 font-medium">{r.title}</div>}
                  {r.body && <p className="mt-1 text-sm text-foreground/80">{r.body}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${r.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {r.is_approved ? "Aprovada" : "Pendente"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggle(r.id, !r.is_approved)} className="text-xs font-semibold text-primary hover:underline">
                    {r.is_approved ? "Ocultar" : "Aprovar"}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-xs font-semibold text-destructive hover:underline">Remover</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (reviews ?? []).length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhuma avaliação.</div>
        )}
      </div>
    </div>
  );
}
