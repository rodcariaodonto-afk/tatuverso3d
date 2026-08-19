# TatuVerso3D — Próximos passos

## Onda 1 — Identidade visual (concluída)
Marca, paleta Cosmic Blue, tipografia Fredoka/Nunito Sans, navegação, home, páginas institucionais.

## Onda 2 — Produtos 3D, variações, personalização e estoque (concluída)
- Schema 3D: `product_options`, `product_option_values`, `product_variants`, `variant_option_values`, `product_customization_fields`, `inventory_movements`.
- `products` expandida (tipo, material, dimensões, prazo, sob encomenda, personalizável, sensorial, SEO, controle de estoque).
- Bucket privado `customization-uploads` com RLS por usuário.
- Loja com filtros de tipo, material, cor, personalizável, estoque e sob encomenda; ordenação por mais vendidos.
- Página `/produto/$slug` com galeria, seletores de variação, campos de personalização e ficha técnica.
- Carrinho e checkout com variações e personalizações; validação de preço/estoque no servidor.
- Admin: listagem com filtros (tipo, material, estoque baixo, personalizáveis) e formulário em abas
  (Básico, Preço, Categorias, Imagens, Variações, Personalização, Estoque, SEO) com geração de combinações
  e registro de movimentações de estoque.

## Hotfix de segurança pós-Onda 2 (concluído)
- `cost_price` inacessível pela Data API (grants por coluna) e exposto apenas via server function admin.
- `validateCart` valida integralmente as personalizações e recalcula todos os preços no servidor.
- Buckets, políticas de storage e unicidade cruzada de SKU garantidas por migração.
- Detalhes em `TATUVERSO3D_PROJECT.md`.

## Onda 3 — Limpeza do esquema legado e operação
Próxima etapa:
1. Remover com segurança colunas e tabelas legadas de café (`roast_level`, `score`, `acidity`, `body`,
   `sweetness`, `intensity`, `grind_option`, `farms`, `producers`, `sensory_notes`, `subscriptions`,
   `producer_plans`, `producer_applications`, `b2b_leads`, `private_label_projects`) após migração de dados.
2. Reservas de estoque no checkout e baixa automática na confirmação do pagamento.
3. Painel de pedidos com produção (fila de impressão, status por item) e etiquetas de envio.
4. Relatórios: vendas por tipo/material, giro de estoque, margem por variação (custo x preço).
5. Revisão final de RLS, linter de segurança e publicação.
