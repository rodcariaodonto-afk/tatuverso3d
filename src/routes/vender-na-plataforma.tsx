import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sprout, Coffee, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-store";

export const Route = createFileRoute("/vender-na-plataforma")({
  head: () => ({
    meta: [
      { title: "Vender na Cafezeira — Para produtores" },
      { name: "description", content: "Conecte sua fazenda ou torrefação a uma comunidade apaixonada por café especial." },
    ],
  }),
  component: SellPage,
});

function SellPage() {
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

  return (
    <div>
      <section className="bg-[var(--espresso)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="eyebrow !text-[var(--gold)]">Para produtores</p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">Venda seus cafés na Cafezeira.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Conectamos sua fazenda ou torrefação a uma comunidade apaixonada por café especial. Painel próprio,
            curadoria, ferramentas de venda e assinatura mensal acessível.
          </p>
          <Link
            to="/cadastro"
            className="mt-8 inline-flex rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--espresso)]"
          >
            Começar agora
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Sprout, title: "Cadastro simples", desc: "Crie sua loja em minutos com nossa curadoria de marca." },
            { icon: Coffee, title: "Vitrine premium", desc: "Cada lote ganha uma página rica com origem, processo e perfil sensorial." },
            { icon: TrendingUp, title: "Crescimento juntos", desc: "Marketing, conteúdo e clube de assinatura para alcançar mais clientes." },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-6">
              <b.icon className="h-6 w-6 text-[var(--gold)]" />
              <p className="mt-4 font-display text-xl text-primary">{b.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--sand)] py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center">
            <p className="eyebrow">Planos</p>
            <h2 className="mt-2 font-display text-3xl text-primary md:text-4xl">Escolha como vender</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(plans ?? []).map((plan: any) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border bg-card p-8 ${
                  plan.is_featured ? "border-[var(--gold)] shadow-xl" : "border-border"
                }`}
              >
                {plan.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--espresso)]">
                    Recomendado
                  </div>
                )}
                <h3 className="font-display text-2xl text-primary">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5">
                  <span className="font-display text-4xl text-primary">{formatBRL(Number(plan.monthly_price))}</span>
                  <span className="ml-1 text-xs text-muted-foreground">/mês</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  + {Number(plan.commission_rate)}% por venda · até {plan.max_products ?? "∞"} produtos
                </p>
                {plan.features && Array.isArray(plan.features) && (
                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-foreground/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/cadastro"
                  className="mt-8 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  Começar com {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
