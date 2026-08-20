# Plano — Fila de produção e controle de pedidos pagos

## Objetivo
Deixar claro e seguro o fluxo de "pedido pago → produção" no painel admin: manter controle por item, criar uma fila prioritária de pedidos pagos ainda não iniciados e garantir que nenhum item entre em produção antes do pagamento confirmado.

## O que será feito

1. **Fila prioritária "Pedidos pagos — aguardando produção"**
   - Nova aba/cards em `/admin/pedidos` listando pedidos com `status = 'paid'` e pelo menos um item com `production_status = 'pending'`.
   - Ordenação por data de pagamento/pedido (mais antigo primeiro).
   - Cada card mostra: ID, cliente, itens pendentes, data, link direto para o pedido.

2. **Bloqueio de segurança no servidor**
   - Ajustar `adminSetItemProduction` em `src/lib/orders-admin.functions.ts` para rejeitar mudança de `pending` → `in_production` quando o pedido não estiver com `payment_status = 'paid'`.
   - Mensagem clara: "Aguarde a confirmação do pagamento para iniciar a produção."

3. **Destaque visual no detalhe do pedido**
   - Em `/admin/pedidos/$id`, quando o pedido está pago mas há itens pendentes, exibir banner/cards "Pronto para produção".
   - Manter o controle por item (dropdown + notas + salvar) já existente.

4. **Auditoria**
   - Garantir que toda mudança de status de produção continue sendo registrada em `audit_logs` (já existe hoje).

## Escopo técnico

- `src/lib/orders-admin.functions.ts`: nova server function `adminPendingProductionQueue` + validação em `adminSetItemProduction`.
- `src/routes/admin.pedidos.tsx`: nova aba "Aguardando produção" com cards da fila prioritária.
- `src/routes/admin.pedidos.$id.tsx`: banner condicional quando pedido pago e itens pendentes.
- Nenhuma alteração de schema de banco necessária (usa `orders.status`, `orders.payment_status`, `order_items.production_status`).

## Não inclui
- Automação de mudança de status (o usuário quer controle manual por item).
- Notificações por e-mail/SMS.
- Integração com impressoras 3D ou outras máquinas.

## Critério de pronto
- Admin consegue abrir `/admin/pedidos`, clicar em "Aguardando produção" e ver todos os pedidos pagos que ainda não começaram a imprimir.
- Tentativa de colocar item em produção antes do pagamento é bloqueada pelo servidor.
- Build, typecheck e testes passam.
