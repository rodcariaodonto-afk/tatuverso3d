import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a TatuVerso3D — impressão 3D com identidade brasileira" },
      {
        name: "description",
        content:
          "A TatuVerso3D cria produtos sensoriais, decorativos, utilitários e colecionáveis feitos em impressão 3D, com acabamento cuidadoso e personalização.",
      },
      { property: "og:title", content: "Sobre a TatuVerso3D" },
      {
        property: "og:description",
        content: "Quem somos, como imprimimos e por que cada peça sai diferente da outra.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    title: "Feito camada por camada",
    text: "Cada peça é impressa sob demanda, revisada à mão e embalada com cuidado antes de sair da nossa oficina.",
  },
  {
    title: "Design com propósito",
    text: "Criamos objetos que resolvem algo: organizar, presentear, acalmar as mãos ou simplesmente arrancar um sorriso.",
  },
  {
    title: "Personalização real",
    text: "Nome, cor, escala, encaixe. Se dá para modelar, a gente conversa e imprime do seu jeito.",
  },
];

function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="eyebrow">Sobre nós</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">TatuVerso3D</h1>
      <div className="brand-divider mt-3" />
      <div className="mt-8 space-y-6 text-base leading-relaxed text-foreground/85">
        <p>
          A TatuVerso3D nasceu da curiosidade de ver um objeto surgir do nada, camada após camada.
          Do primeiro fidget impresso numa madrugada até um catálogo com peças sensoriais,
          decoração, utilidades, presentes, colecionáveis e articulados, mantivemos a mesma
          obsessão: qualidade de acabamento e personalidade em cada modelo.
        </p>
        <p>
          Somos uma marca brasileira, independente e feita por gente que ama tecnologia. Imprimimos
          em materiais selecionados, testamos encaixes de verdade e só enviamos o que colocaríamos
          na nossa própria estante.
        </p>
        <p>
          Nossa missão é simples: <strong>tornar o universo 3D parte do seu dia a dia</strong> — com
          criatividade, cor e um tatu curioso guiando a órbita.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg text-foreground">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          to="/catalogo"
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
        >
          Ver produtos
        </Link>
        <Link
          to="/personalizados"
          className="rounded-full border border-border px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary"
        >
          Quero algo personalizado
        </Link>
      </div>
    </div>
  );
}
