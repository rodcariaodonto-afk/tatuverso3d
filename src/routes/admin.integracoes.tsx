import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/integracoes")({
  head: () => ({ meta: [{ title: "Admin · Integrações — Café EX" }] }),
  component: IntegracoesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PlatformSettings = {
  id: string;
  tenant_id: string;
  store_name: string | null;
  store_logo_url: string | null;
  primary_color: string | null;
  cep_origem: string | null;
  commission_percent: number | null;
  mp_access_token: string | null;
  mp_public_key: string | null;
  mp_environment: string;
  melhor_envio_token: string | null;
  me_environment: string;
};

type TestResult = { ok: boolean; message: string } | null;

// ── Page ──────────────────────────────────────────────────────────────────────

function IntegracoesPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_credentials" as any)
        .select("*")
        .eq("tenant_id", "default")
        .single();
      if (error) throw error;
      return data as PlatformSettings;
    },
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});
  const [saving, setSaving] = useState(false);
  const [testingMp, setTestingMp] = useState(false);
  const [testingMe, setTestingMe] = useState(false);
  const [mpResult, setMpResult] = useState<TestResult>(null);
  const [meResult, setMeResult] = useState<TestResult>(null);

  // Merge DB values with local edits
  const value = <K extends keyof PlatformSettings>(key: K): PlatformSettings[K] | undefined =>
    (key in form ? (form as any)[key] : settings?.[key]) as PlatformSettings[K] | undefined;

  const set = <K extends keyof PlatformSettings>(key: K, v: PlatformSettings[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload: Partial<PlatformSettings> = { ...form };
    const { error } = await supabase
      .from("tenant_credentials" as any)
      .update(payload)
      .eq("tenant_id", "default");
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      setForm({});
    }
    setSaving(false);
  };

  const testMercadoPago = async () => {
    const token = value("mp_access_token");
    if (!token?.trim()) return toast.error("Informe o Access Token antes de testar");
    setTestingMp(true);
    setMpResult(null);
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMpResult({ ok: true, message: `Conectado como: ${data.nickname ?? data.email ?? "conta MP"}` });
      } else {
        setMpResult({ ok: false, message: data.message ?? "Token inválido" });
      }
    } catch {
      setMpResult({ ok: false, message: "Erro de rede ao conectar ao Mercado Pago" });
    }
    setTestingMp(false);
  };

  const testMelhorEnvio = async () => {
    const token = value("melhor_envio_token");
    const env = value("me_environment") ?? "sandbox";
    if (!token?.trim()) return toast.error("Informe o token do Melhor Envio antes de testar");
    setTestingMe(true);
    setMeResult(null);
    try {
      const base = env === "production"
        ? "https://melhorenvio.com.br"
        : "https://sandbox.melhorenvio.com.br";
      const res = await fetch(`${base}/api/v2/me/user`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMeResult({ ok: true, message: `Conectado como: ${data.firstname ?? ""} ${data.lastname ?? ""}`.trim() || "usuário ME" });
      } else {
        const data = await res.json().catch(() => ({}));
        setMeResult({ ok: false, message: (data as any).message ?? "Token inválido ou sem permissão" });
      }
    } catch {
      setMeResult({ ok: false, message: "Erro de rede ao conectar ao Melhor Envio" });
    }
    setTestingMe(false);
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Integrações</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            Configure as credenciais do Mercado Pago, Melhor Envio e os dados da sua loja.
            Os tokens são armazenados com restrição de acesso (RLS) — somente admins podem lê-los.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {/* Dados da loja */}
          <Card title="Dados da loja">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nome da loja"
                value={value("store_name") ?? ""}
                onChange={(v) => set("store_name", v)}
                placeholder="Café EX"
              />
              <Field
                label="CEP de origem (expedição)"
                value={value("cep_origem") ?? ""}
                onChange={(v) => set("cep_origem", v)}
                placeholder="01310-100"
              />
              <Field
                label="Logo (URL)"
                value={value("store_logo_url") ?? ""}
                onChange={(v) => set("store_logo_url", v)}
                placeholder="https://..."
                className="sm:col-span-2"
              />
              <div>
                <label className="block text-xs font-medium text-foreground/70">Cor primária</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={value("primary_color") ?? "#1a1a1a"}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded border border-border bg-card"
                  />
                  <span className="font-mono text-sm text-muted-foreground">
                    {value("primary_color") ?? "#1a1a1a"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">
                  Comissão da plataforma (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={value("commission_percent") ?? 0}
                  onChange={(e) => set("commission_percent", Number(e.target.value) as any)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Mercado Pago */}
          <Card title="Mercado Pago">
            <div className="mb-4 flex items-center gap-4">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Ambiente</label>
              <div className="flex gap-3">
                {(["sandbox", "production"] as const).map((env) => (
                  <label key={env} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="mp_env"
                      checked={(value("mp_environment") ?? "sandbox") === env}
                      onChange={() => set("mp_environment", env)}
                      className="accent-[var(--gold)]"
                    />
                    {env === "sandbox" ? "Sandbox (testes)" : "Produção"}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <SecretField
                label="Access Token"
                value={value("mp_access_token") ?? ""}
                onChange={(v) => set("mp_access_token", v)}
                placeholder="APP_USR-..."
                hint='Encontre em: Mercado Pago → Credenciais → "Access Token"'
              />
              <Field
                label="Public Key"
                value={value("mp_public_key") ?? ""}
                onChange={(v) => set("mp_public_key", v)}
                placeholder="APP_USR-..."
                hint='Encontre em: Mercado Pago → Credenciais → "Public key"'
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={testMercadoPago}
                disabled={testingMp}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary disabled:opacity-50"
              >
                {testingMp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Testar conexão
              </button>
              {mpResult && <TestBadge result={mpResult} />}
            </div>
          </Card>

          {/* Melhor Envio */}
          <Card title="Melhor Envio">
            <div className="mb-4 flex items-center gap-4">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Ambiente</label>
              <div className="flex gap-3">
                {(["sandbox", "production"] as const).map((env) => (
                  <label key={env} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="me_env"
                      checked={(value("me_environment") ?? "sandbox") === env}
                      onChange={() => set("me_environment", env)}
                      className="accent-[var(--gold)]"
                    />
                    {env === "sandbox" ? "Sandbox (testes)" : "Produção"}
                  </label>
                ))}
              </div>
            </div>
            <SecretField
              label="Token de acesso"
              value={value("melhor_envio_token") ?? ""}
              onChange={(v) => set("melhor_envio_token", v)}
              placeholder="eyJ0eXAiOiJKV1Qi..."
              hint="Gere em: Melhor Envio → Gerenciar tokens → Gerar token"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={testMelhorEnvio}
                disabled={testingMe}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary disabled:opacity-50"
              >
                {testingMe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Testar conexão
              </button>
              {meResult && <TestBadge result={meResult} />}
            </div>
          </Card>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(form).length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
  value,
  onChange,
  placeholder,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <div className="relative mt-1">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 font-mono text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label={visible ? "Ocultar token" : "Mostrar token"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TestBadge({ result }: { result: NonNullable<TestResult> }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        result.ok
          ? "bg-emerald-100 text-emerald-700"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {result.message}
    </div>
  );
}
