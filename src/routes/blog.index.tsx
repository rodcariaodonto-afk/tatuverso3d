import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Cafezeira" },
      { name: "description", content: "Histórias, guias e curiosidades sobre cafés especiais." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { data: posts } = useQuery({
    queryKey: ["blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_url, category, author_name, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header>
        <p className="eyebrow">Blog</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Histórias e guias</h1>
        <div className="gold-divider mt-3" />
      </header>
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {(posts ?? []).map((p) => (
          <Link
            key={p.id}
            to="/blog/$slug"
            params={{ slug: p.slug }}
            className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/60"
          >
            <div className="aspect-[16/10] bg-muted">
              {p.cover_url && <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
            </div>
            <div className="flex flex-1 flex-col p-5">
              {p.category && <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">{p.category}</p>}
              <h2 className="mt-1 font-display text-xl text-primary">{p.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">
                {p.author_name} ·{" "}
                {p.published_at && new Date(p.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
