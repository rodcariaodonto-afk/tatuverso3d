import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";

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
];

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [roast, setRoast] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price, compare_at_price, cover_url, score, badges, origin_region, origin_country, roast_level, is_featured, created_at, producers(name)",
        )
        .eq("status", "active");
      if (error) throw error;
      return data as unknown as (ProductCardData & {
        roast_level: string | null;
        is_featured: boolean;
        created_at: string;
      })[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let list = (products ?? []).slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q) ||
          p.producers?.name.toLowerCase().includes(q),
      );
    }
    if (roast.length) list = list.filter((p) => p.roast_level && roast.includes(p.roast_level));
    if (maxPrice) list = list.filter((p) => p.price <= maxPrice);

    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "score_desc":
        list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        break;
      case "newest":
        list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
        break;
      default:
        list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return list;
  }, [products, search, roast, maxPrice, sort]);

  const toggleRoast = (v: string) =>
    setRoast((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header className="mb-10">
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Cafés especiais</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Microlotes selecionados de fazendas e torrefações da América Latina. Use os filtros para encontrar
          o perfil sensorial perfeito para você.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* SIDEBAR */}
        <aside className="space-y-8">
          <div>
            <label className="eyebrow">Buscar</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Café, fazenda, região..."
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="eyebrow">Torra</p>
            <div className="mt-3 space-y-2">
              {ROAST_LEVELS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={roast.includes(r.value)}
                    onChange={() => toggleRoast(r.value)}
                    className="h-4 w-4 rounded border-border accent-[var(--gold)]"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Preço máximo</p>
            <div className="mt-3 space-y-2">
              {[60, 90, 120, 200].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="radio"
                    name="maxPrice"
                    checked={maxPrice === v}
                    onChange={() => setMaxPrice(v)}
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  Até R$ {v}
                </label>
              ))}
              <button
                onClick={() => setMaxPrice(null)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Limpar preço
              </button>
            </div>
          </div>

          {categories && categories.length > 0 && (
            <div>
              <p className="eyebrow">Categorias</p>
              <ul className="mt-3 space-y-1 text-sm">
                {categories.map((c) => (
                  <li key={c.id} className="text-foreground/70">
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* RESULTS */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filtered.length} cafés encontrados`}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Ordenar</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
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

          {filtered.length === 0 && !isLoading ? (
            <div className="mt-16 rounded-lg border border-dashed border-border py-16 text-center">
              <p className="font-display text-xl text-primary">Nenhum café encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente ajustar os filtros.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
