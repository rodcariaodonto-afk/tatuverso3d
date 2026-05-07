import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

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
            <Star className="h-3 w-3 fill-accent text-accent" />
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
              R$ {product.compare_at_price!.toFixed(2).replace(".", ",")}
            </span>
          )}
          <span className="font-display text-xl font-semibold text-primary">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
    </Link>
  );
}
