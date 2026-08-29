import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { tenantConfig } from "@/lib/tenant-config";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/personalizados")({
  head: () => ({
    meta: [
      { title: "Personalizados — TatuVerso3D" },
      {
        name: "description",
        content:
          "Peças sob encomenda em impressão 3D: escolha cores, tamanhos e detalhes para criar presentes, lembranças e itens únicos.",
      },
      { property: "og:title", content: "Personalizados — TatuVerso3D" },
      {
        property: "og:description",
        content: "Você imagina, a gente dá forma. Solicite sua personalização.",
      },
      { property: "og:url", content: "/personalizados" },
    ],
    links: [{ rel: "canonical", href: "/personalizados" }],
  }),
  component: PersonalizadosPage,
});

function PersonalizadosPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 md:px-6">
      <p className="eyebrow">Sob encomenda</p>
      <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">
        Você imagina. A gente dá forma.
      </h1>
      <div className="brand-divider mt-3" />
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
        Escolha cores, detalhes e personalizações para criar presentes, lembranças, itens
        decorativos e produtos únicos. Conte sua ideia e devolvemos com prazo, valor e as
        possibilidades de produção.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { t: "1. Conte a ideia", d: "Descreva o que você imaginou, o uso e a quantidade." },
          { t: "2. Ajustamos juntos", d: "Definimos cores, tamanho, acabamento e prazo." },
          { t: "3. Imprimimos e enviamos", d: "Produzimos camada por camada e enviamos com segurança." },
        ].map((s) => (
          <div key={s.t} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="font-display text-lg text-primary">{s.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>

      <form
        className="mt-12 grid gap-4 rounded-2xl border border-border bg-surface-soft p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
          toast.success("Recebemos sua ideia! Responderemos por e-mail em breve.");
        }}
      >
        <div className="sm:col-span-2">
          <h2 className="font-display text-2xl text-primary">Solicitar personalização</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha os campos e nossa equipe entra em contato por e-mail.
          </p>
        </div>
        <div>
          <label htmlFor="nome" className="text-sm font-semibold text-foreground">Nome</label>
          <input id="nome" name="nome" required className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-foreground">E-mail</label>
          <input id="email" name="email" type="email" required className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ideia" className="text-sm font-semibold text-foreground">Sua ideia</label>
          <textarea id="ideia" name="ideia" rows={5} required className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground"
          >
            Enviar solicitação
          </button>
          <a
            href={`mailto:${tenantConfig.supportEmail}`}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            ou escreva para {tenantConfig.supportEmail}
          </a>
        </div>
        {sent && (
          <p className="sm:col-span-2 text-sm font-semibold text-primary" role="status">
            Obrigado! Sua solicitação foi registrada e responderemos em breve.
          </p>
        )}
      </form>

      <div className="mt-10">
        <Link to="/catalogo" search={{ q: "" } as never} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Ver produtos prontos →
        </Link>
      </div>
    </div>
  );
}
