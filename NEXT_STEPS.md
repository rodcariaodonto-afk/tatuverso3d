# TatuVerso3D — Próximos passos

## Concluído
- **Onda 1** — Identidade visual Cosmic Blue, navegação, home e páginas institucionais.
- **Onda 2** — Produtos 3D, variações, personalização, estoque e painel admin.
- **Hotfix pós-Onda 2** — Proteção de `cost_price`, validação de personalização no servidor, buckets e SKU.
- **Onda 3A** — Cards padronizados, checkout em etapas, modelagem de entrega e provedores de frete.
- **Onda 3B** — Pagamentos Mercado Pago (Pix e cartão), webhook assinado, estoque reservado e job de expiração.
- **Onda 3C** — Operação de pedidos, rastreio, área do cliente e estoque auditado.
- **Onda 3D** — Painel de eventos de pagamento com reprocessamento e estorno real (total/parcial) no provedor.

### O que a Onda 3D entregou
- `/admin/pagamentos`: eventos do provedor com filtros, payload e reprocessamento reconsultando a API.
- Estorno no detalhe do pedido: valor total ou parcial, motivo obrigatório, idempotência, auditoria e
  atualização de pedido/estoque somente após confirmação do provedor.
- `payments` agora guarda `refunded_amount`, `refund_reason` e `refunded_at`.

## Pendências imediatas
1. **Credenciais de teste do Mercado Pago (`TEST-...`)**: as chaves atuais são de produção e a API
   recusa as chamadas com `401 Unauthorized use of live credentials`. Com as chaves de teste,
   rodamos a matriz automatizada (Pix aprovado, cartão aprovado, cartão recusado, expiração, estorno).
2. Cadastrar a URL do webhook no painel do Mercado Pago (evento `payment`).

## Próxima etapa — Onda 3E: notificações por e-mail
E-mails transacionais ao cliente nas transições de status (pago, em produção, enviado, entregue),
com preferência de opt-out e registro de envio.

## Onda 4 (planejada)
Limpeza segura do esquema legado CAFEX (café, assinaturas, produtores) após confirmação de que nenhuma
tela depende mais dessas tabelas.
