# LOVABLE_PROMPTS.md — Biblioteca de prompts para Cafezeira

Cada prompt aqui é projetado para ser colado **integralmente** na Lovable. Não edite a menos que entenda o impacto.

**Como usar:**
1. Abre o projeto Cafezeira na Lovable
2. Copia o prompt da onda correspondente
3. Cola e envia
4. Aguarda execução
5. No terminal local: `cd ~/Developer/cafezeira && git pull origin main`
6. Cola aqui na conversa o resumo das mudanças para revisão

---

## Onda 3 — Correções de RLS e schema completo

```
Você está trabalhando no projeto Cafezeira (e-commerce de cafés especiais com posicionamento de marketplace).

Stack: TanStack Start + React 19 + Supabase + Cloudflare Workers.

Preciso que você crie UMA nova migration SQL versionada na pasta supabase/migrations/ contendo todas as correções e adições abaixo. NÃO altere migrations existentes — apenas adicione uma nova.

OBJETIVOS DA MIGRATION:

1) CORRIGIR 6 BUGS DE RLS

1.1) Coupons: hoje qualquer anon pode ler cupons ativos. Remover policy pública e deixar só admin podendo ler/escrever. Validação de cupom passará a ser feita via Edge Function futura.

1.2) orders_update_admin: adicionar with check explícito além do using.

1.3) order_items: produtor pode atualmente alterar unit_price, total_price, quantity de pedidos pagos. Bloquear isso. Produtor só pode alterar item_status, e somente quando o pedido NÃO está em status 'delivered', 'cancelled' ou 'refunded'. Criar trigger que valida imutabilidade de campos sensíveis (unit_price, total_price, quantity, product_name, product_id) para não-admins.

1.4) reviews: hoje qualquer customer pode avaliar qualquer produto sem ter comprado. Restringir insert a clientes com order_items + orders.status = 'delivered' do produto sendo avaliado.

1.5) subscriptions: cliente pode mudar status diretamente, o que vai quebrar quando integrarmos gateway. Restringir UPDATE para que cliente só altere preferences/endereço, nunca status. Trigger bloqueia mudança de status por não-admins.

1.6) producers: adicionar unique parcial em owner_user_id (where owner_user_id is not null), garantindo 1 produtor por usuário externo, mas permitindo múltiplos com NULL para Cafezeira-própria.

2) CRIAR TABELAS FALTANTES

2.1) product_variants — refatorar produtos para suportar variantes (250g, 500g, 1kg) com preço, SKU e estoque distintos:

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  weight_grams integer not null,
  grind_option grind_option not null default 'whole_bean',
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  sku text,
  stock_quantity integer not null default 0,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, weight_grams, grind_option)
);

Migrar dados existentes: para cada produto em public.products, criar 1 variante default usando weight_grams, price, stock_quantity, sku do produto. Marcar is_default = true.

DEPRECAR (não remover ainda) campos price, stock_quantity, weight_grams, sku, grind_options de public.products. Adicionar comentário SQL marcando como deprecated.

Adicionar coluna em cart_items: variant_id uuid references public.product_variants(id). Migrar cart_items existentes.

Adicionar coluna em order_items: variant_id uuid references public.product_variants(id) on delete restrict.

RLS de product_variants: leitura pública, escrita pelo dono do produto (mesma lógica de products).

2.2) inventory_movements — rastreio de entrada/saída de estoque:

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase','sale','adjustment','return','loss')),
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

RLS: leitura por dono do produto e admin; insert via Edge Function (admin-only por enquanto).

2.3) order_status_history — timeline auditável:

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

Trigger em public.orders: ao mudar status, inserir registro automaticamente.

RLS: customer vê próprio histórico, admin vê tudo.

2.4) payments — separar de orders para suportar múltiplas tentativas e webhooks idempotentes:

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  method text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

RLS: customer vê próprios pagamentos (via join com orders.customer_id), admin vê tudo.

2.5) shipments — rastreio de envio:

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  service text,
  tracking_code text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_at date,
  status text default 'preparing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

RLS: customer vê próprios shipments, admin vê tudo.

2.6) producer_applications — candidaturas para vender na plataforma:

create table public.producer_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid references auth.users(id) on delete set null,
  responsible_name text not null,
  email text not null,
  phone text not null,
  brand_name text not null,
  city text,
  state text,
  country text default 'Brasil',
  operation_type text,
  monthly_volume_kg integer,
  links jsonb default '{}'::jsonb,
  message text,
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

RLS:
- Insert público (formulário sem auth obrigatória)
- Select: applicant vê próprio (se autenticado), admin vê todos
- Update: só admin

3) AJUSTES MENORES

3.1) Adicionar check em products.score: between 0 and 100.

3.2) Adicionar unique em cart_items: (cart_id, product_id, variant_id, grind_option) — evita item duplicado.

3.3) Mudar unique de products.slug para unique composto (producer_id, slug) — permite produtores diferentes terem nomes parecidos.

REQUISITOS DA MIGRATION:

- Idempotente onde possível (use IF NOT EXISTS, DROP IF EXISTS)
- Não apague dados sem migração explícita
- Mantenha ordem correta de criação (referências)
- Comente blocos com -- ============ NOME ============
- Após criar a migration, regenere supabase/integrations/supabase/types.ts com os tipos atualizados
- Faça commit no git com mensagem: "feat(db): add variants, inventory, payments, shipments + RLS hardening"

Não altere código React de catálogo, carrinho ou checkout nesta etapa. Só schema + types.

Quando finalizar, me responda com:
1. Lista de tabelas criadas
2. Lista de bugs corrigidos
3. Eventuais decisões que tomou diferente do que pedi
4. Próximos passos sugeridos
```

---

## Onda 3 — Validação após execução

Depois que a Lovable terminar, no terminal local:

```bash
cd ~/Developer/cafezeira
git pull origin main
git log --oneline -5
ls supabase/migrations/
```

Cola na conversa comigo:

1. Saída do `git log` (últimos 5 commits)
2. Lista nova de migrations
3. Conteúdo da migration nova (`cat supabase/migrations/<arquivo-novo>.sql`)
4. Resposta da Lovable na interface

Vou revisar e apontar problemas antes de seguir para Onda 4.

---

## Onda 4 — Catálogo dinâmico e admin de produtos

```
Continuando o projeto Cafezeira. Agora preciso transformar o catálogo estático em catálogo dinâmico do banco, e construir o admin para cadastro de produtos.

Premissas:
- Schema atual já tem product_variants, product_images, categories, sensory_notes (criados na onda anterior)
- Estamos no MVP marketplace: a maioria dos produtos serão da Cafezeira (producer com owner_user_id = NULL), mas o sistema já precisa suportar outros produtores futuros

ESCOPO:

1) PÁGINA /catalogo (substituir conteúdo estático)

- Listar produtos com status = 'active' do banco
- Hook useProducts com TanStack Query
- Card mostra: imagem principal, nome, produtor, preço a partir de (menor variante), notas sensoriais (top 3), badges
- Filtros laterais (mobile: drawer):
  - Categoria
  - Torra (light/medium/dark)
  - Origem (estado brasileiro ou país)
  - Notas sensoriais (multi-select)
  - Faixa de preço
  - Disponível para assinatura (toggle)
- Busca por nome, produtor, origem (input no topo)
- Ordenação: relevância, preço asc, preço desc, mais recentes
- Loading state com skeleton
- Empty state quando filtros não retornam nada
- Paginação ou scroll infinito (escolha o que ficar mais fluido)

2) PÁGINA /cafe/$slug (página de produto)

- Buscar produto por slug, incluindo variantes, imagens, sensory_notes, producer
- Galeria de imagens (carousel com Embla)
- Seletor de variante: peso (250g, 500g, etc.) + moagem (whole_bean, espresso, filter, etc.)
- Preço atualiza conforme variante
- Estoque atualiza conforme variante (mostrar "Últimas X unidades" se < 10)
- Botão "Adicionar ao carrinho" (chama hook useCart, criado nesta onda)
- Bloco "Origem" com região, fazenda, altitude, processo, variedade, score
- Bloco "Sensorial" com acidez, corpo, doçura, intensidade (barras visuais) + notas sensoriais (chips)
- Bloco "Recomendação de preparo" com brew methods
- Bloco "Sobre o produtor" com link para /produtores/$slug
- Reviews (se houver) com média e lista paginada
- SEO: meta tags com nome do produto, descrição curta, og:image

3) HOOK useCart (criar)

- Persistir carrinho:
  - Usuário logado: na tabela carts/cart_items
  - Anônimo: cookie httpOnly via Edge Function ou localStorage
- Métodos: addItem(variant_id, quantity, grind_option), updateQuantity, removeItem, clear
- Ao login, mesclar carrinho anônimo com o do usuário
- Toast de feedback (sonner já está instalado)

4) /admin (rota protegida)

Validar role admin no server-side via auth-middleware. Se não admin, retornar 403.

Layout: sidebar com navegação:
- Dashboard
- Produtos
- Pedidos
- Clientes
- Produtores
- Leads B2B
- Cupons
- Configurações

Por enquanto, implementar apenas Dashboard (vazio com placeholders) e Produtos.

5) /admin/products (listagem)

- Tabela com: imagem (thumb), nome, produtor, status, variantes (count), estoque total, preço a partir de, ações
- Filtros: status (draft/active/archived), produtor, busca por nome
- Paginação
- Botão "Novo produto" no topo
- Ações por linha: editar, duplicar, arquivar (não deletar)

6) /admin/products/new (criar produto)

Form em etapas (stepper) com Zod validation + react-hook-form:

Etapa 1 — Básico:
- Nome (required, min 3)
- Slug (auto-gerado do nome, editável)
- Produtor (select; default Cafezeira)
- Categorias (multi-select)
- Status (draft/active)
- Descrição curta (textarea, max 200)
- Descrição longa (textarea com markdown)

Etapa 2 — Origem e atributos:
- País, estado, região
- Altitude (number)
- Variedade (text)
- Processo (select: natural, washed, honey, anaerobic, etc.)
- Torra (enum)
- Score (0-100, com validação)
- Notas sensoriais (multi-select de sensory_notes)
- Acidez/corpo/doçura/intensidade (slider 0-10)
- Brew methods recomendados (multi-select)

Etapa 3 — Variantes:
- Tabela editável: peso (g), moagem (enum), preço, compare_at_price (opcional), SKU, estoque
- Mínimo 1 variante, marcar 1 como default
- Botão "Adicionar variante"

Etapa 4 — Imagens:
- Upload múltiplo via Supabase Storage (bucket: product-images)
- Preview com drag-to-reorder
- Validar tamanho (max 5MB cada) e formato (jpg, png, webp)
- Alt text obrigatório por imagem (acessibilidade)

Etapa 5 — Revisão e publicação:
- Preview do card como aparecerá no catálogo
- Confirmar e criar (ou salvar como draft)

Após criar, redirecionar para /admin/products/[id]/edit.

7) /admin/products/[id]/edit

Mesmo form da criação, pré-preenchido. Permite editar tudo. Salva incremental (não precisa stepper).

8) STORAGE BUCKET product-images

Criar bucket público (read) com policies:
- Read: público
- Insert/Update/Delete: admin ou dono do produto

REQUISITOS GERAIS:

- Mobile-first em todas as rotas
- Loading states em todas as queries
- Error boundaries em rotas críticas
- Toast de feedback em todas as ações de admin
- Confirmação dupla para arquivar produto (modal)
- Mensagens de erro em português
- Validações claras: "Slug já existe", "Preço deve ser maior que zero"
- Não usar localStorage para sessão admin (já está em cookies via auth-middleware)

NÃO IMPLEMENTAR NESTA ONDA:
- Carrinho funcional além do hook (UI do /carrinho fica pra Onda 5)
- Checkout
- Pagamento
- Frete
- Páginas de produtor

Quando terminar, me responda com:
1. Lista de rotas criadas/modificadas
2. Lista de hooks criados
3. Lista de componentes principais
4. Variáveis de ambiente novas (se houver)
5. Como testar manualmente
```

---

## Onda 5 — Carrinho e checkout (sem pagamento)

```
[Esse prompt será gerado após a Onda 4 estar validada e funcionando.]

Depende de:
- Hook useCart pronto e testado
- Tabela orders/order_items funcionando
- Estoque sendo lido de product_variants
```

---

## Onda 6 em diante

[Cada prompt será gerado quando a onda anterior estiver validada. Manter dinâmico em vez de pré-fabricado evita desperdício.]

---

## Padrão de prompt eficiente para Lovable

Sempre que precisar montar um prompt fora desta lista, use este template:

```
[CONTEXTO]
Projeto Cafezeira. Stack: TanStack Start + Supabase + Cloudflare. MVP marketplace.

[OBJETIVO]
Uma frase clara do que precisa ser entregue.

[ESCOPO]
Lista numerada do que fazer.

[REQUISITOS]
- Validações
- RLS
- Acessibilidade
- Mobile-first
- Error handling

[RESTRIÇÕES]
- O que NÃO fazer
- O que NÃO mexer

[ENTREGA]
- Onde commitar
- Mensagem de commit padrão
- Como o usuário valida

[RETORNO]
Pedir resumo estruturado do que foi feito.
```

Lovable responde melhor a prompts estruturados que prosa solta.
