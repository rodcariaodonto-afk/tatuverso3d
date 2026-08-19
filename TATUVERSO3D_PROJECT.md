# TatuVerso3D — Documentação do projeto

E-commerce de produtos fabricados por impressão 3D. Identidade "Cosmic Blue"
(azul cósmico, laranja filamento, magenta), tipografia Fredoka + Nunito Sans.

## Stack
TanStack Start (React 19, Vite 7) + Tailwind v4 + Lovable Cloud (Postgres, Auth, Storage).
Lógica de servidor em `createServerFn` (`src/lib/*.functions.ts`).

## Modelo de produtos 3D
- `products`: tipo 3D, material, dimensões, prazo de produção, sob encomenda, personalizável,
  sensorial, SEO, controle de estoque (`track_inventory`, `low_stock_threshold`, `allow_backorder`).
- Variações: `product_options` → `product_option_values` → `product_variants` ← `variant_option_values`.
- Personalização: `product_customization_fields` (texto curto/longo, seleção, cor, número, checkbox,
  arquivo/imagem) com acréscimo de preço por campo.
- Estoque: `inventory_movements` (histórico imutável para não-admin).

## Segurança (hotfix pós-Onda 2)
- **Preço de custo**: `SELECT` de tabela inteira revogado em `product_variants` para `anon` e
  `authenticated`; grants apenas nas colunas públicas. `cost_price` não possui grant algum.
  O admin lê/grava custo exclusivamente por `getVariantCosts` / `saveVariantCosts`
  (`src/lib/admin-costs.functions.ts`), com middleware de auth + verificação `is_admin`.
  Consultas com `select=*` em `product_variants` retornam 42501 para o público.
- **Personalizações**: `validateCart` (`src/lib/cart.functions.ts`) recarrega produto, variação e
  campos do banco; rejeita campo inexistente ou de outro produto, duplicado, obrigatório vazio,
  limites de tamanho, opções fora da lista, cor/número inválidos e arquivos fora do prefixo
  `auth.uid()/` no bucket privado (com limite de 10 MB e MIME permitido verificados no servidor).
  Todo acréscimo e o subtotal são recalculados pelo banco — nada de preço vindo do navegador.
- **Storage**: `customization-uploads` privado, leitura/escrita apenas no prefixo do próprio usuário
  (admin lê tudo); `product-images` público para leitura, escrita restrita a admin.
- **SKU**: índices únicos case-insensitive em `products.sku` e `product_variants.sku` + trigger
  `tg_sku_cross_unique` impedindo reuso cruzado entre as duas tabelas.
- **RLS**: ativa em todas as tabelas do schema público, com grants explícitos por papel.

## Convenções de código
- `*.functions.ts` contém apenas imports, tipos e declarações de server function;
  helpers e schemas ficam em módulos irmãos (`cart-validation.ts`, `admin-costs.shared.ts`).
- Cores sempre por tokens semânticos definidos em `src/styles.css`.
