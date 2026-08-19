import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import type { CatalogProduct } from "@/hooks/useProducts";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Shape simples usada na home e em listagens leves ────────────────────────
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cover_url: string | null;
  badges: string[] | null;
  score?: number | null;
  origin_region?: string | null;
  origin_country?: string | null;
  producers?: { name: string } | null;
};

function FavoriteButton() {
  return (
    <span
      className="pointer-events-none absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur"
      aria-hidden
    >
      <Heart className="h-4 w-4" />
    </span>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-soft">
        {product.cover_url ? (
          <img
            src={product.cover_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
            sem imagem
          </div>
        )}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {product.badges.slice(0, 2).map((b) => (
              <span
                key={b}
                className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <FavoriteButton />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-tight text-foreground">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatBRL(product.compare_at_price!)}
            </span>
          )}
          <span className="font-display text-xl font-semibold text-primary">
            {formatBRL(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Card completo do catálogo ───────────────────────────────────────────────
export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const cheapest = product.variants.slice().sort((a, b) => a.price - b.price)[0];
  const onSale =
    cheapest?.compare_at_price != null && cheapest.compare_at_price > cheapest.price;
  const totalStock = product.variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
  const customizable = (product.badges ?? []).some((b) =>
    b.toLowerCase().includes("personaliz"),
  );

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-soft">
        {product.cover_url ? (
          <img
            src={product.cover_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
            sem imagem
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex max-w-[75%] flex-col items-start gap-1">
            {product.is_featured && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Destaque
              </span>
            )}
            {(product.badges ?? []).slice(0, 2).map((b) => (
              <span
                key={b}
                className="max-w-full truncate rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur"
              >
                {b}
              </span>
            ))}
            {customizable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Personalizável
              </span>
            )}
          </div>
        </div>

        <FavoriteButton />

        {totalStock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold uppercase tracking-wider text-primary">
            Esgotado
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-tight text-foreground">{product.name}</h3>
        {product.short_description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {product.short_description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-3">
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatBRL(cheapest!.compare_at_price!)}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            a partir de
          </span>
          <span className="font-display text-xl font-semibold text-primary">
            {formatBRL(product.min_price)}
          </span>
        </div>
        <span className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition group-hover:brightness-110">
          Ver produto
        </span>
      </div>
    </Link>
  );
}
