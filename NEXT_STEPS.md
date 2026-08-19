# TatuVerso3D — Próximos passos

## Concluído
- **Onda 1** — Identidade visual Cosmic Blue, navegação, home e páginas institucionais.
- **Onda 2** — Produtos 3D, variações, personalização, estoque e painel admin.
- **Hotfix pós-Onda 2** — Proteção de `cost_price`, validação de personalização no servidor, buckets e SKU.
- **Onda 3A** — Cards padronizados, checkout em etapas, modelagem de entrega e provedores de frete.
- **Onda 3B** — Pagamentos Mercado Pago (Pix e cartão), webhook assinado, estoque reservado e job de expiração.

## Próxima etapa — Onda 3C: Operação de pedidos, rastreio e área do cliente
1. **Painel de pedidos (admin)**: lista com filtros por status/pagamento, detalhe do pedido, itens com
   personalização e arquivos, fila de produção e mudança de status com histórico.
2. **Envio e rastreio**: registro de `shipments`, código de rastreio, `tracking_events` e notificação
   de mudanças ao cliente.
3. **Área do cliente**: "Meus pedidos" com linha do tempo (pago → produção → enviado → entregue),
   segunda via do Pix, nota de personalização e endereço.
4. **Estoque na operação**: tela de movimentações (`inventory_movements`), alerta de estoque baixo e
   ajuste manual auditado.
5. **Pagamentos na operação**: visão de `payments`/`payment_events`, reprocessamento manual de webhook
   e estorno registrado.
6. **Testes ponta a ponta** com credenciais de teste do Mercado Pago (Pix aprovado, cartão aprovado,
   cartão recusado, expiração de reserva).

## Onda 4 (planejada)
Limpeza segura do esquema legado CAFEX (café, assinaturas, produtores) após confirmação de que nenhuma
tela depende mais dessas tabelas.
