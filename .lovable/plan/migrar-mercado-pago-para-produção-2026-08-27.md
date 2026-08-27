# Migrar Mercado Pago para produção

Trocar o ambiente de pagamento de sandbox para produção, garantindo que as credenciais sensíveis sejam armazenadas de forma segura e que o webhook continue funcionando.

## 1. Coletar credenciais de produção de forma segura

- Abrir campos de secrets do projeto para receber:
  - `MERCADOPAGO_ACCESS_TOKEN` (Access Token de produção)
  - `MERCADOPAGO_PUBLIC_KEY` (Public Key de produção)
  - `MERCADOPAGO_WEBHOOK_SECRET` (secret usado na validação de assinatura dos webhooks)
- As chaves atuais de sandbox serão substituídas; o código já lê essas variáveis em `src/lib/payments.server.ts` e `src/lib/integrations-admin.functions.ts`.

## 2. Marcar ambiente como production no painel

- Atualizar a chave `integrations.mp_environment` para `production` em `/admin/integracoes`.
- O código usa essa setting para decidir URLs/validações quando necessário.

## 3. Configurar webhook no dashboard do Mercado Pago

- A URL do webhook publicada é: `https://tatuverso3d.lovable.app/api/public/webhooks/mercadopago`
- Registrar o evento `payment` no painal do Mercado Pago com essa URL.
- Confirmar que a assinatura (`x-signature`) continuará sendo validada pelo secret atualizado.

## 4. Validar a conexão

- No painel `/admin/integracoes`, executar "Testar conexão" do Mercado Pago para confirmar que o Access Token de produção está ativo.
- Verificar se o retorno mostra a conta correta (nickname/site_id).

## 5. Teste de pagamento real (opcional, recomendado)

- Realizar uma compra de valor mínimo no ambiente de produção para confirmar que:
  - Pix gera QR code e o webhook atualiza o pedido para `paid`.
  - Cartão tokeniza e cria o pagamento corretamente.
- O estoque reservado/commitado continua funcionando como na sandbox.

## Detalhes técnicos

- Nenhuma alteração de schema é necessária.
- Nenhuma rota nova será criada; o webhook existente (`src/routes/api/public/webhooks/mercadopago.ts`) já suporta produção desde que as variáveis estejam corretas.
- Após a troca das secrets, o servidor precisa ser reiniciado para carregar os novos valores.
