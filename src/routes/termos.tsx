import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — TatuVerso3D" },
      {
        name: "description",
        content: "Condições de compra, produção sob demanda e personalização na loja TatuVerso3D.",
      },
      { property: "og:title", content: "Termos de uso — TatuVerso3D" },
      { property: "og:description", content: "Como funcionam pedidos, prazos e personalizações." },
      { property: "og:url", content: "/termos" },
    ],
    links: [{ rel: "canonical", href: "/termos" }],
  }),
  component: () => (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl">Termos de Uso</h1>
      <div className="brand-divider mt-3" />
      <div className="mt-8 max-w-none space-y-4 text-sm leading-relaxed text-foreground/85">
        <p>
          Bem-vindo à TatuVerso3D. Ao usar nossa loja, você concorda com estes termos. Vendemos
          produtos fabricados por impressão 3D, produzidos sob demanda ou a partir de estoque
          próprio.
        </p>
        <p>
          Por serem peças impressas, pequenas variações de cor, textura e linhas de camada são
          características do processo e não configuram defeito.
        </p>
        <p>
          Pedidos personalizados são aprovados por escrito antes da produção e, por serem exclusivos,
          não aceitam arrependimento após o início da impressão, salvo defeito de fabricação.
        </p>
        <p>
          Esta versão é demonstrativa e será revisada juridicamente antes do lançamento oficial.
        </p>
      </div>
    </div>
  ),
});
