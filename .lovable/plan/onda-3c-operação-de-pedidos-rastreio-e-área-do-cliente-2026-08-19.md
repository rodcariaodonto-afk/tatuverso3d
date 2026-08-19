# Onda 3C — Operação de pedidos, rastreio e área do cliente

Fecha o ciclo depois do pagamento: o time opera o pedido no painel, registra produção e envio,
e o cliente acompanha tudo na conta dele. Nada é apagado — sem DROP de tabelas, colunas ou dados.

## 1. Painel de pedidos (admin)

Hoje a tela de pedidos é uma tabela simples com um seletor de status que grava direto do navegador.
Ela vira uma central de operação:

- **Lista**: filtros por status do pedido, status de pagamento, período e busca por ID, e-mail ou
  nome do cliente. Colunas com cliente, itens, total, pagamento, entrega e data.
- **Detalhe do pedido** (`/admin/pedidos/<id>`): dados do cliente, endereço, itens com variação,
  personalizações preenchidas e links assinados para os arquivos enviados (bucket privado),
  totais, pagamentos, reservas de estoque e histórico completo de status.
- **Mudança de status pelo servidor**, não pelo navegador: apenas transições válidas
  (pago → em produção → enviado → entregue; cancelar/estornar a partir dos estados permitidos),
  com nota interna e registro em histórico. Cancelar devolve o estoque reservado.
- **Fila de produção**: visão dos itens em produção, com status por item e prazo estimado.

## 2. Envio e rastreio

- Ao marcar como enviado, o admin registra transportadora, serviço, código e URL de rastreio —
  isso cria o registro de envio do pedido.
- Linha do tempo de rastreio por envio, com eventos que o admin pode adicionar manualmente
  (ex.: "postado", "em trânsito", "entregue"). Marcar entrega fecha o pedido.
- A tela de entrega já existente (configuração de frete) ganha link para os envios em aberto.

## 3. Área do cliente

- **Meus pedidos** com linha do tempo visual: criado → pago → em produção → enviado → entregue.
- **Detalhe do pedido** (`/minha-conta/pedidos/<id>`): itens, personalizações, endereço, totais,
  código de rastreio com link e histórico de status.
- Pedido aguardando pagamento mostra "Retomar pagamento" (leva à tela de Pix/cartão) e
  "Cancelar pedido" enquanto não estiver pago, liberando a reserva de estoque.
- Correção de escopo: hoje a listagem mostra todos os pedidos quando o usuário é admin. O cliente
  passa a ver só os próprios pedidos; a visão geral fica no painel.

## 4. Estoque na operação

- Tela de movimentações de estoque no admin: filtro por produto/variação e tipo de movimento,
  com origem (pedido, ajuste manual, expiração de reserva).
- Ajuste manual auditado (quantidade, motivo, quem fez), executado no servidor.
- Painel de estoque baixo usando o limite já configurado em cada produto/variação.

## 5. Pagamentos na operação

- No detalhe do pedido: pagamentos registrados, status, método e eventos recebidos do provedor.
- Botão "Reconsultar pagamento" que refaz a checagem no provedor e reconcilia pedido e estoque
  (útil se um webhook se perder). Estorno é registrado como status, sem cobrança real.

## 6. Testes

- Fluxo completo com credenciais de teste: pedido → Pix aprovado → produção → envio → entrega.
- Cartão recusado e expiração de reserva.
- Verificação de acesso: cliente não vê nem altera pedido de outro cliente, e nenhuma transição
  de status é possível direto do navegador.

## Notas técnicas

- Toda escrita de operação (status, envio, evento de rastreio, ajuste de estoque, reconsulta de
  pagamento) passa por server functions com `requireSupabaseAuth` + verificação de `is_admin`;
  o `UPDATE` direto de `orders` pelo navegador sai do código.
- Novas rotas: `src/routes/admin.pedidos.$id.tsx`, `src/routes/admin.estoque.tsx`,
  `src/routes/minha-conta.pedidos.$id.tsx`; `admin.pedidos.tsx` e `minha-conta.tsx` reescritos.
- Novos módulos: `src/lib/orders-admin.functions.ts`, `src/lib/shipments.functions.ts`,
  `src/lib/inventory-admin.functions.ts`, `src/lib/orders.functions.ts` (leitura do cliente),
  com helpers `.server.ts` para transições e reconciliação.
- Migração pequena e aditiva: políticas de leitura do cliente em `shipments`/`tracking_events`
  (apenas dos próprios pedidos), grants correspondentes, `EXECUTE` restrito nas funções novas e
  índices para os filtros da lista. Sem remoção de nada. A SQL é apresentada para aprovação.
- Arquivos de personalização continuam no bucket privado; o admin os acessa por URL assinada de
  curta duração gerada no servidor.