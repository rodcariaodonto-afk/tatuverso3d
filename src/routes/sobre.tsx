import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Cafe EX" },
      { name: "description", content: "A Cafe EX é a vitrine digital dos cafés especiais latino-americanos." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="eyebrow">Sobre nós</p>
      <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">A Cafe EX</h1>
      <div className="gold-divider mt-3" />
      <div className="mt-8 space-y-6 text-base leading-relaxed text-foreground/85">
        <p>
          Nascemos para encurtar a distância entre quem cultiva café com paixão e quem busca uma xícara
          memorável. Reunimos fazendas e torrefações da América Latina em um só lugar, com curadoria
          rigorosa e respeito pela história de cada lote.
        </p>
        <p>
          Acreditamos que café especial é mais do que pontuação SCA. É terroir, é processo, é gente.
          Por isso, cada produtor da Cafe EX tem nome, rosto e território. E cada cafezeiro tem
          informação suficiente para fazer escolhas conscientes.
        </p>
        <p>
          Nossa missão é simples: <strong>tornar o café especial parte do dia a dia</strong> — com
          origem, frescor e clareza.
        </p>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/catalogo" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground">
          Explorar cafés
        </Link>
        <Link to="/vender-na-plataforma" className="rounded-full border border-border px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary">
          Sou produtor
        </Link>
      </div>
    </div>
  );
}
