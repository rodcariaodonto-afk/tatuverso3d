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
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <p className="eyebrow text-[oklch(0.85_0.06_60)]">{tenantConfig.tagline}</p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight md:text-5xl">
                Ideias que ganham forma. Produtos que criam conexão.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[oklch(0.9_0.02_265)] md:text-base">
                Peças sensoriais, articuladas, decorativas e personalizadas feitas em impressão 3D.
              </p>
            </div>

            {/* Logo 3D — mobile/tablet entre a descrição e a busca; desktop à direita */}
            <div className="flex justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
              <LogoShowcase />
            </div>

            <form
              onSubmit={submitSearch}
              className="max-w-xl lg:col-start-1 lg:row-start-2 lg:w-full"
            >
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

      {/* BANNER DE CRIAÇÃO PERSONALIZADA */}
      <section className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-dark px-6 py-10 text-[oklch(0.97_0.01_265)] shadow-xl md:px-12 md:py-14">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(70% 120% at 0% 50%, oklch(0.48 0.2 275 / 0.85) 0%, transparent 65%), radial-gradient(55% 110% at 100% 30%, oklch(0.65 0.2 45 / 0.72) 0%, transparent 68%)",
            }}
          />
          <div className="absolute -right-10 -top-14 -z-10 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -bottom-24 right-20 -z-10 h-56 w-56 rounded-full border border-white/10" />

          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[oklch(0.9_0.08_60)] backdrop-blur">
                <Sparkles className="h-4 w-4" /> Criação personalizada
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl leading-tight md:text-4xl lg:text-5xl">
                Tem uma ideia e não sabe como transformá-la em realidade?
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[oklch(0.91_0.02_265)] md:text-base">
                Conte para a gente. Criamos sua peça em impressão 3D do zero, com o tamanho, as
                cores e os detalhes que você imaginou.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/85">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Projeto sob medida
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Orçamento personalizado
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Produção exclusiva
                </span>
              </div>
            </div>

            <Link
              to="/personalizados"
              className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-full bg-accent px-7 py-4 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Transformar minha ideia
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
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
    </div>
  );
}
