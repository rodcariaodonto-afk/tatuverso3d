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


## Onda 3A — Checkout, entrega e padronização visual

### Cards
`src/components/catalog/ProductCard.tsx` expõe um `BaseProductCard` único (imagem quadrada,
alturas reservadas para título/descrição/badges e preço ancorado com `mt-auto`), consumido por
catálogo, home e blocos de destaque. Todos os cards de uma grade têm a mesma altura.

### Checkout
`/checkout` é um fluxo autenticado em três etapas (Endereço → Entrega → Revisão) com resumo
fixo, busca de CEP, validação de UF/telefone e tela de confirmação.

### Entrega
- Tabelas: `shipping_settings`, `shipping_methods`, `shipping_quotes`, `tracking_events`;
  `orders` guarda `shipping_snapshot`, `shipping_quote_id` e `production_days`.
- Provedores em `src/lib/shipping.server.ts`: `manual`, `pickup` e `melhor_envio`
  (ativado apenas com `MELHOR_ENVIO_TOKEN`; falha de API nunca vira frete grátis).
- Painel `/admin/entrega` para origem, prazos, retirada, markup e métodos manuais.

### Segurança
- `INSERT` direto em `orders` e `order_items` foi revogado de `anon` e `authenticated`.
  Pedidos só nascem em `createOrder`, que recalcula preços, valida personalizações,
  confere a cotação (dono, validade, hash do carrinho e CEP) e grava via service role.
- Cotações são persistidas com `cart_hash` e expiram em 30 minutos.
- Funções administrativas de frete validam `is_admin` antes de qualquer escrita.


## Onda 3B — Pagamentos, webhook e estoque reservado

### Pagamentos (Mercado Pago, Checkout Transparente)
- `src/lib/payments.server.ts` — cliente da API (idempotência, timeout, mapeamento de status,
  verificação HMAC da assinatura do webhook). Somente servidor.
- `src/lib/payments.functions.ts` — `getPaymentConfig` (só a chave pública), `startPayment`
  (Pix e cartão; o valor vem sempre do pedido no banco), `getPaymentStatus` (reconsulta o provedor),
  `cancelOrder` (libera reserva).
- `src/lib/payments-sync.server.ts` — única fonte de reconciliação: provedor → `payments` → `orders`
  → estoque. O corpo do webhook nunca é confiável; o pagamento é sempre reconsultado na API.
- `src/routes/pagamento.$orderId.tsx` — Pix (QR + copia e cola + contagem regressiva + polling) e
  cartão tokenizado no navegador pelo SDK oficial. A loja nunca recebe o número do cartão.

### Webhook e job
- `POST /api/public/webhooks/mercadopago` — valida assinatura `x-signature` (HMAC-SHA256 em tempo
  constante), grava `payment_events` com índice único (idempotência) e responde 500 apenas para
  forçar reenvio em falha de processamento.
- `POST /api/public/jobs/expire-reservations` — protegido por `apikey`; agendado no pg_cron a cada
  5 minutos para liberar reservas vencidas.

### Estoque reservado
- `stock_reservations` + `products.reserved_quantity` / `product_variants.reserved_quantity`.
- Funções `reserve_stock` (na criação do pedido, com `FOR UPDATE`), `commit_stock` (pagamento
  aprovado, gera `inventory_movements`), `release_stock` (recusa/cancelamento) e
  `expire_stock_reservations`. Todas `SECURITY DEFINER` com `EXECUTE` revogado de `public`, `anon`
  e `authenticated` — apenas o servidor da loja executa.

### Segurança
- Credenciais do provedor em secrets (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`,
  `MERCADOPAGO_WEBHOOK_SECRET`); o navegador só recebe a chave pública.
- `payment_events` e `stock_reservations` com RLS: leitura apenas para admin; escrita só service role.
- Nenhum valor de pagamento vem do navegador: total, frete e acréscimos são lidos do pedido no banco.

## Onda 3C — Operação de pedidos, rastreio e área do cliente

### Servidor
- `src/lib/orders.shared.ts` — rótulos pt-BR, máquina de transições permitidas e linha do tempo do cliente.
- `src/lib/orders.server.ts` — `buildOrderDetail`, com URLs assinadas (10 min) para arquivos de personalização.
- `src/lib/orders-admin.functions.ts` — lista/detalhe de pedidos, transição de status validada, produção por
  item, envio, eventos de rastreio e reconsulta de pagamento. Todas exigem `is_admin`.
- `src/lib/orders.functions.ts` — `listMyOrders` e `getMyOrder`, escopados por `customer_id = auth.uid()`.
- `src/lib/inventory-admin.functions.ts` — histórico, ajuste manual auditado e alerta de estoque baixo.

### Regras
- Transições válidas: pending→cancelled; paid→preparing/shipped/cancelled/refunded; preparing→shipped/
  cancelled/refunded; shipped→delivered/refunded; delivered→refunded. Qualquer outra é recusada no servidor.
- Cancelamento chama `release_stock`; ajuste manual grava `inventory_movements` com autor, motivo e
  quantidade anterior/resultante, além de registro em `audit_logs`.
- `anon` e `authenticated` não possuem INSERT/UPDATE/DELETE em `orders`, `shipments`, `tracking_events`
  e `inventory_movements`; a escrita ocorre apenas via `service_role` nas server functions.

### Telas
- `/admin/pedidos`, `/admin/pedidos/$id`, `/admin/estoque`, `/minha-conta`, `/minha-conta/pedido/$id`.

## Onda 3D — Operação de pagamentos e estorno

### Painel de eventos (`/admin/pagamentos`)
- Lista `payment_events` (tipo, id do pagamento, assinatura, processamento, erro) com filtros
  "somente com erro", "não processados" e busca por id do pagamento.
- Detalhe lateral com payload recebido (somente leitura) e link para o pedido vinculado.
- **Reprocessar** chama `syncPaymentFromProvider`, que sempre reconsulta a API do Mercado Pago;
  o corpo salvo nunca é fonte de verdade. Sucesso grava `processed_at`; falha grava `process_error`.

### Estorno real
- `refundMpPayment` (`src/lib/payments.server.ts`) → `POST /v1/payments/{id}/refunds`, com chave de
  idempotência `refund:<payment_id>:<valor>` e timeout de 15 s.
- `refundPayment` (`src/lib/payments-admin.functions.ts`): exige admin, confere valor contra
  `payments.amount - refunded_amount`, chama o provedor, reconcilia, grava `refunded_amount`,
  `refund_reason`, `refunded_at` e registra em `audit_logs`.
- Estorno total marca o pedido como `refunded` (respeitando a máquina de transições) e libera reservas
  pendentes; estorno parcial mantém o pedido pago e apenas registra o valor devolvido.
- Falha da API nunca marca o pedido como estornado — o erro aparece na tela.

### Matriz de testes
| Cenário | Como validar |
| --- | --- |
| Pix aprovado | Pedido → Pix → aprovar no sandbox → pedido `paid`, reserva `committed`, movimento de estoque |
| Cartão aprovado | Titular `APRO` → pedido `paid` |
| Cartão recusado | Titular `OTHE` → pedido segue `pending`, reserva mantida |
| Expiração de reserva | `POST /api/public/jobs/expire-reservations` com apikey → reserva liberada, pedido cancelado |
| Estorno total | `/admin/pedidos/$id` → Estornar → pedido `refunded` e valor em `payments.refunded_amount` |

Observação: os testes automatizados de pagamento dependem de credenciais **TEST-** do Mercado Pago.
Com as chaves de produção atuais a API responde `401 Unauthorized use of live credentials`.
