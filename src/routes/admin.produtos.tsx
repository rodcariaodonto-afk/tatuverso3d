import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Star, Trash2, Pencil, Archive, X, Loader2,
  Image as ImageIcon, AlertTriangle, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  PRODUCT_TYPE_LABEL,
  mapCatalogProduct,
  productMaterials,
  type CatalogProduct,
} from "@/hooks/useProducts";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Admin · Produtos — TatuVerso3D" }] }),
  component: AdminProductsLayout,
});

function AdminProductsLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (path !== "/admin/produtos") return <Outlet />;
  return <AdminProductsPage />;
}

type Tab = "products" | "categories" | "reviews";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
  pending_review: "Em revisão",
  rejected: "Rejeitado",
};

function AdminProductsPage() {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administração</p>
            <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Produtos</h1>
            <div className="brand-divider mt-3" />
          </div>
          {tab === "products" && (
            <Link
              to="/admin/produtos/novo"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Novo produto
            </Link>
          )}
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          {(
            [
              ["products", "Produtos"],
              ["categories", "Categorias"],
              ["reviews", "Avaliações"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
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

// ── ProductsList ──────────────────────────────────────────────────────────────

const ADMIN_PRODUCT_SELECT = `
  id, name, slug, short_description, cover_url, price, compare_at_price, status,
  product_type, material_description, is_featured, is_personalizable, is_sensory,
  made_to_order, production_time_days, stock_quantity, low_stock_threshold,
  track_inventory, allow_backorder, dimensions_text, created_at,
  product_images ( id, url, alt, sort_order ),
  product_categories ( category_id ),
  product_variants ( id, name, sku, price, compare_at_price, stock_quantity,
                     low_stock_threshold, is_default, is_active, sort_order, image_url ),
  product_options ( id, name, option_type, is_required, sort_order,
                    product_option_values ( id, label, value, color_hex, price_adjustment, sort_order ) ),
  product_customization_fields ( id, label, field_type, is_required, price_adjustment, is_active )
`;

function ProductsList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [material, setMaterial] = useState<string>("all");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyCustom, setOnlyCustom] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products-3d"],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(ADMIN_PRODUCT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCatalogProduct);
    },
  });

  const materials = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => productMaterials(p).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [products]);

  const isLowStock = (p: CatalogProduct) =>
    p.track_inventory && !p.made_to_order && p.total_stock <= (p.low_stock_threshold ?? 5);

  const filtered = useMemo(() => {
    let list = (products ?? []).slice();
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          p.variants.some((v) => v.sku?.toLowerCase().includes(term)),
      );
    }
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (type !== "all") list = list.filter((p) => p.product_type === type);
    if (material !== "all")
      list = list.filter((p) => productMaterials(p).some((m) => m === material));
    if (onlyLowStock) list = list.filter(isLowStock);
    if (onlyCustom) list = list.filter((p) => p.is_personalizable);
    return list;
  }, [products, q, status, type, material, onlyLowStock, onlyCustom]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products-3d"] });

  const toggleFeatured = async (p: CatalogProduct) => {
    const { error } = await supabase
      .from("products").update({ is_featured: !p.is_featured }).eq("id", p.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(p.is_featured ? "Removido dos destaques" : "Adicionado aos destaques");
    refresh();
  };

  const changeStatus = async (p: CatalogProduct, next: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status: next as any, published_at: next === "active" ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Status: ${STATUS_LABEL[next] ?? next}`);
    refresh();
  };

  const remove = async (p: CatalogProduct) => {
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Produto excluído");
    refresh();
  };

  const lowStockCount = (products ?? []).filter(isLowStock).length;

  return (
    <div>
      {lowStockCount > 0 && (
        <button
          onClick={() => setOnlyLowStock(true)}
          className="mb-4 flex w-full items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-left text-sm"
        >
          <AlertTriangle className="h-4 w-4 text-accent" />
          {lowStockCount} produto(s) com estoque baixo — clique para filtrar
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          <option value="all">Todos os tipos</option>
          {Object.entries(PRODUCT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {materials.length > 0 && (
          <select value={material} onChange={(e) => setMaterial(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <option value="all">Todos os materiais</option>
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]" />
          Estoque baixo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]" />
          Personalizáveis
        </label>
      </div>

      {isLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl text-primary">Nenhum produto encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo produto.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Variações</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.name} className="h-11 w-11 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          /{p.slug}
                          {p.is_personalizable && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">Personalizável</span>}
                          {p.made_to_order && <span className="rounded-full bg-muted px-2 py-0.5">Sob encomenda</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PRODUCT_TYPE_LABEL[p.product_type] ?? p.product_type}
                  </td>
                  <td className="px-4 py-3">{formatBRL(p.min_price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" /> {p.variants.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.made_to_order || !p.track_inventory ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={isLowStock(p) ? "font-semibold text-accent" : ""}>
                        {p.total_stock}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => changeStatus(p, e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleFeatured(p)}
                        title="Destaque"
                        className={`rounded-md p-2 hover:bg-muted ${p.is_featured ? "text-accent" : "text-muted-foreground"}`}
                      >
                        <Star className="h-4 w-4" fill={p.is_featured ? "currentColor" : "none"} />
                      </button>
                      <Link
                        to="/admin/produtos/$id/editar"
                        params={{ id: p.id }}
                        title="Editar"
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => changeStatus(p, "archived")}
                        title="Arquivar"
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        title="Excluir"
                        className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CategoriesPanel ────────────────────────────────────────────────────────────

function CategoriesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    sort_order: 0,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const catSlugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const reset = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", image_url: "", sort_order: 0 });
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || catSlugify(form.name),
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
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {(categories ?? []).map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-primary">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 text-right">{c.sort_order ?? 0}</td>
                <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(c)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button
                    onClick={() => remove(c.id, c.name)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && (categories ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma categoria ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-lg text-primary">
          {editing ? "Editar categoria" : "Nova categoria"}
        </h3>
        <div className="mt-4 space-y-3">
          {(
            [
              ["Nome", "name"],
              ["Slug", "slug"],
              ["Descrição", "description"],
              ["Imagem (URL)", "image_url"],
            ] as const
          ).map(([label, key]) => (
            <div key={key}>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                {label}
              </label>
              {key === "description" ? (
                <textarea
                  value={(form as any)[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              ) : (
                <input
                  value={(form as any)[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]: e.target.value,
                      ...(key === "name" && !editing
                        ? { slug: catSlugify(e.target.value) }
                        : {}),
                    }))
                  }
                  className={`mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ${key === "slug" ? "font-mono" : ""}`}
                />
              )}
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Ordem
            </label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {editing ? "Salvar" : "Criar"}
            </button>
            {editing && (
              <button
                onClick={reset}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReviewsPanel ───────────────────────────────────────────────────────────────

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
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: approve })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Aprovada" : "Ocultada");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover avaliação permanentemente?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(
          [
            ["all", "Todas"],
            ["pending", "Pendentes"],
            ["approved", "Aprovadas"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === k
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
      )}

      <div className="space-y-3">
        {(reviews ?? []).map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {r.products?.cover_url ? (
                  <img
                    src={r.products.cover_url}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted" />
                )}
                <div>
                  <div className="font-semibold text-primary">{r.products?.name ?? "—"}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < r.rating
                            ? "fill-[var(--brand-accent)] text-[var(--brand-accent)]"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {r.title && <div className="mt-2 font-medium">{r.title}</div>}
                  {r.body && <p className="mt-1 text-sm text-foreground/80">{r.body}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    r.is_approved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.is_approved ? "Aprovada" : "Pendente"}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggle(r.id, !r.is_approved)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {r.is_approved ? "Ocultar" : "Aprovar"}
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (reviews ?? []).length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma avaliação.
          </div>
        )}
      </div>
    </div>
  );
}
