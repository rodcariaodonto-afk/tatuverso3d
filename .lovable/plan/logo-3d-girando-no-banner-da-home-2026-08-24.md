# Logo 3D girando no banner da home

Insere a logo oficial da TatuVerso3D como uma peça 3D girando no espaço vazio à direita do banner principal, sem tocar em nenhuma outra parte do site.

Observação sobre o arquivo: o anexo é um PNG com fundo branco (não um SVG). Vou usar exatamente essa arte, sem redesenhar, recortando o fundo branco para deixá-lo transparente e aplicando a imagem como face do medalhão. Nada de cores, textos ou proporções alterados.

## 1. Reorganização do banner

- Parte superior do banner passa a ter duas colunas no desktop: à esquerda tagline, título, descrição e busca exatamente como estão hoje; à direita a peça 3D centralizada.
- Os cards de categoria continuam abaixo, ocupando toda a largura.
- Tablet: mesma divisão, peça menor.
- Celular: coluna única, com a peça entre a descrição e o campo de busca, centralizada e em rotação mais lenta.
- Espaço reservado com altura fixa por breakpoint, para não haver salto de layout enquanto o 3D carrega.

## 2. A peça 3D

- Medalhão circular: face frontal com a arte da logo, face traseira com a mesma arte orientada corretamente (não espelhada), espessura lateral visível e bordas chanfradas.
- Lateral azul-marinho #061657 e anel externo ciano #08CFFF, acabamento acetinado.
- Iluminação suave e sombra discreta abaixo da peça.
- Canvas totalmente transparente: o gradiente do banner continua visível atrás. Sem partículas, estrelas ou neon extra.

## 3. Animação

- Giro contínuo de 360° no eixo vertical, ~10 s por volta, como produto em vitrine — sem tombar nem girar como relógio.
- Flutuação vertical bem discreta.
- Ao passar o mouse, a rotação desacelera levemente.
- Arraste horizontal permitido; ao soltar, a rotação automática volta suavemente.

## 4. Tamanhos

- Desktop 380–440 px, tablet 300–360 px, celular 240–290 px, sempre com a peça inteira visível.

## 5. Performance e acessibilidade

- Componente 3D carregado sob demanda (lazy), somente no navegador.
- DPR limitado a 1.5; animação pausada quando o banner sai da tela.
- `prefers-reduced-motion`: mostra a logo parada.
- Sem WebGL: mostra a imagem da logo normalmente, no mesmo espaço.

## 6. Verificação

Build de produção, typecheck e revisão no navegador em 375, 768, 1024 e 1440 px, com prints, conferindo que nada ficou sobreposto ou cortado. Ao final, listo os arquivos criados e alterados.

## Detalhes técnicos

- Novas dependências: `three`, `@react-three/fiber`, `@react-three/drei` (+ `@types/three`).
- Arte: PNG do anexo com fundo removido, publicado via `lovable-assets` como novo pointer em `src/assets/`; o pointer atual não é apagado.
- Geometria: cilindro chanfrado (ou `ExtrudeGeometry` de círculo com bevel) com materiais por face — textura frontal, textura traseira com `repeat.x = -1` para não espelhar, lateral `#061657`, anel `#08CFFF`.
- Novo componente `src/components/brand/Logo3D.tsx` (contém os imports do three) carregado por `React.lazy` dentro de `<ClientOnly>` + `<Suspense>`, conforme a regra de SSR do projeto — nada de import estático de three em rota.
- Único arquivo de rota alterado: `src/routes/index.tsx`, apenas o bloco do hero. Sem mudanças em header, menu, produtos, banco, auth ou carrinho.
