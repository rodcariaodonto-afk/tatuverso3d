import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { CatalogProduct } from "@/hooks/useProducts";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Legacy shape kept for compatibility with /, /produtores/$slug, /quiz ─────
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cover_url: string | null;
  score: number | null;
  badges: string[] | null;
  origin_region: string | null;
  origin_country: string | null;
  producers?: { name: string } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  return (
    <Link
      to="/cafe/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/60 hover:shadow-[0_20px_50px_-30px_oklch(0.22_0.045_45/0.4)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {product.cover_url && (
          <img
            src={product.cover_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        )}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {product.badges.slice(0, 2).map((b) => (
              <span
                key={b}
                className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        {product.score && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground backdrop-blur">
            <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
            {product.score}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {product.producers?.name ?? "Cafezeira"}
          {product.origin_region ? ` · ${product.origin_region}` : ""}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-foreground">{product.name}</h3>
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

// ─── New rich card driven by CatalogProduct (variants + notes + badges) ──────
export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const cheapest = product.variants
    .slice()
    .sort((a, b) => a.price - b.price)[0];
  const onSale =
    cheapest?.compare_at_price != null && cheapest.compare_at_price > cheapest.price;
  const totalStock = product.variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);

  return (
    <Link
      to="/cafe/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/60 hover:shadow-[0_20px_50px_-30px_oklch(0.22_0.045_45/0.4)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--sand)]">
        {product.cover_url ? (
          <img
            src={product.cover_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
            sem imagem
          </div>
        )}

        {/* Top overlay: badges left (stacked), score right — no overlap */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex max-w-[70%] flex-col items-start gap-1">
            {product.is_featured && (
              <span className="rounded-full bg-[var(--gold)]/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--espresso)] backdrop-blur">
                Destaque
              </span>
            )}
            {product.is_subscription_available && (
              <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                Assinatura
              </span>
            )}
            {(product.badges ?? []).slice(0, 1).map((b) => (
              <span
                key={b}
                className="max-w-full truncate rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur"
              >
                {b}
              </span>
            ))}
          </div>
          {product.score != null && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground backdrop-blur">
              <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
              {product.score}
            </div>
          )}
        </div>

        {totalStock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs font-bold uppercase tracking-wider text-primary">
            Esgotado
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {product.producer?.name ?? "Cafezeira"}
          {product.origin_region ? ` · ${product.origin_region}` : ""}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-foreground">
          {product.name}
        </h3>
        {product.notes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.notes.slice(0, 3).map((n) => (
              <span
                key={n.name}
                className="rounded-full border border-accent/30 bg-[var(--sand)] px-2 py-0.5 text-[10px] text-primary"
              >
                {n.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-3">
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
      </div>
    </Link>
  );
}
