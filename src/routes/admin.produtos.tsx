import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star, Trash2, Pencil, Archive, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Admin · Cafés — TatuVerso3D" }] }),
  component: AdminProductsLayout,
});

function AdminProductsLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return path === "/admin/produtos" ? <AdminProductsPage /> : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = {
  id?: string;
  weight_grams: number;
  grind_option: string;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock_quantity: number;
  is_default: boolean;
};

type VariantRow = Variant & { _key: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_url: string | null;
  roast_level: string | null;
  origin_region: string | null;
  origin_country: string | null;
  score: number | null;
  badges: string[] | null;
  is_featured: boolean | null;
  is_subscription_available: boolean | null;
  status: string;
  producer_id: string;
  created_at: string;
  producers: { id: string; name: string } | null;
  product_variants: Variant[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ROAST_LEVELS = [
  { value: "light", label: "Clara" },
  { value: "medium_light", label: "Média-clara" },
  { value: "medium", label: "Média" },
  { value: "medium_dark", label: "Média-escura" },
  { value: "dark", label: "Escura" },
];

const GRIND_OPTIONS = [
  { value: "whole_bean", label: "Grão inteiro" },
  { value: "espresso", label: "Espresso" },
  { value: "moka", label: "Moka" },
  { value: "filter", label: "Filtrado" },
  { value: "french_press", label: "French Press" },
  { value: "aeropress", label: "Aeropress" },
  { value: "cold_brew", label: "Cold Brew" },
];

const STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "pending_review", label: "Aguardando revisão" },
  { value: "active", label: "Publicado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "archived", label: "Arquivado" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function minPrice(variants: Variant[]): number {
  const prices = variants.map((v) => Number(v.price)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function totalStock(variants: Variant[]): number {
  return variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
}

function emptyVariant(): VariantRow {
  return {
    _key: crypto.randomUUID(),
    weight_grams: 250,
    grind_option: "whole_bean",
    price: 0,
    compare_at_price: null,
    sku: null,
    stock_quantity: 0,
    is_default: false,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "products" | "categories" | "reviews";

function AdminProductsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [editing, setEditing] = useState<Product | null | "new">(null);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administração</p>
            <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Cafés</h1>
            <div className="brand-divider mt-3" />
          </div>
          {tab === "products" && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Novo café
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          {(
            [
              ["products", "Cafés"],
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
          {tab === "products" && <ProductsList onEdit={(p) => setEditing(p)} />}
          {tab === "categories" && <CategoriesPanel />}
          {tab === "reviews" && <ReviewsPanel />}
        </div>
      </div>

      {editing !== null && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminShell>
  );
}

// ── ProductsList ──────────────────────────────────────────────────────────────

function ProductsList({ onEdit }: { onEdit: (p: Product) => void }) {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          `id, name, slug, short_description, description, cover_url,
           roast_level, origin_region, origin_country, score, badges,
           is_featured, is_subscription_available, status, producer_id, created_at,
           producers(id, name),
           product_variants(id, price, compare_at_price, weight_grams, grind_option, stock_quantity, is_default, sku)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const duplicate = async (p: Product) => {
    const { product_variants, id: _id, created_at, ...rest } = p as any;
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        ...rest,
        name: `${p.name} (cópia)`,
        slug: `${p.slug}-copia-${Date.now().toString(36)}`,
        status: "draft",
        published_at: null,
      })
      .select("id")
      .single();
    if (error || !created) return toast.error(error?.message ?? "Erro ao duplicar");
    if (product_variants?.length) {
      await supabase.from("product_variants").insert(
        product_variants.map((v: any) => {
          const { id: _vid, created_at: _ca, updated_at: _ua, ...vrest } = v;
          return { ...vrest, product_id: created.id };
        }),
      );
    }
    toast.success("Café duplicado como rascunho");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const archive = async (id: string, name: string) => {
    if (!confirm(`Arquivar "${name}"? Ele deixará de aparecer no catálogo.`)) return;
    const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Arquivado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog-products"] });
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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Café</th>
                  <th className="px-4 py-3 text-left">Produtor</th>
                  <th className="px-4 py-3 text-left">SKUs</th>
                  <th className="px-4 py-3 text-left">Estoque</th>
                  <th className="px-4 py-3 text-right">Preço mín.</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(products ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.cover_url ? (
                          <img
                            src={p.cover_url}
                            alt={p.name}
                            className="h-10 w-10 flex-shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.producers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs">
                        {p.product_variants.length} SKU
                        {p.product_variants.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          totalStock(p.product_variants) === 0
                            ? "text-destructive"
                            : "text-foreground/70"
                        }`}
                      >
                        {totalStock(p.product_variants)} un.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {minPrice(p.product_variants) > 0
                        ? formatBRL(minPrice(p.product_variants))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : p.status === "archived"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-[var(--surface-soft)] text-muted-foreground"
                        }`}
                      >
                        {STATUSES.find((s) => s.value === p.status)?.label ?? p.status}
                      </span>
                    </td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => onEdit(p)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button
                        onClick={() => duplicate(p)}
                        className="text-xs font-semibold text-foreground/60 hover:underline"
                      >
                        Duplicar
                      </button>
                      {p.status !== "archived" && (
                        <button
                          onClick={() => archive(p.id, p.name)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          <Archive className="h-3 w-3" /> Arquivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(products ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum café encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── ProductForm ────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  slug: string;
  producer_id: string;
  short_description: string;
  description: string;
  roast_level: string;
  origin_region: string;
  origin_country: string;
  score: string;
  badges_raw: string;
  is_featured: boolean;
  is_subscription_available: boolean;
  status: string;
};

function initForm(product: Product | null): FormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    producer_id: product?.producer_id ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    roast_level: product?.roast_level ?? "",
    origin_region: product?.origin_region ?? "",
    origin_country: product?.origin_country ?? "Brasil",
    score: product?.score != null ? String(product.score) : "",
    badges_raw: (product?.badges ?? []).join(", "),
    is_featured: product?.is_featured ?? false,
    is_subscription_available: product?.is_subscription_available ?? false,
    status: product?.status ?? "draft",
  };
}

function initVariants(product: Product | null): VariantRow[] {
  if (!product || product.product_variants.length === 0) {
    return [{ ...emptyVariant(), is_default: true }];
  }
  return product.product_variants.map((v) => ({
    ...v,
    price: Number(v.price),
    compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
    _key: v.id ?? crypto.randomUUID(),
  }));
}

function ProductForm({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initForm(product));
  const [variants, setVariants] = useState<VariantRow[]>(() => initVariants(product));
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.cover_url ?? null,
  );
  const [saving, setSaving] = useState(false);

  const { data: producers } = useQuery({
    queryKey: ["admin-producers"],
    queryFn: async () => {
      const { data } = await supabase.from("producers").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = useCallback(
    (name: string) => {
      setForm((f) => ({ ...f, name, slug: product ? f.slug : slugify(name) }));
    },
    [product],
  );

  const addVariant = () => {
    const hasDefault = variants.some((v) => v.is_default);
    setVariants((vs) => [...vs, { ...emptyVariant(), is_default: !hasDefault }]);
  };

  const updateVariant = (key: string, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v) => (v._key === key ? { ...v, ...patch } : v)));

  const removeVariant = (key: string) => {
    const v = variants.find((v) => v._key === key);
    if (v?.id) setDeletedVariantIds((ids) => [...ids, v.id!]);
    setVariants((vs) => {
      const remaining = vs.filter((v) => v._key !== key);
      if (remaining.length > 0 && !remaining.some((v) => v.is_default)) {
        remaining[0].is_default = true;
      }
      return remaining;
    });
  };

  const setDefaultVariant = (key: string) =>
    setVariants((vs) => vs.map((v) => ({ ...v, is_default: v._key === key })));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    if (!form.slug.trim()) return toast.error("Slug é obrigatório");
    if (!form.producer_id) return toast.error("Selecione um produtor");
    if (variants.length === 0) return toast.error("Adicione ao menos uma variante");
    if (!variants.some((v) => Number(v.price) > 0))
      return toast.error("Ao menos uma variante precisa ter preço > 0");

    setSaving(true);
    const productId = product?.id ?? crypto.randomUUID();

    // 1. Upload image
    let coverUrl = product?.cover_url ?? null;
    if (imageFile) {
      const ext = (imageFile.name.split(".").pop() ?? "jpg").toLowerCase();
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(`${productId}/cover.${ext}`, imageFile, { upsert: true });
      if (uploadErr) {
        toast.error(`Erro no upload: ${uploadErr.message}`);
        setSaving(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(`${productId}/cover.${ext}`);
      coverUrl = publicUrl;
    }

    // 2. Upsert product
    const badges = form.badges_raw
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    const minPrice = Math.min(...variants.map((v) => Number(v.price) || 0).filter((n) => n > 0));
    const { error: productErr } = await supabase.from("products").upsert({
      price: minPrice,
      id: productId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      producer_id: form.producer_id,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      roast_level: (form.roast_level as any) || null,
      origin_region: form.origin_region.trim() || null,
      origin_country: form.origin_country.trim() || "Brasil",
      score: form.score ? Number(form.score) : null,
      badges: badges.length ? badges : null,
      is_featured: form.is_featured,
      is_subscription_available: form.is_subscription_available,
      status: form.status as any,
      cover_url: coverUrl,
      published_at: form.status === "active" ? new Date().toISOString() : null,
    });
    if (productErr) {
      toast.error(productErr.message);
      setSaving(false);
      return;
    }

    // 3. Delete removed variants (best-effort)
    for (const id of deletedVariantIds) {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error)
        toast.warning(
          `Variante ${id.slice(0, 8)}… não removida — tem pedidos vinculados.`,
        );
    }

    // 4. Upsert remaining variants
    for (const v of variants) {
      const { error } = await supabase.from("product_variants").upsert({
        ...(v.id ? { id: v.id } : {}),
        product_id: productId,
        weight_grams: Number(v.weight_grams),
        grind_option: v.grind_option as any,
        price: Number(v.price),
        compare_at_price:
          v.compare_at_price != null && Number(v.compare_at_price) > 0
            ? Number(v.compare_at_price)
            : null,
        sku: v.sku?.trim() || null,
        stock_quantity: Number(v.stock_quantity),
        is_default: v.is_default,
      });
      if (error) toast.error(`Erro ao salvar variante: ${error.message}`);
    }

    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog-products"] });
    toast.success(product ? "Produto atualizado" : "Produto criado");
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-3xl rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl text-primary">
            {product ? "Editar café" : "Novo café"}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 px-6 py-6">
          {/* Informações básicas */}
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Informações básicas
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground/70">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Serra da Mantiqueira Natural"
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">
                  Slug * (URL)
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  placeholder="sera-mantiqueira-natural"
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Produtor *</label>
                <select
                  value={form.producer_id}
                  onChange={(e) => setField("producer_id", e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {(producers ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground/70">
                  Descrição curta
                </label>
                <textarea
                  value={form.short_description}
                  onChange={(e) => setField("short_description", e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Torra</label>
                <select
                  value={form.roast_level}
                  onChange={(e) => setField("roast_level", e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {ROAST_LEVELS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">
                  Região de origem
                </label>
                <input
                  value={form.origin_region}
                  onChange={(e) => setField("origin_region", e.target.value)}
                  placeholder="Ex: Cerrado Mineiro"
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">País</label>
                <input
                  value={form.origin_country}
                  onChange={(e) => setField("origin_country", e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">
                  Pontuação SCA (0–100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.score}
                  onChange={(e) => setField("score", e.target.value)}
                  placeholder="87"
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground/70">
                  Badges (separados por vírgula)
                </label>
                <input
                  value={form.badges_raw}
                  onChange={(e) => setField("badges_raw", e.target.value)}
                  placeholder="Premiado, Orgânico, Biodinâmico"
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setField("is_featured", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-accent)]"
                  />
                  Destaque na home
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.is_subscription_available}
                    onChange={(e) => setField("is_subscription_available", e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-accent)]"
                  />
                  Disponível para assinatura
                </label>
              </div>
            </div>
          </section>

          {/* Imagem de capa */}
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Imagem de capa
            </p>
            <div className="flex items-start gap-4">
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[10px]">sem imagem</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--surface-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-accent/20"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG ou WEBP · Recomendado: 800 × 1000 px.
                </p>
              </div>
            </div>
          </section>

          {/* Variantes / SKUs */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variantes (SKUs)
              </p>
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-accent"
              >
                <Plus className="h-3 w-3" /> Adicionar variante
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Peso (g)</th>
                    <th className="px-3 py-2 text-left">Moagem</th>
                    <th className="px-3 py-2 text-left">Preço (R$) *</th>
                    <th className="px-3 py-2 text-left">De (R$)</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Estoque</th>
                    <th className="px-3 py-2 text-center">Padrão</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variants.map((v) => (
                    <tr key={v._key}>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={v.weight_grams}
                          onChange={(e) =>
                            updateVariant(v._key, { weight_grams: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-border bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={v.grind_option}
                          onChange={(e) =>
                            updateVariant(v._key, { grind_option: e.target.value })
                          }
                          className="w-36 rounded border border-border bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        >
                          {GRIND_OPTIONS.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={v.price || ""}
                          onChange={(e) =>
                            updateVariant(v._key, { price: Number(e.target.value) })
                          }
                          placeholder="0,00"
                          className="w-24 rounded border border-border bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={v.compare_at_price ?? ""}
                          onChange={(e) =>
                            updateVariant(v._key, {
                              compare_at_price: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          placeholder="—"
                          className="w-24 rounded border border-border bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={v.sku ?? ""}
                          onChange={(e) =>
                            updateVariant(v._key, { sku: e.target.value || null })
                          }
                          placeholder="CAF-001-GI"
                          className="w-28 rounded border border-border bg-card px-2 py-1 font-mono text-xs focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={v.stock_quantity}
                          onChange={(e) =>
                            updateVariant(v._key, {
                              stock_quantity: Number(e.target.value),
                            })
                          }
                          className="w-16 rounded border border-border bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="radio"
                          name="default_variant"
                          checked={v.is_default}
                          onChange={() => setDefaultVariant(v._key)}
                          className="h-4 w-4 accent-[var(--brand-accent)]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(v._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Variantes com pedidos vinculados não podem ser removidas — zere o estoque para
              desativá-las.
            </p>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium transition hover:border-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : product ? "Salvar alterações" : "Criar café"}
          </button>
        </div>
      </div>
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
