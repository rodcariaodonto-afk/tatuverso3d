import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, CheckCircle2, Package, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/cart-store";
import { tenantConfig } from "@/lib/tenant-config";

const searchSchema = z.object({
  status: z.enum(["success", "cancelled", "pending"]).optional(),
  sub_id: z.string().optional(),
});

export const Route = createFileRoute("/clube")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: `Clube do Café — ${tenantConfig.name}` },
      { name: "description", content: "Assine e receba microlotes premiados todo mês." },
    ],
  }),
  component: ClubePage,
});

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  biannual: "Semestral",
  annual: "Anual",
};

function ClubePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/clube" });
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Limpa params da URL após retorno do MP
  useEffect(() => {
    if (search.status) {
      const timer = setTimeout(
        () => navigate({ to: "/clube", search: {} as any }),
        4000,
      );
      return () => clearTimeout(timer);
    }
  }, [search.status, navigate]);

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast.info("Faça login para assinar");
      navigate({ to: "/login" });
      return;
    }

    setSubscribingId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {
          tenant_id: "default",
          plan_id: plan.id,
          customer_id: user.id,
          payer_email: user.email,
          back_url: window.location.origin,
        },
      });

      if (error) throw error;

      const { approval_url } = data as { approval_url: string };
      if (!approval_url) throw new Error("URL de aprovação não recebida do Mercado Pago");

      // Redireciona para o MP para autorizar a assinatura
      window.location.href = approval_url;
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao iniciar assinatura");
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <div>
      {/* Status banner (retorno do MP) */}
      {search.status === "success" && (
        <div className="bg-emerald-600 py-3 text-center text-sm font-semibold text-white">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          Assinatura autorizada! Seu primeiro envio está sendo preparado.
        </div>
      )}
      {search.status === "cancelled" && (
        <div className="bg-amber-500 py-3 text-center text-sm font-semibold text-white">
          Assinatura não concluída. Tente novamente quando quiser.
        </div>
      )}
      {search.status === "pending" && (
        <div className="bg-blue-600 py-3 text-center text-sm font-semibold text-white">
          Assinatura pendente de autorização. Verifique seu e-mail do Mercado Pago.
        </div>
      )}

      {/* Hero */}
      <section className="bg-[var(--espresso)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6">
          <Crown className="mx-auto h-10 w-10 text-[var(--gold)]" />
          <p className="eyebrow mt-4 !text-[var(--gold)]">Clube {tenantConfig.name}</p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">
            Microlotes premiados, todo mês.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Curadoria sensorial sazonal feita por especialistas. Receba cafés selecionados de
            fazendas latino-americanas, frescos e prontos para sua próxima descoberta.
          </p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="bg-[var(--sand)] py-16">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3 md:px-6">
          {[
            { icon: Star, title: "Curadoria sensorial", desc: "Selecionados por baristas e Q-graders com pontuação SCA acima de 84." },
            { icon: Package, title: "Torra fresca", desc: "Enviado em até 14 dias após a torra, garantindo aromas e sabores no pico." },
            { icon: Clock, title: "Sem fidelidade", desc: "Pause, troque de plano ou cancele quando quiser, sem multa nem burocracia." },
          ].map((b) => (
            <div key={b.title} className="flex gap-4">
              <b.icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" />
              <div>
                <p className="font-display text-lg text-primary">{b.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Planos</p>
          <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">
            Escolha o seu ritmo
          </h2>
          <div className="gold-divider mx-auto mt-3" />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {(plans ?? []).map((plan: any) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-card p-8 transition ${
                plan.is_featured
                  ? "border-[var(--gold)] shadow-[0_30px_60px_-30px_oklch(0.74_0.13_80/0.4)]"
                  : "border-border"
              }`}
            >
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--espresso)]">
                  <Crown className="mr-1 inline h-3 w-3" /> Mais escolhido
                </div>
              )}

              <p className="eyebrow">{CYCLE_LABELS[plan.cycle] ?? plan.cycle}</p>
              <h2 className="mt-2 font-display text-3xl text-primary">{plan.name}</h2>
              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              )}

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl text-primary">
                  {formatBRL(Number(plan.monthly_price))}
                </span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.packages_per_month}{" "}
                {plan.packages_per_month > 1 ? "envios" : "envio"} por mês · Pagamento recorrente
              </p>

              {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribingId === plan.id}
                className={`mt-8 w-full rounded-full py-3 text-sm font-semibold uppercase tracking-wider transition disabled:opacity-60 ${
                  plan.is_featured
                    ? "bg-[var(--gold)] text-[var(--espresso)] hover:brightness-110"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {subscribingId === plan.id ? "Redirecionando..." : "Assinar agora"}
              </button>
              <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                Cancele quando quiser · Cobrado via Mercado Pago
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--sand)] py-16">
        <div className="container mx-auto max-w-2xl px-4 md:px-6">
          <h2 className="font-display text-2xl text-primary">Dúvidas frequentes</h2>
          <div className="mt-6 space-y-5">
            {[
              {
                q: "Como funciona a assinatura?",
                a: "Você autoriza o pagamento recorrente via Mercado Pago. A cada mês, realizamos a cobrança automaticamente e enviamos o lote selecionado pela curadoria.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Acesse sua conta, vá em Privacidade ou entre em contato pelo suporte. O cancelamento é imediato e sem multa.",
              },
              {
                q: "O café é sempre o mesmo?",
                a: "Não. A cada ciclo, nossa equipe de curadoria seleciona um novo microlote de origem diferente.",
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-lg border border-border bg-card p-5">
                <p className="font-semibold text-primary">{faq.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
