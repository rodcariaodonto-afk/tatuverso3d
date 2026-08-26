import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Plus, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVariantCosts, saveVariantCosts } from "@/lib/admin-costs.functions";
import { adminAdjustStock } from "@/lib/inventory-admin.functions";
import { PRODUCT_TYPE_LABEL, OPTION_TYPE_LABEL } from "@/hooks/useProducts";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { MoneyInput } from "@/components/admin/MoneyInput";


/* ── tipos ─────────────────────────────────────────────────────────────── */

type OptionValueRow = {
  id?: string;
  tempId: string;
  label: string;
  value: string;
  color_hex: string | null;
  price_adjustment: number;
  sort_order: number;
};

type OptionRow = {
  id?: string;
  tempId: string;
  name: string;
  option_type: string;
  is_required: boolean;
  sort_order: number;
  values: OptionValueRow[];
};

type VariantRow = {
  id?: string;
  tempId: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  dimensions_text: string;
  weight_grams: number | null;
  image_url: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  /** tempIds (ou ids) dos valores de opção que compõem a variação */
  valueRefs: string[];
};

type CustomFieldRow = {
  id?: string;
  tempId: string;
  label: string;
  field_type: string;
  placeholder: string;
  help_text: string;
  is_required: boolean;
  max_length: number | null;
  price_adjustment: number;
  options: string;
  sort_order: number;
};

type ImageRow = { id?: string; url: string; alt: string; sort_order: number };

type ProductFormProps = { productId?: string };

/* ── constantes ────────────────────────────────────────────────────────── */

const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABEL);
const OPTION_TYPES = Object.keys(OPTION_TYPE_LABEL);
const STATUSES = [
  { v: "draft", l: "Rascunho" },
  { v: "active", l: "Ativo" },
  { v: "archived", l: "Arquivado" },
];
const FIELD_TYPES = [
  { v: "short_text", l: "Texto curto" },
  { v: "long_text", l: "Texto longo" },
  { v: "number", l: "Número" },
  { v: "select", l: "Lista de opções" },
  { v: "color", l: "Cor" },
  { v: "file", l: "Upload de arquivo" },
];
const TABS = [
  { id: "basic", label: "Básico" },
  { id: "pricing", label: "Preço" },
  { id: "categories", label: "Categorias" },
  { id: "images", label: "Imagens" },
  { id: "variants", label: "Variações" },
  { id: "custom", label: "Personalização" },
  { id: "inventory", label: "Estoque" },
  { id: "seo", label: "SEO" },
] as const;

const uid = () => Math.random().toString(36).slice(2, 10);

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ── UI helpers ────────────────────────────────────────────────────────── */

const inputCls =
  "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Check({
  label, checked, onChange, hint,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--brand-accent)]"
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── componente ────────────────────────────────────────────────────────── */

export function ProductForm({ productId }: ProductFormProps) {
  const navigate = useNavigate();
  const isEdit = !!productId;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("basic");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "", slug: "", short_description: "", description: "",
    product_type: "decoration", status: "draft",
    price: 0, compare_at_price: null as number | null, sku: "",
    material_description: "", dimensions_text: "", color_notes: "", included_items: "",
    care_instructions: "", safety_notes: "", age_recommendation: "",
    weight_grams: null as number | null,
    production_time_days: 3,
    made_to_order: false, is_personalizable: false, is_sensory: false,
    is_featured: false,
    stock_quantity: 0, low_stock_threshold: 5, track_inventory: true, allow_backorder: false,
    cover_url: "", seo_title: "", seo_description: "", sort_order: 0,
  });

  const setField = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([]);
  const [movement, setMovement] = useState({ variantId: "", type: "in", quantity: 0, reason: "" });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories").select("id, name, parent_id").order("sort_order");
      return data ?? [];
    },
  });

  /* carregar produto existente */
  const { data: loaded, isLoading: loadingProduct } = useQuery({
    queryKey: ["admin-product-full", productId],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`*,
          product_images ( id, url, alt, sort_order ),
          product_categories ( category_id ),
          product_options ( id, name, option_type, is_required, sort_order,
            product_option_values ( id, label, value, color_hex, price_adjustment, sort_order ) ),
          product_variants ( id, name, sku, barcode, price, compare_at_price,
            stock_quantity, low_stock_threshold, dimensions_text, weight_grams, image_url,
            is_default, is_active, sort_order,
            variant_option_values ( option_value_id ) ),
          product_customization_fields ( id, label, field_type, placeholder, help_text,
            is_required, max_length, price_adjustment, options, sort_order )`)
        .eq("id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  /* preço de custo: somente admin, via server function protegida */
  const fetchVariantCosts = useServerFn(getVariantCosts);
  const persistVariantCosts = useServerFn(saveVariantCosts);
  const adjustStockFn = useServerFn(adminAdjustStock);
  const { data: variantCosts } = useQuery({
    queryKey: ["admin-variant-costs", productId],
    enabled: isEdit,
    queryFn: () => fetchVariantCosts({ data: { product_id: productId! } }),
  });

  useEffect(() => {
    if (!loaded) return;
    const p: any = loaded;
    setForm({
      name: p.name ?? "", slug: p.slug ?? "", short_description: p.short_description ?? "",
      description: p.description ?? "", product_type: p.product_type ?? "decoration",
      status: p.status ?? "draft", price: Number(p.price ?? 0),
      compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
      sku: p.sku ?? "", material_description: p.material_description ?? "",
      dimensions_text: p.dimensions_text ?? "", color_notes: p.color_notes ?? "",
      included_items: p.included_items ?? "", care_instructions: p.care_instructions ?? "",
      safety_notes: p.safety_notes ?? "", age_recommendation: p.age_recommendation ?? "",
      weight_grams: p.weight_grams ?? null, production_time_days: p.production_time_days ?? 3,
      made_to_order: !!p.made_to_order, is_personalizable: !!p.is_personalizable,
      is_sensory: !!p.is_sensory, is_featured: !!p.is_featured,
      stock_quantity: p.stock_quantity ?? 0, low_stock_threshold: p.low_stock_threshold ?? 5,
      track_inventory: p.track_inventory ?? true, allow_backorder: !!p.allow_backorder,
      cover_url: p.cover_url ?? "", seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "", sort_order: p.sort_order ?? 0,
    });
    setCategoryIds((p.product_categories ?? []).map((c: any) => c.category_id));
    setImages(
      (p.product_images ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((i: any) => ({ id: i.id, url: i.url, alt: i.alt ?? "", sort_order: i.sort_order ?? 0 })),
    );
    setOptions(
      (p.product_options ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((o: any) => ({
          id: o.id, tempId: o.id, name: o.name, option_type: o.option_type,
          is_required: o.is_required, sort_order: o.sort_order,
          values: (o.product_option_values ?? [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((v: any) => ({
              id: v.id, tempId: v.id, label: v.label, value: v.value,
              color_hex: v.color_hex, price_adjustment: Number(v.price_adjustment ?? 0),
              sort_order: v.sort_order,
            })),
        })),
    );
    setVariants(
      (p.product_variants ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((v: any) => ({
          id: v.id, tempId: v.id, name: v.name ?? "", sku: v.sku ?? "", barcode: v.barcode ?? "",
          price: Number(v.price ?? 0),
          compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
          cost_price: null,
          stock_quantity: v.stock_quantity ?? 0, low_stock_threshold: v.low_stock_threshold ?? 5,
          dimensions_text: v.dimensions_text ?? "", weight_grams: v.weight_grams ?? null,
          image_url: v.image_url ?? null, is_default: !!v.is_default, is_active: v.is_active !== false,
          sort_order: v.sort_order ?? 0,
          valueRefs: (v.variant_option_values ?? []).map((x: any) => x.option_value_id),
        })),
    );
    setCustomFields(
      (p.product_customization_fields ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((f: any) => ({
          id: f.id, tempId: f.id, label: f.label, field_type: f.field_type,
          placeholder: f.placeholder ?? "", help_text: f.help_text ?? "",
          is_required: !!f.is_required, max_length: f.max_length,
          price_adjustment: Number(f.price_adjustment ?? 0),
          options: Array.isArray(f.options) ? f.options.map((o: any) => o.label ?? o).join(", ") : "",
          sort_order: f.sort_order ?? 0,
        })),
    );
  }, [loaded]);

  /* injeta os custos carregados pela server function admin */
  useEffect(() => {
    if (!variantCosts) return;
    setVariants((prev) =>
      prev.map((v) => (v.id && v.id in variantCosts ? { ...v, cost_price: variantCosts[v.id] ?? null } : v)),
    );
  }, [variantCosts]);

  const allValues = useMemo(
    () => options.flatMap((o) => o.values.map((v) => ({ ...v, optionName: o.name }))),
    [options],
  );

  /* ── uploads ─────────────────────────────────────────────────────────── */

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const path = `products/${Date.now()}-${slugify(file.name)}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast.error("Falha no upload", { description: e.message });
      return null;
    } finally {
      setUploading(false);
    }
  };

  /* ── variações ───────────────────────────────────────────────────────── */

  const addVariant = () =>
    setVariants((vs) => [
      ...vs,
      {
        tempId: uid(), name: "", sku: "", barcode: "", price: form.price,
        compare_at_price: null, cost_price: null, stock_quantity: 0,
        low_stock_threshold: 5, dimensions_text: "", weight_grams: null, image_url: null,
        is_default: vs.length === 0, is_active: true, sort_order: vs.length, valueRefs: [],
      },
    ]);

  const generateVariants = () => {
    const groups = options.filter((o) => o.values.length > 0);
    if (groups.length === 0) return toast.error("Cadastre opções com valores primeiro");
    let combos: OptionValueRow[][] = [[]];
    for (const g of groups) combos = combos.flatMap((c) => g.values.map((v) => [...c, v]));
    if (combos.length > 60) return toast.error("Combinações demais (máx. 60)");
    const existing = new Set(variants.map((v) => [...v.valueRefs].sort().join("|")));
    const added: VariantRow[] = [];
    combos.forEach((combo, idx) => {
      const key = combo.map((c) => c.tempId).sort().join("|");
      if (existing.has(key)) return;
      const adj = combo.reduce((s, c) => s + Number(c.price_adjustment ?? 0), 0);
      added.push({
        tempId: uid(), name: combo.map((c) => c.label).join(" / "), sku: "", barcode: "",
        price: Number((form.price + adj).toFixed(2)), compare_at_price: null, cost_price: null,
        stock_quantity: 0, low_stock_threshold: 5, dimensions_text: "", weight_grams: null,
        image_url: null, is_default: variants.length === 0 && idx === 0, is_active: true,
        sort_order: variants.length + idx, valueRefs: combo.map((c) => c.tempId),
      });
    });
    if (added.length === 0) return toast.info("Nenhuma combinação nova");
    setVariants((vs) => [...vs, ...added]);
    toast.success(`${added.length} variações geradas`);
  };

  const patchVariant = (tempId: string, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)));

  /* ── salvar ──────────────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Informe o nome do produto");
    if (form.price <= 0) return toast.error("Informe um preço maior que zero");
    if (variants.length > 0 && !variants.some((v) => v.is_default))
      return toast.error("Marque uma variação como padrão");
    if (variants.length > 1) {
      const keys = variants.map((v) => [...v.valueRefs].sort().join("|"));
      const dup = keys.some((k, i) => k && keys.indexOf(k) !== i);
      if (dup) return toast.error("Existem variações com a mesma combinação de opções");
      const unnamed = variants.filter((v) => !v.valueRefs.length && !v.name.trim());
      if (unnamed.length)
        return toast.error("Dê um nome a cada variação (ex.: Kit com 4, Kit com 8)");
    }


    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name);
      const payload: any = {
        ...form,
        slug,
        price: Number(form.price),
        compare_at_price: form.compare_at_price,
        sku: form.sku || null,
        published_at: form.status === "active" ? new Date().toISOString() : null,
      };

      let pid = productId;
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", pid!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        pid = data.id;
      }

      /* categorias */
      await supabase.from("product_categories").delete().eq("product_id", pid!);
      if (categoryIds.length)
        await supabase.from("product_categories").insert(
          categoryIds.map((c) => ({ product_id: pid!, category_id: c })),
        );

      /* imagens */
      await supabase.from("product_images").delete().eq("product_id", pid!);
      if (images.length)
        await supabase.from("product_images").insert(
          images.map((i, idx) => ({ product_id: pid!, url: i.url, alt: i.alt || form.name, sort_order: idx })),
        );

      /* opções + valores (recria e mapeia tempId → id real) */
      const valueIdMap = new Map<string, string>();
      await supabase.from("product_options").delete().eq("product_id", pid!);
      for (const [oi, o] of options.entries()) {
        if (!o.name.trim()) continue;
        const { data: optRow, error: optErr } = await supabase
          .from("product_options")
          .insert({
            product_id: pid!, name: o.name, option_type: o.option_type as any,
            is_required: o.is_required, sort_order: oi,
          })
          .select("id").single();
        if (optErr) throw optErr;
        for (const [vi, v] of o.values.entries()) {
          if (!v.label.trim()) continue;
          const { data: valRow, error: valErr } = await supabase
            .from("product_option_values")
            .insert({
              option_id: optRow.id, label: v.label, value: v.value || slugify(v.label),
              color_hex: v.color_hex, price_adjustment: v.price_adjustment, sort_order: vi,
            })
            .select("id").single();
          if (valErr) throw valErr;
          valueIdMap.set(v.tempId, valRow.id);
        }
      }

      /* variações */
      const keptIds = variants.filter((v) => v.id).map((v) => v.id!);
      const { data: existingVariants } = await supabase
        .from("product_variants").select("id").eq("product_id", pid!);
      const toDelete = (existingVariants ?? []).map((v) => v.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length) await supabase.from("product_variants").delete().in("id", toDelete);

      const costUpdates: Array<{ variant_id: string; cost_price: number | null }> = [];
      for (const [idx, v] of variants.entries()) {
        const vPayload = {
          product_id: pid!, name: v.name || null, sku: v.sku || null, barcode: v.barcode || null,
          price: Number(v.price), compare_at_price: v.compare_at_price,
          stock_quantity: v.stock_quantity, low_stock_threshold: v.low_stock_threshold,
          dimensions_text: v.dimensions_text || null, weight_grams: v.weight_grams,
          image_url: v.image_url, is_default: v.is_default, is_active: v.is_active, sort_order: idx,
        };
        let variantId = v.id;
        if (variantId) {
          const { error } = await supabase.from("product_variants").update(vPayload).eq("id", variantId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("product_variants").insert(vPayload).select("id").single();
          if (error) throw error;
          variantId = data.id;
        }
        if (variantId) costUpdates.push({ variant_id: variantId, cost_price: v.cost_price });
        await supabase.from("variant_option_values").delete().eq("variant_id", variantId!);
        const refs = v.valueRefs.map((r) => valueIdMap.get(r) ?? null).filter(Boolean) as string[];
        if (refs.length)
          await supabase.from("variant_option_values").insert(
            refs.map((option_value_id) => ({ variant_id: variantId!, option_value_id })),
          );
      }

      /* preço de custo gravado apenas pela server function protegida */
      if (costUpdates.length) {
        await persistVariantCosts({ data: { items: costUpdates } });
      }

      /* campos de personalização */
      await supabase.from("product_customization_fields").delete().eq("product_id", pid!);
      const activeFields = customFields.filter((f) => f.label.trim());
      if (activeFields.length)
        await supabase.from("product_customization_fields").insert(
          activeFields.map((f, idx) => ({
            product_id: pid!, label: f.label, field_type: f.field_type as any,
            placeholder: f.placeholder || null, help_text: f.help_text || null,
            is_required: f.is_required, max_length: f.max_length,
            price_adjustment: f.price_adjustment,
            options: f.options
              ? f.options.split(",").map((o) => ({ label: o.trim(), value: slugify(o.trim()) }))
              : [],
            sort_order: idx,
          })),
        );

      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      navigate({ to: "/admin/produtos" });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ── movimentação de estoque ─────────────────────────────────────────── */

  const registerMovement = async () => {
    if (!movement.variantId || !movement.quantity)
      return toast.error("Escolha a variação e a quantidade");
    if ((movement.reason ?? "").trim().length < 3)
      return toast.error("Informe o motivo do ajuste (mínimo 3 caracteres)");
    const variant = variants.find((v) => v.id === movement.variantId);
    if (!variant?.id || !productId) return;
    try {
      // Escrita de estoque acontece somente no servidor, com auditoria.
      const result = await adjustStockFn({
        data: {
          product_id: productId,
          variant_id: variant.id,
          movement_type: movement.type as "in" | "out" | "adjust",
          quantity: Math.abs(movement.quantity),
          reason: movement.reason,
        },
      });
      patchVariant(variant.tempId, { stock_quantity: result.resulting });
      setMovement({ variantId: "", type: "in", quantity: 0, reason: "" });
      toast.success(`Movimentação registrada (${result.previous} → ${result.resulting})`);
    } catch (err: any) {
      toast.error("Erro ao registrar", { description: err?.message });
    }
  };

  if (isEdit && loadingProduct)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando produto...
      </div>
    );

  /* ── render ──────────────────────────────────────────────────────────── */

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* BÁSICO */}
      {tab === "basic" && (
        <div className="space-y-6">
          <SectionCard title="Informações principais">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome *">
                <input
                  className={inputCls} value={form.name}
                  onChange={(e) => {
                    setField("name", e.target.value);
                    if (!isEdit) setField("slug", slugify(e.target.value));
                  }}
                />
              </Field>
              <Field label="Slug">
                <input className={inputCls} value={form.slug} onChange={(e) => setField("slug", e.target.value)} />
              </Field>
              <Field label="Tipo de produto">
                <select className={inputCls} value={form.product_type} onChange={(e) => setField("product_type", e.target.value)}>
                  {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Descrição curta">
                  <input className={inputCls} value={form.short_description} onChange={(e) => setField("short_description", e.target.value)} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Descrição completa">
                  <textarea rows={5} className={inputCls} value={form.description} onChange={(e) => setField("description", e.target.value)} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ficha técnica 3D">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Material (ex.: PLA, PETG)">
                <input className={inputCls} value={form.material_description} onChange={(e) => setField("material_description", e.target.value)} />
              </Field>
              <Field label="Dimensões">
                <input className={inputCls} placeholder="10 x 6 x 4 cm" value={form.dimensions_text} onChange={(e) => setField("dimensions_text", e.target.value)} />
              </Field>
              <Field label="Peso (g)">
                <input type="number" className={inputCls} value={form.weight_grams ?? ""} onChange={(e) => setField("weight_grams", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Prazo de produção (dias)">
                <input type="number" className={inputCls} value={form.production_time_days} onChange={(e) => setField("production_time_days", Number(e.target.value))} />
              </Field>
              <Field label="Cores disponíveis (nota)">
                <input className={inputCls} value={form.color_notes} onChange={(e) => setField("color_notes", e.target.value)} />
              </Field>
              <Field label="Itens inclusos">
                <input className={inputCls} value={form.included_items} onChange={(e) => setField("included_items", e.target.value)} />
              </Field>
              <Field label="Indicação de idade">
                <input className={inputCls} placeholder="A partir de 3 anos" value={form.age_recommendation} onChange={(e) => setField("age_recommendation", e.target.value)} />
              </Field>
              <Field label="Cuidados">
                <input className={inputCls} value={form.care_instructions} onChange={(e) => setField("care_instructions", e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Avisos de segurança">
                  <textarea rows={2} className={inputCls} value={form.safety_notes} onChange={(e) => setField("safety_notes", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Check label="Produto sensorial" checked={form.is_sensory} onChange={(v) => setField("is_sensory", v)} />
              <Check label="Destaque na home" checked={form.is_featured} onChange={(v) => setField("is_featured", v)} />
              <Check label="Sob encomenda" hint="Produzido após a compra" checked={form.made_to_order} onChange={(v) => setField("made_to_order", v)} />
              <Check label="Personalizável" hint="Habilita a aba Personalização" checked={form.is_personalizable} onChange={(v) => setField("is_personalizable", v)} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* PREÇO */}
      {tab === "pricing" && (
        <SectionCard title="Preço base">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Preço (R$) *">
              <MoneyInput className={inputCls} value={form.price} onChange={(v) => setField("price", v ?? 0)} />
            </Field>
            <Field label="Preço comparativo (R$)">
              <MoneyInput className={inputCls} allowEmpty value={form.compare_at_price} onChange={(v) => setField("compare_at_price", v)} />
            </Field>

            <Field label="SKU base">
              <input className={inputCls} value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
            </Field>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Quando houver variações, o preço exibido na loja vem da variação selecionada.
          </p>
        </SectionCard>
      )}

      {/* CATEGORIAS */}
      {tab === "categories" && (
        <SectionCard title="Categorias">
          <div className="grid gap-2 sm:grid-cols-2">
            {(categories ?? []).map((c: any) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={categoryIds.includes(c.id)}
                  onChange={() =>
                    setCategoryIds((ids) => ids.includes(c.id) ? ids.filter((i) => i !== c.id) : [...ids, c.id])
                  }
                  className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]"
                />
                {c.parent_id ? `— ${c.name}` : c.name}
              </label>
            ))}
          </div>
        </SectionCard>
      )}

      {/* IMAGENS */}
      {tab === "images" && (
        <div className="space-y-6">
          <SectionCard title="Imagem de capa">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {form.cover_url && (
                <img src={form.cover_url} alt="Capa" className="h-28 w-28 shrink-0 rounded-md border border-border object-cover" />
              )}
              <div className="flex-1">
                <ImageDropzone
                  busy={uploading}
                  enablePaste={!form.cover_url}
                  label="Arraste a capa aqui"
                  onFiles={async (files: File[]) => {
                    const url = await uploadImage(files[0]);
                    if (url) setField("cover_url", url);
                  }}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Galeria">
            <div className="mb-4">
              <ImageDropzone
                multiple
                busy={uploading}
                label="Arraste as imagens aqui"
                hint="ou cole com Ctrl+V • ou clique para escolher (várias de uma vez)"
                enablePaste={!!form.cover_url}
                onFiles={async (files: File[]) => {
                  for (const f of files) {
                    const url = await uploadImage(f);
                    if (url) setImages((im) => [...im, { url, alt: form.name, sort_order: im.length }]);
                  }
                }}
              />
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma imagem adicional.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img, idx) => (
                  <div key={img.url + idx} className="rounded-md border border-border p-2">
                    <img src={img.url} alt={img.alt} className="aspect-square w-full rounded object-cover" />
                    <input
                      className="mt-2 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                      placeholder="Texto alternativo" value={img.alt}
                      onChange={(e) => setImages((im) => im.map((x, i) => i === idx ? { ...x, alt: e.target.value } : x))}
                    />
                    <button
                      type="button" onClick={() => setImages((im) => im.filter((_, i) => i !== idx))}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* VARIAÇÕES */}
      {tab === "variants" && (
        <div className="space-y-6">
          <SectionCard
            title="Opções (cor, tamanho, material…)"
            action={
              <button
                type="button"
                onClick={() =>
                  setOptions((os) => [...os, {
                    tempId: uid(), name: "", option_type: "color", is_required: true,
                    sort_order: os.length, values: [],
                  }])
                }
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent"
              >
                <Plus className="h-3 w-3" /> Nova opção
              </button>
            }
          >
            {options.length === 0 && <p className="text-sm text-muted-foreground">Sem opções cadastradas.</p>}
            <div className="space-y-4">
              {options.map((o) => (
                <div key={o.tempId} className="rounded-md border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Field label="Nome da opção">
                      <input
                        className={inputCls} value={o.name} placeholder="Cor"
                        onChange={(e) => setOptions((os) => os.map((x) => x.tempId === o.tempId ? { ...x, name: e.target.value } : x))}
                      />
                    </Field>
                    <Field label="Tipo">
                      <select
                        className={inputCls} value={o.option_type}
                        onChange={(e) => setOptions((os) => os.map((x) => x.tempId === o.tempId ? { ...x, option_type: e.target.value } : x))}
                      >
                        {OPTION_TYPES.map((t) => <option key={t} value={t}>{OPTION_TYPE_LABEL[t]}</option>)}
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={() => setOptions((os) => os.filter((x) => x.tempId !== o.tempId))}
                      className="self-end rounded-md p-2 text-destructive hover:bg-destructive/10"
                      aria-label="Remover opção"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {o.values.map((v) => (
                      <div key={v.tempId} className="flex flex-wrap items-center gap-2">
                        <input
                          className="flex-1 min-w-[140px] rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                          placeholder="Rótulo (Azul Cósmico)" value={v.label}
                          onChange={(e) => setOptions((os) => os.map((x) => x.tempId === o.tempId
                            ? { ...x, values: x.values.map((y) => y.tempId === v.tempId ? { ...y, label: e.target.value } : y) } : x))}
                        />
                        {o.option_type === "color" && (
                          <input
                            type="color" value={v.color_hex ?? "#1b2a6b"}
                            className="h-9 w-12 rounded border border-border bg-card"
                            onChange={(e) => setOptions((os) => os.map((x) => x.tempId === o.tempId
                              ? { ...x, values: x.values.map((y) => y.tempId === v.tempId ? { ...y, color_hex: e.target.value } : y) } : x))}
                          />
                        )}
                        <MoneyInput
                          placeholder="+ R$" value={v.price_adjustment}
                          className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                          onChange={(nv) => setOptions((os) => os.map((x) => x.tempId === o.tempId
                            ? { ...x, values: x.values.map((y) => y.tempId === v.tempId ? { ...y, price_adjustment: nv ?? 0 } : y) } : x))}
                        />

                        <button
                          type="button"
                          onClick={() => setOptions((os) => os.map((x) => x.tempId === o.tempId
                            ? { ...x, values: x.values.filter((y) => y.tempId !== v.tempId) } : x))}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          aria-label="Remover valor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOptions((os) => os.map((x) => x.tempId === o.tempId
                        ? { ...x, values: [...x.values, { tempId: uid(), label: "", value: "", color_hex: x.option_type === "color" ? "#1b2a6b" : null, price_adjustment: 0, sort_order: x.values.length }] }
                        : x))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
                    >
                      <Plus className="h-3 w-3" /> Adicionar valor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Variações"
            action={
              <div className="flex gap-2">
                <button type="button" onClick={generateVariants} className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent">
                  Gerar combinações
                </button>
                <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent">
                  <Plus className="h-3 w-3" /> Manual
                </button>
              </div>
            }
          >
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem variações — a loja usará o preço e estoque base do produto.
              </p>
            ) : (
              <div className="space-y-4">
                {variants.map((v) => (
                  <div key={v.tempId} className="rounded-md border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="Nome">
                        <input className={inputCls} value={v.name} onChange={(e) => patchVariant(v.tempId, { name: e.target.value })} />
                      </Field>
                      <Field label="SKU">
                        <input className={inputCls} value={v.sku} onChange={(e) => patchVariant(v.tempId, { sku: e.target.value })} />
                      </Field>
                      <Field label="Preço (R$)">
                        <MoneyInput className={inputCls} value={v.price} onChange={(nv) => patchVariant(v.tempId, { price: nv ?? 0 })} />
                      </Field>
                      <Field label="Estoque">
                        <input type="number" className={inputCls} value={v.stock_quantity} onChange={(e) => patchVariant(v.tempId, { stock_quantity: Number(e.target.value) })} />
                      </Field>
                      <Field label="Custo (R$)">
                        <MoneyInput className={inputCls} allowEmpty value={v.cost_price} onChange={(nv) => patchVariant(v.tempId, { cost_price: nv })} />
                      </Field>
                      <Field label="Alerta de estoque">
                        <input type="number" className={inputCls} value={v.low_stock_threshold} onChange={(e) => patchVariant(v.tempId, { low_stock_threshold: Number(e.target.value) })} />
                      </Field>
                      <Field label="Código de barras">
                        <input className={inputCls} value={v.barcode} onChange={(e) => patchVariant(v.tempId, { barcode: e.target.value })} />
                      </Field>
                      <Field label="Dimensões">
                        <input className={inputCls} value={v.dimensions_text} onChange={(e) => patchVariant(v.tempId, { dimensions_text: e.target.value })} />
                      </Field>
                    </div>

                    {allValues.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {allValues.map((av) => {
                          const on = v.valueRefs.includes(av.tempId);
                          return (
                            <button
                              key={av.tempId} type="button"
                              onClick={() => patchVariant(v.tempId, {
                                valueRefs: on ? v.valueRefs.filter((r) => r !== av.tempId) : [...v.valueRefs, av.tempId],
                              })}
                              className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                            >
                              {av.optionName}: {av.label || "—"}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <Check label="Padrão" checked={v.is_default}
                        onChange={() => setVariants((vs) => vs.map((x) => ({ ...x, is_default: x.tempId === v.tempId })))} />
                      <Check label="Ativa" checked={v.is_active} onChange={(c) => patchVariant(v.tempId, { is_active: c })} />
                      <button
                        type="button" onClick={() => setVariants((vs) => vs.filter((x) => x.tempId !== v.tempId))}
                        className="ml-auto inline-flex items-center gap-1 text-xs text-destructive"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* PERSONALIZAÇÃO */}
      {tab === "custom" && (
        <SectionCard
          title="Campos de personalização"
          action={
            <button
              type="button"
              onClick={() => setCustomFields((fs) => [...fs, {
                tempId: uid(), label: "", field_type: "short_text", placeholder: "", help_text: "",
                is_required: false, max_length: 40, price_adjustment: 0, options: "", sort_order: fs.length,
              }])}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent"
            >
              <Plus className="h-3 w-3" /> Novo campo
            </button>
          }
        >
          {!form.is_personalizable && (
            <p className="mb-4 rounded-md border border-accent/40 bg-accent/10 p-3 text-xs">
              Marque "Personalizável" na aba Básico para exibir estes campos na loja.
            </p>
          )}
          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum campo cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {customFields.map((f) => (
                <div key={f.tempId} className="rounded-md border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Rótulo">
                      <input className={inputCls} value={f.label} placeholder="Nome gravado"
                        onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, label: e.target.value } : x))} />
                    </Field>
                    <Field label="Tipo">
                      <select className={inputCls} value={f.field_type}
                        onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, field_type: e.target.value } : x))}>
                        {FIELD_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                    </Field>
                    <Field label="Acréscimo (R$)">
                      <MoneyInput className={inputCls} value={f.price_adjustment}
                        onChange={(nv) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, price_adjustment: nv ?? 0 } : x))} />

                    </Field>
                    <Field label="Placeholder">
                      <input className={inputCls} value={f.placeholder}
                        onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, placeholder: e.target.value } : x))} />
                    </Field>
                    <Field label="Limite de caracteres">
                      <input type="number" className={inputCls} value={f.max_length ?? ""}
                        onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, max_length: e.target.value ? Number(e.target.value) : null } : x))} />
                    </Field>
                    <Field label="Texto de ajuda">
                      <input className={inputCls} value={f.help_text}
                        onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, help_text: e.target.value } : x))} />
                    </Field>
                    {f.field_type === "select" && (
                      <div className="md:col-span-3">
                        <Field label="Opções (separadas por vírgula)">
                          <input className={inputCls} value={f.options}
                            onChange={(e) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, options: e.target.value } : x))} />
                        </Field>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <Check label="Obrigatório" checked={f.is_required}
                      onChange={(c) => setCustomFields((fs) => fs.map((x) => x.tempId === f.tempId ? { ...x, is_required: c } : x))} />
                    <button type="button" onClick={() => setCustomFields((fs) => fs.filter((x) => x.tempId !== f.tempId))}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-destructive">
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ESTOQUE */}
      {tab === "inventory" && (
        <div className="space-y-6">
          <SectionCard title="Controle de estoque">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Estoque base">
                <input type="number" className={inputCls} value={form.stock_quantity} onChange={(e) => setField("stock_quantity", Number(e.target.value))} />
              </Field>
              <Field label="Alerta de estoque baixo">
                <input type="number" className={inputCls} value={form.low_stock_threshold} onChange={(e) => setField("low_stock_threshold", Number(e.target.value))} />
              </Field>
              <Field label="Ordem de exibição">
                <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setField("sort_order", Number(e.target.value))} />
              </Field>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Check label="Controlar estoque" checked={form.track_inventory} onChange={(v) => setField("track_inventory", v)} />
              <Check label="Permitir venda sem estoque" checked={form.allow_backorder} onChange={(v) => setField("allow_backorder", v)} />
            </div>
          </SectionCard>

          {isEdit && variants.some((v) => v.id) && (
            <SectionCard title="Registrar movimentação">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Variação">
                  <select className={inputCls} value={movement.variantId} onChange={(e) => setMovement((m) => ({ ...m, variantId: e.target.value }))}>
                    <option value="">Selecione</option>
                    {variants.filter((v) => v.id).map((v) => (
                      <option key={v.id} value={v.id}>{v.name || v.sku || "Variação"} ({v.stock_quantity})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select className={inputCls} value={movement.type} onChange={(e) => setMovement((m) => ({ ...m, type: e.target.value }))}>
                    <option value="in">Entrada</option>
                    <option value="out">Saída</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </Field>
                <Field label="Quantidade">
                  <input type="number" className={inputCls} value={movement.quantity} onChange={(e) => setMovement((m) => ({ ...m, quantity: Number(e.target.value) }))} />
                </Field>
                <Field label="Motivo">
                  <input className={inputCls} value={movement.reason} onChange={(e) => setMovement((m) => ({ ...m, reason: e.target.value }))} />
                </Field>
              </div>
              <button type="button" onClick={registerMovement}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                Registrar
              </button>
            </SectionCard>
          )}
        </div>
      )}

      {/* SEO */}
      {tab === "seo" && (
        <SectionCard title="SEO">
          <div className="space-y-4">
            <Field label="Título SEO">
              <input className={inputCls} value={form.seo_title} maxLength={70} onChange={(e) => setField("seo_title", e.target.value)} />
            </Field>
            <Field label="Descrição SEO">
              <textarea rows={3} maxLength={165} className={inputCls} value={form.seo_description} onChange={(e) => setField("seo_description", e.target.value)} />
            </Field>
            <p className="text-xs text-muted-foreground">URL: /produto/{form.slug || slugify(form.name) || "slug"}</p>
          </div>
        </SectionCard>
      )}

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <button
          type="submit" disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
        </button>
        <button
          type="button" onClick={() => navigate({ to: "/admin/produtos" })}
          className="rounded-full border border-border px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
