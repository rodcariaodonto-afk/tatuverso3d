import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — TatuVerso3D" },
      {
        name: "description",
        content: "Receba microlotes premiados todos os meses na sua casa. Três planos para todos os perfis.",
      },
      { property: "og:title", content: "Assinatura TatuVerso3D" },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const subscribe = async (planId: string) => {
    if (!user) {
      toast.info("Faça login para assinar");
      navigate({ to: "/login" });
      return;
    }
    const { error } = await supabase.from("subscriptions").insert({
      customer_id: user.id,
      plan_id: planId,
      status: "active",
      next_delivery_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      toast.error("Erro ao assinar", { description: error.message });
      return;
    }
    toast.success("Assinatura ativada!", { description: "Seu primeiro envio será preparado em breve." });
    navigate({ to: "/minha-conta" });
  };

  return (
    <div>
      <section className="bg-[var(--brand-dark)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto px-4 text-center md:px-6">
          <p className="eyebrow !text-[var(--brand-accent)]">Clube TatuVerso3D</p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">Microlotes premiados, todos os meses.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Curadoria sensorial sazonal, feita por especialistas. Receba cafés selecionados de fazendas
            latino-americanas, frescos e prontos para sua próxima descoberta.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {(plans ?? []).map((plan: any) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-card p-8 transition ${
                plan.is_featured ? "border-[var(--brand-accent)] shadow-[0_30px_60px_-30px_oklch(0.74_0.13_80/0.4)]" : "border-border"
              }`}
            >
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-dark)]">
                  <Crown className="mr-1 inline h-3 w-3" /> Mais escolhido
                </div>
              )}
              <p className="eyebrow">{plan.cycle === "monthly" ? "Mensal" : plan.cycle}</p>
              <h2 className="mt-2 font-display text-3xl text-primary">{plan.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl text-primary">{formatBRL(Number(plan.monthly_price))}</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.packages_per_month} {plan.packages_per_month > 1 ? "envios" : "envio"} por mês
              </p>

              {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => subscribe(plan.id)}
                className={`mt-8 w-full rounded-full py-3 text-sm font-semibold uppercase tracking-wider transition ${
                  plan.is_featured
                    ? "bg-[var(--brand-accent)] text-[var(--brand-dark)] hover:brightness-110"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                Assinar agora
              </button>
              <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                Cancele quando quiser · Pagamento simulado
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--surface-soft)] py-20">
        <div className="container mx-auto grid gap-12 px-4 md:grid-cols-3 md:px-6">
          {[
            { title: "Curadoria sensorial", desc: "Selecionados por baristas e Q-graders." },
            { title: "Torra fresca", desc: "Enviado em até 14 dias após a torra." },
            { title: "Sem fidelidade", desc: "Pause, troque ou cancele a qualquer momento." },
          ].map((b) => (
            <div key={b.title}>
              <p className="font-display text-xl text-primary">{b.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
