import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Package, ShoppingBag, Boxes, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — TatuVerso3D" }] }),
  component: AdminLayout,
});

export function useAdminRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return data?.map((r) => r.role) ?? [];
    },
    staleTime: 60_000,
  });
}

function AdminLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return path === "/admin" ? <AdminDashboard /> : <Outlet />;
}

function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: roles } = useQuery({
    queryKey: ["admin-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return data?.map((r) => r.role) ?? [];
    },
  });

  const isAdmin = roles?.includes("admin" as any) || roles?.includes("support" as any);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const [{ count: products }, { count: orders }, { count: customers }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      const { data: revRows } = await supabase.from("orders").select("total, payment_status");
      const revenue = (revRows ?? [])
        .filter((r: any) => r.payment_status === "paid")
        .reduce((s, r: any) => s + Number(r.total), 0);
      return { products, orders, customers, revenue };
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["admin-low-stock"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold, track_inventory")
        .order("stock_quantity", { ascending: true })
        .limit(50);
      return (data ?? []).filter(
        (p: any) => p.track_inventory && Number(p.stock_quantity) <= Number(p.low_stock_threshold ?? 0),
      );
    },
  });

  const { data: recentProducts } = useQuery({
    queryKey: ["admin-recent-products"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, status, product_type")
        .order("created_at", { ascending: false })
        .limit(20);
      return data;
    },
  });

  const setProductStatus = async (
    id: string,
    status: "active" | "draft" | "pending_review" | "rejected" | "archived",
  ) => {
    const { error } = await supabase
      .from("products")
      .update({ status, published_at: status === "active" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto atualizado");
    qc.invalidateQueries({ queryKey: ["admin-recent-products"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administração</p>
            <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Painel TatuVerso3D</h1>
            <div className="brand-divider mt-3" />
          </div>
          <Link
            to="/admin/produtos"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary"
          >
            Gerenciar produtos →
          </Link>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Package} label="Produtos" value={`${stats?.products ?? 0}`} />
          <Metric icon={ShoppingBag} label="Pedidos" value={`${stats?.orders ?? 0}`} />
          <Metric icon={Users} label="Clientes" value={`${stats?.customers ?? 0}`} />
          <Metric icon={Wallet} label="Receita paga" value={formatBRL(stats?.revenue ?? 0)} />
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-primary">Estoque baixo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Produtos que atingiram o limite mínimo configurado.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            {(lowStock ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum produto com estoque baixo.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(lowStock ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                      <td className="px-4 py-3 text-right">{p.stock_quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{p.low_stock_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-primary">Produtos recentes</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            {(recentProducts ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum produto cadastrado ainda.{" "}
                <Link to="/admin/produtos/novo" className="font-semibold text-primary hover:underline">
                  Cadastrar o primeiro →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Preço</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(recentProducts ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.product_type}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs">{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setProductStatus(p.id, "active")}
                          className="mr-2 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                        >
                          Publicar
                        </button>
                        <button
                          onClick={() => setProductStatus(p.id, "draft")}
                          className="text-xs font-semibold text-muted-foreground hover:underline"
                        >
                          Pausar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Boxes className="h-3.5 w-3.5" /> Estoque, variações e personalizações são gerenciados em cada produto.
        </p>
      </div>
    </AdminShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-[var(--brand-accent)]" />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}
