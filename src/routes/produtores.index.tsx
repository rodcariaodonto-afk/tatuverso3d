import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/produtores/")({
  head: () => ({
    meta: [
      { title: "Produtores — Cafe EX" },
      {
        name: "description",
        content:
          "Conheça as fazendas e torrefações latino-americanas selecionadas pela Cafe EX.",
      },
      { property: "og:title", content: "Produtores Cafe EX" },
      { property: "og:description", content: "Histórias de fazendas e torrefações." },
    ],
  }),
  component: ProducersPage,
});

function ProducersPage() {
  const { data: producers } = useQuery({
    queryKey: ["producers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producers")
        .select("id, slug, name, description, region, state, country, cover_url, logo_url, certifications")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header>
        <p className="eyebrow">Produtores</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Histórias por trás do café</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Famílias e cooperativas que cultivam, processam e torram com cuidado obsessivo. Conheça quem está
          por trás de cada xícara.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(producers ?? []).map((p) => (
          <Link
            key={p.id}
            to="/produtores/$slug"
            params={{ slug: p.slug }}
            className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/60"
          >
            <div className="aspect-[16/9] overflow-hidden bg-muted">
              {p.cover_url && (
                <img src={p.cover_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {p.region ?? p.state} · {p.country}
              </p>
              <h2 className="mt-1 font-display text-xl text-primary">{p.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
              {p.certifications && p.certifications.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.certifications.slice(0, 3).map((c: string) => (
                    <span key={c} className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
