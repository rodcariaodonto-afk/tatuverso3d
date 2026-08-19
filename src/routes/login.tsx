import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TatuVerso3D" },
      { name: "description", content: "Acesse sua conta TatuVerso3D." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mounted || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não conseguimos entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    router.invalidate();
    navigate({ to: "/minha-conta" });
  };

  const onGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-16 md:px-6">
      <p className="eyebrow text-center">Bem-vindo</p>
      <h1 className="mt-2 text-center font-display text-3xl text-primary md:text-4xl">Entrar na TatuVerso3D</h1>
      <div className="brand-divider mx-auto mt-3" />

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <Link to="/recuperar-senha" className="mt-1 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <button
          disabled={loading}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="bg-card px-2">ou</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
        </div>
        <button
          type="button"
          onClick={onGoogle}
          className="w-full rounded-full border border-border bg-background py-3 text-sm font-medium hover:bg-muted"
        >
          Continuar com Google
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-semibold text-primary underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
