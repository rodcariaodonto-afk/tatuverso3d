# Onda 3D — Operação de pagamentos, estorno real e testes ponta a ponta

Escopo definido: sem e-mails nesta onda, estorno chamando a API do Mercado Pago de verdade,
e testes automatizados com credenciais de teste.

## 1. Painel de eventos de pagamento

Nova tela `/admin/pagamentos`:
- Lista de `payment_events` com provedor, tipo, id do pagamento, assinatura válida,
  processado em / erro de processamento e data.
- Filtros: apenas com erro, não processados, por id de pagamento.
- Detalhe em painel lateral com o payload recebido (somente leitura).
- Botão **Reprocessar**: reexecuta a reconciliação a partir do provedor (nunca do corpo salvo),
  atualizando `processed_at` ou `process_error`.
- Todas as ações exigem admin verificado no servidor.

## 2. Estorno real no Mercado Pago

- Novo bloco "Estorno" no detalhe do pedido (`/admin/pedidos/$id`), visível quando há pagamento aprovado.
- Suporta estorno total ou parcial, com motivo obrigatório.
- Fluxo: valida admin → confere valor contra o pagamento no banco → chama a API de refund do
  Mercado Pago com chave de idempotência → reconsulta o pagamento → atualiza `payments` e o
  pedido (`payment_status = refunded`, `status = refunded` no total) → registra em `audit_logs`.
- Estorno total libera/ajusta estoque conforme a política já existente de cancelamento.
- Estorno parcial mantém o pedido pago e registra o valor devolvido.
- Falha da API nunca marca o pedido como estornado; o erro aparece na tela.

## 3. Testes ponta a ponta automatizados

Roteiro executado com Playwright contra a preview, usando as credenciais de teste já configuradas:
1. Carrinho → checkout autenticado → endereço → frete → criação do pedido (reserva de estoque criada).
2. **Pix aprovado**: gera QR, simula aprovação pelo provedor, confirma pedido `paid`,
   reserva `committed` e movimento de estoque gerado.
3. **Cartão aprovado**: tokenização no navegador, pedido `paid`.
4. **Cartão recusado**: pedido permanece `pending`, reserva mantida, mensagem clara ao cliente.
5. **Expiração de reserva**: força vencimento e roda o job; reserva liberada e pedido cancelado.
6. **Estorno**: aplica estorno total em um pedido pago e valida o resultado no admin e na área do cliente.

Cada cenário gera evidência (status final no banco + captura de tela). O que não puder ser
automatizado com segurança vira checklist manual documentado.

## 4. Documentação

- `TATUVERSO3D_PROJECT.md`: seção Onda 3D (painel de eventos, estorno, matriz de testes).
- `NEXT_STEPS.md`: marca 3D como concluída e deixa como próximas etapas
  notificações por e-mail e a Onda 4 (limpeza do esquema legado CAFEX).

## Detalhes técnicos

- `src/lib/payments.server.ts`: adiciona `refundMpPayment` (POST `/v1/payments/{id}/refunds`,
  idempotência, timeout) e reuso do mapeamento de status existente.
- `src/lib/payments-admin.functions.ts` (novo): `listPaymentEvents`, `getPaymentEvent`,
  `reprocessPaymentEvent`, `refundPayment` — todas com `requireSupabaseAuth` + `is_admin`,
  carregando `client.server` dentro do handler.
- Reprocessamento reutiliza `syncPaymentFromProvider` de `payments-sync.server.ts`.
- Migração pequena: colunas de estorno em `payments` (`refunded_amount`, `refund_reason`,
  `refunded_at`) + índices em `payment_events` para os filtros. Sem DROP de nada.
- `src/routes/admin.pagamentos.tsx` novo e link no `AdminShell`.
- Sem novas Edge Functions; tudo em server functions do TanStack.
