# Painel de Analytics no Admin

Um painel próprio dentro do `/admin` para acompanhar quantas pessoas entram no site, por onde navegam, no que clicam e quantas viram comprar. Sem depender de Google Analytics, sem cookies de terceiros, dados 100% no seu banco.

## O que você vai ver

**Cartões do topo (com comparação vs. período anterior)**
- Visitantes únicos
- Sessões
- Páginas vistas
- Duração média da sessão
- Taxa de rejeição (visitas de 1 página só)
- Taxa de conversão (visitas que viraram pedido pago)

**Gráfico de linha** — visitantes e pageviews por dia, com seletor de período (Hoje / 7 dias / 30 dias / 90 dias).

**Páginas mais vistas** — URL, visualizações, visitantes únicos, tempo médio na página.

**Origem do tráfego** — Direto, Google, Instagram, WhatsApp, TikTok etc., além de campanhas UTM (`utm_source`, `utm_medium`, `utm_campaign`).

**Dispositivos** — desktop / mobile / tablet e navegador.

**Cliques rastreados** — ranking dos elementos mais clicados: "Personalize o seu", cards de categoria, cards de produto, links de redes sociais, WhatsApp, botões de checkout e adicionar ao carrinho.

**Funil de venda** — com taxa de conversão entre cada passo:

```text
Visitou o site      ████████████████████  1.240
Viu um produto      ███████████            520   (41,9%)
Adicionou ao carrinho ████                 118   (22,7%)
Iniciou checkout    ██                      64   (54,2%)
Pagou               █                       31   (48,4%)
```

**Produtos mais vistos** — quais produtos atraem visita mas não convertem em venda.

## Como funciona a coleta

- Cada visitante recebe um identificador anônimo aleatório guardado no próprio navegador (sem cookie de rastreamento, sem dado pessoal).
- Uma sessão termina após 30 minutos de inatividade.
- O IP nunca é gravado: é usado só no servidor para derivar país/estado e descartado em seguida.
- Eventos brutos são apagados automaticamente após **90 dias**; os resumos diários ficam guardados para sempre, então o histórico de longo prazo não se perde.
- O rastreamento respeita "Do Not Track" do navegador e ignora acessos vindos de dentro do `/admin`.

## Detalhes técnicos

**Banco (migração):**
- `analytics_events` — `id`, `session_id`, `visitor_id`, `event_type` (`pageview` | `click` | `product_view` | `add_to_cart` | `begin_checkout` | `purchase`), `path`, `referrer`, `utm_source/medium/campaign`, `device_type`, `browser`, `os`, `country`, `region`, `element_id`, `element_label`, `product_id`, `order_id`, `value_cents`, `duration_ms`, `user_id`, `created_at`. Índices em `created_at`, `event_type`, `session_id`, `path`.
- `analytics_daily` — resumo agregado por dia (`day`, `visitors`, `sessions`, `pageviews`, `orders`, `revenue`) para consultas rápidas de períodos longos.
- GRANTs: `INSERT` para `anon` e `authenticated` apenas em `analytics_events` (visitante anônimo precisa registrar); `SELECT` somente via `service_role`/server functions de admin — nenhum visitante consegue ler dados de tráfego.
- RLS ativa em ambas; policy de leitura restrita a `is_admin(auth.uid())`.
- Função `analytics_rollup()` (SECURITY DEFINER) que consolida o dia anterior em `analytics_daily` e apaga eventos com mais de 90 dias.

**Coleta no front:**
- `src/lib/analytics.ts` — helpers `trackPageview()`, `trackClick(id, label)`, `trackEvent(type, payload)`; gera/guarda `visitor_id` e `session_id` em `localStorage`/`sessionStorage`, faz batch dos eventos e envia via `navigator.sendBeacon`.
- Rota pública `src/routes/api/public/analytics/collect.ts` — recebe o lote, valida com Zod, deriva device/browser/país a partir dos headers, grava com o cliente admin. Sem PII, com limite de tamanho por requisição.
- Hook em `src/routes/__root.tsx` que dispara `trackPageview()` a cada mudança de rota (ignorando `/admin/*`).
- `data-track` em CTAs-chave (hero, categorias, cards de produto, WhatsApp, redes sociais) com um listener global — sem precisar mexer em cada `onClick`.
- Eventos de funil disparados onde a ação já acontece: página de produto, adicionar ao carrinho, checkout e confirmação de pagamento.

**Painel:**
- `src/lib/analytics-admin.functions.ts` — server functions protegidas por `requireSupabaseAuth` + checagem de admin, com as consultas agregadas (resumo, série temporal, top páginas, origens, dispositivos, cliques, funil, produtos).
- `src/routes/admin.analytics.tsx` — página do painel usando os componentes de gráfico já presentes no projeto (recharts), no mesmo estilo visual das outras telas do admin.
- Novo item "Analytics" no menu lateral do `AdminShell`, entre Vendas e Clientes.

**Manutenção:**
- Rota `src/routes/api/public/jobs/analytics-rollup.ts`, no mesmo padrão da rotina de expiração de reservas já existente, para rodar o resumo diário e a limpeza dos 90 dias.
