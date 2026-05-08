import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Package, Heart, MapPin, LogOut, User as UserIcon, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — Cafe EX" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

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

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Card icon={UserIcon} title="Perfil" desc={user.email ?? ""} />
        <Card icon={Package} title="Pedidos" desc={`${orders?.length ?? 0} no histórico`} />
        <Card icon={Heart} title="Assinatura" desc="Gerencie seus envios" link="/assinatura" />
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
