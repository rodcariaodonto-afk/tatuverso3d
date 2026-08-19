# Hotfix de Segurança e Integridade — pós-Onda 2

Escopo: proteger custo, validar personalização no servidor, versionar buckets e garantir unicidade de SKU. A Onda 3 não será iniciada.

## O que foi verificado agora

- `product_variants` e `products` hoje concedem privilégios de tabela inteira (incluindo SELECT) a `anon` e `authenticated` — ou seja, `cost_price` é legível pela Data API.
- `validateCart` (src/lib/cart.functions.ts) recebe apenas `customization_field_ids` e soma os acréscimos dos IDs enviados; não verifica campos obrigatórios, valores, tipos, limites nem propriedade de arquivos.
- Os buckets `customization-uploads` (privado) e `product-images` (público) existem, mas **sem** limite de tamanho e **sem** lista de MIME types, e a criação não está em migração.
- Não existe nenhuma constraint UNIQUE de `sku` em `products` nem em `product_variants`.

## 1. Proteger `cost_price`

- Migração: `REVOKE SELECT ON public.product_variants FROM anon, authenticated` e reconceder SELECT **coluna a coluna**, excluindo `cost_price` (id, product_id, name, sku, barcode, price, compare_at_price, stock/reserved, thresholds, dimensões, imagem, flags, ordenação, timestamps, weight_grams, grind_option, is_default).
- Aproveitar para restringir escrita: `anon` sem INSERT/UPDATE/DELETE; `authenticated` mantém escrita sob RLS; `service_role` com ALL.
- Ajustar todas as consultas públicas/cliente para listar colunas explicitamente (`select('*')` passa a falhar sem a coluna proibida).
- Nova server function protegida `getVariantCosts` (admin-only): valida `is_admin(auth.uid())` no servidor e só então carrega `cost_price` via cliente privilegiado; `ProductForm` passa a buscar/salvar custo por ela. Nada de service role no frontend.
- Sem views que burlem RLS.

## 2. Validar personalização no servidor

- Payload do carrinho passa a enviar as escolhas completas (`field_id` + `value` + arquivo, quando houver), nunca preço.
- `validateCart` recarrega do banco todos os campos de personalização do produto e valida: obrigatórios presentes, campo pertence ao produto, campo ativo, `field_type` correto, `min_length`/`max_length`, opções válidas em `select`/`color`, números e limites, checkbox obrigatório marcado.
- Arquivos: caminho precisa estar no bucket `customization-uploads` e sob o prefixo do `auth.uid()` do usuário autenticado — exige token, então a validação passa a rodar autenticada quando houver campo de arquivo.
- Todos os acréscimos recalculados pelo banco; preço/total do navegador ignorados.
- Retorno inclui `customization_data` normalizado (label, field_id, valor escolhido, acréscimo) gravado como snapshot em `order_items`.

## 3. Buckets em migração

- Migração idempotente que garante `customization-uploads` privado, com limite de tamanho e MIME types permitidos (imagens + PDF, nada executável).
- Políticas SELECT/INSERT/UPDATE/DELETE coerentes: cliente só no prefixo `auth.uid()`, admin com leitura para produção; acesso via URL assinada com expiração.
- Garantir `product-images` público, com escrita apenas de administrador.

## 4. SKU único

- Índices únicos parciais (ignorando nulos/vazios) em `products.sku` e `product_variants.sku`.
- Trigger de validação cruzada impedindo que um SKU de `products` seja reutilizado em `product_variants` e vice-versa — validação no banco, não só no formulário; o formulário passa a exibir o erro retornado.

## 5. Auditoria final

Regenerar tipos, build, typecheck, teste do catálogo como anônimo, do painel como admin e de conta cliente comum; rodar o verificador de segurança/RLS; confirmar bloqueio de `cost_price` para anon e cliente autenticado e rejeição de personalização obrigatória omitida. Nenhuma tabela ou dado será excluído. Atualizar `TATUVERSO3D_PROJECT.md` e marcar o hotfix como concluído no `NEXT_STEPS.md`, com relatório final (migrações, grants, server functions, testes, build, evidências).

## Detalhes técnicos

- Arquivos tocados: `src/lib/cart.functions.ts`, `src/lib/cart-store.ts`, `src/routes/checkout.tsx`, `src/routes/produto.$slug.tsx`, `src/components/admin/ProductForm.tsx`, `src/hooks/useProducts.ts`, `src/routes/catalogo.tsx`, nova `src/lib/admin-costs.functions.ts`, migrações SQL e docs.
- Migrações serão apresentadas para aprovação antes da execução.
