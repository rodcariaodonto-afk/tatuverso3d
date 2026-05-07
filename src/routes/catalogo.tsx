import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import {
  CatalogProductCard,
} from "@/components/catalog/ProductCard";
import {
  applyCatalogFilters,
  useCatalogProducts,
  useCategories,
} from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.array(z.string()), []).default([]),
  roast: fallback(z.array(z.string()), []).default([]),
  origin: fallback(z.array(z.string()), []).default([]),
  pmax: fallback(z.number().nullable(), null).default(null),
  sub: fallback(z.boolean(), false).default(false),
  sort: fallback(
    z.enum(["featured", "price_asc", "price_desc", "score_desc", "newest"]),
    "featured",
  ).default("featured"),
  page: fallback(z.number().int().positive(), 1).default(1),
});

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de cafés especiais — Cafezeira" },
      {
        name: "description",
        content:
          "Explore microlotes premiados de produtores latino-americanos. Filtre por torra, processo, perfil e origem.",
      },
      { property: "og:title", content: "Catálogo Cafezeira" },
      { property: "og:description", content: "Cafés especiais com origem, curadoria e torra fresca." },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  component: CatalogPage,
});

const ROAST_LEVELS = [
  { value: "light", label: "Clara" },
  { value: "medium_light", label: "Média-clara" },
  { value: "medium", label: "Média" },
  { value: "medium_dark", label: "Média-escura" },
  { value: "dark", label: "Escura" },
];

const SORTS = [
  { value: "featured", label: "Destaques" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "score_desc", label: "Maior pontuação" },
  { value: "newest", label: "Mais recentes" },
] as const;

const PAGE_SIZE = 12;

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: products, isLoading } = useCatalogProducts();
  const { data: categories } = useCategories();

  const origins = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => {
      if (p.origin_region) set.add(p.origin_region);
    });
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return applyCatalogFilters(products, {
      search: search.q,
      categoryIds: search.cat,
      roastLevels: search.roast,
      origins: search.origin,
      priceMax: search.pmax ?? undefined,
      subscriptionOnly: search.sub,
      sort: search.sort,
    });
  }, [products, search]);

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

  const toggleArray = (key: "cat" | "roast" | "origin", v: string) => {
    const cur = (search[key] ?? []) as string[];
    update({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as any);
  };

  const clearAll = () =>
    navigate({
      search: {
        q: "",
        cat: [],
        roast: [],
        origin: [],
        pmax: null,
        sub: false,
        sort: "featured",
        page: 1,
      },
    });

  const activeCount =
    (search.q ? 1 : 0) +
    search.cat.length +
    search.roast.length +
    search.origin.length +
    (search.pmax ? 1 : 0) +
    (search.sub ? 1 : 0);

  const Filters = (
    <div className="space-y-8">
      <div>
        <label className="eyebrow">Buscar</label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Café, fazenda, região..."
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
                  className="h-4 w-4 rounded border-border accent-[var(--gold)]"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow">Torra</p>
        <div className="mt-3 space-y-2">
          {ROAST_LEVELS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={search.roast.includes(r.value)}
                onChange={() => toggleArray("roast", r.value)}
                className="h-4 w-4 rounded border-border accent-[var(--gold)]"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      {origins.length > 0 && (
        <div>
          <p className="eyebrow">Origem</p>
          <div className="mt-3 space-y-2 max-h-48 overflow-auto pr-1">
            {origins.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={search.origin.includes(o)}
                  onChange={() => toggleArray("origin", o)}
                  className="h-4 w-4 rounded border-border accent-[var(--gold)]"
                />
                {o}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow">Preço máximo</p>
        <div className="mt-3 space-y-2">
          {[60, 90, 120, 200].map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="radio"
                name="maxPrice"
                checked={search.pmax === v}
                onChange={() => update({ pmax: v })}
                className="h-4 w-4 accent-[var(--gold)]"
              />
              Até R$ {v}
            </label>
          ))}
          {search.pmax && (
            <button
              onClick={() => update({ pmax: null })}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Limpar preço
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={search.sub}
            onChange={(e) => update({ sub: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-[var(--gold)]"
          />
          Disponível para assinatura
        </label>
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
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Cafés especiais</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Microlotes selecionados de fazendas e torrefações da América Latina.
          Use os filtros para encontrar o perfil sensorial perfeito para você.
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
                {isLoading ? "Carregando..." : `${filtered.length} cafés`}
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
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 rounded-lg border border-dashed border-border py-16 text-center">
              <p className="font-display text-xl text-primary">Nenhum café encontrado</p>
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
              <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((p) => (
                  <CatalogProductCard key={p.id} product={p} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    const active = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => navigate({ search: (p) => ({ ...p, page }) })}
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
