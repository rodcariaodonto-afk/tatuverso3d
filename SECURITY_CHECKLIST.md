# SECURITY_CHECKLIST.md — Cafezeira

Documento de auditoria de segurança. Atualizar à medida que itens são corrigidos.

---

## Resumo executivo

Auditoria realizada em maio/2026 sobre o schema gerado pela Lovable. **6 bugs ativos** no momento desta versão. Nenhum compromete dados pessoais imediatamente, mas todos devem ser corrigidos antes de aceitar pedidos reais ou processar pagamentos.

**Princípio orientador:** RLS é a única linha de defesa entre o cliente (browser, com chave anon) e os dados do banco. Toda policy precisa ser explícita, restritiva, e testada com 2 usuários diferentes.

---

## Bug 1 — `coupons` permite leitura pública dos cupons ativos (CRÍTICO)

### Policy atual

```sql
create policy "coupons_public_read" on public.coupons
  for select using (is_active = true or public.is_admin(auth.uid()));
```

### O problema

Qualquer pessoa não autenticada consegue executar `SELECT * FROM coupons WHERE is_active = true` via API anon e ver:
- Códigos de cupom
- Valor de desconto
- Pedido mínimo
- Limite de usos
- Datas de validade

### Risco prático

- Concorrência clona estratégia de promoção
- Scrapers automatizados acumulam cupons
- Cliente compartilha cupons internos publicamente
- Vazamento de campanhas comerciais antes do lançamento

### Correção

Cupom **nunca** deve ser lido pelo client. Validação só via Edge Function que recebe o código digitado e retorna se é válido + qual o desconto aplicado àquele carrinho.

```sql
-- Remover policy pública
drop policy "coupons_public_read" on public.coupons;

-- Manter só admin pode ler/escrever
create policy "coupons_admin_select" on public.coupons
  for select using (public.is_admin(auth.uid()));

create policy "coupons_admin_write" on public.coupons
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
```

E criar Edge Function `validate-coupon`:
- Recebe: código + cart_id (do JWT do usuário)
- Retorna: válido sim/não + valor do desconto + razão se inválido
- Service role bypass de RLS para fazer a validação

### Validação após correção

```bash
# Como anon, deve falhar
curl 'https://<project>.supabase.co/rest/v1/coupons?select=*' \
  -H "apikey: <anon_key>"
# Esperado: array vazio ou erro 401
```

---

## Bug 2 — `orders_update_admin` sem `with check` (MÉDIO)

### Policy atual

```sql
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin(auth.uid()));
```

### O problema

Sem `with check`, em alguns cenários o Postgres permite que UPDATE altere a row de tal forma que ela deixaria de ser visível pelo `using` clause após a alteração. Comportamento sutil que pode causar inconsistência ou erro em runtime.

### Correção

```sql
drop policy "orders_update_admin" on public.orders;

create policy "orders_update_admin" on public.orders
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
```

### Validação

Admin deve conseguir atualizar status de qualquer pedido. Não-admin deve receber erro 403.

---

## Bug 3 — Produtor pode alterar preço/quantidade de pedido pago (CRÍTICO)

### Policy atual

```sql
create policy "order_items_update_owner_admin" on public.order_items
  for update using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.producers p
      where p.id = order_items.producer_id and p.owner_user_id = auth.uid()
    )
  );
```

### O problema

Produtor pode dar UPDATE em `unit_price`, `total_price`, `quantity` dos próprios `order_items` **mesmo depois** do pedido estar pago. Isso permite:
- Fraude: produtor mal-intencionado altera valores históricos
- Quebra de auditoria fiscal: total do pedido divergir do total cobrado
- Disputa com cliente: produto comprado por R$50 aparece como R$80 depois

### Correção

Produtor deve poder atualizar APENAS `item_status` (ex: marcar como "preparing"), e SOMENTE quando o pedido ainda não foi finalizado. Preço, quantidade e nome do produto são imutáveis depois da criação.

```sql
drop policy "order_items_update_owner_admin" on public.order_items;

-- Admin pode tudo
create policy "order_items_admin_update" on public.order_items
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Produtor só pode atualizar item_status, e só de pedidos não finais
create policy "order_items_producer_status_only" on public.order_items
  for update
  using (
    exists (
      select 1 from public.producers p
      where p.id = order_items.producer_id
        and p.owner_user_id = auth.uid()
    )
    and exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.status not in ('delivered','cancelled','refunded')
    )
  )
  with check (
    -- bloqueia tentativa de mudar campos sensíveis (validação extra via trigger abaixo)
    exists (
      select 1 from public.producers p
      where p.id = order_items.producer_id
        and p.owner_user_id = auth.uid()
    )
  );

-- Trigger garantindo imutabilidade de campos sensíveis para produtor
create or replace function public.guard_order_item_immutability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if old.unit_price is distinct from new.unit_price
     or old.total_price is distinct from new.total_price
     or old.quantity is distinct from new.quantity
     or old.product_name is distinct from new.product_name
     or old.product_id is distinct from new.product_id
  then
    raise exception 'Producer cannot modify price, quantity, or product reference of order items';
  end if;

  return new;
end; $$;

create trigger trg_order_item_guard
  before update on public.order_items
  for each row execute function public.guard_order_item_immutability();
```

### Validação

Logado como produtor de teste:
- UPDATE `item_status` em pedido `pending` de seu produto: deve passar
- UPDATE `unit_price` em qualquer pedido: deve falhar com a mensagem custom
- UPDATE em pedido `delivered`: deve falhar (RLS bloqueia)

---

## Bug 4 — Reviews aceitas sem comprovação de compra (MÉDIO)

### Policy atual

```sql
create policy "reviews_customer_insert" on public.reviews
  for insert with check (customer_id = auth.uid());
```

### O problema

Qualquer customer logado pode avaliar qualquer produto, mesmo nunca tendo comprado. Permite:
- Reviews falsas (próprias ou pagas)
- Spam de avaliações
- Manipulação de score de produtos concorrentes (no futuro com marketplace)

### Correção

Restringir insert a clientes que tenham `order_items` com pedido `delivered` daquele produto.

```sql
drop policy "reviews_customer_insert" on public.reviews;

create policy "reviews_customer_insert_verified_buyer" on public.reviews
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
    )
  );
```

### Validação

- Cliente A compra e recebe produto X. Pode avaliar X. Não pode avaliar Y.
- Cliente B nunca comprou. Não pode avaliar nenhum produto.

---

## Bug 5 — `subscriptions` permite cancelamento via UPDATE direto (BAIXO no momento)

### Policy atual

```sql
create policy "subscriptions_owner_all" on public.subscriptions
  for all using (customer_id = auth.uid() or public.is_admin(auth.uid()))
  with check (customer_id = auth.uid() or public.is_admin(auth.uid()));
```

### O problema

Cliente pode mudar `status` de `active` para `cancelled` direto via API, sem passar por lógica de:
- Cancelar cobrança recorrente no gateway
- Notificar admin
- Registrar motivo

Hoje sem gateway integrado, é só inconsistência. Quando entrar Mercado Pago/Stripe na Onda 6, vira bug grave.

### Correção

Restringir UPDATE de status a Edge Function. Cliente pode atualizar `preferences` mas não `status`.

```sql
drop policy "subscriptions_owner_all" on public.subscriptions;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (customer_id = auth.uid() or public.is_admin(auth.uid()));

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (customer_id = auth.uid());

-- Cliente atualiza só preferências e endereço
create policy "subscriptions_update_preferences" on public.subscriptions
  for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "subscriptions_admin_all" on public.subscriptions
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Trigger bloqueando mudança de status pelo cliente
create or replace function public.guard_subscription_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  if old.status is distinct from new.status then
    raise exception 'Subscription status can only be changed via cancel/pause Edge Functions';
  end if;
  return new;
end; $$;

create trigger trg_subscription_status_guard
  before update on public.subscriptions
  for each row execute function public.guard_subscription_status();
```

Edge Functions a criar (Onda 6+):
- `cancel-subscription`: cancela no MP + atualiza status (com service_role)
- `pause-subscription`
- `resume-subscription`

### Validação

- Cliente não consegue mudar status próprio
- Edge Function consegue mudar (usa service_role bypass)

---

## Bug 6 — Falta unique parcial em `producers.owner_user_id` (MÉDIO)

### Estado atual

A migration 3 alterou `owner_user_id` para permitir NULL (intencional, para Cafezeira-própria). Mas não há restrição de "1 produtor por usuário" para usuários não-NULL.

### O problema

Mesmo usuário pode criar 2+ produtores, gerando confusão de roles e dados.

### Correção

Unique parcial: aplica unique apenas onde `owner_user_id IS NOT NULL`.

```sql
create unique index producers_owner_user_id_unique
  on public.producers (owner_user_id)
  where owner_user_id is not null;
```

### Validação

- Criar produtor com user_X: OK
- Criar segundo produtor com user_X: deve falhar com violação de unique
- Criar 2 produtores com `owner_user_id = NULL` (Cafezeira-própria): OK

---

## Bug bônus — `b2b_leads` permite spam (MÉDIO)

### Policy atual

```sql
create policy "b2b_leads_public_insert" on public.b2b_leads
  for insert with check (true);
```

### O problema

Sem rate limit, qualquer bot pode submeter milhares de leads B2B.

### Correção (mais leve)

Manter policy aberta (necessário para form público), mas adicionar:

1. Rate limit no nível da Edge Function (`submit-private-label-lead`):
   - Max 3 leads por IP por hora
   - Validação de email real (bounce check ou regex strict)
   - reCAPTCHA v3 ou hCaptcha

2. Trigger limitando inserts diretos (sem passar pela Edge Function):

```sql
create or replace function public.guard_b2b_lead_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Bloqueia se não vier de service_role (Edge Function)
  if current_setting('request.jwt.claim.role', true) = 'authenticated' then
    raise exception 'B2B leads must be submitted via the official form';
  end if;
  return new;
end; $$;

-- (não criar o trigger ainda — só após Edge Function existir, senão o form quebra)
```

Decisão: deixar como está por enquanto. Implementar quando criar Edge Function `submit-private-label-lead` na Onda 8.

---

## Itens estruturais que não são bugs mas precisam atenção

| Item | Status | Ação |
|---|---|---|
| `client.ts` usa `localStorage` em SSR | Frágil | Refatorar para usar cookie + middleware (Onda 4) |
| Score de produto sem range check | Falta CHECK | Adicionar `score between 0 and 100` (Onda 3) |
| `cart_items` sem unique parcial | Permite duplicata | Adicionar unique (Onda 3) |
| `products.slug` unique global | Conflito futuro entre produtores | Mudar para unique composto (`producer_id`, `slug`) (Onda 3) |
| `audit_logs` sem RLS estrita de insert | Qualquer auth pode inserir | Restringir a Edge Functions específicas (Onda 6) |

---

## Como validar tudo após correções

Criar 3 contas de teste:
- `customer@test.com` — role customer
- `producer@test.com` — role producer + producer ativo
- `admin@test.com` — role admin

Para cada bug, executar query/mutation que **deveria falhar** e confirmar que falha. Documentar resultado neste arquivo.

Ferramenta: Supabase Studio (SQL Editor) ou Postman com JWT do usuário de teste.

---

## Boas práticas daqui pra frente

1. **Toda nova tabela** tem RLS ativada na criação, mesmo que vazia.
2. **Toda policy** tem `using` E `with check` quando aplicável.
3. **Lógica sensível** (preço, status, pagamento) sempre via Edge Function com service_role.
4. **Cupons, segredos, tokens** nunca em tabela com select público.
5. **Antes de cada release**, rodar checklist de validação acima com 3 contas de teste.
