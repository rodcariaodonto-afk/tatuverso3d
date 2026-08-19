# TatuVerso3D — Próximos passos

## Concluído

- **Onda 1** — Identidade visual Cosmic Blue, navegação, home, páginas institucionais.
- **Onda 2** — Produtos 3D, variações, personalização, estoque e painel administrativo.
- **Hotfix pós-Onda 2** — Proteção de `cost_price`, validação de personalização no servidor,
  buckets em migração idempotente e unicidade cruzada de SKU.
- **Onda 3A** — Cards padronizados, checkout profissional em etapas, modelagem de entrega
  (dimensões, pacotes, cotações, rastreio) e arquitetura de provedores de frete
  (Manual, Retirada, Melhor Envio preparado para sandbox) com painel `/admin/entrega`.

## Próxima etapa

### Onda 3B — Pagamentos Mercado Pago, webhooks e baixa de estoque

1. Checkout Transparente com Pix (QR + copia e cola) e cartão (tokenização no navegador,
   nenhum dado sensível trafega pelo backend da loja).
2. Server functions de criação de pagamento e consulta de status; nenhuma credencial no cliente.
3. Webhook em `/api/public/webhooks/mercadopago` com verificação de assinatura, idempotência
   e reconciliação de `payments` e `orders`.
4. Baixa e reserva de estoque vinculadas ao pagamento aprovado, com registro em
   `inventory_movements` e liberação automática de reservas expiradas.
5. Fila de produção por item (`production_status`) e transições auditadas.
6. Testes ponta a ponta em ambiente de teste — nenhuma cobrança real.

Pré-requisito: credenciais de teste do Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN` e chave pública).

### Onda 3C — Operação, área do cliente e envio

- Painel de pedidos com etiquetas, rastreio e histórico de status.
- Área do cliente com acompanhamento de produção e entrega.
- Integração real do Melhor Envio (token sandbox) e emissão de etiqueta.

### Onda 4 — Limpeza segura do esquema legado CAFEX

Somente após 3B e 3C estáveis, com backup e migração reversível.
