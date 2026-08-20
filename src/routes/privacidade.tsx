import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade — TatuVerso3D" }] }),
  component: () => (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl text-primary">Política de Privacidade</h1>
      <div className="brand-divider mt-3" />
      <div className="prose mt-8 max-w-none space-y-4 text-sm leading-relaxed text-foreground/85">
        <p>
          A TatuVerso3D respeita a sua privacidade. Coletamos apenas os dados necessários para prestar nossos
          serviços: cadastro, pedidos e atendimento. Não vendemos seus dados a terceiros.
        </p>
        <p>
          Você pode solicitar a remoção dos seus dados a qualquer momento entrando em contato pelo email{" "}
          <a href="mailto:privacidade@tatuverso3d.com.br" className="text-primary underline">privacidade@tatuverso3d.com.br</a>.
        </p>
        <p>Em conformidade com a LGPD (Lei Geral de Proteção de Dados).</p>
      </div>
    </div>
  ),
});
