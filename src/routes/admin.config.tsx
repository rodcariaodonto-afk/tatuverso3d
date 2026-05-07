import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Store, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/config")({
  head: () => ({ meta: [{ title: "Configurações — Admin Cafezeira" }] }),
  component: ConfigPage,
});

type Tab = "store" | "company" | "payments";

const STORE_FIELDS = [
  { key: "store.name", label: "Nome da loja", placeholder: "Cafezeira" },
  { key: "store.tagline", label: "Tagline", placeholder: "Cafés especiais brasileiros" },
  { key: "store.currency", label: "Moeda", placeholder: "BRL", type: "select", options: ["BRL", "USD", "EUR"] },
  { key: "store.measurement", label: "Sistema de medição", placeholder: "metric", type: "select", options: ["metric", "imperial"] },
  { key: "store.timezone", label: "Fuso horário", placeholder: "America/Sao_Paulo" },
  { key: "shipping.free_threshold", label: "Frete grátis acima de (R$)", placeholder: "150" },
  { key: "shipping.flat_rate", label: "Frete fixo (R$)", placeholder: "19.90" },
  { key: "social.instagram", label: "Instagram URL", placeholder: "https://instagram.com/cafezeira" },
];

const COMPANY_FIELDS = [
  { key: "company.legal_name", label: "Razão social", placeholder: "Cafezeira LTDA" },
  { key: "company.cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00" },
  { key: "company.email", label: "E-mail de contato", placeholder: "contato@cafezeira.com.br" },
  { key: "company.phone", label: "Telefone / WhatsApp", placeholder: "+55 11 99999-9999" },
  { key: "company.street", label: "Endereço", placeholder: "Rua, número, complemento" },
  { key: "company.city", label: "Cidade", placeholder: "São Paulo" },
  { key: "company.state", label: "Estado", placeholder: "SP" },
  { key: "company.zip", label: "CEP", placeholder: "00000-000" },
  { key: "company.country", label: "País", placeholder: "Brasil" },
  { key: "company.logo_url", label: "Logotipo (URL)", placeholder: "https://..." },
];

const PAYMENT_METHODS = [
  { key: "pix", label: "PIX", desc: "Recebimento instantâneo via QR Code." },
  { key: "credit_card", label: "Cartão de crédito", desc: "Visa, Mastercard, Amex, Elo." },
  { key: "boleto", label: "Boleto bancário", desc: "Compensação em 1–3 dias úteis." },
  { key: "stripe", label: "Stripe", desc: "Gateway internacional." },
  { key: "mercadopago", label: "Mercado Pago", desc: "Cartão, PIX e boleto." },
  { key: "manual", label: "Pagamento manual", desc: "Transferência ou combinado offline." },
];

function ConfigPage() {
  const [tab, setTab] = useState<Tab>("store");

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="eyebrow">Plataforma</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Configurações</h1>
          <div className="gold-divider mt-3" />
        </header>

        <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {([
            ["store", "Detalhes da loja", Store],
            ["company", "Informações da empresa", Building2],
            ["payments", "Pagamentos", CreditCard],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "store" && <SettingsList fields={STORE_FIELDS} />}
          {tab === "company" && <SettingsList fields={COMPANY_FIELDS} />}
          {tab === "payments" && <PaymentsPanel />}
        </div>
      </div>
    </AdminShell>
  );
}

function useSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const map = useMemo(() => {
    const m: Record<string, any> = {};
    (data ?? []).forEach((row: any) => {
      m[row.key] = typeof row.value === "string" ? row.value : (row.value?.value ?? row.value);
    });
    return m;
  }, [data]);

  const save = async (key: string, value: any) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value: typeof value === "object" ? value : { value } }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["platform-settings"] });
    return true;
  };

  return { map, isLoading, save };
}

function SettingsList({ fields }: { fields: { key: string; label: string; placeholder?: string; type?: string; options?: string[] }[] }) {
  const { map, isLoading, save } = useSettings();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    fields.forEach((f) => {
      v[f.key] = map[f.key] ?? "";
    });
    setValues(v);
  }, [map, fields]);

  if (isLoading) return <div className="text-center text-sm text-muted-foreground py-12">Carregando…</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className="rounded-lg border border-border bg-card p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{f.key}</p>
          <div className="mt-3 flex gap-2">
            {f.type === "select" ? (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            )}
            <button
              onClick={async () => {
                const ok = await save(f.key, values[f.key] ?? "");
                if (ok) toast.success("Salvo");
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Salvar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsPanel() {
  const { map, isLoading, save } = useSettings();
  const enabled: Record<string, boolean> = (map["payments.enabled"] && typeof map["payments.enabled"] === "object")
    ? map["payments.enabled"]
    : {};
  const [defaultMethod, setDefaultMethod] = useState<string>("");

  useEffect(() => {
    setDefaultMethod(map["payments.default"] ?? "");
  }, [map]);

  const toggle = async (key: string) => {
    const next = { ...enabled, [key]: !enabled[key] };
    const ok = await save("payments.enabled", next);
    if (ok) toast.success("Atualizado");
  };

  if (isLoading) return <div className="text-center text-sm text-muted-foreground py-12">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-lg text-primary">Métodos de pagamento aceitos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha quais formas de pagamento serão oferecidas no checkout da Cafezeira.
        </p>
        <div className="mt-5 divide-y divide-border">
          {PAYMENT_METHODS.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-semibold text-primary">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
              <button
                onClick={() => toggle(m.key)}
                className={`relative h-6 w-11 rounded-full transition ${enabled[m.key] ? "bg-primary" : "bg-muted"}`}
                aria-pressed={!!enabled[m.key]}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    enabled[m.key] ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-lg text-primary">Forma de pagamento padrão</h3>
        <p className="mt-1 text-sm text-muted-foreground">Pré-selecionada no checkout.</p>
        <div className="mt-4 flex gap-2">
          <select
            value={defaultMethod}
            onChange={(e) => setDefaultMethod(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {PAYMENT_METHODS.filter((m) => enabled[m.key]).map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              const ok = await save("payments.default", defaultMethod);
              if (ok) toast.success("Salvo");
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-lg text-primary">Credenciais do gateway</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaves de Stripe / Mercado Pago são armazenadas como segredos no backend.
          Acesse o painel do Lovable Cloud para configurá-las.
        </p>
      </div>
    </div>
  );
}
