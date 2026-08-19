import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GRIND_LABEL, formatBRL, useCart, type GrindOption } from "@/lib/cart-store";
import { useCartDrawer } from "@/components/cart/CartDrawer";

export const Route = createFileRoute("/cafe/$slug")({
  component: ProductPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Erro ao carregar produto</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
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
        Ver catálogo
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
  const openCart = useCartDrawer((s) => s.setOpen);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*, producers(id, name, slug, region, state, country, logo_url), product_sensory_notes(sensory_notes(name, family)), product_images(url, alt, sort_order), product_variants(id, weight_grams, grind_option, price, compare_at_price, stock_quantity, is_default)",
        )
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  type Variant = {
    id: string;
    weight_grams: number;
    grind_option: GrindOption;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    is_default: boolean | null;
  };
  const variants = ((product?.product_variants ?? []) as Variant[]).slice().sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return a.weight_grams - b.weight_grams;
  });

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Carregando...</div>
    );
  }
  if (!product) return null;

  const selectedVariant =
    variants.find((v) => v.id === variantId) ?? variants[0] ?? null;

  const images = [
    ...(product.cover_url ? [{ url: product.cover_url, alt: product.name }] : []),
    ...((product.product_images ?? []) as Array<{ url: string; alt: string | null }>).map((i) => ({
      url: i.url,
      alt: i.alt ?? product.name,
    })),
  ];

  const notes = (product.product_sensory_notes ?? [])
    .map((n: any) => n.sensory_notes)
    .filter(Boolean) as Array<{ name: string; family: string | null }>;

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
  const displayCompare = selectedVariant
    ? selectedVariant.compare_at_price != null
      ? Number(selectedVariant.compare_at_price)
      : null
    : product.compare_at_price != null
      ? Number(product.compare_at_price)
      : null;
  const displayStock = selectedVariant?.stock_quantity ?? product.stock_quantity ?? 0;
  const onSale = displayCompare != null && displayCompare > displayPrice;

  const handleAdd = () => {
    if (!selectedVariant) {
      toast.error("Selecione uma variante");
      return;
    }
    add({
      variant_id: selectedVariant.id,
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      producer_name: product.producers?.name ?? null,
      producer_id: product.producers?.id ?? null,
      cover_url: product.cover_url,
      unit_price: displayPrice,
      quantity: qty,
      grind_option: selectedVariant.grind_option,
      weight_grams: selectedVariant.weight_grams,
      variant_label: `${selectedVariant.weight_grams}g · ${GRIND_LABEL[selectedVariant.grind_option]}`,
    });
    toast.success("Adicionado ao carrinho", { description: `${qty}x ${product.name}` });
    openCart(true);
  };

  return (
    <div className="container mx-auto px-4 py-10 md:px-6">
      <Link to="/catalogo" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Voltar à loja
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        {/* GALLERY */}
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            {images[0] && <img src={images[0].url} alt={images[0].alt ?? product.name} className="h-full w-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-md bg-muted">
                  <img src={img.url} alt={img.alt ?? product.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">{product.name}</h1>
          <p className="mt-5 leading-relaxed text-foreground/80">{product.short_description}</p>

          {/* Buy box */}
          <div className="mt-8 rounded-xl border border-border bg-[var(--surface-soft)] p-5">
            <div className="flex items-baseline gap-3">
              {onSale && displayCompare != null && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatBRL(displayCompare)}
                </span>
              )}
              <span className="font-display text-3xl font-semibold text-primary">
                {formatBRL(displayPrice)}
              </span>
            </div>

            {variants.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow">Opções</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const active = (selectedVariant?.id ?? variants[0]?.id) === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        disabled={v.stock_quantity <= 0}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground/80 hover:border-primary"
                        }`}
                      >
                        {GRIND_LABEL[v.grind_option]} · {v.weight_grams}g
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-card">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-lg">−</button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={displayStock <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                {displayStock > 0 ? "Adicionar ao carrinho" : "Esgotado"}
              </button>
            </div>

          </div>

          {product.description && (
            <div className="prose mt-10 max-w-none text-foreground/80">
              <p className="eyebrow">Sobre este produto</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
