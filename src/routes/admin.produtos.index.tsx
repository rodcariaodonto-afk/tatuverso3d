import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/admin/produtos/")({
  head: () => ({ meta: [{ title: "Admin · Cafés — Cafezeira" }] }),
  component: AdminProductsList,
});

function AdminProductsList() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      const roles = data?.map((r) => r.role) ?? [];
      return roles.includes("admin" as any) || roles.includes("support" as any);
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products", q],
    enabled: !!isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, status, stock_quantity, cover_url, producers(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  if (!user) return null;
  if (isAdmin === false) {
    return <div className="container mx-auto py-20 text-center text-sm text-muted-foreground">Acesso restrito.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Cafés</h1>
          <div className="gold-divider mt-3" />
        </div>
        <Link to="/admin/produtos/novo" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo café
        </Link>
      </div>

      <div className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Café</th>
              <th className="px-4 py-3 text-left">Produtor</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                    <span className="font-medium text-primary">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.producers?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                <td className="px-4 py-3 text-right">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to="/admin/produtos/$id/editar" params={{ id: p.id }} className="text-xs font-semibold text-primary hover:underline">
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Nenhum café encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
