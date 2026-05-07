# NEXT_STEPS.md — Roadmap Cafezeira

Documento vivo. Atualizar conforme cada onda é concluída.

**Visão:** marketplace de cafés especiais. Cafezeira como vendedor inicial e operadora da plataforma. Outros produtores (fazendas, torrefações, marcas) podem candidatar-se e vender via plataforma.

**Stack atual:** TanStack Start (SSR) + React 19 + TanStack Router + Tailwind 4 + shadcn/ui + Supabase (via Lovable Cloud) + Cloudflare Workers (deploy).

**Modelo de execução:** Lovable Cloud para mudanças de schema e código. Git para versionamento. Pull requests para mudanças relevantes feitas localmente.

---

## Status atual (após Onda 2)

Concluído:
- Auditoria do repositório e do schema atual
- Higiene de variáveis de ambiente (`.env` fora do Git, `.env.example` documentado)
- `.gitignore` cobrindo Supabase CLI cache
- Padrão Conventional Commits estabelecido
- Padrão de Pull Request com squash merge

Em aberto:
- 6 bugs de RLS detectados (ver `SECURITY_CHECKLIST.md`)
- Tabelas faltantes para checkout sério (`product_variants`, `inventory_movements`, `payments`, `shipments`, `order_status_history`, `producer_applications`)
- Decisão de gateway de pagamento
- Decisão de emissão de NF-e
- Decisão de provider de frete
- Cadastro real de produtos no admin
- Admin funcional para uso por não-técnico

---

## Roadmap por ondas

### Onda 3 — Correções de segurança e schema completo

**Objetivo:** banco pronto para checkout real e marketplace, RLS sem furos.

| Item | Detalhe |
|---|---|
| Corrigir 6 bugs de RLS | Ver `SECURITY_CHECKLIST.md` |
| Criar `product_variants` | Refatorar produtos para suportar 250g/500g/1kg com SKUs e estoques distintos |
| Criar `inventory_movements` | Rastrear entrada e saída de estoque |
| Criar `payments` separado de `orders` | Permitir múltiplas tentativas de pagamento por pedido |
| Criar `shipments` | Transportadora, código de rastreio, status de envio |
| Criar `order_status_history` | Timeline auditável do pedido |
| Criar `producer_applications` | Candidaturas de novos produtores para vender na plataforma |
| Adicionar unique parcial em `producers.owner_user_id` | 1 produtor por usuário, exceto NULL (Cafezeira-própria) |
| Adicionar score check em produtos (0–100) | Padrão SCA |
| Adicionar unique em `cart_items(cart_id, product_id, grind_option)` | Evitar item duplicado |

**Como executar:** prompt único na Lovable usando `LOVABLE_PROMPTS.md` seção "Onda 3".

**Critério de aceite:** `git pull` traz nova migration na pasta `supabase/migrations/`. `git diff main` mostra schema atualizado. Frontend ainda compila.

---

### Onda 4 — Catálogo dinâmico e admin de produtos

**Objetivo:** sócio (você) consegue cadastrar e gerenciar produtos da Cafezeira via interface.

| Item | Detalhe |
|---|---|
| Página `/catalogo` listando produtos do banco | Substituir conteúdo estático |
| Página `/cafe/$slug` com dados reais | Imagens, variantes, sensorial, origem |
| Filtros: torra, moagem, origem, notas, preço | Reativos |
| Busca por nome, produtor, origem | Full-text |
| `/admin` com listagem de produtos | CRUD completo |
| `/admin/products/new` | Criar produto com variantes e imagens |
| `/admin/products/[id]/edit` | Editar produto |
| Upload de imagens via Supabase Storage | Bucket `product-images` |
| Estados de produto: `draft`, `active`, `archived` | Mostrar no admin, filtrar no catálogo |

**Como executar:** prompt na Lovable + revisão de código aqui comigo antes de aceitar.

**Critério de aceite:** você cadastra 1 café real (foto, descrição, 250g a R$45 e 500g a R$80) e ele aparece em `/catalogo` ao público.

---

### Onda 5 — Carrinho e checkout sem pagamento

**Objetivo:** cliente consegue chegar ao "criar pedido" com endereço, mas sem cobrar.

| Item | Detalhe |
|---|---|
| Carrinho persistente para usuário logado | Tabela `carts` + `cart_items` (já existe) |
| Carrinho de sessão para anônimo | LocalStorage ou cookie, mesclar no login |
| Adicionar/remover/alterar quantidade | UI fluida com TanStack Query |
| Cálculo de subtotal | Server-side via RPC para garantir preços do banco |
| Aplicação de cupom | Edge Function (não expor cupom no client) |
| `/checkout` em etapas: identificação, endereço, frete-mock, revisão | Stepper |
| Criar pedido com snapshot dos itens | Tabela `orders` + `order_items` |
| Validação de estoque na criação | Server-side, não confiar no client |
| Email de confirmação | Edge Function + Resend ou SendGrid |
| `/minha-conta/pedidos` | Listagem dos pedidos do cliente |
| `/admin/pedidos` | Listagem para você acompanhar |

**Como executar:** múltiplos prompts na Lovable (carrinho, checkout, admin de pedidos).

**Critério de aceite:** você consegue criar pedido fictício com produto real, ver no admin, mudar status manualmente.

---

### Onda 6 — Pagamento real

**Bloqueador:** decisão de gateway.

**Recomendação técnica:** Mercado Pago. Razões:
- Melhor cobertura de meios de pagamento brasileiros (PIX, boleto, cartão)
- Modelo nativo de split de pagamento (essencial para marketplace na fase 2)
- Antifraude embutido
- Documentação em português
- Stripe ainda tem split limitado no Brasil

| Item | Detalhe |
|---|---|
| Edge Function `create-payment-preference` | Cria preferência no Mercado Pago, retorna `init_point` |
| Edge Function `mp-webhook` | Recebe IPN/webhook, idempotente, atualiza `payments` e `orders` |
| Integração PIX com QR code | UI mostra QR code |
| Integração boleto | Gera URL e exibe |
| Integração cartão (checkout transparente ou redirect) | Decisão UX |
| Tabela `payments` populada | Cada tentativa registrada |
| Logs de auditoria para webhooks | Tabela `webhook_logs` |
| Reconciliação manual no admin | Caso webhook falhe |

**Como executar:** prompt na Lovable + criação de conta Mercado Pago + adição de `MP_ACCESS_TOKEN` no `.env`.

**Critério de aceite:** pedido real com PIX de R$1, confirmado no admin via webhook em produção.

---

### Onda 7 — Frete e rastreio

**Bloqueador:** decisão de provider de frete.

**Recomendação técnica:** Melhor Envio. Razões:
- Cobre Correios + transportadoras privadas (Jadlog, Total Express, etc.)
- Cálculo via API por CEP origem/destino e dimensões
- Etiquetas geradas pela própria Melhor Envio
- Conta gratuita, paga só quando emite etiqueta

| Item | Detalhe |
|---|---|
| Edge Function `calculate-shipping` | CEP + variantes do carrinho → opções de frete |
| Cadastro de dimensões/peso por variante | Campo `weight_grams` já existe, falta `dimensions` |
| Seleção de opção no checkout | Cliente escolhe |
| Tabela `shipments` ligada a `orders` | Transportadora, código, status |
| Endpoint webhook para atualização de status | `shipment-webhook` |
| Página `/minha-conta/pedidos/[id]` com timeline de envio | Cliente acompanha |
| Admin pode inserir rastreio manual | Backup caso integração falhe |

**Como executar:** prompt na Lovable + criação de conta Melhor Envio + token no `.env`.

**Critério de aceite:** pedido com cálculo de frete real para CEP de teste e código de rastreio salvo.

---

### Onda 8 — Marketplace fase 1 (cadastro de produtores)

**Objetivo:** produtor externo se candidata, é aprovado, cadastra produtos próprios.

| Item | Detalhe |
|---|---|
| Página `/vender-na-plataforma` corrigida (CTAs apontam pra rota certa) | Bug de menu corrigido |
| Formulário de candidatura persiste em `producer_applications` | Já especificado na Onda 3 |
| `/admin/producer-applications` | Listagem, aprovação, rejeição |
| Trigger ao aprovar: cria `producers` + role `producer` no usuário | Server-side |
| Email para candidato com status | Edge Function |
| Painel `/produtor` para usuário com role `producer` | Dashboard, produtos próprios, pedidos próprios |
| RLS estrita: produtor só vê dados dele | Já especificado |
| Comissão configurável por plano | Tabela `producer_plans` já existe |

**Como executar:** prompts segmentados na Lovable.

**Critério de aceite:** você cria conta produtor de teste, candidata, aprova no admin, faz login no painel produtor, cadastra produto, vê na vitrine pública.

---

### Onda 9 — Split de pagamento e marketplace fase 2

**Objetivo:** quando produtor vende, valor é dividido automaticamente.

| Item | Detalhe |
|---|---|
| Cadastro de conta Mercado Pago do produtor | Em `producers.mp_account_id` |
| Edge Function ajustada para criar split na preferência | `marketplace_fee` calculado pela `commission_rate` |
| Tabela `producer_payouts` para rastrear repasses | Já no Manus |
| Relatório de vendas por produtor no painel `/produtor` | Receita, comissão, líquido |
| Saque manual ou automático via MP | Decisão de UX |

**Bloqueador:** Mercado Pago em produção (Onda 6 finalizada) + KYC dos produtores.

---

### Onda 10 — Assinaturas B2C, polish e go-live

| Item | Detalhe |
|---|---|
| Quiz sensorial funcional | Recomenda café e plano de assinatura |
| Página `/assinatura` com planos compráveis | Cobrança recorrente via MP |
| Pausar/cancelar assinatura | Edge Function que sincroniza com MP |
| Página de blog funcional | Já tem schema `blog_posts` |
| LGPD: política de privacidade, termo de uso, banner de cookies | Texto jurídico necessário |
| LGPD: direito de eliminação de conta | Edge Function + cascade delete |
| NF-e: integração com Bling, Tiny ou Olist | Decisão pendente |
| Antifraude no checkout | Configuração no MP |
| Política de devolução conforme CDC | Texto jurídico |
| Backup do Supabase | Configurar via Lovable ou painel Supabase |
| Monitoramento de erro (Sentry ou similar) | Decisão futura |
| SEO básico (sitemap, meta tags, OG images) | Lovable executa |

**Critério de go-live:** primeiro pedido pago real (PIX de R$10), nota fiscal emitida, frete contratado, cliente recebe café em casa.

---

## Decisões pendentes que você precisa resolver

Sem essas decisões, ondas específicas ficam bloqueadas. Não preciso esperar para começar A, B, C, D acima — mas E em diante depende.

| Decisão | Bloqueia | Recomendação técnica |
|---|---|---|
| Gateway de pagamento | Onda 6 em diante | Mercado Pago |
| Provider de frete | Onda 7 em diante | Melhor Envio |
| Emissão de NF-e | Onda 10 (go-live) | Bling no início, migrar para integração direta SEFAZ se escalar |
| CNPJ operador da plataforma | Tudo (você precisa de CNPJ para vender) | Confirmar se já existe |
| Texto da política de privacidade e termos | Onda 10 | Contratar advogado (não use template genérico) |
| Tabela de comissão por plano de produtor | Onda 9 | Definir 3 planos: free (15%), growth (12% + R$99/mês), enterprise (8% + R$299/mês) — placeholder |

---

## Estimativa realista de tempo

| Onda | Tempo de execução Lovable | Tempo seu (revisão + decisões) |
|---|---|---|
| Onda 3 — schema | 1 dia | 2h |
| Onda 4 — catálogo + admin | 3 dias | 1 dia |
| Onda 5 — carrinho + checkout (sem pagamento) | 3 dias | 1 dia |
| Onda 6 — pagamento real | 4 dias | 1 dia + setup MP |
| Onda 7 — frete | 2 dias | 4h + setup ME |
| Onda 8 — marketplace fase 1 | 4 dias | 2 dias |
| Onda 9 — split + payouts | 3 dias | 1 dia |
| Onda 10 — assinatura + LGPD + NF-e + go-live | 5 dias | 3 dias + jurídico |

**Total realista: 4 a 6 semanas** focadas, com você dedicando ~3h/dia para revisar e decidir, Lovable executando, eu apoiando.

Se trabalhar 1h/dia, multiplica por 3.

---

## Como executar

1. Pega o prompt correspondente em `LOVABLE_PROMPTS.md`
2. Cola na Lovable
3. Aguarda execução
4. No terminal: `git pull origin main`
5. Cola aqui na conversa o resumo do que mudou ou os arquivos relevantes
6. Eu reviso, aponto problemas, sugiro ajustes
7. Se houver bug crítico, ajusta via novo prompt na Lovable ou edição direta
8. Próxima onda

Cada onda fechada = um ponto de descanso seguro. Não pula.
