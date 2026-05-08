import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [{ title: "Recuperar senha — Café EX" }],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não conseguimos enviar o email", { description: error.message });
      return;
    }
    setSent(true);
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-16 md:px-6">
      <h1 className="font-display text-3xl text-primary md:text-4xl">Recuperar senha</h1>
      <div className="gold-divider mt-3" />
      {sent ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm">
          <p className="font-semibold text-primary">Pronto!</p>
          <p className="mt-2 text-muted-foreground">
            Se houver uma conta para esse email, enviamos um link para redefinir a senha.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-primary underline">
            Voltar para entrar
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Informe o email da sua conta. Vamos enviar um link para você redefinir a senha.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
    </div>
  );
}
