
# CAFEZEIRA — Plano do MVP

Plataforma premium de e-commerce de cafés especiais, com arquitetura preparada para evoluir para marketplace multi-produtor e SaaS por assinatura. Nome da marca: **CAFEZEIRA**.

## Direção visual

- Paleta Espresso & Dourado: `#2B1810` (espresso), `#6F4E37` (café), `#E8D5B7` (creme/areia), `#C9A84C` (dourado discreto). Acento neutro preto suave + verde-fazenda secundário para badges sensoriais.
- Tipografia: serif elegante para títulos (Playfair Display) + sans humanista para corpo (Inter). Uppercase com tracking amplo em labels premium.
- Mobile-first, microinterações suaves, cards de produto altamente visuais, badges sensoriais, hero cinematográfico com sobreposição escura, dourado em CTAs e detalhes.
- Estética de marca premium (tipo Single Origin / Onyx Coffee Lab) com usabilidade de marketplace.

## Stack

- Frontend: TanStack Start + React + Tailwind v4, shadcn/ui já incluso.
- Backend: Lovable Cloud (Supabase) — Postgres + Auth + Storage + RLS.
- Pagamento: **simulado/placeholder** (estrutura de checkout completa, pronta para Mercado Pago / Stripe / Pagar.me depois).

## Arquitetura de papéis

`customer`, `producer`, `admin`, `support` — armazenados em tabela separada `user_roles` com enum `app_role` e função `has_role()` SECURITY DEFINER (sem risco de escalada de privilégio). Rotas protegidas via layout `_authenticated/` + sub-layouts `_producer/` e `_admin/` com `beforeLoad`.

## Banco de dados (Supabase)

Tabelas principais com UUID, timestamps, RLS habilitado:
`profiles`, `user_roles`, `producers`, `producer_plans`, `farms`, `products`, `product_images`, `sensory_notes`, `product_sensory_notes`, `categories`, `product_categories`, `carts`, `cart_items`, `orders`, `order_items`, `addresses`, `favorites`, `reviews`, `coupons`, `subscription_plans`, `subscriptions`, `quiz_responses`, `blog_posts`, `banners`, `audit_logs`, `platform_settings`.

Policies essenciais:
- Cliente lê/edita só seus dados (profile, addresses, orders, favorites, reviews, quiz).
- Produtor lê/edita só sua loja, produtos, pedidos, métricas.
- Admin tem acesso global via `has_role(uid, 'admin')`.
- Pedidos imutáveis pelo cliente após criação.
- Produtos de produtor entram com `status='pending_review'`, aprovação só por admin.

Trigger de auto-criação de `profile` no signup. Seed de demonstração: 4 produtores LATAM, 12+ cafés, 6 categorias, 3 banners, 3 posts de blog, 3 planos de assinatura B2C, 3 planos de produtor.

## Páginas públicas

- `/` Home — hero premium, cafés em destaque, perfis sensoriais, assinatura, produtores em destaque, benefícios da curadoria, depoimentos, CTA "Vender na Cafezeira".
- `/catalogo` — grid + filtros laterais (drawer no mobile): origem, produtor, notas sensoriais, torra, moagem, método, intensidade, acidez, corpo, processo, variedade, preço, disponibilidade, pontuação, promoção. Busca textual e ordenação.
- `/cafe/$slug` — galeria, ficha completa (origem, fazenda, altitude, variedade, processo, torra, notas, intensidade, acidez, corpo, doçura, pontuação), seletor de moagem e tamanho, badges (Microlote, Torra Fresca, Orgânico etc.), avaliações, FAQ, relacionados, botão de compra fixo no mobile.
- `/produtores` e `/produtores/$slug` — vitrine + página do produtor (capa, logo, história, certificações, fazenda, cafés).
- `/quiz` — quiz sensorial multistep (intensidade, doçura, acidez, notas, método, frequência, orçamento, grão/moído, interesse em assinatura) → recomendações com justificativa; salva em `quiz_responses` se logado.
- `/assinatura` — planos Descoberta, Gourmet, Premium; simulação de assinatura (placeholder de billing).
- `/blog` e `/blog/$slug` — guias e artigos.
- `/sobre`, `/vender-na-plataforma` (página comercial para produtores com planos Essencial/Profissional/Premium e CTA cadastro), `/contato`, `/privacidade`, `/termos`.
- `/carrinho`, `/checkout` (etapas: identificação, endereço, entrega, pagamento simulado, revisão, confirmação).
- `/login`, `/cadastro`, `/recuperar-senha`, `/reset-password`.

## Áreas autenticadas

**Minha Conta (`/conta/*`)**: dashboard, perfil, endereços, pedidos + status, favoritos, avaliações, preferências do quiz, assinaturas, segurança.

**Painel do Produtor (`/produtor/*`)**: dashboard (vendas, pedidos, estoque baixo, ticket médio, avaliações, status do plano), perfil da marca, produtos, novo produto (envia para aprovação), pedidos, estoque, métricas, repasses simulados, plano, suporte.

**Painel Admin (`/admin/*`)**: dashboard executivo, usuários, produtores (aprovar/suspender), aprovação de produtos, catálogo, pedidos, cupons, banners, blog, comissões, planos de produtor, configurações, auditoria. Ações críticas registram em `audit_logs`.

## Auth

Email/senha + Google (defaults Lovable Cloud). `onAuthStateChange` antes de `getSession()`. Reset de senha com página `/reset-password` dedicada. Documentar como promover usuário a admin no Supabase (insert em `user_roles`).

## Componentes reutilizáveis

`ProductCard`, `ProducerCard`, `SensoryBadge`, `RoastLevelBadge`, `PriceDisplay`, `AddToCartButton`, `FavoriteButton`, `RatingStars`, `FilterSidebar`, `ProductGallery`, `GrindSelector`, `QuantitySelector`, `CheckoutSummary`, `StatusBadge`, `DashboardMetricCard`, `AdminTable`, `ProducerProductForm`, `EmptyState`, `LoadingState (skeletons)`, `ProtectedRoute`, `RoleBasedNavigation`, `Header`, `Footer`, `Toaster`.

## Estrutura de código

```
src/
  routes/                  rotas (TanStack file-based)
    _authenticated/
      conta/
      _producer/produtor/
      _admin/admin/
  components/{ui,marketing,catalog,cart,checkout,account,producer,admin}
  features/{cart,quiz,subscription}/
  lib/services/            camada de acesso ao Supabase (products, orders, producers...)
  lib/types/               tipos compartilhados
  hooks/
  integrations/supabase/   já existente
```

Carrinho global via Zustand com persistência local; sincronização opcional ao logar.

## Integrações futuras (placeholders documentados)

Mercado Pago / Stripe / Pagar.me (split payments, webhooks, recorrência), Melhor Envio / Correios, WhatsApp Business, Resend (e-mail), Google Analytics, Meta Pixel, Make/n8n, OpenAI. Pontos de integração marcados com `// TODO(integration): ...` e variáveis de ambiente reservadas.

## Critérios de aceite cobertos

Todos os 18 critérios do brief: visual premium responsivo, catálogo funcional com filtros/busca, página de produto detalhada, carrinho, checkout estruturado, auth Supabase, separação de papéis, Minha Conta, Painel Produtor, Painel Admin, banco preparado para multi-produtor, estrutura para assinatura B2C e planos B2B, RLS, conteúdo demo em pt-BR, página "Vender na Plataforma", estrutura para pagamentos e integrações futuras, código limpo e modular.

## Execução em ondas (commits lógicos)

1. Design system (tokens da paleta, fontes, componentes base) + layout root + Header/Footer.
2. Banco de dados: migrações de todas as tabelas + RLS + seed demo.
3. Catálogo público: Home, Catálogo, Página de Produto, Produtores.
4. Auth + Minha Conta + carrinho + checkout simulado.
5. Quiz, Assinatura, Blog, páginas institucionais.
6. Painel do Produtor (dashboard + CRUD de produtos + pedidos).
7. Painel Admin (aprovações, gestão, auditoria).
8. QA final: rotas, RLS, responsividade mobile, estados vazios/loading/erro.

> Observação: o escopo é grande. Vou entregar tudo, mas algumas áreas internas (relatórios avançados de produtor, repasses, billing recorrente real) ficam como estrutura + UI funcional com dados/ações simuladas, prontas para serem ligadas a serviços reais depois via GitHub + Claude Code.

Pode aprovar para eu começar a construir?
