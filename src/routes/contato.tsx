import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, Instagram } from "lucide-react";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Cafe EX" },
      { name: "description", content: "Fale com a Cafe EX. Estamos aqui para ajudar." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast.success("Mensagem enviada! Responderemos em até 24 horas.");
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="eyebrow">Contato</p>
      <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Vamos conversar</h1>
      <div className="gold-divider mt-3" />

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          { icon: Mail, label: "Email", value: "ola@cafezeira.com.br" },
          { icon: MessageCircle, label: "WhatsApp", value: "+55 11 99999-9999" },
          { icon: Instagram, label: "Instagram", value: "@cafezeira" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-5">
            <c.icon className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-base text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      {sent ? (
        <div className="mt-10 rounded-xl border border-border bg-[var(--sand)] p-8 text-center">
          <p className="font-display text-2xl text-primary">Obrigado pelo contato ☕️</p>
          <p className="mt-2 text-sm text-muted-foreground">Em breve nosso time responde no seu email.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-4 rounded-xl border border-border bg-card p-6">
          <Field label="Nome" />
          <Field label="Email" type="email" />
          <Field label="Assunto" />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem</label>
            <textarea
              required
              rows={5}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
            Enviar mensagem
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        required
        type={type}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
