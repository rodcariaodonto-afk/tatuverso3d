import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Gift,
  Hand,
  Layers,
  MapPin,
  Palette,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  applyCatalogFilters,
  useCatalogProducts,
  useSalesCounts,
} from "@/hooks/useProducts";
import { ProductSection } from "@/components/catalog/ProductRail";
import { LogoShowcase } from "@/components/brand/LogoShowcase";
import { tenantConfig } from "@/lib/tenant-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TatuVerso3D | Loja de produtos criativos em impressão 3D" },
      {
        name: "description",
        content:
          "Marketplace da TatuVerso3D: sensoriais, articulados, decoração, colecionáveis e presentes personalizados feitos em impressão 3D, com envio para todo o Brasil.",
      },
      { property: "og:title", content: "TatuVerso3D | Loja de produtos em impressão 3D" },
      {
        property: "og:description",
        content:
          "Um universo de ideias que ganham forma: sensoriais, articulados, decoração e personalizados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const CATEGORY_TILES = [
  { name: "Sensoriais", type: "sensory", icon: Hand },
  { name: "Articulados", type: "articulated", icon: Boxes },
  { name: "Decoração", type: "decoration", icon: Layers },
  { name: "Colecionáveis", type: "collectible", icon: Sparkles },
  { name: "Presentes", type: "gift", icon: Gift },
  { name: "Organização", type: "organizer", icon: Palette },
];

const BENEFITS = [
  { icon: Truck, title: "Envio para todo o Brasil", desc: "Rastreio em cada pedido." },
  { icon: Layers, title: "Impressão 3D real", desc: "Camada por camada, no capricho." },
  { icon: Palette, title: "Personalizável", desc: "Cor, nome e detalhes do seu jeito." },
  { icon: MapPin, title: "Feito por makers", desc: "Produção nacional e artesanal." },
];

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: products, isLoading } = useCatalogProducts();
  const { data: salesCounts } = useSalesCounts();

  const all = products ?? [];

  const featured = useMemo(
    () => applyCatalogFilters(all, { sort: "featured" }).filter((p) => p.is_featured).slice(0, 8),
    [all],
  );
  const newest = useMemo(
    () => applyCatalogFilters(all, { sort: "newest" }).slice(0, 4),
    [all],
  );
  const bestSellers = useMemo(
    () => applyCatalogFilters(all, { sort: "best_sellers", salesCounts }).slice(0, 4),
    [all, salesCounts],
  );
  const personalizable = useMemo(
    () => all.filter((p) => p.is_personalizable).slice(0, 4),
    [all],
  );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/catalogo", search: { q } as never });
  };

  return (
    <div className="bg-background">
      {/* HERO — faixa cósmica compacta com busca */}
      <section className="relative isolate overflow-hidden bg-brand-dark text-[oklch(0.97_0.01_265)]">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 12% 10%, oklch(0.42 0.19 275) 0%, transparent 55%), radial-gradient(90% 80% at 88% 20%, oklch(0.5 0.2 330 / 0.5) 0%, transparent 60%), radial-gradient(80% 70% at 70% 95%, oklch(0.62 0.18 45 / 0.4) 0%, transparent 60%)",
          }}
        />
        <div className="container mx-auto px-4 py-12 md:px-6 md:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
            <div className="min-w-0">
              <p className="eyebrow text-[oklch(0.85_0.06_60)]">{tenantConfig.tagline}</p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight md:text-5xl">
                Ideias que ganham forma. Produtos que criam conexão.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[oklch(0.9_0.02_265)] md:text-base">
                Peças sensoriais, articuladas, decorativas e personalizadas feitas em impressão 3D.
              </p>

              {/* Logo 3D — no mobile aparece entre a descrição e a busca */}
              <div className="mt-6 flex justify-center lg:hidden">
                <LogoShowcase />
              </div>

              <form onSubmit={submitSearch} className="mt-6 max-w-xl">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <div className="relative min-w-0">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar fidget, chaveiro, tatu, organizador..."
                      aria-label="Buscar produtos"
                      className="h-12 w-full rounded-full border border-transparent bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 shrink-0 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
                  >
                    Buscar
                  </button>
                </div>
              </form>
            </div>

            {/* Coluna direita — desktop/tablet largo */}
            <div className="hidden justify-center lg:flex">
              <LogoShowcase />
            </div>
          </div>

          {/* Tiras de categoria */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
            {CATEGORY_TILES.map((c) => (
              <Link
                key={c.type}
                to="/catalogo"
                search={{ type: [c.type] } as never}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[oklch(1_0_0_/_0.08)] p-3 text-center backdrop-blur transition hover:bg-[oklch(1_0_0_/_0.16)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/90 text-accent-foreground">
                  <c.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>

      </section>

      {/* BENEFÍCIOS */}
      <section className="border-b border-border bg-surface-soft">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4 md:px-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <b.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
                  {b.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VITRINES */}
      <ProductSection
        eyebrow="Favoritos da órbita"
        title="Destaques"
        linkTo="/catalogo"
        isLoading={isLoading}
        products={featured}
      />

      <ProductSection
        eyebrow="Recém-saídos da impressora"
        title="Novidades"
        linkTo="/catalogo"
        linkSearch={{ sort: "newest" }}
        isLoading={isLoading}
        products={newest}
      />

      <ProductSection
        eyebrow="Escolha da galera"
        title="Mais vendidos"
        linkTo="/catalogo"
        linkSearch={{ sort: "best_sellers" }}
        isLoading={isLoading}
        products={bestSellers}
      />

      <ProductSection
        eyebrow="Do seu jeito"
        title="Personalizáveis"
        linkTo="/catalogo"
        linkSearch={{ pers: true }}
        isLoading={isLoading}
        products={personalizable}
      />

      {!isLoading && all.length === 0 && (
        <section className="container mx-auto px-4 pb-12 md:px-6">
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-display text-xl text-primary">Vitrine em preparação</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os primeiros produtos entram em órbita em breve.
            </p>
          </div>
        </section>
      )}

      {/* CTA PERSONALIZADOS */}
      <section className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid items-center gap-6 overflow-hidden rounded-3xl bg-brand-dark p-8 text-[oklch(0.97_0.01_265)] md:grid-cols-[1.2fr_auto] md:p-12">
          <div className="min-w-0">
            <p className="eyebrow text-[oklch(0.85_0.06_60)]">Projetos sob medida</p>
            <h2 className="mt-2 font-display text-2xl md:text-3xl">
              Tem uma ideia? A gente imprime.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[oklch(0.9_0.02_265)]">
              Brindes corporativos, lembranças de eventos, peças com logo, nome ou cor exclusiva.
              Conte o que você precisa e montamos um orçamento.
            </p>
          </div>
          <Link
            to="/personalizados"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
          >
            Pedir personalizado <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
