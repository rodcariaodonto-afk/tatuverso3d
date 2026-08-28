import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  Boxes,
  Gift,
  Hand,
  Layers,
  MapPin,
  Palette,
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
import dentistasAsset from "@/assets/dentistas-3d.png.asset.json";

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
  {
    icon: Truck,
    title: "Envio para todo o Brasil",
    desc: "Rastreio em tempo real, do pedido à sua porta.",
  },
  {
    icon: Layers,
    title: "100% personalizável",
    desc: "Cor, nome e tamanho, tudo do seu jeito.",
  },
  {
    icon: Palette,
    title: "Feito à mão",
    desc: "Impressão 3D real, camada por camada, no capricho.",
  },
  {
    icon: MapPin,
    title: "Produção artesanal brasileira",
    desc: "Feito por makers, peça por peça.",
  },
];

function HomePage() {
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

  return (
    <div className="bg-background">
      {/* HERO: faixa cósmica compacta */}
      <section className="relative isolate overflow-hidden bg-brand-dark text-[oklch(0.97_0.01_265)]">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 12% 10%, oklch(0.42 0.19 275) 0%, transparent 55%), radial-gradient(90% 80% at 88% 20%, oklch(0.5 0.2 330 / 0.5) 0%, transparent 60%), radial-gradient(80% 70% at 70% 95%, oklch(0.62 0.18 45 / 0.4) 0%, transparent 60%)",
          }}
        />
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <p className="eyebrow text-[oklch(0.85_0.06_60)]">+2.000 peças entregues no Brasil</p>
              <h1 className="mt-2 max-w-3xl font-display text-3xl leading-tight md:text-4xl">
                Produtos 3D únicos, do seu jeito: do fidget que acalma ao presente que ninguém
                mais tem
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[oklch(0.9_0.02_265)] md:text-base">
                Sensoriais, articulados, decoração e presentes personalizados, feitos sob medida,
                com cor, nome e detalhes do seu jeito. Envio para todo o Brasil.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/catalogo"
                  search={{ sort: "best_sellers" } as never}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
                >
                  Ver mais vendidos
                </Link>
                <Link
                  to="/personalizados"
                  data-track="home-hero:personalize"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/45 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
                >
                  Criar o meu personalizado
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:col-start-2 lg:row-start-1 lg:self-center">
              <LogoShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* NAVEGAÇÃO SECUNDÁRIA POR CATEGORIA */}
      <section className="bg-brand-dark text-[oklch(0.97_0.01_265)]">
        <div className="container mx-auto grid grid-cols-3 gap-2 px-4 pb-5 sm:gap-3 md:grid-cols-6 md:px-6">
          {CATEGORY_TILES.map((c) => (
            <Link
              key={c.type}
              to="/catalogo"
              search={{ type: [c.type] } as never}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-[oklch(1_0_0_/_0.08)] p-2.5 text-center backdrop-blur transition hover:bg-[oklch(1_0_0_/_0.16)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/90 text-accent-foreground">
                <c.icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* BANNER DE CRIAÇÃO PERSONALIZADA */}
      <section className="container mx-auto px-4 py-5 md:px-6 md:py-7">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-dark px-6 py-8 text-[oklch(0.97_0.01_265)] shadow-xl md:px-12 md:py-10">
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
                <Sparkles className="h-4 w-4" /> Sob encomenda
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl leading-tight md:text-4xl lg:text-5xl">
                Tem uma ideia na cabeça? A gente imprime do jeito que você imaginou.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[oklch(0.91_0.02_265)] md:text-base">
                Manda o tamanho, a cor e a referência. Nossa equipe modela e imprime sua peça do
                zero. Orçamento em até 24h, sem compromisso.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/85">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Orçamento grátis em 24h
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Você aprova antes de produzir
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  Peça única, feita só pra você
                </span>
              </div>
            </div>

            <Link
              to="/personalizados"
              data-track="home-cta:orcamento"
              className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-full bg-accent px-7 py-4 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Pedir meu orçamento
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* SPOTLIGHT PARA DENTISTAS */}
      <section className="container mx-auto px-4 py-5 md:px-6 md:py-7">
        <div className="overflow-hidden rounded-3xl bg-brand-dark shadow-xl">
          <img
            src={dentistasAsset.url}
            alt="Peças 3D personalizadas para dentistas: molde de dente anatômico, porta escovas, plaquinhas e chaveiros"
            className="block h-auto w-full"
            loading="lazy"
          />
          <div className="flex flex-col items-start justify-between gap-4 px-6 py-5 text-[oklch(0.97_0.01_265)] sm:flex-row sm:items-center md:px-8">
            <p className="max-w-xl text-sm leading-relaxed text-[oklch(0.91_0.02_265)] md:text-base">
              Peças 3D sob encomenda para o seu consultório, na cor e no acabamento que você
              escolher.
            </p>
            <Link
              to="/personalizados"
              data-track="home-dentistas:orcamento"
              className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-full bg-accent px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Pedir meu orçamento
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="border-y border-border bg-surface-soft">
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
        eyebrow="Os favoritos"
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
        eyebrow="Os mais vendidos"
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
