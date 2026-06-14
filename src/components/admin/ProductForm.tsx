import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Variant = {
  id?: string;
  weight_grams: number;
  grind_option: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_default: boolean;
  sku?: string | null;
};

type ProductFormProps = {
  productId?: string;
  producerId: string;
};

const GRINDS = ["whole_bean", "espresso", "filter", "moka", "french_press", "aeropress"];
const ROAST_LEVELS = ["light", "medium_light", "medium", "medium_dark", "dark"];
const STATUSES = ["draft", "pending_review", "active", "archived"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProductForm({ productId, producerId }: ProductFormProps) {
  const navigate = useNavigate();
  const isEdit = !!productId;
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    price: 0,
    weight_grams: 250,
    origin_region: "",
    origin_country: "Brasil",
    altitude_meters: null as number | null,
    variety: "",
    process: "",
    score: null as number | null,
    intensity: 3,
    sweetness: 3,
    body: 3,
    acidity: 3,
    roast_level: "medium",
    is_subscription_available: false,
    is_featured: false,
    cover_url: "",
    status: "draft",
    stock_quantity: 0,
  });

  const [variants, setVariants] = useState<Variant[]>([
    { weight_grams: 250, grind_option: "whole_bean", price: 0, compare_at_price: null, stock_quantity: 0, is_default: true },
  ]);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ["sensory-notes-all"],
    queryFn: async () => {
      const { data } = await supabase.from("sensory_notes").select("id, name, family").order("name");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_variants(*), product_sensory_notes(sensory_note_id), product_categories(category_id)")
        .eq("id", productId!)
        .maybeSingle();
      if (!data) return;
      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        short_description: data.short_description ?? "",
        description: data.description ?? "",
        price: Number(data.price ?? 0),
        weight_grams: data.weight_grams ?? 250,
        origin_region: data.origin_region ?? "",
        origin_country: data.origin_country ?? "Brasil",
        altitude_meters: data.altitude_meters,
        variety: data.variety ?? "",
        process: data.process ?? "",
        score: data.score != null ? Number(data.score) : null,
        intensity: data.intensity ?? 3,
        sweetness: data.sweetness ?? 3,
        body: data.body ?? 3,
        acidity: data.acidity ?? 3,
        roast_level: data.roast_level ?? "medium",
        is_subscription_available: !!data.is_subscription_available,
        is_featured: !!data.is_featured,
        cover_url: data.cover_url ?? "",
        status: data.status ?? "draft",
        stock_quantity: data.stock_quantity ?? 0,
      });
      const vs = (data.product_variants ?? []) as any[];
      if (vs.length) {
        setVariants(
          vs.map((v) => ({
            id: v.id,
            weight_grams: v.weight_grams,
            grind_option: v.grind_option,
            price: Number(v.price),
            compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
            stock_quantity: v.stock_quantity,
            is_default: !!v.is_default,
            sku: v.sku,
          })),
        );
      }
      setSelectedNotes((data.product_sensory_notes ?? []).map((n: any) => n.sensory_note_id));
      setSelectedCategories((data.product_categories ?? []).map((c: any) => c.category_id));
    })();
  }, [isEdit, productId]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${productId ?? "tmp"}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set("cover_url", data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    setLoading(true);
    try {
      const payload = {
        ...form,
        producer_id: producerId,
        slug: form.slug || slugify(form.name),
        score: form.score,
        altitude_meters: form.altitude_meters,
      };

      let pid = productId;
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", productId!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload as any).select("id").single();
        if (error) throw error;
        pid = data.id;
      }

      // Variants — drop and recreate (simple, safe)
      if (pid) {
        await supabase.from("product_variants").delete().eq("product_id", pid);
        if (variants.length > 0) {
          const rows = variants.map((v) => ({
            product_id: pid,
            weight_grams: v.weight_grams,
            grind_option: v.grind_option as any,
            price: v.price,
            compare_at_price: v.compare_at_price,
            stock_quantity: v.stock_quantity,
            is_default: v.is_default,
            sku: v.sku ?? null,
          }));
          const { error } = await supabase.from("product_variants").insert(rows);
          if (error) throw error;
        }

        await supabase.from("product_sensory_notes").delete().eq("product_id", pid);
        if (selectedNotes.length) {
          await supabase
            .from("product_sensory_notes")
            .insert(selectedNotes.map((n) => ({ product_id: pid!, sensory_note_id: n })));
        }
        await supabase.from("product_categories").delete().eq("product_id", pid);
        if (selectedCategories.length) {
          await supabase
            .from("product_categories")
            .insert(selectedCategories.map((c) => ({ product_id: pid!, category_id: c })));
        }
      }

      toast.success(isEdit ? "Café atualizado" : "Café criado");
      navigate({ to: "/admin/produtos" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Básico */}
      <Section title="Informações básicas">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Slug (opcional)">
            <input className="input" value={form.slug} placeholder={slugify(form.name)} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Descrição curta" className="md:col-span-2">
            <textarea className="input min-h-[60px]" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
          </Field>
          <Field label="Descrição completa" className="md:col-span-2">
            <textarea className="input min-h-[120px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Imagem de capa">
            <div className="flex items-center gap-3">
              {form.cover_url && <img src={form.cover_url} alt="" className="h-12 w-12 rounded object-cover" />}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary">
                <Upload className="h-3 w-3" />
                {uploadingCover ? "Enviando..." : form.cover_url ? "Trocar" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
              </label>
            </div>
          </Field>
        </div>
      </Section>

      {/* Origem */}
      <Section title="Origem">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="País"><input className="input" value={form.origin_country} onChange={(e) => set("origin_country", e.target.value)} /></Field>
          <Field label="Região"><input className="input" value={form.origin_region} onChange={(e) => set("origin_region", e.target.value)} /></Field>
          <Field label="Altitude (m)"><input className="input" type="number" value={form.altitude_meters ?? ""} onChange={(e) => set("altitude_meters", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Variedade"><input className="input" value={form.variety} onChange={(e) => set("variety", e.target.value)} /></Field>
          <Field label="Processo"><input className="input" value={form.process} onChange={(e) => set("process", e.target.value)} /></Field>
          <Field label="Pontuação SCA"><input className="input" type="number" step="0.25" value={form.score ?? ""} onChange={(e) => set("score", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Torra">
            <select className="input" value={form.roast_level} onChange={(e) => set("roast_level", e.target.value)}>
              {ROAST_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Sensorial */}
      <Section title="Perfil sensorial (1–5)">
        <div className="grid gap-4 md:grid-cols-4">
          {(["intensity", "sweetness", "body", "acidity"] as const).map((k) => (
            <Field key={k} label={k}>
              <input className="input" type="number" min={1} max={5} value={form[k]} onChange={(e) => set(k, Number(e.target.value) as any)} />
            </Field>
          ))}
        </div>
        {notes && (
          <div className="mt-4">
            <p className="eyebrow">Notas sensoriais</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {notes.map((n: any) => {
                const active = selectedNotes.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNotes((s) => active ? s.filter((x) => x !== n.id) : [...s, n.id])}
                    className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {categories && categories.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow">Categorias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c: any) => {
                const active = selectedCategories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategories((s) => active ? s.filter((x) => x !== c.id) : [...s, c.id])}
                    className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Variantes */}
      <Section title="Variantes (peso × moagem × preço)">
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border bg-card p-3 md:grid-cols-7">
              <input className="input" type="number" placeholder="g" value={v.weight_grams} onChange={(e) => setVariants((arr) => arr.map((x, j) => j === i ? { ...x, weight_grams: Number(e.target.value) } : x))} />
              <select className="input md:col-span-2" value={v.grind_option} onChange={(e) => setVariants((arr) => arr.map((x, j) => j === i ? { ...x, grind_option: e.target.value } : x))}>
                {GRINDS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input className="input" type="number" step="0.01" placeholder="Preço" value={v.price} onChange={(e) => setVariants((arr) => arr.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} />
              <input className="input" type="number" step="0.01" placeholder="De" value={v.compare_at_price ?? ""} onChange={(e) => setVariants((arr) => arr.map((x, j) => j === i ? { ...x, compare_at_price: e.target.value ? Number(e.target.value) : null } : x))} />
              <input className="input" type="number" placeholder="Estoque" value={v.stock_quantity} onChange={(e) => setVariants((arr) => arr.map((x, j) => j === i ? { ...x, stock_quantity: Number(e.target.value) } : x))} />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={v.is_default} onChange={(e) => setVariants((arr) => arr.map((x, j) => ({ ...x, is_default: j === i ? e.target.checked : false })))} />
                  Padrão
                </label>
                <button type="button" onClick={() => setVariants((arr) => arr.filter((_, j) => j !== i))} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariants((arr) => [...arr, { weight_grams: 250, grind_option: "whole_bean", price: 0, compare_at_price: null, stock_quantity: 0, is_default: arr.length === 0 }])}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary"
          >
            <Plus className="h-3 w-3" /> Adicionar variante
          </button>
        </div>
      </Section>

      {/* Flags */}
      <Section title="Visibilidade">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> Destaque na home
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_subscription_available} onChange={(e) => set("is_subscription_available", e.target.checked)} /> Disponível na assinatura
          </label>
        </div>
      </Section>

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <button onClick={() => navigate({ to: "/admin/produtos" })} className="rounded-full border border-border px-5 py-2 text-sm">Cancelar</button>
        <button onClick={submit} disabled={loading} className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar café"}
        </button>
      </div>

      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--card);border-radius:6px;padding:8px 10px;font-size:14px;color:var(--foreground)}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-primary">{title}</h2>
      <div className="gold-divider mt-2 mb-5" />
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
