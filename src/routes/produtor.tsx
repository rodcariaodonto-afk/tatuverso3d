import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, ShoppingCart, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/produtor")({
  head: () => ({ meta: [{ title: "Painel do Produtor — Café EX" }] }),
  component: ProducerDashboard,
});

function ProducerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: producer } = useQuery({
    queryKey: ["my-producer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("producers").select("*").eq("owner_user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["my-products", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["producer-orders", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, orders(id, customer_id, status, created_at)")
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (!user) return null;

  if (!producer) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
        <h1 className="font-display text-4xl text-primary">Bem-vindo!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Você ainda não tem um perfil de produtor cadastrado. Vamos criar um agora.
        </p>
        <ProducerSetup
          userId={user.id}
          onCreated={() => qc.invalidateQueries({ queryKey: ["my-producer"] })}
        />
      </div>
    );
  }

  const revenue = (orderItems ?? []).reduce(
    (sum, i: any) => sum + Number(i.total_price),
    0,
  );

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Painel do Produtor</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">{producer.name}</h1>
          <div className="gold-divider mt-3" />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
          producer.status === "active" ? "bg-[var(--farm)]/15 text-[var(--farm)]" : "bg-muted text-muted-foreground"
        }`}>
          {producer.status === "active" ? "Ativo" : producer.status === "pending_review" ? "Em curadoria" : producer.status}
        </span>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <Metric icon={Package} label="Cafés" value={`${products?.length ?? 0}`} />
        <Metric icon={ShoppingCart} label="Itens vendidos" value={`${orderItems?.length ?? 0}`} />
        <Metric icon={ShoppingCart} label="Receita" value={formatBRL(revenue)} />
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-primary">Meus cafés</h2>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" /> Novo café
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {(products ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum café cadastrado ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Café</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3 text-right">Estoque</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(products ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-xs">{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                    <td className="px-4 py-3 text-right">{p.stock_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary">Pedidos recentes</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {(orderItems ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido por enquanto.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Café</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orderItems ?? []).map((i: any) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 font-mono text-xs">#{i.order_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{i.product_name}</td>
                    <td className="px-4 py-3 text-right">{i.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(Number(i.total_price))}</td>
                    <td className="px-4 py-3">{i.item_status ?? i.orders?.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {(editing || creating) && (
        <ProductDrawer
          product={editing}
          producerId={producer.id}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["my-products"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
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

function ProducerSetup({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("producers").insert({
      owner_user_id: userId,
      name,
      slug: `${slug}-${Date.now().toString(36)}`,
      region,
      description,
      status: "pending_review",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    // Add producer role
    await supabase.from("user_roles").insert({ user_id: userId, role: "producer" });
    toast.success("Perfil enviado para curadoria!");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 text-left">
      <Input label="Nome da fazenda / torrefação" value={name} onChange={setName} required />
      <Input label="Região" value={region} onChange={setRegion} />
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Sobre você</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <button disabled={submitting} className="w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60">
        {submitting ? "Enviando..." : "Enviar para curadoria"}
      </button>
    </form>
  );
}

function ProductDrawer({
  product,
  producerId,
  onClose,
  onSaved,
}: {
  product: any | null;
  producerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [shortDesc, setShortDesc] = useState(product?.short_description ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [stock, setStock] = useState(product?.stock_quantity ?? 0);
  const [coverUrl, setCoverUrl] = useState(product?.cover_url ?? "");
  const [submitting, setSubmitting] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = {
      producer_id: producerId,
      name,
      short_description: shortDesc,
      price,
      stock_quantity: stock,
      cover_url: coverUrl,
      slug: product?.slug ?? `${slug}-${Date.now().toString(36)}`,
      status: product?.status ?? "pending_review",
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success(product ? "Café atualizado" : "Café cadastrado");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <form onSubmit={save} className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-background p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-primary">{product ? "Editar café" : "Novo café"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Input label="Nome" value={name} onChange={setName} required />
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição curta</label>
          <textarea
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <Input label="Preço (R$)" type="number" value={String(price)} onChange={(v) => setPrice(Number(v))} required />
        <Input label="Estoque" type="number" value={String(stock)} onChange={(v) => setStock(Number(v))} required />
        <Input label="URL da imagem" value={coverUrl} onChange={setCoverUrl} />
        <button disabled={submitting} className="rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60">
          {submitting ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
