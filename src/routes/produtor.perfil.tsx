import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ProducerShell } from "@/components/producer/ProducerShell";

export const Route = createFileRoute("/produtor/perfil")({
  head: () => ({ meta: [{ title: "Perfil da marca — Painel do Produtor" }] }),
  component: ProducerPerfilPage,
});

type ProducerForm = {
  name: string;
  description: string;
  story: string;
  region: string;
  city: string;
  state: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  cover_url: string;
  instagram: string;
  website: string;
  mp_account_id: string;
};

const EMPTY: ProducerForm = {
  name: "",
  description: "",
  story: "",
  region: "",
  city: "",
  state: "",
  contact_email: "",
  contact_phone: "",
  logo_url: "",
  cover_url: "",
  instagram: "",
  website: "",
  mp_account_id: "",
};

function ProducerPerfilPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProducerForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: producer, isLoading } = useQuery({
    queryKey: ["my-producer-full", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("producers")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Populate form when producer loads
  useEffect(() => {
    if (!producer) return;
    const links = (producer as any).social_links ?? {};
    setForm({
      name: producer.name ?? "",
      description: (producer as any).description ?? "",
      story: (producer as any).story ?? "",
      region: (producer as any).region ?? "",
      city: (producer as any).city ?? "",
      state: (producer as any).state ?? "",
      contact_email: (producer as any).contact_email ?? "",
      contact_phone: (producer as any).contact_phone ?? "",
      logo_url: (producer as any).logo_url ?? "",
      cover_url: (producer as any).cover_url ?? "",
      instagram: links.instagram ?? "",
      website: links.website ?? "",
      mp_account_id: (producer as any).mp_account_id ?? "",
    });
  }, [producer]);

  const set = (k: keyof ProducerForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer) return;
    setSaving(true);
    const { error } = await supabase
      .from("producers")
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        story: form.story.trim() || null,
        region: form.region.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        logo_url: form.logo_url.trim() || null,
        cover_url: form.cover_url.trim() || null,
        social_links: {
          ...(form.instagram ? { instagram: form.instagram.trim() } : {}),
          ...(form.website ? { website: form.website.trim() } : {}),
        },
        mp_account_id: form.mp_account_id.trim() || null,
      } as any)
      .eq("id", producer.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["my-producer-full"] });
    qc.invalidateQueries({ queryKey: ["my-producer"] });
  };

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

  if (isLoading) {
    return (
      <ProducerShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ProducerShell>
    );
  }

  return (
    <ProducerShell>
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">Minha marca</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Perfil da marca</h1>
          <div className="brand-divider mt-3" />
        </header>

        <form onSubmit={handleSave} className="mt-10 space-y-8">
          {/* Identidade */}
          <Card title="Identidade">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da marca *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Região">
                <input
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  className={inputCls}
                  placeholder="Ex.: Cerrado Mineiro"
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Estado (UF)">
                <input
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => set("state", e.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="MG"
                />
              </Field>
              <Field label="Logo (URL)" className="sm:col-span-2">
                <input
                  value={form.logo_url}
                  onChange={(e) => set("logo_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="logo preview"
                    className="mt-2 h-16 w-16 rounded-lg object-contain"
                  />
                )}
              </Field>
              <Field label="Imagem de capa (URL)" className="sm:col-span-2">
                <input
                  value={form.cover_url}
                  onChange={(e) => set("cover_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
                {form.cover_url && (
                  <img
                    src={form.cover_url}
                    alt="cover preview"
                    className="mt-2 h-24 w-full rounded-lg object-cover"
                  />
                )}
              </Field>
            </div>
          </Card>

          {/* Sobre */}
          <Card title="Sobre a marca">
            <div className="space-y-4">
              <Field label="Descrição curta">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={inputCls}
                  placeholder="Uma frase que define sua marca"
                />
              </Field>
              <Field label="Nossa história">
                <textarea
                  rows={5}
                  value={form.story}
                  onChange={(e) => set("story", e.target.value)}
                  className={inputCls}
                  placeholder="Conte a história da sua fazenda ou torrefação..."
                />
              </Field>
            </div>
          </Card>

          {/* Contato */}
          <Card title="Contato e redes sociais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email de contato">
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Instagram">
                <input
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  className={inputCls}
                  placeholder="@suamarca"
                />
              </Field>
              <Field label="Site">
                <input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </Card>

          {/* Pagamentos */}
          <Card title="Pagamentos (Split MP)">
            <Field label="ID da conta Mercado Pago">
              <input
                value={form.mp_account_id}
                onChange={(e) => set("mp_account_id", e.target.value)}
                className={inputCls}
                placeholder="123456789"
              />
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              ID numérico da sua conta no Mercado Pago. Necessário para o split automático de
              comissões. Encontre em: MP → Configurações → Dados da conta.
            </p>
            {producer && (
              <p className="mt-1 text-xs text-muted-foreground">
                Comissão da plataforma: <strong>{producer.commission_rate ?? 12}%</strong> (definida
                pelo time TatuVerso3D).
              </p>
            )}
          </Card>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </form>
      </div>
    </ProducerShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
