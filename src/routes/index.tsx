import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";
import { tenantConfig } from "@/lib/tenant-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TatuVerso3D | Produtos criativos em impressão 3D" },
      {
        name: "description",
        content:
          "Produtos sensoriais, decoração, utilidades, presentes, colecionáveis e itens personalizados feitos em impressão 3D.",
      },
      { property: "og:title", content: "TatuVerso3D | Produtos criativos em impressão 3D" },
      {
        property: "og:description",
        content: "Um universo de ideias que ganham forma. Produtos criativos feitos em impressão 3D.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const CATEGORIES = [
  { name: "Sensoriais", desc: "Textura, movimento e foco para todas as idades.", q: "sensorial", icon: Hand },
  { name: "Decoração e Utilidades", desc: "Peças que deixam a casa com a sua cara.", q: "decoração", icon: Layers },
  { name: "Presentes Personalizados", desc: "Lembranças únicas com nome, cor e estilo.", q: "presente", icon: Gift },
  { name: "Colecionáveis", desc: "Séries e figuras para colecionar e trocar.", q: "colecionável", icon: Sparkles },
  { name: "Articulados", desc: "Peças que dobram, giram e surpreendem.", q: "articulado", icon: Boxes },
  { name: "Organização", desc: "Organizadores que resolvem o dia a dia.", q: "organizador", icon: Palette },
];

const BENEFITS = [
  { icon: Layers, title: "Feito com impressão 3D", desc: "Tecnologia e cuidado em cada camada." },
  { icon: MapPin, title: "Produção no Brasil", desc: "Criado e produzido por nós." },
  { icon: Palette, title: "Personalização", desc: "Cores e detalhes do seu jeito." },
  { icon: Truck, title: "Envio para todo o Brasil", desc: "Sua encomenda entregue com segurança." },
];

function HomePage() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["home", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price, compare_at_price, cover_url, badges",
        )
        .eq("status", "active")
        .eq("is_featured", true)
        .limit(8);
      if (error) throw error;
      return data as unknown as ProductCardData[];
    },
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-brand-dark text-[oklch(0.97_0.01_265)]">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 12% 10%, oklch(0.42 0.19 275) 0%, transparent 55%), radial-gradient(90% 80% at 88% 20%, oklch(0.5 0.2 330 / 0.55) 0%, transparent 60%), radial-gradient(80% 70% at 70% 95%, oklch(0.62 0.18 45 / 0.45) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-28">
          <div>
            <p className="eyebrow !text-[oklch(0.85_0.13_75)]">{tenantConfig.tagline}</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] md:text-6xl">
              Ideias que ganham forma.{" "}
              <span className="text-[oklch(0.82_0.14_75)]">Produtos que criam conexão.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
              Produtos criativos feitos em impressão 3D para brincar, sentir, organizar, decorar,
              presentear e colecionar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalogo"
                search={{ q: "" } as never}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
              >
                Explorar produtos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/personalizados"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
              >
                Quero personalizar
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-white/10 blur-2xl" aria-hidden />
            <div className="relative grid grid-cols-2 gap-3">
              {[
                { label: "Sensoriais", note: "Textura e movimento", Icon: Hand },
                { label: "Articulados", note: "Dobram e giram", Icon: Boxes },
                { label: "Decoração", note: "Sua casa com cara sua", Icon: Layers },
                { label: "Personalizados", note: "Nome, cor e escala", Icon: Palette },
              ].map(({ label, note, Icon }, i) => (
                <div
                  key={label}
                  className={`rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur ${
                    i % 3 === 0 ? "translate-y-4" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.82_0.14_75)] text-[oklch(0.2_0.06_275)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-display text-lg">{label}</p>
                  <p className="mt-1 text-xs text-white/70">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-border bg-surface-soft">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Explore o universo</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Categorias em destaque</h2>
          <div className="brand-divider mx-auto mt-3" />
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              to="/catalogo"
              search={{ q: c.q } as never}
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 line-clamp-2 min-h-[1.6em] font-display text-xl leading-tight text-foreground">
                {c.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-[2.5em] text-sm leading-tight text-muted-foreground">
                {c.desc}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
                Ver produtos <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="bg-surface-soft py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Em destaque</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl">Favoritos do TatuVerso</h2>
              <div className="brand-divider mt-3" />
              <p className="mt-3 text-sm text-muted-foreground">
                Produtos criativos que estão conquistando todo mundo.
              </p>
            </div>
            <Link
              to="/catalogo"
              search={{ q: "" } as never}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Ver todos os produtos →
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (featured ?? []).length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <p className="font-display text-xl text-primary">Novidades chegando</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Estamos preparando as primeiras peças do TatuVerso. Enquanto isso, você já pode
                pedir algo personalizado.
              </p>
              <Link
                to="/personalizados"
                className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-foreground"
              >
                Quero personalizar
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(featured ?? []).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SENSORIAL */}
      <section className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6">
        <div>
          <p className="eyebrow">Linha sensorial</p>
          <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">
            Sentir, explorar e se conectar
          </h2>
          <div className="brand-divider mt-3" />
          <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/80">
            Nossa linha sensorial foi pensada para proporcionar experiências táteis, movimento, foco
            e diversão. Produtos criados com atenção aos detalhes e respeito às diferentes formas de
            perceber o mundo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/catalogo"
              search={{ q: "sensorial" } as never}
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110"
            >
              Conhecer a linha sensorial
            </Link>
            <Link
              to="/sobre"
              className="rounded-full border border-border px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary hover:bg-muted"
            >
              Entenda nossa proposta
            </Link>
          </div>
          <p className="mt-5 max-w-lg text-xs text-muted-foreground">
            Cada pessoa possui necessidades e preferências sensoriais diferentes. Nossos produtos
            não substituem acompanhamento profissional.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["Textura", "Movimento", "Foco", "Calma"].map((t, i) => (
            <div
              key={t}
              className={`rounded-3xl border border-border bg-surface-highlight p-8 text-center ${
                i % 2 === 1 ? "translate-y-6" : ""
              }`}
            >
              <Hand className="mx-auto h-7 w-7 text-primary" />
              <p className="mt-3 font-display text-lg text-primary">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PERSONALIZAÇÃO */}
      <section className="bg-brand-dark py-20 text-[oklch(0.96_0.01_265)]">
        <div className="container mx-auto grid items-center gap-10 px-4 md:grid-cols-[1.2fr_0.8fr] md:px-6">
          <div>
            <p className="eyebrow !text-[oklch(0.85_0.13_75)]">Sob encomenda</p>
            <h2 className="mt-2 font-display text-3xl md:text-5xl">Você imagina. A gente dá forma.</h2>
            <p className="mt-4 max-w-xl text-white/80">
              Escolha cores, detalhes e personalizações para criar presentes, lembranças, itens
              decorativos e produtos únicos.
            </p>
          </div>
          <Link
            to="/personalizados"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground md:justify-self-end"
          >
            Solicitar personalização <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* SOBRE */}
      <section className="container mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
        <p className="eyebrow">Nossa história</p>
        <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">Bem-vindo ao TatuVerso</h2>
        <div className="brand-divider mx-auto mt-3" />
        <p className="mt-6 text-base leading-relaxed text-foreground/80">
          Somos uma família transformando criatividade, tecnologia e propósito em produtos impressos
          em 3D. Cada peça nasce de uma ideia, ganha forma camada por camada e chega até você
          carregando um pouco do nosso universo.
        </p>
        <Link
          to="/sobre"
          className="mt-7 inline-flex rounded-full border border-border px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary hover:bg-muted"
        >
          Conheça nossa história
        </Link>
      </section>

      {/* PROVA SOCIAL */}
      <section className="bg-surface-soft py-16">
        <div className="container mx-auto max-w-2xl px-4 text-center md:px-6">
          <h2 className="font-display text-3xl text-primary md:text-4xl">
            Quem entra no TatuVerso quer voltar
          </h2>
          <div className="brand-divider mx-auto mt-3" />
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda não temos avaliações publicadas por aqui. Assim que os primeiros pedidos chegarem
            às casas de vocês, as opiniões reais aparecem neste espaço.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-20 text-center md:px-6">
        <h2 className="font-display text-3xl text-primary md:text-5xl">
          Qual ideia vamos transformar hoje?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/catalogo"
            search={{ q: "" } as never}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110"
          >
            Ver todos os produtos
          </Link>
          <Link
            to="/personalizados"
            className="rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground hover:brightness-110"
          >
            Criar algo personalizado
          </Link>
        </div>
      </section>
    </div>
  );
}
