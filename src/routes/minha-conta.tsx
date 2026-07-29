import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package, Heart, LogOut, User as UserIcon, Crown, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — Café EX" }] }),
  component: AccountLayout,
});

function AccountLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return path === "/minha-conta" ? <AccountPage /> : <Outlet />;
}

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return data?.map((r) => r.role) ?? [];
    },
  });

  const isStaff = roles?.includes("admin" as any) || roles?.includes("support" as any);
  const preferences =
    profile?.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)
      ? (profile.preferences as Record<string, Json | undefined>)
      : {};
  const mustChangePassword = preferences.must_change_password === true;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSavingPassword(true);
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) {
      setSavingPassword(false);
      toast.error("Não foi possível atualizar a senha", { description: passwordError.message });
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ preferences: { ...preferences, must_change_password: false } })
      .eq("id", user.id);

    setSavingPassword(false);

    if (profileError) {
      toast.error("Senha atualizada, mas não conseguimos liberar a troca obrigatória", {
        description: profileError.message,
      });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha atualizada com sucesso.");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id, isStaff],
    enabled: !!user?.id && roles !== undefined,
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, status, payment_status, total, created_at, customer_id, order_items(product_name, quantity)")
        .order("created_at", { ascending: false });
      if (!isStaff) q = q.eq("customer_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  if (!user) return null;

  if (mustChangePassword) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-12 md:px-6">
        <header>
          <p className="eyebrow">Segurança da conta</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Defina sua nova senha</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-4 text-sm text-muted-foreground">
            Você entrou com uma senha temporária. Troque por uma senha própria para continuar.
          </p>
        </header>
        <PasswordForm
          className="mt-8"
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          savingPassword={savingPassword}
          submitLabel="Salvar nova senha"
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={changePassword}
        />
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="mt-4 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
        >
          Sair e trocar depois
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Sua conta</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">
            Olá, {profile?.full_name?.split(" ")[0] ?? "café lover"}
          </h1>
          <div className="gold-divider mt-3" />
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:bg-muted"
        >
          <LogOut className="h-3 w-3" /> Sair
        </button>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Card icon={UserIcon} title="Perfil" desc={user.email ?? ""} />
        <Card icon={Package} title="Pedidos" desc={`${orders?.length ?? 0} no histórico`} />
        <Card icon={Heart} title="Clube" desc="Gerencie sua assinatura" link="/clube" />
        <Card icon={Shield} title="Privacidade" desc="Exporte ou exclua seus dados (LGPD)" link="/minha-conta/privacidade" />
      </div>

      {roles?.includes("producer" as any) && (
        <Link
          to="/produtor"
          className="mt-6 flex items-center justify-between rounded-xl border border-accent/40 bg-[var(--sand)] p-5"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-[var(--gold)]" />
            <div>
              <p className="font-display text-lg text-primary">Painel do Produtor</p>
              <p className="text-xs text-muted-foreground">Gerencie seus cafés e pedidos.</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary">Abrir →</span>
        </Link>
      )}

      {(roles?.includes("admin" as any) || roles?.includes("support" as any)) && (
        <Link
          to="/admin"
          className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary p-5 text-primary-foreground"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-[var(--gold)]" />
            <div>
              <p className="font-display text-lg">Painel Admin</p>
              <p className="text-xs text-primary-foreground/70">Gestão da plataforma.</p>
            </div>
          </div>
          <span className="text-sm font-semibold">Abrir →</span>
        </Link>
      )}

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-2xl text-primary">Alterar senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">Atualize sua senha de acesso quando precisar.</p>
        <PasswordForm
          className="mt-4"
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          savingPassword={savingPassword}
          submitLabel="Atualizar senha"
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={changePassword}
        />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary">{isStaff ? "Pedidos da plataforma" : "Meus pedidos"}</h2>
        {isStaff && (
          <p className="mt-1 text-xs text-muted-foreground">Visão administrativa · todos os pedidos. <Link to="/admin/pedidos" className="font-semibold text-primary underline">Abrir gestão completa</Link></p>
        )}
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {(orders ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Você ainda não fez pedidos.{" "}
              <Link to="/catalogo" className="font-semibold text-primary underline">
                Ver catálogo
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orders ?? []).map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-foreground/80">
                      {o.order_items?.map((i: any) => `${i.quantity}× ${i.product_name}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs font-semibold text-primary">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatBRL(Number(o.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function PasswordForm({
  className,
  newPassword,
  confirmPassword,
  savingPassword,
  submitLabel,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  className?: string;
  newPassword: string;
  confirmPassword: string;
  savingPassword: boolean;
  submitLabel: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={`${className ?? ""} space-y-4 rounded-lg border border-border bg-card p-5`}>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha</label>
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar nova senha</label>
        <input
          required
          type="password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <button
        disabled={savingPassword}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {savingPassword ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function Card({
  icon: Icon,
  title,
  desc,
  link,
}: {
  icon: any;
  title: string;
  desc: string;
  link?: string;
}) {
  const Inner = (
    <div className="rounded-lg border border-border bg-card p-5 transition hover:border-accent/60">
      <Icon className="h-5 w-5 text-[var(--gold)]" />
      <p className="mt-3 font-display text-lg text-primary">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
  return link ? <Link to={link as any}>{Inner}</Link> : Inner;
}
