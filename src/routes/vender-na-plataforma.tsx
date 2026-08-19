import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Sprout, Coffee, TrendingUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/vender-na-plataforma")({
  head: () => ({
    meta: [
      { title: "Vender na TatuVerso3D — Para produtores" },
      { name: "description", content: "Conecte sua fazenda ou torrefação a uma comunidade apaixonada por café especial." },
    ],
  }),
  component: SellPage,
});

const OPERATION_TYPES = [
  { value: "fazenda", label: "Fazenda / Sítio" },
  { value: "torrefacao", label: "Torrefação" },
  { value: "importador", label: "Importador" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "outro", label: "Outro" },
];

const EMPTY_FORM = {
  responsible_name: "",
  email: "",
  brand_name: "",
  phone: "",
  city: "",
  state: "",
  operation_type: "",
  monthly_volume_kg: "",
  message: "",
  instagram: "",
  website: "",
};

function SellPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: plans } = useQuery({
    queryKey: ["producer-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producer_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const set = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.responsible_name.trim()) return toast.error("Informe seu nome");
    if (!form.email.includes("@")) return toast.error("Email inválido");
    if (!form.brand_name.trim()) return toast.error("Informe o nome da sua marca");

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "submit-producer-application",
        {
          body: {
            responsible_name: form.responsible_name,
            email: form.email,
            brand_name: form.brand_name,
            phone: form.phone || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            operation_type: form.operation_type || undefined,
            monthly_volume_kg: form.monthly_volume_kg
              ? Number(form.monthly_volume_kg)
              : undefined,
            message: form.message || undefined,
            links: {
              ...(form.instagram ? { instagram: form.instagram } : {}),
              ...(form.website ? { website: form.website } : {}),
            },
            applicant_user_id: user?.id ?? undefined,
          },
        },
      );

      if (error) throw error;

      if ((data as any).duplicate) {
        toast.info("Já temos uma candidatura com esse email em análise.");
      }
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar candidatura");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div>
      {/* Hero */}
      <section className="bg-[var(--brand-dark)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="eyebrow !text-[var(--brand-accent)]">Para produtores</p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">Venda seus cafés na TatuVerso3D.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Conectamos sua fazenda ou torrefação a uma comunidade apaixonada por café especial.
            Painel próprio, curadoria, ferramentas de venda e assinatura mensal acessível.
          </p>
          <a
            href="#candidatura"
            className="mt-8 inline-flex rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand-dark)]"
          >
            Enviar candidatura
          </a>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Sprout, title: "Cadastro simples", desc: "Crie sua loja em minutos com nossa curadoria de marca." },
            { icon: Coffee, title: "Vitrine premium", desc: "Cada lote ganha uma página rica com origem, processo e perfil sensorial." },
            { icon: TrendingUp, title: "Crescimento juntos", desc: "Marketing, conteúdo e clube de assinatura para alcançar mais clientes." },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-6">
              <b.icon className="h-6 w-6 text-[var(--brand-accent)]" />
              <p className="mt-4 font-display text-xl text-primary">{b.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      {(plans ?? []).length > 0 && (
        <section className="bg-[var(--surface-soft)] py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <p className="eyebrow">Planos</p>
              <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">Escolha como vender</h2>
              <div className="brand-divider mx-auto mt-3" />
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {(plans ?? []).map((plan: any) => (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border bg-card p-8 ${
                    plan.is_featured ? "border-[var(--brand-accent)] shadow-xl" : "border-border"
                  }`}
                >
                  {plan.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-dark)]">
                      Recomendado
                    </div>
                  )}
                  <h3 className="font-display text-2xl text-primary">{plan.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-5">
                    <span className="font-display text-4xl text-primary">
                      {formatBRL(Number(plan.monthly_price))}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    + {Number(plan.commission_rate)}% por venda · até {plan.max_products ?? "∞"} produtos
                  </p>
                  {plan.features && Array.isArray(plan.features) && (
                    <ul className="mt-6 space-y-2 text-sm">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-2 text-foreground/80">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Application Form */}
      <section id="candidatura" className="container mx-auto max-w-2xl px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Candidatura</p>
          <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">Faça parte da plataforma</h2>
          <div className="brand-divider mx-auto mt-3" />
          <p className="mt-4 text-sm text-muted-foreground">
            Preencha o formulário abaixo. Nossa equipe entrará em contato em até 3 dias úteis.
          </p>
        </div>

        {submitted ? (
          <div className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 font-display text-2xl text-primary">Candidatura enviada!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Recebemos sua candidatura e retornaremos em breve no email{" "}
              <strong>{form.email}</strong>. Aguarde a confirmação da nossa equipe de curadoria.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
            >
              Voltar para o site
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-xl border border-border bg-card p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-foreground/70">Nome do responsável *</label>
                <input
                  required
                  value={form.responsible_name}
                  onChange={(e) => set("responsible_name", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="Maria Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="maria@fazenda.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Nome da marca / torrefação *</label>
                <input
                  required
                  value={form.brand_name}
                  onChange={(e) => set("brand_name", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="Fazenda Serra Verde"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Telefone / WhatsApp</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="(11) 9 9999-9999"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="Patrocínio"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Estado (UF)</label>
                <input
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => set("state", e.target.value.toUpperCase())}
                  className={`mt-1 ${inputCls}`}
                  placeholder="MG"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Tipo de operação</label>
                <select
                  value={form.operation_type}
                  onChange={(e) => set("operation_type", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">Selecione...</option>
                  {OPERATION_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Volume estimado mensal (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={form.monthly_volume_kg}
                  onChange={(e) => set("monthly_volume_kg", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="Ex.: 500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Instagram</label>
                <input
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="@fazendaverdeoficial"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Site</label>
                <input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="https://fazendaverde.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground/70">
                Sobre a sua marca e o que produz
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className={`mt-1 ${inputCls}`}
                placeholder="Conte sobre sua fazenda ou torrefação, origem dos grãos, processos de produção..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar candidatura"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
