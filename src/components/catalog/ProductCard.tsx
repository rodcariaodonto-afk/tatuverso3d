import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Sparkles, Clock, Truck } from "lucide-react";
import type { CatalogProduct } from "@/hooks/useProducts";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Parcelamento simples usado em toda a vitrine. */
function installments(price: number) {
  const max = 12;
  const min = 5; // valor mínimo por parcela
  const n = Math.max(1, Math.min(max, Math.floor(price / min)));
  return { n, value: price / n };
}

/** Shape simples usada na home e listagens leves. */
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cover_url: string | null;
  badges: string[] | null;
};

/** Modelo normalizado consumido pelo card — todas as telas passam por aqui. */
export type ProductCardView = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Preço exibido (menor preço quando há variações). */
  price: number;
  /** Preço "de" — só quando realmente maior que o preço atual. */
  compareAtPrice: number | null;
  /** Mostra o rótulo "a partir de" antes do preço. */
  fromPrice?: boolean;
  badges: string[];
  featured?: boolean;
  personalizable?: boolean;
  madeToOrder?: boolean;
  productionDays?: number | null;
  soldOut?: boolean;
  freeShipping?: boolean;
  ctaLabel?: string;
};

function Placeholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,var(--surface-soft),color-mix(in_oklab,var(--surface-soft),var(--brand-primary)_12%))] text-muted-foreground">
      <ImageIcon className="h-8 w-8 opacity-50" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        Imagem em breve
      </span>
    </div>
  );
}

/**
 * Card base — estrutura idêntica para todos os produtos:
 * imagem quadrada, faixa de selos absoluta, nome em 2 linhas,
 * bloco de preço com altura fixa e botão ancorado embaixo.
 */
export function BaseProductCard({ product }: { product: ProductCardView }) {
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discount = onSale
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;
  const parc = installments(product.price);

  const chips: Array<{ key: string; label: string; icon: typeof Sparkles }> = [];
  if (product.personalizable)
    chips.push({ key: "custom", label: "Personalizável", icon: Sparkles });
  if (product.madeToOrder) chips.push({ key: "mto", label: "Sob encomenda", icon: Clock });
  if (product.freeShipping) chips.push({ key: "ship", label: "Frete grátis", icon: Truck });

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      {/* Mídia — proporção quadrada para todos os cards */}
      <div className="relative aspect-square shrink-0 overflow-hidden bg-surface-soft">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Placeholder />
        )}

        {/* Selos — camada absoluta, nunca empurram o conteúdo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex max-w-full flex-wrap items-start gap-1 p-2.5">
          {discount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              -{discount}%
            </span>
          )}
          {product.featured && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Destaque
            </span>
          )}
          {product.badges.slice(0, 1).map((b) => (
            <span
              key={b}
              className="max-w-[60%] truncate rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur"
            >
              {b}
            </span>
          ))}
        </div>

        {product.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold uppercase tracking-wider text-primary">
            Esgotado
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.6em] font-display text-sm leading-tight text-foreground sm:text-base">
          {product.name}
        </h3>

        {/* Selos de atributo — altura reservada mesmo quando vazio */}
        <div className="mt-1.5 flex min-h-[20px] flex-wrap items-center gap-1 overflow-hidden">
          {chips.slice(0, 2).map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
            >
              <c.icon className="h-3 w-3" /> {c.label}
            </span>
          ))}
        </div>

        {/* Preço — mesma altura com ou sem promoção */}
        <div className="mt-auto pt-3">
          <div className="flex h-4 items-center gap-2">
            {onSale ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatBRL(product.compareAtPrice!)}
              </span>
            ) : (
              <span aria-hidden className="text-xs opacity-0">
                &nbsp;
              </span>
            )}
          </div>
          <div className="flex h-8 flex-wrap items-baseline gap-1.5">
            {product.fromPrice && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                a partir de
              </span>
            )}
            <span className="font-display text-lg font-semibold text-primary sm:text-xl">
              {formatBRL(product.price)}
            </span>
          </div>
          <p className="mt-0.5 flex h-4 items-center text-[11px] text-muted-foreground">
            {parc.n > 1 ? `em até ${parc.n}x de ${formatBRL(parc.value)}` : "à vista no Pix"}
          </p>
          {product.productionDays ? (
            <p className="mt-0.5 flex h-4 items-center text-[11px] text-muted-foreground">
              Produção em até {product.productionDays} dias
            </p>
          ) : (
            <p aria-hidden className="mt-0.5 h-4" />
          )}
        </div>

        <span className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground transition group-hover:brightness-110">
          {product.ctaLabel ?? "Ver produto"}
        </span>
      </div>
    </Link>
  );
}

/** Card usado por listagens leves (dados diretos da tabela products). */
export function ProductCard({ product }: { product: ProductCardData }) {
  const badges = product.badges ?? [];
  return (
    <BaseProductCard
      product={{
        slug: product.slug,
        name: product.name,
        description: product.short_description,
        imageUrl: product.cover_url,
        price: product.price,
        compareAtPrice: product.compare_at_price,
        badges: badges.filter((b) => !b.toLowerCase().includes("personaliz")),
        personalizable: badges.some((b) => b.toLowerCase().includes("personaliz")),
      }}
    />
  );
}

/** Card completo do catálogo (variações, estoque, personalização). */
export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const cheapest = product.variants.slice().sort((a, b) => a.price - b.price)[0];
  const compareAt = cheapest?.compare_at_price ?? product.compare_at_price ?? null;
  const badges = product.badges ?? [];

  return (
    <BaseProductCard
      product={{
        slug: product.slug,
        name: product.name,
        description: product.short_description,
        imageUrl: product.cover_url ?? cheapest?.image_url ?? null,
        price: product.min_price,
        compareAtPrice: compareAt != null && compareAt > product.min_price ? compareAt : null,
        fromPrice: product.variants.length > 1,
        badges: badges.filter((b) => !b.toLowerCase().includes("personaliz")),
        featured: !!product.is_featured,
        personalizable:
          product.is_personalizable || badges.some((b) => b.toLowerCase().includes("personaliz")),
        madeToOrder: product.made_to_order,
        productionDays: product.production_time_days,
        soldOut: !product.in_stock,
      }}
    />
  );
}
