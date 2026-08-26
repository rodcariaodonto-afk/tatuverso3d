import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Clock, Heart, Package, Ruler, Share2, Shield, ShoppingBag, Sparkles, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL, useCart, type CartCustomization } from "@/lib/cart-store";
import { useCartDrawer } from "@/components/cart/CartDrawer";
import { mapCatalogProduct, OPTION_TYPE_LABEL, PRODUCT_TYPE_LABEL, useCatalogProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/catalog/ProductRail";

export const Route = createFileRoute("/produto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Produto ${params.slug} — TatuVerso3D` },
      { name: "description", content: "Produto em impressão 3D da TatuVerso3D, feito camada por camada." },
      { property: "og:title", content: "Produto — TatuVerso3D" },
      { property: "og:description", content: "Produto em impressão 3D da TatuVerso3D." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Erro ao carregar produto</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl">Produto não encontrado</h1>
      <Link to="/catalogo" className="mt-6 inline-flex text-sm font-semibold text-primary underline">
        Ver loja
      </Link>
    </div>
  ),
});

const PRODUCT_SELECT = `
  *,
  product_categories ( category_id, categories ( id, name, slug ) ),
  product_images ( id, url, alt, sort_order, variant_id ),
  product_variants (
    id, name, sku, price, compare_at_price, stock_quantity, is_active, image_url, sort_order,
    weight_grams, dimensions_text,
    variant_option_values ( option_value_id )
  ),
  product_options (
    id, name, option_type, is_required, sort_order,
    product_option_values ( id, label, value, color_hex, image_url, price_adjustment, is_active, sort_order )
  ),
  product_customization_fields (
    id, label, field_type, placeholder, help_text, is_required, min_length, max_length,
    price_adjustment, options, sort_order, is_active
  )
`;

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const add = useCart((s) => s.add);
  const openCart = useCartDrawer((s) => s.setOpen);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  const { data: allProducts } = useCatalogProducts();

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [variantPick, setVariantPick] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fav, setFav] = useState(false);

  const product = useMemo(() => (raw ? mapCatalogProduct(raw) : null), [raw]);

  const fields = useMemo(
    () =>
      ((raw?.product_customization_fields ?? []) as any[])
        .filter((f) => f.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [raw],
  );

  const images = useMemo(() => {
    if (!raw) return [] as Array<{ url: string; alt: string }>;
    const list = [
      ...(raw.cover_url ? [{ url: raw.cover_url, alt: raw.name }] : []),
      ...((raw.product_images ?? []) as any[])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((i) => ({ url: i.url, alt: i.alt ?? raw.name })),
    ];
    return list.filter((v, i, arr) => arr.findIndex((x) => x.url === v.url) === i);
  }, [raw]);

  /** variações "soltas" (sem vínculo com opções) — escolha direta pelo cliente */
  const standaloneVariants = useMemo(() => {
    if (!product) return [];
    if (product.options.length) return [];
    return product.variants;
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    if (!product.options.length) {
      if (!product.variants.length) return null;
      if (product.variants.length === 1) return product.variants[0];
      return product.variants.find((v) => v.id === variantPick) ?? null;
    }
    const chosen = Object.values(selection);
    if (chosen.length !== product.options.length) return null;
    return (
      product.variants.find(
        (v) =>
          chosen.every((id) => v.option_value_ids.includes(id)) &&
          v.option_value_ids.length === chosen.length,
      ) ?? null
    );
  }, [product, selection, variantPick]);


  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Carregando...</div>;
  }
  if (!product || !raw) return null;

  const customizationAdjust = fields.reduce((acc, f) => {
    const v = custom[f.id];
    const filled = f.field_type === "checkbox" ? v === "true" : !!v;
    return acc + (filled ? Number(f.price_adjustment ?? 0) : 0);
  }, 0);

  const basePrice = selectedVariant ? selectedVariant.price : product.min_price || product.price;
  const unitPrice = basePrice + customizationAdjust;
  const compareAt = selectedVariant?.compare_at_price ?? product.compare_at_price;
  const onSale = compareAt != null && compareAt > basePrice;

  const stock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const unlimited = product.made_to_order || product.allow_backorder || !product.track_inventory;
  const outOfStock = !unlimited && stock <= 0;

  const cover = activeImage ?? selectedVariant?.image_url ?? images[0]?.url ?? null;

  const categories = ((raw.product_categories ?? []) as any[])
    .map((c) => c.categories)
    .filter(Boolean);

  const related = (allProducts ?? [])
    .filter((p) => p.id !== product.id && p.category_ids.some((c) => product.category_ids.includes(c)))
    .slice(0, 4);

  const missingRequired = () => {
    for (const f of fields) {
      if (!f.is_required) continue;
      const v = custom[f.id];
      if (f.field_type === "checkbox" ? v !== "true" : !v) return f.label;
      if (f.min_length && v && v.length < f.min_length) return f.label;
    }
    return null;
  };

  const uploadFile = async (fieldId: string, file: File) => {
    if (!user) {
      toast.error("Entre na sua conta para enviar arquivos de personalização");
      return;
    }
    const okTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!okTypes.includes(file.type)) {
      toast.error("Formato não permitido", { description: "Use PNG, JPG, WebP ou PDF." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Limite de 8 MB." });
      return;
    }
    setUploading(fieldId);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${user.id}/${product.id}/${fieldId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("customization-uploads").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) return toast.error("Falha no upload", { description: error.message });
    setCustom((c) => ({ ...c, [fieldId]: path }));
    toast.success("Arquivo enviado");
  };

  const handleAdd = () => {
    if (product.options.length && !selectedVariant) {
      toast.error("Selecione todas as opções disponíveis");
      return;
    }
    if (standaloneVariants.length > 1 && !selectedVariant) {
      toast.error("Selecione uma variação");
      return;
    }
    const missing = missingRequired();
    if (missing) {
      toast.error("Personalização obrigatória", { description: `Preencha: ${missing}` });
      return;
    }
    if (outOfStock) {
      toast.error("Produto sem estoque");
      return;
    }
    const customizations: CartCustomization[] = fields
      .filter((f) => custom[f.id])
      .map((f) => ({
        field_id: f.id,
        label: f.label,
        value: custom[f.id],
        price_adjustment: Number(f.price_adjustment ?? 0),
      }));

    const optionLabels = product.options
      .map((o) => {
        const val = o.values.find((v) => v.id === selection[o.id]);
        return val ? `${OPTION_TYPE_LABEL[o.option_type] ?? o.name}: ${val.label}` : null;
      })
      .filter(Boolean) as string[];

    add({
      product_id: product.id,
      variant_id: selectedVariant?.id ?? null,
      slug: product.slug,
      name: product.name,
      cover_url: cover,
      unit_price: unitPrice,
      base_price: basePrice,
      adjustments: customizationAdjust,
      quantity: qty,
      variant_label: selectedVariant?.name ?? (optionLabels.length ? optionLabels.join(" · ") : null),
      option_labels: optionLabels,
      customizations,
      made_to_order: product.made_to_order,
      production_time_days: product.production_time_days,
      max_stock: unlimited ? null : stock,
    });
    toast.success("Adicionado ao carrinho", { description: `${qty}x ${product.name}` });
    openCart(true);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="container mx-auto px-4 py-10 md:px-6">
      <Link to="/catalogo" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Voltar à loja
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        {/* GALERIA */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {cover ? (
              <img src={cover} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs uppercase text-muted-foreground">sem imagem</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img) => (
                <button
                  key={img.url}
                  onClick={() => setActiveImage(img.url)}
                  className={`aspect-square overflow-hidden rounded-md border-2 bg-muted transition ${
                    cover === img.url ? "border-primary" : "border-transparent hover:border-border"
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETALHES */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {PRODUCT_TYPE_LABEL[product.product_type] ?? "Produto"}
            </span>
            {product.is_personalizable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Personalizável
              </span>
            )}
            {(product.badges ?? []).map((b) => (
              <span key={b} className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{b}</span>
            ))}
          </div>

          <h1 className="mt-3 font-display text-4xl text-primary md:text-5xl">{product.name}</h1>

          {categories.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {categories.map((c: any) => c.name).join(" · ")}
            </p>
          )}

          <p className="mt-5 leading-relaxed text-foreground/80">{product.short_description}</p>

          <div className="mt-8 rounded-xl border border-border bg-[var(--surface-soft)] p-5">
            <div className="flex items-baseline gap-3">
              {onSale && compareAt != null && (
                <span className="text-sm text-muted-foreground line-through">{formatBRL(compareAt)}</span>
              )}
              {!selectedVariant && standaloneVariants.length > 1 && (
                <span className="text-xs uppercase tracking-wider text-muted-foreground">A partir de</span>
              )}
              <span className="font-display text-3xl font-semibold text-primary">{formatBRL(unitPrice)}</span>
              {customizationAdjust > 0 && (
                <span className="text-xs text-muted-foreground">inclui {formatBRL(customizationAdjust)} de personalização</span>
              )}
            </div>

            {/* VARIAÇÕES SEM OPÇÕES */}
            {standaloneVariants.length > 1 && (
              <div className="mt-5">
                <p className="eyebrow">Escolha a variação</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {standaloneVariants.map((v, i) => {
                    const active = selectedVariant?.id === v.id;
                    const soldOut = !unlimited && (v.stock_quantity ?? 0) <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => { setVariantPick(v.id); if (v.image_url) setActiveImage(v.image_url); }}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-primary"
                        }`}
                      >
                        <span className="block">{v.name?.trim() || v.sku || `Opção ${i + 1}`}</span>
                        <span className={`block text-[11px] ${active ? "opacity-90" : "text-muted-foreground"}`}>
                          {formatBRL(v.price)}{soldOut ? " · esgotado" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!selectedVariant && (
                  <p className="mt-2 text-xs text-destructive">Selecione uma variação para ver preço e disponibilidade.</p>
                )}
              </div>
            )}

            {/* OPÇÕES */}
            {product.options.map((o) => (
              <div key={o.id} className="mt-5">
                <p className="eyebrow">{o.name || OPTION_TYPE_LABEL[o.option_type]}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.values.map((v) => {
                    const active = selection[o.id] === v.id;
                    if (o.option_type === "color") {
                      return (
                        <button
                          key={v.id}
                          title={v.label}
                          aria-label={v.label}
                          onClick={() => setSelection((s) => ({ ...s, [o.id]: v.id }))}
                          className={`h-9 w-9 rounded-full border-2 transition ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                          style={{ backgroundColor: v.color_hex ?? "var(--surface-soft)" }}
                        />
                      );
                    }
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelection((s) => ({ ...s, [o.id]: v.id }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-primary"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
                {o.option_type === "color" && selection[o.id] && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {o.values.find((v) => v.id === selection[o.id])?.label}
                  </p>
                )}
              </div>
            ))}

            {product.options.length > 0 && !selectedVariant && (
              <p className="mt-3 text-xs text-destructive">
                {Object.keys(selection).length < product.options.length
                  ? "Selecione todas as opções para ver preço e disponibilidade."
                  : "Esta combinação não está disponível."}
              </p>
            )}

            {/* PERSONALIZAÇÃO */}
            {fields.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <p className="eyebrow">Personalização</p>
                {fields.map((f) => (
                  <div key={f.id}>
                    <label className="block text-xs font-semibold text-foreground/80">
                      {f.label}{f.is_required && <span className="text-destructive"> *</span>}
                      {Number(f.price_adjustment) > 0 && (
                        <span className="ml-1 font-normal text-muted-foreground">(+{formatBRL(Number(f.price_adjustment))})</span>
                      )}
                    </label>
                    {f.field_type === "long_text" ? (
                      <textarea
                        rows={3}
                        maxLength={f.max_length ?? undefined}
                        placeholder={f.placeholder ?? ""}
                        value={custom[f.id] ?? ""}
                        onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      />
                    ) : f.field_type === "select" ? (
                      <select
                        value={custom[f.id] ?? ""}
                        onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      >
                        <option value="">Selecione</option>
                        {(Array.isArray(f.options) ? f.options : []).map((op: any) => (
                          <option key={String(op)} value={String(op)}>{String(op)}</option>
                        ))}
                      </select>
                    ) : f.field_type === "checkbox" ? (
                      <label className="mt-1 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={custom[f.id] === "true"}
                          onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.checked ? "true" : "" }))}
                        />
                        {f.help_text ?? "Sim"}
                      </label>
                    ) : f.field_type === "file" || f.field_type === "image" ? (
                      <div className="mt-1">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold">
                          <Upload className="h-3.5 w-3.5" />
                          {uploading === f.id ? "Enviando..." : custom[f.id] ? "Trocar arquivo" : "Enviar arquivo"}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(f.id, file); }}
                          />
                        </label>
                        {custom[f.id] && <p className="mt-1 truncate text-xs text-muted-foreground">{custom[f.id].split("/").pop()}</p>}
                      </div>
                    ) : (
                      <input
                        type={f.field_type === "number" ? "number" : f.field_type === "color" ? "color" : "text"}
                        maxLength={f.max_length ?? undefined}
                        placeholder={f.placeholder ?? ""}
                        value={custom[f.id] ?? ""}
                        onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      />
                    )}
                    {f.help_text && f.field_type !== "checkbox" && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{f.help_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ESTOQUE E PRAZO */}
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {product.made_to_order ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 font-semibold text-primary">
                  <Clock className="h-3.5 w-3.5" /> Produzido sob encomenda
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1">
                  <Package className="h-3.5 w-3.5" />
                  {unlimited ? "Disponível" : stock > 0 ? `${stock} em estoque` : "Sem estoque"}
                </span>
              )}
              {product.production_time_days != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1">
                  <Clock className="h-3.5 w-3.5" /> Produção em até {product.production_time_days} dia(s) úteis
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-card">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-lg" aria-label="Diminuir">−</button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg" aria-label="Aumentar">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                {outOfStock ? "Esgotado" : "Adicionar ao carrinho"}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFav((f) => !f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${fav ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} /> Favoritar
              </button>
              <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Share2 className="h-3.5 w-3.5" /> Compartilhar
              </button>
            </div>
          </div>

          {raw.description && (
            <div className="mt-10">
              <p className="eyebrow">Sobre este produto</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{raw.description}</p>
            </div>
          )}

          <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <Spec icon={Ruler} label="Dimensões" value={raw.dimensions_text ?? selectedVariant?.name ?? null} />
            <Spec icon={Package} label="Peso" value={raw.weight_grams ? `${raw.weight_grams} g` : null} />
            <Spec icon={Sparkles} label="Material" value={raw.material_description} />
            <Spec icon={Package} label="Itens inclusos" value={raw.included_items} />
            <Spec icon={Shield} label="Recomendação de idade" value={raw.age_recommendation} />
            <Spec icon={Shield} label="Segurança" value={raw.safety_notes} />
            <Spec icon={Shield} label="Cuidados" value={raw.care_instructions} />
            <Spec icon={Sparkles} label="Sobre as cores" value={raw.color_notes} />
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-primary">Você também pode gostar</h2>
          <div className="brand-divider mt-3" />
          <div className="mt-6">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground/80">{value}</dd>
    </div>
  );
}
