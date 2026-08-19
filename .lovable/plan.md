# Onda 3B — Pagamentos Mercado Pago, webhook e estoque reservado

Pix e cartão em ambiente de teste, com baixa de estoque confiável. Nenhuma cobrança real.

## O que muda para quem compra

1. Na revisão do pedido aparece a etapa **Pagamento**: Pix ou cartão de crédito.
2. **Pix** — o pedido é criado, aparece o QR Code e o código copia-e-cola, com contagem de expiração. A tela verifica sozinha quando o pagamento cai.
3. **Cartão** — os dados do cartão são digitados no formulário oficial do Mercado Pago dentro da página; número e CVV nunca passam pelo servidor da loja, só um token de uso único.
4. Aprovado: pedido vira **pago**, estoque baixa, e o cliente vê a confirmação com prazo de produção e entrega.
5. Recusado ou expirado: o pedido continua aberto e o cliente pode tentar outra forma de pagamento sem refazer endereço e frete.

## Estoque reservado

- Ao criar o pedido, a quantidade sai do disponível e entra em **reservada** (30 minutos para Pix, 15 para cartão).
- Pagamento aprovado: a reserva vira saída definitiva com registro no histórico de estoque.
- Pagamento recusado, cancelado ou expirado: a reserva volta ao disponível automaticamente.
- Toda alteração fica registrada em histórico com quantidade anterior, resultante e motivo.

## Painel administrativo

- Coluna de forma de pagamento e status real em `/admin/pedidos`, com detalhe do pagamento (método, ID no provedor, tentativas).
- Ação de **cancelar pedido** que libera reserva de estoque.
- Aba de reservas expiradas e botão de liberação manual, além da liberação automática.

## Detalhes técnicos

**Credenciais** — vou pedir dois secrets no backend: `MERCADOPAGO_ACCESS_TOKEN` (teste) e `MERCADOPAGO_PUBLIC_KEY`. O token nunca chega ao navegador; a chave pública é entregue por uma função de servidor apenas para montar o formulário de cartão.

**Banco (migração para aprovação)**
- `payments`: adicionar `idempotency_key` único, `provider_status`, `qr_code`, `qr_code_base64`, `ticket_url`, `expires_at`, `installments`, `payer_document`, `failure_reason`.
- `payment_events`: log bruto e idempotente de cada notificação recebida (`provider`, `event_id` único, `payload`, `processed_at`).
- `stock_reservations`: `order_id`, `product_id`, `variant_id`, `quantity`, `status` (held/committed/released), `expires_at`.
- Funções SQL `reserve_stock`, `commit_stock` e `release_stock` (security definer, transacionais) usando `reserved_quantity` de `product_variants` e `products`, com trava por linha para não vender a mesma unidade duas vezes.
- RLS: cliente lê apenas pagamentos dos próprios pedidos; escrita só por service role; `payment_events` e `stock_reservations` restritos a admin/service role.

**Servidor**
- `src/lib/payments.server.ts`: cliente Mercado Pago (fetch), criação de pagamento Pix e cartão, consulta de status, mapeamento de status do provedor para `payment_status`.
- `src/lib/payments.functions.ts`: `getPaymentConfig` (chave pública + métodos ativos), `startPayment` (recalcula o total do pedido no banco, nunca aceita valor do navegador, cria com chave de idempotência) e `getPaymentStatus` (polling autenticado, dono do pedido).
- `createOrder` passa a reservar estoque na mesma operação e a devolver o pedido pronto para pagamento.

**Webhook** — `src/routes/api/public/webhooks/mercadopago.ts`: valida a assinatura `x-signature` do Mercado Pago, ignora eventos repetidos por `event_id`, reconsulta o pagamento na API do provedor (nunca confia no corpo da notificação), atualiza `payments` e `orders` e efetiva ou libera o estoque. Sempre responde 200 depois de registrar, para não gerar reenvio infinito.

**Expiração** — rota `/api/public/cron/expire-payments` protegida por segredo, liberando reservas vencidas; enquanto não houver agendador, também é chamada de forma preguiçosa em leituras de estoque.

**Frontend** — nova etapa de pagamento em `/checkout` (Pix e cartão), tela de acompanhamento do pedido em `/pedido/$id` com status ao vivo, e ajuste do resumo para mostrar a forma escolhida.

**Verificação** — pagamento de teste Pix e cartão aprovado/recusado ponta a ponta, conferência de que o estoque reserva, baixa e volta corretamente, teste de webhook duplicado e de valor adulterado no navegador (deve ser ignorado), build e typecheck limpos, docs `TATUVERSO3D_PROJECT.md` e `NEXT_STEPS.md` atualizados para a Onda 3C.
