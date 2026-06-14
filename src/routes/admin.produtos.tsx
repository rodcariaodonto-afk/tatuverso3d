import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Archive,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { useAdminRoles } from "./admin";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin · Cafezeira" }] }),
  component: AdminProdutos,
});

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

const ROAST_LABELS: Record<string, string> = {
  light: "Clara",
  medium_light: "Média-clara",
  medium: "Média",
  medium_dark: "Média-escura",
  dark: "Escura",
};

const ROAST_LEVELS = Object.entries(ROAST_LABELS).map(([value, label]) => ({ value, label }));

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function minPrice(p: Product): number {
  const prices = p.product_variants
    .map((v) => Number(v.price))
    .filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function totalStock(p: Product): number {
  return p.product_variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
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

// ── Main page ─────────────────────────────────────────────────────────────────

function AdminProdutos() {
  const qc = useQueryClient();
  const { data: roles } = useAdminRoles();
  const isAdmin =
    roles?.includes("admin" as any) || roles?.includes("support" as any);

  const [editing, setEditing] = useState<Product | null | "new">(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id, name, slug, short_description, description, cover_url,
           roast_level, origin_region, origin_country, score, badges,
           is_featured, is_subscription_available, status, producer_id, created_at,
           producers(id, name),
           product_variants(id, price, compare_at_price, weight_grams, grind_option, stock_quantity, is_default, sku)`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const archiveProduct = async (id: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto arquivado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-1 font-display text-3xl text-primary">Cafés</h1>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Novo café
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
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
                  <th className="px-4 py-3 text-right">Ações</th>
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
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
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
                      <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">
                        {p.product_variants.length} SKU
                        {p.product_variants.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          totalStock(p) === 0 ? "text-destructive" : "text-foreground/70"
                        }`}
                      >
                        {totalStock(p)} un.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {minPrice(p) > 0 ? formatBRL(minPrice(p)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : p.status === "archived"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-[var(--sand)] text-muted-foreground"
                        }`}
                      >
                        {STATUSES.find((s) => s.value === p.status)?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="mr-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      {p.status !== "archived" && (
                        <button
                          onClick={() => archiveProduct(p.id)}
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
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum produto cadastrado. Clique em &ldquo;Novo café&rdquo; para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
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
      const { data } = await supabase
        .from("producers")
        .select("id, name")
        .order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = useCallback(
    (name: string) => {
      setForm((f) => ({
        ...f,
        name,
        slug: product ? f.slug : slugify(name),
      }));
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
      return toast.error("Ao menos uma variante precisa ter preço maior que zero");

    setSaving(true);

    const productId = product?.id ?? crypto.randomUUID();

    // 1. Upload image if a new file was selected
    let coverUrl = product?.cover_url ?? null;
    if (imageFile) {
      const ext = (imageFile.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${productId}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { upsert: true });
      if (uploadErr) {
        toast.error(`Erro no upload da imagem: ${uploadErr.message}`);
        setSaving(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      coverUrl = publicUrl;
    }

    // 2. Upsert product row
    const badges = form.badges_raw
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    const { error: productErr } = await supabase.from("products").upsert({
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

    // 3. Delete removed variants (best-effort: fails silently if FK prevents it)
    for (const id of deletedVariantIds) {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", id);
      if (error) {
        toast.warning(
          `Variante ${id.slice(0, 8)}… não removida — tem pedidos vinculados. Zere o estoque para desativá-la.`,
        );
      }
    }

    // 4. Upsert all remaining variants
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

    // 5. Refresh queries
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog-products"] });

    toast.success(product ? "Produto atualizado" : "Produto criado com sucesso");
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl text-primary">
            {product ? "Editar café" : "Novo café"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-8 px-6 py-6">
          {/* ── Informações básicas ── */}
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Informações básicas
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground/70">
                  Nome *
                </label>
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
                <label className="block text-xs font-medium text-foreground/70">
                  Produtor *
                </label>
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
                  placeholder="Uma frase sobre o café..."
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/70">
                  Torra
                </label>
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
                <label className="block text-xs font-medium text-foreground/70">
                  País
                </label>
                <input
                  value={form.origin_country}
                  onChange={(e) => setField("origin_country", e.target.value)}
                  placeholder="Brasil"
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
                <label className="block text-xs font-medium text-foreground/70">
                  Status
                </label>
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
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  Destaque na home
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.is_subscription_available}
                    onChange={(e) =>
                      setField("is_subscription_available", e.target.checked)
                    }
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  Disponível para assinatura
                </label>
              </div>
            </div>
          </section>

          {/* ── Imagem de capa ── */}
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
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--sand)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-accent/20"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG ou WEBP · Recomendado: 800 × 1000 px.
                </p>
                {product?.cover_url && !imageFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Imagem atual mantida se nenhuma nova for selecionada.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Variantes / SKUs ── */}
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
                            updateVariant(v._key, {
                              weight_grams: Number(e.target.value),
                            })
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
                          className="h-4 w-4 accent-[var(--gold)]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(v._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remover variante"
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
              O botão &ldquo;Padrão&rdquo; define qual variante é exibida primeiro no catálogo.
              Variantes com pedidos vinculados não podem ser removidas — zere o estoque para desativá-las.
            </p>
          </section>
        </div>

        {/* Footer */}
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
