# Plano — Mercado Pago em Produção

## Situação atual
- As novas credenciais foram salvas no ambiente, mas ainda não foi confirmado se são de produção.
- O usuário informou que a chave secreta do webhook (`MERCADOPAGO_WEBHOOK_SECRET`) continua a mesma após a alteração no painel do Mercado Pago.
- O painel `/admin/integracoes` mostra "Conectado como CBCEDFGHA90170 (MLB)", mas isso não distingue sandbox de produção.

## Objetivo
Garantir que o Mercado Pago esteja 100% em produção, com webhook configurado e fluxo de pagamento validado.

## Passos

### 1. Validar se o access token é de produção
- Fazer uma chamada de teste à API do Mercado Pago usando o `MERCADOPAGO_ACCESS_TOKEN` atual.
- Verificar se a resposta indica ambiente de produção (ex: presença de `live_mode: true` ou ausência de flags de teste).
- Se for sandbox, solicitar novamente as credenciais de produção.

### 2. Confirmar a chave secreta do webhook
- Como a chave não mudou, manter o valor atual de `MERCADOPAGO_WEBHOOK_SECRET`.
- Caso o usuário desconfie que a chave antiga era de sandbox, abrir formulário seguro para atualização.

### 3. Configurar o webhook no Mercado Pago
- URL: `https://tatuverso3d.lovable.app/api/public/webhooks/mercadopago`
- Evento obrigatório: `payment`
- Garantir que o endpoint esteja público e valide a assinatura HMAC corretamente.

### 4. Testar fluxo de pagamento real
- Realizar uma compra de teste com valor mínimo (ex: R$ 1,00) usando Pix ou cartão.
- Verificar se o pagamento aparece no painel `/admin/pedidos` com status atualizado.
- Confirmar se o webhook foi recebido e processado sem erro.

### 5. Limpar ambiente de sandbox
- Remover ou desativar credenciais antigas de sandbox, se ainda existirem em algum lugar do código/ambiente.
- Garantir que `integrations.mp_environment` esteja definido como `production`.

## Critérios de conclusão
- [ ] API do Mercado Pago responde como produção.
- [ ] Webhook configurado no painel do Mercado Pago.
- [ ] Pagamento de teste processado com sucesso.
- [ ] Status do pedido atualizado automaticamente no painel admin.
