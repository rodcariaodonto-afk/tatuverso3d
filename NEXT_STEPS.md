# TatuVerso3D — Próximos passos

> Este documento substitui integralmente o planejamento anterior (CAFEX / Café EX).
> A Onda 1 (identidade visual, navegação, home e páginas institucionais) está concluída.

## Estado atual (pós Onda 1)

- Identidade visual TatuVerso3D aplicada: paleta cósmica (azul), laranja filamento e magenta, tipografia Fredoka + Nunito Sans, logo e favicon oficiais.
- Header, footer, home, loja, página de produto e páginas institucionais (Sobre, FAQ, Envios, Trocas, Cuidados, Personalizados, Termos, Privacidade, Contato) reescritos para a marca.
- Nenhuma menção pública à marca antiga ou ao universo de café.
- O **esquema do banco ainda é o legado de café** (`products.score`, `roast_level`, `origin_*`, `product_variants.grind_option`, `producers`, `sensory_notes`, assinaturas). Ele está apenas oculto na interface.

## Onda 2 — Modelagem de produtos 3D, variações, personalizações, estoque e limpeza segura do esquema legado

Objetivos:

1. **Modelagem de produtos 3D**
   - Categorias reais: sensoriais, decoração, utilidades, presentes, colecionáveis, articulados, organizadores.
   - Campos próprios: material (PLA, PETG, TPU, resina), tempo de impressão, dimensões, peso real, nível de detalhe, indicação etária.

2. **Variações**
   - Substituir `grind_option`/`weight_grams` por eixos reais: cor do filamento, tamanho/escala, acabamento e material.
   - Tabela de variações com SKU, preço, estoque e imagem por combinação.

3. **Personalizações**
   - Campos de personalização por produto (texto gravado, cor, escala, upload de referência).
   - Fluxo de orçamento para pedidos sob medida, integrado ao formulário de `/personalizados`.

4. **Estoque**
   - Controle por variação, com produção sob demanda vs. pronta entrega.
   - Movimentações de estoque e alerta de mínimo.

5. **Limpeza segura do esquema legado**
   - Migração em duas fases: primeiro parar de escrever nas colunas de café, depois remover.
   - Remover/renomear `producers`, `sensory_notes`, assinatura de café e rotas órfãs (`/cafe/$slug` → `/produto/$slug`, `/produtores`, `/clube`, `/assinatura`, `/private-label`, `/quiz` sensorial) com redirects.
   - Revisar RLS e GRANTs de todas as tabelas novas.

## Onda 3 (prevista)

- Checkout e frete calibrados para produtos físicos impressos.
- Galeria de fotos reais, avaliações e prova social.
- Painel administrativo focado em produção (fila de impressão, status por peça).
