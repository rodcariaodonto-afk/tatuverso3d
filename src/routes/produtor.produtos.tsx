import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";
import { ProducerShell } from "@/components/producer/ProducerShell";

export const Route = createFileRoute("/produtor/produtos")({
  head: () => ({ meta: [{ title: "Meus cafés — Painel do Produtor" }] }),
  component: ProducerProdutosPage,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Publicado",
  draft: "Rascunho",
  pending_review: "Em curadoria",
  rejected: "Rejeitado",
  archived: "Arquivado",
};

const EMPTY_FORM = {
  name: "",
  short_description: "",
  price: "",
  stock_quantity: "",
  cover_url: "",
  status: "pending_review",
};

function ProducerProdutosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: producer } = useQuery({
    queryKey: ["my-producer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("producers")
        .select("id, name, commission_rate")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products-full", producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, short_description, price, stock_quantity, cover_url, status, slug, created_at")
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ["my-products-full"] });
    qc.invalidateQueries({ queryKey: ["my-products"] });
    setEditing(null);
    setCreating(false);
  };

  return (
    <ProducerShell>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Minha marca</p>
            <h1 className="mt-2 font-display text-4xl text-primary">Meus cafés</h1>
            <div className="brand-divider mt-3" />
          </div>
          <button
            onClick={() => { setEditing(null); setCreating(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo café
          </button>
        </header>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (products ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum café cadastrado ainda.</p>
              <button
                onClick={() => setCreating(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
              >
                <Plus className="h-4 w-4" /> Cadastrar meu primeiro café
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Café</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3 text-right">Estoque</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(products ?? []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.cover_url && (
                          <img
                            src={p.cover_url}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-primary">{p.name}</p>
                          {p.short_description && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {p.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] ?? ""}`}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(Number(p.price))}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={Number(p.stock_quantity) === 0 ? "text-destructive" : ""}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Novos cafés ficam em curadoria até serem publicados pelo time TatuVerso3D.
        </p>
      </div>

      {(creating || editing) && (
        <ProductDrawer
          product={editing}
          producerId={producer?.id ?? ""}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={onSaved}
        />
      )}
    </ProducerShell>
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
  const [form, setForm] = useState({
    name: product?.name ?? "",
    short_description: product?.short_description ?? "",
    price: product ? String(product.price) : "",
    stock_quantity: product ? String(product.stock_quantity) : "",
    cover_url: product?.cover_url ?? "",
    status: product?.status ?? "pending_review",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const slug =
      product?.slug ??
      `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const payload = {
      producer_id: producerId,
      name: form.name.trim(),
      short_description: form.short_description.trim() || null,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      cover_url: form.cover_url.trim() || null,
      slug,
      status: product ? (product.status as any) : ("pending_review" as any),
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Café atualizado" : "Café enviado para curadoria!");
    onSaved();
  };

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <form
        onSubmit={save}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-background p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-primary">
            {product ? "Editar café" : "Novo café"}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground/70">Nome *</label>
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground/70">Descrição curta</label>
          <textarea
            rows={3}
            value={form.short_description}
            onChange={(e) => set("short_description", e.target.value)}
            className={`mt-1 ${inputCls}`}
            placeholder="Ex.: Café natural cereja descascado, notas de chocolate amargo e frutas vermelhas."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground/70">Preço (R$) *</label>
            <input
              required
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70">Estoque</label>
            <input
              type="number"
              min={0}
              value={form.stock_quantity}
              onChange={(e) => set("stock_quantity", e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground/70">URL da imagem de capa</label>
          <input
            value={form.cover_url}
            onChange={(e) => set("cover_url", e.target.value)}
            className={`mt-1 ${inputCls}`}
            placeholder="https://..."
          />
          {form.cover_url && (
            <img src={form.cover_url} alt="preview" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
        </div>

        <div className="mt-auto flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando..." : product ? "Salvar alterações" : "Enviar para curadoria"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
