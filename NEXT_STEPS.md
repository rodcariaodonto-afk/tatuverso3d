# TatuVerso3D — Próximos passos

## Concluído
- **Onda 1** — Identidade visual Cosmic Blue, navegação, home e páginas institucionais.
- **Onda 2** — Produtos 3D, variações, personalização, estoque e painel admin.
- **Hotfix pós-Onda 2** — Proteção de `cost_price`, validação de personalização no servidor, buckets e SKU.
- **Onda 3A** — Cards padronizados, checkout em etapas, modelagem de entrega e provedores de frete.
- **Onda 3B** — Pagamentos Mercado Pago (Pix e cartão), webhook assinado, estoque reservado e job de expiração.
- **Onda 3C** — Operação de pedidos, rastreio, área do cliente e estoque auditado.

### O que a Onda 3C entregou
- `/admin/pedidos`: filtros por status, pagamento, período e busca; resumo operacional e fila de produção.
- `/admin/pedidos/$id`: itens com personalização e download assinado, produção por item, envio e rastreio,
  histórico de status, pagamentos com reconsulta ao provedor e reservas de estoque.
- `/admin/estoque`: movimentações, alerta de estoque baixo e ajuste manual com motivo obrigatório e auditoria.
- `/minha-conta` e `/minha-conta/pedido/$id`: pedidos apenas do próprio usuário, linha do tempo,
  rastreio, retomada de pagamento e cancelamento de pedido pendente.
- Toda escrita em `orders`, `order_items`, `shipments`, `tracking_events` e `inventory_movements` passa por
  server functions com verificação `is_admin`; `anon`/`authenticated` não têm mais INSERT/UPDATE/DELETE direto.

## Próxima etapa — Onda 3D: testes ponta a ponta e operação de pagamentos
1. Testes com credenciais de teste do Mercado Pago: Pix aprovado, cartão aprovado, cartão recusado e
   expiração de reserva.
2. Visão de `payment_events` no painel com reprocessamento manual de webhook e estorno registrado.
3. Notificações por e-mail ao cliente nas transições de status (pago, em produção, enviado, entregue).

## Onda 4 (planejada)
Limpeza segura do esquema legado CAFEX (café, assinaturas, produtores) após confirmação de que nenhuma
tela depende mais dessas tabelas.
