import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Mountain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";

export const Route = createFileRoute("/produtores/$slug")({
  component: ProducerPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl">Produtor não encontrado</h1>
      <Link to="/produtores" className="mt-6 inline-flex text-sm font-semibold text-primary underline">
        Ver produtores
      </Link>
    </div>
  ),
});

function ProducerPage() {
  const { slug } = Route.useParams();

  const { data: producer } = useQuery({
    queryKey: ["producer", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producers")
        .select("*, farms(id, name, region, country, altitude_meters, description, cover_url)")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["producer-products", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price, compare_at_price, cover_url, score, badges, origin_region, origin_country, producers(name)",
        )
        .eq("producer_id", producer!.id)
        .eq("status", "active");
      if (error) throw error;
      return data as unknown as ProductCardData[];
    },
  });

  if (!producer) return null;

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[var(--espresso)] text-[oklch(0.95_0.02_80)]">
        {producer.cover_url && (
          <div
            className="absolute inset-0 -z-10 opacity-40"
            style={{
              backgroundImage: `url(${producer.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--espresso)] to-[var(--espresso)]/50" />
        <div className="container mx-auto px-4 py-20 md:px-6 md:py-28">
          <Link to="/produtores" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-white/70 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> Produtores
          </Link>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-[var(--gold)]">
            {producer.region ?? producer.state} · {producer.country}
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-6xl">{producer.name}</h1>
          {producer.description && (
            <p className="mt-5 max-w-2xl text-base text-white/85">{producer.description}</p>
          )}
        </div>
      </section>

      <div className="container mx-auto grid gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1fr_320px]">
        {/* Story */}
        <article className="space-y-6">
          {producer.story && (
            <>
              <p className="eyebrow">Nossa história</p>
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
                {producer.story}
              </p>
            </>
          )}

          {producer.farms && producer.farms.length > 0 && (
            <div className="mt-12">
              <p className="eyebrow">Fazendas</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {producer.farms.map((f: any) => (
                  <div key={f.id} className="overflow-hidden rounded-lg border border-border bg-card">
                    {f.cover_url && (
                      <div className="aspect-[16/9] bg-muted">
                        <img src={f.cover_url} alt={f.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-display text-lg text-primary">{f.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {f.region}, {f.country}
                        {f.altitude_meters && (
                          <>
                            <Mountain className="ml-2 h-3 w-3" /> {f.altitude_meters}m
                          </>
                        )}
                      </p>
                      {f.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-6">
          {producer.certifications && producer.certifications.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="eyebrow">Certificações</p>
              <ul className="mt-3 space-y-1 text-sm text-foreground/80">
                {producer.certifications.map((c: string) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-lg border border-border bg-[var(--sand)] p-5">
            <p className="eyebrow">Onde encontrar</p>
            <p className="mt-2 text-sm text-foreground/80">
              Cafés deste produtor estão disponíveis no nosso catálogo, com torra fresca e envio para todo o
              Brasil.
            </p>
          </div>
        </aside>
      </div>

      {/* Products */}
      {products && products.length > 0 && (
        <section className="border-t border-border bg-[var(--sand)] py-16">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow">Cafés deste produtor</p>
            <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">No catálogo</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
