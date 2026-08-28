# Banner "Para Dentistas" na Home

Adicionar uma seção de destaque na Home usando a imagem enviada (banner promocional 3D voltado para dentistas, com molde de dente, porta-escovas, plaquinha e impressora 3D ao fundo), com um botão "Pedir meu orçamento" que leva a `/personalizados`.

## Posicionamento

Seção nova, inserida logo após os tiles de categorias (NAVEGAÇÃO SECUNDÁRIA) e antes do "BANNER DE CRIAÇÃO PERSONALIZADA" existente. Fica no topo da página, em alta visibilidade, sem redundar com o banner genérico que vem logo abaixo — este é um recorte específico para atrair dentistas.

## Estrutura visual

- Container `rounded-3xl` com a imagem como fundo (`object-cover`), ocupando largura total dentro do `container`.
- Sobreposição (overlay) com gradiente escuro à esquerda para garantir contraste do texto sobre a imagem.
- Eyebrow: "Para Dentistas".
- Título: "Peças 3D que valorizam seu consultório" (ou similar, alinhado ao tom da marca).
- Subtítulo curto: molde de dente anatômico, porta-escovas, plaquinhas e chaveiros personalizados, tudo sob encomenda.
- Botão CTA "Pedir meu orçamento" → `/personalizados` (mesmo estilo do CTA atual do hero: pill accent, min-h-11).
- Responsivo: em mobile, texto sobreposto embaixo/centro; em desktop, texto à esquerda e imagem à direita.

## Implementação técnica

1. Criar asset CDN da imagem enviada via `lovable-assets create --file /mnt/user-uploads/image-10.png --filename dentistas-3d.png` → gravar ponteiro em `src/assets/dentistas-3d.png.asset.json`.
2. Em `src/routes/index.tsx`:
   - Importar o asset: `import dentistasAsset from "@/assets/dentistas-3d.png.asset.json"`.
   - Inserir a nova `<section>` entre a "NAVEGAÇÃO SECUNDÁRIA" e o "BANNER DE CRIAÇÃO PERSONALIZADA".
   - Usar tokens de cor existentes (`bg-brand-dark`, `text-[oklch(...)]`, `bg-accent`/`accent-foreground`), sem cores hardcoded.
   - Manter `data-track="home-dentistas:orcamento"` para o analytics de cliques.
3. Adicionar `alt` descritivo na imagem: "Peças 3D personalizadas para dentistas: molde de dente, porta-escovas e plaquinhas".
4. SEO: sem mudança de head da Home (título/description atuais já cobrem).

## Validação

- Build de produção e checagem de TypeScript.
- Revisão visual em desktop e mobile via navegador headless confirmando contraste, alinhamento e o botão levando a `/personalizados`.

## Fora desta tarefa

Alterar a página `/personalizados`, mudar o banner genérico existente, ou criar uma rota dedicada para dentistas.
