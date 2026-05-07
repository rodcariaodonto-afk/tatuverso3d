import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Package, ShoppingBag, Sprout, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Cafezeira" }] }),
  component: AdminDashboard,
});

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
      const [{ count: products }, { count: producers }, { count: orders }, { count: subs }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("producers").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      ]);
      const { data: revRows } = await supabase.from("orders").select("total");
      const revenue = (revRows ?? []).reduce((s, r: any) => s + Number(r.total), 0);
      return { products, producers, orders, subs, revenue };
    },
  });

  const { data: pendingProducers } = useQuery({
    queryKey: ["pending-producers"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("producers")
        .select("id, name, region, country, contact_email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data;
    },
  });

  const { data: pendingProducts } = useQuery({
    queryKey: ["pending-products"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, status, producers(name)")
        .order("created_at", { ascending: false })
        .limit(30);
      return data;
    },
  });

  const { data: b2bLeads } = useQuery({
    queryKey: ["b2b-leads"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("b2b_leads")
        .select("id, company_name, contact_name, email, phone, estimated_quantity, purpose, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data;
    },
  });

  const setLeadStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("b2b_leads").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead atualizado");
    qc.invalidateQueries({ queryKey: ["b2b-leads"] });
  };

  const setProducerStatus = async (id: string, status: "active" | "rejected" | "suspended" | "pending_review") => {
    const { error } = await supabase.from("producers").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["pending-producers"] });
  };

  const setProductStatus = async (id: string, status: "active" | "draft" | "pending_review" | "rejected" | "archived") => {
    const { error } = await supabase.from("products").update({
      status,
      published_at: status === "active" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["pending-products"] });
  };

  if (!user) return null;
  if (roles && !isAdmin) {
    return (
      <div className="container mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-3xl text-primary">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Painel Cafezeira</h1>
          <div className="gold-divider mt-3" />
        </div>
        <a href="/admin/produtos" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary">
          Gerenciar cafés →
        </a>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={Sprout} label="Produtores" value={`${stats?.producers ?? 0}`} />
        <Metric icon={Package} label="Cafés" value={`${stats?.products ?? 0}`} />
        <Metric icon={ShoppingBag} label="Pedidos" value={`${stats?.orders ?? 0}`} />
        <Metric icon={Briefcase} label="Leads B2B" value={`${b2bLeads?.length ?? 0}`} />
        <Metric icon={Users} label="Receita" value={formatBRL(stats?.revenue ?? 0)} />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary">Orçamentos corporativos · Private Label</h2>
        <p className="mt-1 text-sm text-muted-foreground">Leads recebidos pelo formulário Café com sua marca.</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {(b2bLeads ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lead recebido ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left">Qtd / Finalidade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(b2bLeads ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{l.company_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{l.contact_name}</p>
                      <p className="text-xs">{l.email}{l.phone ? ` · ${l.phone}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{l.estimated_quantity ?? "—"}</p>
                      <p className="text-xs line-clamp-1">{l.purpose ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status}
                        onChange={(e) => setLeadStatus(l.id, e.target.value)}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-xs"
                      >
                        {["new","contacted","in_proposal","won","lost","archived"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`mailto:${l.email}`} className="text-xs font-semibold text-primary hover:underline">Responder →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary">Curadoria de produtores</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(pendingProducers ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.region} · {p.country}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{p.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setProducerStatus(p.id, "active")} className="mr-2 text-xs font-semibold text-[var(--farm)] hover:underline">Aprovar</button>
                    <button onClick={() => setProducerStatus(p.id, "rejected")} className="text-xs font-semibold text-destructive hover:underline">Rejeitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary">Curadoria de cafés</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Café</th>
                <th className="px-4 py-3 text-left">Produtor</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(pendingProducts ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.producers?.name}</td>
                  <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{p.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setProductStatus(p.id, "active")} className="mr-2 text-xs font-semibold text-[var(--farm)] hover:underline">Publicar</button>
                    <button onClick={() => setProductStatus(p.id, "draft")} className="text-xs font-semibold text-muted-foreground hover:underline">Pausar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-[var(--gold)]" />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}
