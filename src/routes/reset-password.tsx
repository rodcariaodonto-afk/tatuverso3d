import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — Cafe EX" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/minha-conta" });
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-16 md:px-6">
      <h1 className="font-display text-3xl text-primary md:text-4xl">Definir nova senha</h1>
      <div className="gold-divider mt-3" />
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          disabled={loading}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
