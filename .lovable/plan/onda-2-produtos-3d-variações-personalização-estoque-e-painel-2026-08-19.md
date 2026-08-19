# Onda 2 — Produtos 3D, variações, personalização, estoque e painel

## Verificação da Onda 1 (feita antes deste plano)

Confirmado no código e no banco:

- Marca pública já é TatuVerso3D (nenhuma string "CAFEX"/"Café EX" restante em `src`).
- Logo TatuVerso3D no header e footer; home sem conteúdo de café; menu com categorias 3D.
- Painel administrativo com item "Produtos" (`/admin/produtos`).
- Build atual funcionando.
- **Exceção:** a rota do produto ainda é `/cafe/$slug` (arquivo `src/routes/cafe.$slug.tsx`). A rota `/produto/$slug` **não existe**. Este é o único item do checklist pendente e será o primeiro passo da Onda 2 (renomear rota e atualizar todos os links: catálogo, card de produto, carrinho, drawer).

Estado dos dados: todas as tabelas relevantes (`products`, `orders`, `order_items`, `profiles`, `addresses`, `categories`, `product_images`, `favorites`, `carts`, `product_variants`, `producers`) estão **vazias** (0 registros). Portanto a migração é aditiva e sem risco a dados reais — ainda assim, nenhum DROP será executado.

## Entregas

### 1. Rota do produto
Renomear `cafe.$slug.tsx` → `produto.$slug.tsx`; atualizar links em `ProductCard`, `catalogo`, `carrinho`, `CartDrawer`.

### 2. Migração única (aditiva, apresentada para aprovação)
- `products`: adicionar `product_type`, `material_description`, `production_time_days`, `made_to_order`, `is_personalizable`, `is_sensory`, `age_recommendation`, `safety_notes`, `care_instructions`, `dimensions_text`, `included_items`, `color_notes`, `seo_title`, `seo_description`, `low_stock_threshold`, `track_inventory`, `allow_backorder`, `sort_order`. Tornar `producer_id` opcional (`DROP NOT NULL`). Colunas de café permanecem intactas.
- `categories`: adicionar `parent_id`, `icon`, `is_active`, `is_featured`, `updated_at` + trigger.
- Novas tabelas: `product_options`, `product_option_values`, `variant_option_values`, `product_customization_fields`.
- `product_variants`: adicionar `name`, `barcode`, `cost_price`, `reserved_quantity`, `low_stock_threshold`, `dimensions_text`, `image_url`, `is_active`, `sort_order`; tornar `weight_grams`/`grind_option` opcionais.
- `order_items`: adicionar `variant_name_snapshot`, `sku_snapshot`, `customization_data`, `production_notes`, `production_status` (o `product_name`/`unit_price` já são snapshots imutáveis por trigger).
- `inventory_movements`: adicionar `product_id`, `previous_quantity`, `resulting_quantity`, `reason`, `order_id`; tornar `variant_id` opcional; ampliar tipos de movimento.
- `product_images`: adicionar `variant_id`.
- Índices para FKs e campos usados em políticas; constraint única em `variant_option_values`, em slugs e SKUs.
- RLS + GRANTs explícitos em todas as tabelas novas: leitura anônima só de produtos publicados/categorias ativas/valores ativos, sem `cost_price` (via view/coluna omitida na projeção); escrita apenas admin via `is_admin(auth.uid())`; políticas UPDATE sempre com USING + WITH CHECK.
- Seed apenas das 7 categorias institucionais. Nenhum produto fictício.
- Após aprovação: regenerar tipos TypeScript.

### 3. Storage
- Bucket privado `customization-uploads` com políticas por `auth.uid()` (cliente vê só os próprios; admin vê tudo), URLs assinadas com expiração, validação de MIME/extensão/tamanho no cliente e no servidor.
- `product-images` segue público, gerenciável só por admin.

### 4. Painel administrativo
- `/admin/produtos`: lista com imagem, nome, SKU, categoria, preço inicial, estoque total, nº de variações, personalizável, destaque, status, atualizado em; filtros (busca, categoria, status, tipo, material, personalizável, estoque baixo, sem estoque, destaque); ações criar/editar/duplicar/arquivar/ativar/ver na loja/gerenciar estoque. Produtos com pedidos só podem ser arquivados.
- `ProductForm` reescrito em abas: Básico, Preço, Categorias, Imagens, Variações, Personalização, Estoque, Produção e envio, Segurança e cuidados, SEO. Validação de slug/SKU únicos, regras de publicação, rascunho/publicar/arquivar, aviso ao sair com alterações não salvas, preview.
- Tela de estoque: ajuste manual gerando `inventory_movements` com quantidade anterior/resultante e responsável; alerta de estoque baixo. **Sem** integração automática de baixa por pagamento nesta onda (o evento de confirmação do pedido será definido na Onda 3) — o mecanismo fica pronto e documentado.

### 5. Catálogo e página de produto
- Catálogo: filtros por categoria, faixa de preço, material, cor, personalizável, em estoque, sob encomenda; ordenação por recentes, mais vendidos, preço asc/desc, destaques. Nenhum filtro de café.
- `/produto/$slug`: galeria, preço/promocional, badges, seleção visual de cor, tamanho e material, campos de personalização, prazo de produção, estoque, quantidade, cuidados, segurança, faixa etária, dimensões, peso, itens inclusos, relacionados, favorito, compartilhar. Preço e imagem mudam com a variação; combinação inexistente e personalização obrigatória bloqueiam a compra; "Produzido sob encomenda" visível. Sem promessa terapêutica.

### 6. Carrinho
- Linha identificada por `product_id` + `variant_id` + hash das personalizações; mesmas escolhas somam quantidade, escolhas diferentes criam nova linha. Exibe imagem, nome, variação, cor, material, personalização, acréscimos e prazo.
- Server function recalcula e valida preço no backend antes de criar pedido/pagamento; nunca confia no preço do navegador.

### 7. Validação
Playwright em desktop e mobile cobrindo: criar produto simples, com cores/tamanhos, sob encomenda, personalizável; upload e reordenação de imagens; ajuste de estoque com movimento registrado; catálogo, seleção de variação, mudança de preço, personalização obrigatória, dois itens com configurações diferentes no carrinho. Testes RLS com sessões reais (anon, cliente, outro cliente, admin) — não pelo SQL editor. Dados de teste removidos ao final. Build de produção, typecheck e console limpos.

### 8. Documentação
Atualizar `TATUVERSO3D_PROJECT.md` e substituir `NEXT_STEPS.md` por "Onda 3 — Limpeza segura do legado CAFEX, checkout, pagamentos, frete e operação de pedidos."

## Notas técnicas

- Sem `DROP TABLE`/`DROP COLUMN`/`DELETE` nesta onda; colunas legadas de café permanecem no banco, ocultas da UI.
- Autorização via `user_roles` + `is_admin()` já existentes; nada de `user_metadata` nem `auth.role()`.
- Leituras públicas por server function com chave publicável; escritas admin via cliente autenticado com RLS.
- `routeTree.gen.ts` não é editado manualmente.
