import { tenantConfig } from "@/lib/tenant-config";

type Section = { id?: string; title: string; body: string[] };
type Content = { eyebrow: string; title: string; intro: string; sections: Section[] };

const CONTENT: Record<string, Content> = {
  faq: {
    eyebrow: "Atendimento",
    title: "Perguntas frequentes",
    intro: "As dúvidas que mais recebemos sobre nossos produtos impressos em 3D.",
    sections: [
      {
        id: "prazos",
        title: "Prazos de produção",
        body: [
          "Produtos prontos saem para envio em até 2 dias úteis.",
          "Peças personalizadas ou sob encomenda levam de 3 a 10 dias úteis para serem produzidas, dependendo do tamanho, das cores e da quantidade. Confirmamos o prazo exato antes de iniciar a produção.",
        ],
      },
      {
        title: "Do que são feitos os produtos?",
        body: [
          "Usamos filamentos próprios para impressão 3D, escolhidos por resistência e acabamento. Cada peça é montada e revisada manualmente por nós antes do envio.",
        ],
      },
      {
        title: "Posso escolher as cores?",
        body: [
          "Sim. A maior parte dos itens pode ser produzida em combinações diferentes de cores. Fale com a gente na página de personalizados.",
        ],
      },
      {
        title: "Os produtos sensoriais servem para quem?",
        body: [
          "Nossa linha sensorial foi pensada para crianças, adultos e famílias que buscam estímulo tátil, movimento e foco. Cada pessoa possui necessidades e preferências sensoriais diferentes. Nossos produtos não substituem acompanhamento profissional.",
        ],
      },
      {
        title: "Vocês fazem pedidos em quantidade?",
        body: [
          "Fazemos sim: lembrancinhas, brindes e kits. Envie sua ideia e retornamos com prazo e valores.",
        ],
      },
    ],
  },
  envios: {
    eyebrow: "Atendimento",
    title: "Envios e entregas",
    intro: "Enviamos para todo o Brasil com embalagem protegida e código de rastreio.",
    sections: [
      {
        title: "Como calculamos o frete",
        body: [
          "O valor é calculado no carrinho a partir do seu CEP, do peso e do volume das peças.",
        ],
      },
      {
        title: "Prazo de entrega",
        body: [
          "O prazo total é a soma do tempo de produção com o prazo da transportadora. Você recebe o código de rastreio assim que o pedido é postado.",
        ],
      },
      {
        title: "Embalagem",
        body: [
          "Peças articuladas e sensoriais seguem protegidas individualmente para chegarem intactas.",
        ],
      },
    ],
  },
  trocas: {
    eyebrow: "Atendimento",
    title: "Trocas e devoluções",
    intro: "Queremos que você fique feliz com a peça que recebeu.",
    sections: [
      {
        title: "Arrependimento",
        body: [
          "Você pode desistir da compra em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor, desde que o produto esteja sem uso.",
        ],
      },
      {
        title: "Produto com defeito",
        body: [
          "Se a peça chegar danificada ou com falha de impressão, envie fotos para o nosso atendimento em até 7 dias. Reimprimimos ou devolvemos o valor.",
        ],
      },
      {
        title: "Peças personalizadas",
        body: [
          "Itens produzidos sob encomenda com cores, nomes ou formatos exclusivos não são elegíveis a troca por gosto pessoal, mas seguem cobertos em caso de defeito.",
        ],
      },
    ],
  },
  cuidados: {
    eyebrow: "Institucional",
    title: "Cuidados com os produtos",
    intro: "Alguns cuidados simples fazem sua peça durar muito mais.",
    sections: [
      {
        title: "Limpeza",
        body: [
          "Limpe com pano macio levemente úmido e sabão neutro. Evite produtos abrasivos, álcool em excesso e água quente.",
        ],
      },
      {
        title: "Calor e sol",
        body: [
          "Não deixe as peças dentro do carro fechado, próximas a fogões ou expostas ao sol forte por muito tempo: o material pode deformar.",
        ],
      },
      {
        title: "Uso por crianças",
        body: [
          "Peças pequenas e articuladas devem ser usadas com supervisão de um adulto por crianças menores de 3 anos.",
        ],
      },
      {
        title: "Manutenção",
        body: [
          "Se alguma articulação ficar dura, movimente devagar algumas vezes. Precisou de ajuda? Fale com a gente.",
        ],
      },
    ],
  },
};

export function InfoPage({ slug }: { slug: keyof typeof CONTENT | string }) {
  const c = CONTENT[slug];
  if (!c) return null;
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">{c.title}</h1>
      <div className="brand-divider mt-3" />
      <p className="mt-6 text-base leading-relaxed text-foreground/80">{c.intro}</p>
      <div className="mt-10 space-y-6">
        {c.sections.map((s) => (
          <section
            key={s.title}
            id={s.id}
            className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-xl text-primary">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-foreground/80">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        Ficou com dúvida? Escreva para{" "}
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href={`mailto:${tenantConfig.supportEmail}`}>
          {tenantConfig.supportEmail}
        </a>
        .
      </p>
    </div>
  );
}
