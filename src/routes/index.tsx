import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Coffee, Leaf, Award, Truck, Sparkles, Package as PackageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ["home", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, short_description, price, compare_at_price, cover_url, score, badges, origin_region, origin_country, producers(name)")
        .eq("status", "active")
        .eq("is_featured", true)
        .limit(8);
      if (error) throw error;
      return data as unknown as ProductCardData[];
    },
  });

  const { data: producers } = useQuery({
    queryKey: ["home", "producers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producers")
        .select("id, slug, name, description, region, state, country, cover_url, logo_url")
        .eq("status", "active")
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: siteImages } = useQuery({
    queryKey: ["home", "site_images"],
    queryFn: async () => {
      const { data } = await supabase.from("site_images").select("key, url, alt");
      const map: Record<string, { url: string; alt: string }> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = { url: r.url, alt: r.alt }));
      return map;
    },
  });
  const img = (key: string, fallback: string, fallbackAlt = "") => ({
    url: siteImages?.[key]?.url || fallback,
    alt: siteImages?.[key]?.alt || fallbackAlt,
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[oklch(0.16_0.03_45)] text-[oklch(0.95_0.02_80)]">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.13_0.03_45)]/95 via-[oklch(0.16_0.03_45)]/85 to-[oklch(0.22_0.045_45)]/70" />

        <div className="container mx-auto px-4 py-24 md:px-6 md:py-36">
          <div className="max-w-2xl">
            <p className="eyebrow !text-[var(--gold)]">Cafezeira · cafés especiais da Mantiqueira</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl lg:text-7xl">
              Compre, assine e crie cafés <em className="text-[var(--gold)] not-italic">com a sua marca</em>.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              A Cafezeira é especialista em cafés 100% arábica da Serra da Mantiqueira. Curadoria de
              microlotes, assinatura mensal e private label para empresas que querem cafés
              corporativos com identidade própria.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--espresso)] transition hover:brightness-110"
              >
                Explorar cafés <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/private-label"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
              >
                Café com sua marca
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-xs uppercase tracking-wider text-white/60">
              <div><span className="block font-display text-2xl text-[var(--gold)] normal-case tracking-normal">B2C</span>Cafés especiais</div>
              <div><span className="block font-display text-2xl text-[var(--gold)] normal-case tracking-normal">Clube</span>Assinatura mensal</div>
              <div><span className="block font-display text-2xl text-[var(--gold)] normal-case tracking-normal">B2B</span>Private label</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-border bg-[var(--sand)]">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          {[
            { icon: Coffee, title: "Curadoria sensorial", desc: "Selecionamos cafés com perfis únicos e pontuação alta." },
            { icon: Leaf, title: "Origem rastreável", desc: "Cada lote traz fazenda, altitude, variedade e processo." },
            { icon: Award, title: "Torra fresca", desc: "Enviado em até 14 dias após a torra." },
            { icon: Truck, title: "Frete em todo o Brasil", desc: "Entregamos com cuidado e rapidez." },
          ].map((b) => (
            <div key={b.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-primary">{b.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Curadoria do mês</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Cafés em destaque</h2>
            <div className="gold-divider mt-3" />
          </div>
          <Link to="/catalogo" className="hidden text-sm font-semibold text-primary underline-offset-4 hover:underline md:inline-flex">
            Ver catálogo completo →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(featured ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* SUBSCRIPTION */}
      <section className="bg-[oklch(0.22_0.045_45)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2 md:px-6">
          <div>
            <p className="eyebrow !text-[var(--gold)]">Assinatura Cafezeira</p>
            <h2 className="mt-2 font-display text-3xl md:text-5xl">Receba microlotes premiados todos os meses.</h2>
            <p className="mt-4 max-w-lg text-white/80">
              Três planos pensados para iniciantes e exploradores: Descoberta, Gourmet e Premium. Curadoria sazonal, cancele quando quiser.
            </p>
            <Link
              to="/assinatura"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--espresso)] hover:brightness-110"
            >
              Conhecer planos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["1559525839","1572286258","1611854779"].map((id, i) => (
              <img
                key={id}
                src={`https://images.unsplash.com/photo-${id === "1559525839" ? "1559525839-d9acfd03b6ce" : id === "1572286258" ? "1572286258-217cf8e6f3c3" : "1611854779-393-1b2da9d400fe"}?auto=format&fit=crop&w=600&q=80`}
                alt=""
                className={`aspect-[3/4] w-full rounded-md object-cover ${i === 1 ? "translate-y-6" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRIVATE LABEL B2B */}
      <section className="bg-[var(--cream)]">
        <div className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-[3/4] rounded-md bg-[oklch(0.22_0.045_45)]" />
            <div className="aspect-[3/4] translate-y-6 rounded-md bg-[var(--gold)]" />
            <div className="aspect-[3/4] translate-y-3 rounded-md bg-[oklch(0.35_0.05_45)]" />
            <div className="aspect-[3/4] -translate-y-3 rounded-md bg-[var(--espresso)]" />
          </div>
          <div>
            <p className="eyebrow">Para empresas · Private Label</p>
            <h2 className="mt-2 font-display text-3xl text-primary md:text-5xl">
              Café especial com a sua marca.
            </h2>
            <p className="mt-4 max-w-lg text-primary/80">
              Curadoria de grãos, embalagem personalizada, design de marca e produção artesanal para
              presentes corporativos, brindes e cafés institucionais. A partir de 30 unidades.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-primary/80">
              <span className="inline-flex items-center gap-2"><PackageIcon className="h-4 w-4 text-[var(--gold)]" /> Embalagem premium</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--gold)]" /> Branding exclusivo</span>
              <span className="inline-flex items-center gap-2"><Coffee className="h-4 w-4 text-[var(--gold)]" /> 100% arábica</span>
            </div>
            <Link
              to="/private-label"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Solicitar orçamento <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCERS */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Quem está por trás</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Produtores em destaque</h2>
          <div className="gold-divider mx-auto mt-3" />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Fazendas e torrefações latino-americanas selecionadas pela qualidade e cuidado com cada etapa.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(producers ?? []).map((p) => (
            <Link
              key={p.id}
              to="/produtores/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/60"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {p.cover_url && (
                  <img src={p.cover_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.region ?? p.state} · {p.country}</p>
                <h3 className="mt-1 font-display text-lg text-foreground">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SELL CTA */}
      <section className="bg-[var(--cream)]">
        <div className="container mx-auto grid gap-8 px-4 py-16 md:grid-cols-[2fr_1fr] md:items-center md:px-6">
          <div>
            <p className="eyebrow">Para produtores</p>
            <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">Venda na Cafezeira.</h2>
            <p className="mt-3 max-w-xl text-sm text-primary/80 md:text-base">
              Conectamos sua fazenda ou torrefação a uma comunidade apaixonada por café. Painel próprio, curadoria, ferramentas de venda e assinatura mensal acessível.
            </p>
          </div>
          <Link
            to="/vender-na-plataforma"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 md:justify-self-end"
          >
            Quero vender <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
