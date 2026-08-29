import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductRail";

import {
  applyCatalogFilters,
  productColors,
  productMaterials,
  useCatalogProducts,
  useCategories,
  useSalesCounts,
  PRODUCT_TYPE_LABEL,
} from "@/hooks/useProducts";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.array(z.string()), []).default([]),
  mat: fallback(z.array(z.string()), []).default([]),
  color: fallback(z.array(z.string()), []).default([]),
  type: fallback(z.array(z.string()), []).default([]),
  pmax: fallback(z.number().nullable(), null).default(null),
  pers: fallback(z.boolean(), false).default(false),
  stock: fallback(z.boolean(), false).default(false),
  order: fallback(z.boolean(), false).default(false),
  sort: fallback(
    z.enum(["featured", "price_asc", "price_desc", "newest", "best_sellers"]),
    "featured",
  ).default("featured"),
  page: fallback(z.number().int().positive(), 1).default(1),
});

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Loja — TatuVerso3D" },
      {
        name: "description",
        content:
          "Produtos sensoriais, decoração, utilidades, presentes, colecionáveis e articulados feitos em impressão 3D.",
      },
      { property: "og:title", content: "Loja — TatuVerso3D" },
      {
        property: "og:description",
        content: "Produtos criativos em impressão 3D, prontos para enviar ou personalizar.",
      },
      { property: "og:url", content: "/catalogo" },
    ],
    links: [{ rel: "canonical", href: "/catalogo" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: CatalogPage,
});

const SORTS = [
  { value: "featured", label: "Destaques" },
  { value: "newest", label: "Mais recentes" },
  { value: "best_sellers", label: "Mais vendidos" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
] as const;

const PAGE_SIZE = 12;

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: products, isLoading } = useCatalogProducts();
  const { data: categories } = useCategories();
  const { data: salesCounts } = useSalesCounts();

  const materials = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => productMaterials(p).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [products]);

  const colors = useMemo(() => {
    const map = new Map<string, string | null>();
    (products ?? []).forEach((p) => productColors(p).forEach((c) => map.set(c.label, c.hex)));
    return Array.from(map, ([label, hex]) => ({ label, hex })).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const types = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => set.add(p.product_type));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return applyCatalogFilters(products, {
      search: search.q,
      categoryIds: search.cat,
      materials: search.mat,
      colors: search.color,
      types: search.type,
      priceMax: search.pmax ?? undefined,
      personalizableOnly: search.pers,
      inStockOnly: search.stock,
      madeToOrderOnly: search.order,
      sort: search.sort,
      salesCounts,
    });
  }, [products, search, salesCounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(search.page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const update = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev: typeof search) => ({ ...prev, ...patch, page: 1 }),
    });

  const toggleArray = (key: "cat" | "mat" | "color" | "type", v: string) => {
    const cur = (search[key] ?? []) as string[];
    update({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as any);
  };

  const clearAll = () =>
    navigate({
      search: {
        q: "",
        cat: [],
        mat: [],
        color: [],
        type: [],
        pmax: null,
        pers: false,
        stock: false,
        order: false,
        sort: "featured",
        page: 1,
      },
    });

  const activeCount =
    (search.q ? 1 : 0) +
    search.cat.length +
    search.mat.length +
    search.color.length +
    search.type.length +
    (search.pmax ? 1 : 0) +
    (search.pers ? 1 : 0) +
    (search.stock ? 1 : 0) +
    (search.order ? 1 : 0);

  const Filters = (
    <div className="space-y-8">
      <div>
        <label className="eyebrow">Buscar</label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Buscar produtos..."
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div>
          <p className="eyebrow">Categorias</p>
          <div className="mt-3 space-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={search.cat.includes(c.id)}
                  onChange={() => toggleArray("cat", c.id)}
                  className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow">Faixa de preço</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[40, 70, 120, 200].map((v) => (
            <button
              key={v}
              onClick={() => update({ pmax: search.pmax === v ? null : v })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                search.pmax === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-accent"
              }`}
            >
              até R$ {v}
            </button>
          ))}
        </div>
      </div>

      {types.length > 0 && (
        <div>
          <p className="eyebrow">Tipo</p>
          <div className="mt-3 space-y-2">
            {types.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={search.type.includes(t)}
                  onChange={() => toggleArray("type", t)}
                  className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]"
                />
                {PRODUCT_TYPE_LABEL[t] ?? t}
              </label>
            ))}
          </div>
        </div>
      )}

      {materials.length > 0 && (
        <div>
          <p className="eyebrow">Material</p>
          <div className="mt-3 space-y-2">
            {materials.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={search.mat.includes(m)}
                  onChange={() => toggleArray("mat", m)}
                  className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]"
                />
                {m}
              </label>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="eyebrow">Cor</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((c) => {
              const active = search.color.includes(c.label);
              return (
                <button
                  key={c.label}
                  onClick={() => toggleArray("color", c.label)}
                  title={c.label}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: c.hex ?? "var(--surface-soft)" }}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow">Disponibilidade</p>
        <div className="mt-3 space-y-2 text-sm text-foreground/80">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={search.pers} onChange={() => update({ pers: !search.pers })}
              className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]" />
            Personalizável
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={search.stock} onChange={() => update({ stock: !search.stock })}
              className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]" />
            Em estoque
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={search.order} onChange={() => update({ order: !search.order })}
              className="h-4 w-4 rounded border-border accent-[var(--brand-accent)]" />
            Sob encomenda
          </label>
        </div>
      </div>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-accent"
        >
          <X className="h-3 w-3" /> Limpar todos os filtros ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header className="mb-10">
        <p className="eyebrow">Produtos</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Produtos em impressão 3D</h1>
        <div className="brand-divider mt-3" />
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Sensoriais, decoração, utilidades, presentes, colecionáveis, articulados e organizadores.
          Use os filtros para encontrar a peça certa.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">{Filters}</aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros {activeCount > 0 && `(${activeCount})`}
              </button>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Carregando..." : `${filtered.length} produtos`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ordenar
              </label>
              <select
                value={search.sort}
                onChange={(e) => update({ sort: e.target.value as any })}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-8">
              <ProductGridSkeleton count={8} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 rounded-lg border border-dashed border-border py-16 text-center">
              <p className="font-display text-xl text-primary">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente ajustar os filtros.
              </p>
              <button
                onClick={clearAll}
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <ProductGrid products={pageItems} />
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    const active = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => navigate({ search: (p: typeof search) => ({ ...p, page }) })}
                        className={`h-9 min-w-9 rounded-md px-3 text-sm font-medium transition ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card text-foreground hover:border-accent"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-auto bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl text-primary">Filtros</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1 hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}
