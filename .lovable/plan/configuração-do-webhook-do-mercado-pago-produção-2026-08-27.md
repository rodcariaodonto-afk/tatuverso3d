# Configuração do webhook do Mercado Pago (produção)

Nenhuma mudança de código é necessária — o endpoint já existe e valida assinatura.

## O que fazer no painel do Mercado Pago

1. URL de produção: `https://tatuverso3d.lovable.app/api/public/webhooks/mercadopago` (já está correta).
2. Eventos: deixar marcado **apenas "Pagamentos (legacy)"**.
   - Desmarcar "Pedidos comerciais" e "Order (Mercado Pago)".
3. Salvar e copiar a **chave secreta** exibida pelo Mercado Pago.

## Verificação

- A chave secreta salva no painel precisa ser idêntica à `MERCADOPAGO_WEBHOOK_SECRET` já cadastrada no projeto. Se o Mercado Pago gerou uma nova ao salvar, eu abro o formulário seguro para você colar o valor atualizado.
- Após salvar, uma compra de teste em produção (Pix, valor baixo) confirma o fluxo: o pagamento deve mudar para `paid` automaticamente e o pedido aparecer em `/admin/pedidos`.

## Detalhe técnico

O handler `src/routes/api/public/webhooks/mercadopago.ts` verifica o header `x-signature` (HMAC com `MERCADOPAGO_WEBHOOK_SECRET`), grava o evento em `payment_events` de forma idempotente e só processa eventos cujo tipo contenha `payment`; os demais são registrados e ignorados.
