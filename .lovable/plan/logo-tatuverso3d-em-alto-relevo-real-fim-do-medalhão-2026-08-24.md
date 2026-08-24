# Logo TatuVerso3D em alto-relevo real (fim do medalhão)

## Diagnóstico honesto

O arquivo enviado (`TatuVerso3D_Logo_Original_Sem_Fundo_2.svg`) não é vetorial: é um PNG embutido em base64 dentro de um `<svg>`, sem nenhum `path`. Verifiquei: zero caminhos vetoriais. Também não existe nenhum GLB/GLTF no projeto.

Consequência direta: **não é possível derivar automaticamente a geometria fiel do tatu, do focinho, das patas, das placas do casco, do planeta esférico e dos anéis tubulares a partir de uma imagem raster**. Isso exigiria modelagem 3D manual.

Portanto há dois caminhos, e eles produzem resultados diferentes.

## Caminho A — Você fornece um GLB modelado (fidelidade total)

Você (ou um modelador/serviço de conversão) envia `tatuverso3d-logo.glb` com o tatu volumétrico, planeta esférico, anéis em tubo, letras extrudadas e chanfradas, materiais separados e mapas PBR.

O que eu faço:
- Remover totalmente o medalhão atual: cilindro, borda ciano, planos com o PNG.
- Substituir por um visualizador de GLB com iluminação de três pontos (frontal, lateral, contorno), sombra suave no chão, canvas transparente, rotação contínua no eixo Y de 10 a 12 s por volta, sem tombar.
- Manter lazy loading, DPR limitado, pausa fora da tela, `prefers-reduced-motion` e fallback com a arte estática.
- Validação lateral com prints em desktop, tablet e celular.

Esse é o único caminho que entrega exatamente tudo que você descreveu.

## Caminho B — Alto-relevo real gerado a partir da arte (sem modelador externo)

Sem GLB, o que consigo gerar de forma legítima — e que **não é um plano com textura, nem disco, nem falsa profundidade** — é geometria extrudada por camadas, recortada pelo alpha e pelas regiões de cor da própria logo:

- Separação da arte em camadas por cor/região: fundo espacial, planeta, anéis, tatu, contornos, "TATUVERSO", "3D".
- Cada camada vira um contorno vetorial traçado do bitmap e é extrudada com `ExtrudeGeometry` + bisel, em profundidades diferentes. Profundidade total ≈ 25% da largura.
- As áreas transparentes não geram geometria alguma.
- Superfície de cada camada recebe abaulamento (deslocamento suave) para não ficar chapada, mais normal map e roughness map derivados da arte, para o relevo interno (placas do casco, focinho, patas) reagir à luz.
- Sombras próprias: camadas da frente projetam sombra sobre as de trás.
- O resultado é exportado como GLB no build, então em runtime o site carrega um modelo 3D de verdade.

Limite claro deste caminho: o tatu fica em alto-relevo escalonado e abaulado, **não uma escultura totalmente arredondada**; o planeta fica em domo, não numa esfera completa; os anéis ficam em relevo curvo, não em tubo fechado. De lado, os níveis de profundidade aparecem separados de verdade — não é uma superfície única — mas não é o mesmo que um modelo esculpido.

## Recomendação

Começar pelo Caminho B agora, porque entrega profundidade real e some com o medalhão, e trocar pelo GLB assim que você tiver o modelo — o visualizador é o mesmo nos dois casos, só muda a fonte da geometria.

## Escopo intocado

Header, menu, textos do banner, busca, categorias, produtos, banco, autenticação, carrinho e checkout permanecem exatamente como estão. Só o bloco da logo à direita do banner muda.

## Detalhes técnicos

- `src/components/brand/Logo3D.tsx`: reescrito; remoção de `cylinderGeometry`, `torusGeometry` e dos planos com textura. Passa a carregar GLB via `useGLTF`, com `Environment`/luzes de três pontos e `ContactShadows`.
- `src/components/brand/LogoShowcase.tsx`: mantido (lazy, WebGL check, reduced-motion, fallback), apontando para o novo visualizador.
- Caminho B adiciona um script de build em `scripts/` que traça contornos do PNG, monta as camadas extrudadas e exporta `src/assets/tatuverso3d-logo.glb` como asset de CDN.
- `src/routes/index.tsx`: sem mudança de layout, apenas o componente da coluna direita.
- Validação: build, typecheck e prints laterais (0°, 45°, 90°) em 375, 768, 1024 e 1440 px.
