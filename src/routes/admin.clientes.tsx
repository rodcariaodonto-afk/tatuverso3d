import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Admin Cafe EX" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = (profiles ?? []).filter((p: any) =>
    !search ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Pessoas</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Clientes</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">{profiles?.length ?? 0} perfis cadastrados</p>
        </header>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="mt-6 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        />

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Telefone</th>
                  <th className="px-4 py-3 text-left">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-primary">{p.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
