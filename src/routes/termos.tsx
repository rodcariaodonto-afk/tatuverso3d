import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de uso — TatuVerso3D" }] }),
  component: () => (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl text-primary">Termos de Uso</h1>
      <div className="brand-divider mt-3" />
      <div className="prose mt-8 max-w-none space-y-4 text-sm leading-relaxed text-foreground/85">
        <p>
          Bem-vindo à TatuVerso3D. Ao usar nossa plataforma, você concorda com estes termos. Somos um
          marketplace que conecta produtores de café especial a consumidores.
        </p>
        <p>
          Os pedidos são processados via produtores parceiros e a TatuVerso3D atua como intermediadora,
          garantindo curadoria, qualidade e suporte. Em caso de dúvida, fale com nosso atendimento.
        </p>
        <p>Esta versão é demonstrativa e será revisada por nosso departamento jurídico antes do lançamento.</p>
      </div>
    </div>
  ),
});
