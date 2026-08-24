import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { CatalogProductCard } from "@/components/catalog/ProductCard";
import type { CatalogProduct } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

/** Grade padrão do marketplace: 2 / 3 / 4 colunas com linhas de altura uniforme. */
export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <CatalogProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Faixa de vitrine com título, link "ver todos" e grade padronizada. */
export function ProductSection({
  eyebrow,
  title,
  linkTo,
  linkSearch,
  isLoading,
  products,
  empty,
}: {
  eyebrow?: string;
  title: string;
  linkTo?: string;
  linkSearch?: Record<string, unknown>;
  isLoading?: boolean;
  products: CatalogProduct[];
  empty?: ReactNode;
}) {
  if (!isLoading && products.length === 0) {
    if (!empty) return null;
    return (
      <section className="container mx-auto px-4 py-8 md:px-6">
        <Header eyebrow={eyebrow} title={title} linkTo={linkTo} linkSearch={linkSearch} />
        {empty}
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8 md:px-6">
      <Header eyebrow={eyebrow} title={title} linkTo={linkTo} linkSearch={linkSearch} />
      {isLoading ? <ProductGridSkeleton count={4} /> : <ProductGrid products={products} />}
    </section>
  );
}

function Header({
  eyebrow,
  title,
  linkTo,
  linkSearch,
}: {
  eyebrow?: string;
  title: string;
  linkTo?: string;
  linkSearch?: Record<string, unknown>;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 truncate font-display text-2xl text-foreground md:text-3xl">{title}</h2>
      </div>
      {linkTo && (
        <Link
          to={linkTo as never}
          search={linkSearch as never}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
