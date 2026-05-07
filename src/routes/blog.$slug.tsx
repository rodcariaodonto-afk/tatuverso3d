import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/$slug")({
  component: PostPage,
  notFoundComponent: () => (
    <div className="container mx-auto py-20 text-center">
      <h1 className="font-display text-3xl">Artigo não encontrado</h1>
      <Link to="/blog" className="mt-6 inline-flex font-semibold text-primary underline">Ver blog</Link>
    </div>
  ),
});

function PostPage() {
  const { slug } = Route.useParams();

  const { data: post } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (!post) return null;

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 md:px-6">
      <Link to="/blog" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Blog
      </Link>
      {post.category && <p className="eyebrow mt-6 !text-[var(--gold)]">{post.category}</p>}
      <h1 className="mt-3 font-display text-4xl text-primary md:text-5xl">{post.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {post.author_name} ·{" "}
        {post.published_at && new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </p>
      {post.cover_url && (
        <div className="mt-8 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}
      {post.excerpt && <p className="mt-8 text-lg leading-relaxed text-foreground/85">{post.excerpt}</p>}
      {post.body && (
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/85">{post.body}</div>
      )}
    </article>
  );
}
