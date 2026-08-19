import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCreateUser, adminPromoteUser, adminSetTemporaryPassword } from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Admin TatuVerso3D" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const qc = useQueryClient();
  const createUserFn = useServerFn(adminCreateUser);
  const setTemporaryPasswordFn = useServerFn(adminSetTemporaryPassword);
  const promoteUserFn = useServerFn(adminPromoteUser);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; label: string } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at, preferences")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: () => createUserFn({ data: { fullName, email, password, makeAdmin: true } }),
    onSuccess: () => {
      toast.success("Usuário admin criado", { description: "Ele já pode entrar com a senha temporária." });
      setFullName("");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (error) => toast.error("Não foi possível criar o usuário", { description: error.message }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => {
      if (!resetTarget) throw new Error("Selecione um usuário.");
      return setTemporaryPasswordFn({ data: { userId: resetTarget.id, password: temporaryPassword } });
    },
    onSuccess: () => {
      toast.success("Senha temporária definida", { description: "No próximo acesso, o usuário deverá trocar a senha." });
      setResetTarget(null);
      setTemporaryPassword("");
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (error) => toast.error("Não foi possível trocar a senha", { description: error.message }),
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => promoteUserFn({ data: { userId } }),
    onSuccess: () => toast.success("Usuário promovido a admin"),
    onError: (error) => toast.error("Não foi possível promover", { description: error.message }),
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
          <div className="brand-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">{profiles?.length ?? 0} perfis cadastrados</p>
        </header>

        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-2xl text-primary">Criar usuário admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use uma senha temporária e informe ao usuário por um canal seguro.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate();
            }}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]"
          >
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com.br"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha temporária"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              disabled={createUserMutation.isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {createUserMutation.isPending ? "Criando..." : "Criar admin"}
            </button>
          </form>
        </section>

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
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-primary">{p.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => promoteMutation.mutate(p.id)}
                          disabled={promoteMutation.isPending}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary hover:bg-muted disabled:opacity-60"
                        >
                          Tornar admin
                        </button>
                        <button
                          onClick={() => setResetTarget({ id: p.id, label: p.email ?? p.full_name ?? "usuário" })}
                          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Senha temporária
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate();
              }}
              className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl"
            >
              <h2 className="font-display text-2xl text-primary">Definir senha temporária</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Usuário: <span className="font-medium text-foreground">{resetTarget.label}</span>
              </p>
              <input
                required
                type="password"
                minLength={8}
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Nova senha temporária"
                className="mt-5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setTemporaryPassword("");
                  }}
                  className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  disabled={resetPasswordMutation.isPending}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {resetPasswordMutation.isPending ? "Salvando..." : "Salvar senha"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
