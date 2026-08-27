import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, Save, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getIntegrations,
  saveIntegrations,
  testMercadoPago,
  testMelhorEnvio,
} from "@/lib/integrations-admin.functions";

export const Route = createFileRoute("/admin/integracoes")({
  head: () => ({
    meta: [
      { title: "Admin · Integrações — TatuVerso3D" },
      {
        name: "description",
        content: "Status das credenciais de pagamento, frete e e-mail da TatuVerso3D.",
      },
    ],
  }),
  component: IntegracoesPage,
});

type SettingKey =
  | "integrations.mp_environment"
  | "integrations.me_environment"
  | "integrations.email_from_name"
  | "integrations.email_from_address"
  | "integrations.email_reply_to";

type TestResult = { ok: boolean; message: string; live_mode?: boolean | null } | null;

function IntegracoesPage() {
  const qc = useQueryClient();
  const fetchIntegrations = useServerFn(getIntegrations);
  const persist = useServerFn(saveIntegrations);
  const runMpTest = useServerFn(testMercadoPago);
  const runMeTest = useServerFn(testMelhorEnvio);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => fetchIntegrations(),
  });

  const [form, setForm] = useState<Partial<Record<SettingKey, string>>>({});
  const [mpResult, setMpResult] = useState<TestResult>(null);
  const [meResult, setMeResult] = useState<TestResult>(null);

  const value = (key: SettingKey, fallback = "") =>
    key in form ? (form[key] as string) : (data?.settings?.[key] ?? fallback);
  const set = (key: SettingKey, v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = useMutation({
    mutationFn: () => persist({ data: { settings: form as Record<SettingKey, string> } }),
    onSuccess: () => {
      toast.success("Configurações salvas");
      setForm({});
      qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const mpTest = useMutation({
    mutationFn: () => runMpTest(),
    onSuccess: (r) => setMpResult(r),
    onError: (e: any) => setMpResult({ ok: false, message: e?.message ?? "Erro" }),
  });

  const meTest = useMutation({
    mutationFn: () =>
      runMeTest({ data: { environment: (value("integrations.me_environment", "sandbox") as "sandbox" | "production") } }),
    onSuccess: (r) => setMeResult(r),
    onError: (e: any) => setMeResult({ ok: false, message: e?.message ?? "Erro" }),
  });

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </p>
      </AdminShell>
    );
  }

  const cred = data!.credentials;

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Integrações</h1>
          <div className="brand-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            As chaves sensíveis ficam guardadas como segredos do servidor — nunca no navegador nem no banco.
            Aqui você confere o status de cada credencial, testa a conexão e ajusta as preferências.
          </p>
        </header>

        <div className="mt-10 space-y-8">
          <Card title="Mercado Pago" icon>
            <div className="grid gap-2">
              <StatusRow label="Access Token (MERCADOPAGO_ACCESS_TOKEN)" ok={cred.mp_access_token} />
              <StatusRow label="Public Key (MERCADOPAGO_PUBLIC_KEY)" ok={cred.mp_public_key} />
              <StatusRow label="Segredo do webhook (MERCADOPAGO_WEBHOOK_SECRET)" ok={cred.mp_webhook_secret} />
            </div>
            <EnvPicker
              name="mp_env"
              value={value("integrations.mp_environment", "sandbox")}
              onChange={(v) => set("integrations.mp_environment", v)}
            />
            <TestRow
              label="Testar conexão"
              loading={mpTest.isPending}
              onClick={() => mpTest.mutate()}
              result={mpResult}
            />
          </Card>

          <Card title="Melhor Envio">
            <StatusRow label="Token de acesso (MELHOR_ENVIO_TOKEN)" ok={cred.melhor_envio_token} />
            <EnvPicker
              name="me_env"
              value={value("integrations.me_environment", "sandbox")}
              onChange={(v) => set("integrations.me_environment", v)}
            />
            <TestRow
              label="Testar conexão"
              loading={meTest.isPending}
              onClick={() => meTest.mutate()}
              result={meResult}
            />
          </Card>

          <Card title="E-mails transacionais">
            <StatusRow label="Chave da API (RESEND_API_KEY)" ok={cred.resend_api_key} />
            <p className="mt-3 text-xs text-muted-foreground">
              Sem a chave configurada os e-mails ficam desativados. Crie a sua em{" "}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
              >
                resend.com/api-keys <ExternalLink className="h-3 w-3" />
              </a>{" "}
              e peça para adicioná-la como segredo do projeto.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Nome do remetente"
                value={value("integrations.email_from_name")}
                onChange={(v) => set("integrations.email_from_name", v)}
                placeholder="TatuVerso3D"
              />
              <Field
                label="E-mail do remetente"
                value={value("integrations.email_from_address")}
                onChange={(v) => set("integrations.email_from_address", v)}
                placeholder="noreply@tatuverso3d.com.br"
              />
              <Field
                label="Responder para (opcional)"
                value={value("integrations.email_reply_to")}
                onChange={(v) => set("integrations.email_reply_to", v)}
                placeholder="contato@tatuverso3d.com.br"
                className="sm:col-span-2"
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || Object.keys(form).length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {save.isPending ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ── UI ────────────────────────────────────────────────────────────────────────

function Card({ title, children, icon }: { title: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-xl text-primary">
        {icon ? <ShieldCheck className="h-4 w-4 text-accent" /> : null}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
      <span className="text-foreground/80">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-emerald-600" : "text-destructive"}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {ok ? "Configurado" : "Não configurado"}
      </span>
    </div>
  );
}

function EnvPicker({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      <span className="text-xs font-semibold uppercase text-muted-foreground">Ambiente</span>
      <div className="flex gap-3">
        {(["sandbox", "production"] as const).map((env) => (
          <label key={env} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              checked={value === env}
              onChange={() => onChange(env)}
              className="accent-[var(--brand-accent)]"
            />
            {env === "sandbox" ? "Sandbox (testes)" : "Produção"}
          </label>
        ))}
      </div>
    </div>
  );
}

function TestRow({
  label,
  loading,
  onClick,
  result,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  result: TestResult;
}) {
  const envBadge =
    result && result.live_mode != null ? (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          result.live_mode ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
        }`}
      >
        {result.live_mode ? "Produção" : "Sandbox"}
      </span>
    ) : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {label}
      </button>
      {result ? (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${result.ok ? "text-emerald-600" : "text-destructive"}`}
        >
          {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {result.message}
          {envBadge}
        </span>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
