# Atualizar credenciais do Mercado Pago para produção

As credenciais atualmente salvas são de sandbox. Substituir pelas credenciais de produção reais do Mercado Pago.

## Ação

- Abrir formulário seguro de atualização para:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_PUBLIC_KEY`
  - `MERCADOPAGO_WEBHOOK_SECRET`
- Após a troca, reiniciar o servidor para carregar os novos valores.
- Validar a conexão novamente em `/admin/integracoes`.
