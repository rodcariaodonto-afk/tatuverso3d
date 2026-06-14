# Guia de Configuração — Ambiente Sandbox

Este guia cobre tudo que você precisa fazer antes de vender a plataforma para o primeiro cliente real. Siga os passos na ordem.

---

## 1. Mercado Pago Sandbox

### 1.1 Criar conta de desenvolvedor

1. Acesse [developers.mercadopago.com.br](https://developers.mercadopago.com.br) e clique em **Criar conta** (ou entre com uma conta MP existente).
2. No painel, vá em **Suas integrações** → **Criar aplicação**.
3. Preencha:
   - **Nome da aplicação:** nome da loja (ex: "Café EX - Testes")
   - **Finalidade:** Pagamentos online
   - **Modelo de integração:** Checkout Pro (e/ou Pagamentos transparentes se usar PIX)
4. Clique em **Criar aplicação**. Você será redirecionado para o painel da aplicação.

### 1.2 Pegar o Access Token de teste

1. Dentro da aplicação criada, clique na aba **Credenciais de teste**.
2. Copie o valor de **Access Token** que começa com `TEST-...`.
   > ⚠️ Nunca use as credenciais de **produção** durante testes. As credenciais de teste têm o prefixo `TEST-`.

### 1.3 Criar usuários de teste

O MP exige usuários de teste separados para simular comprador e vendedor. Rode o curl abaixo com o seu Access Token de teste:

```bash
# Criar usuário comprador
curl -X POST \
  https://api.mercadopago.com/users/test \
  -H "Authorization: Bearer TEST-SEU-ACCESS-TOKEN-AQUI" \
  -H "Content-Type: application/json" \
  -d '{ "site_id": "MLB", "description": "Comprador de teste" }'

# Criar usuário vendedor (se usar split/marketplace)
curl -X POST \
  https://api.mercadopago.com/users/test \
  -H "Authorization: Bearer TEST-SEU-ACCESS-TOKEN-AQUI" \
  -H "Content-Type: application/json" \
  -d '{ "site_id": "MLB", "description": "Vendedor de teste" }'
```

A resposta traz `email`, `password` e `access_token` de cada usuário. Guarde esses dados.

### 1.4 Simular pagamento aprovado e recusado

No Checkout Pro (sandbox), após escolher pagar com cartão de crédito, use os **cartões de teste oficiais do MP**:

| Cenário | Número do cartão | Nome no cartão | CVV | Vencimento |
|---|---|---|---|---|
| Aprovado | `5031 4332 1540 6351` | `APRO` | `123` | Qualquer data futura |
| Recusado (saldo insuficiente) | `5031 4332 1540 6351` | `FUND` | `123` | Qualquer data futura |
| Recusado (dados inválidos) | `5031 4332 1540 6351` | `SECU` | `123` | Qualquer data futura |
| Pendente | `5031 4332 1540 6351` | `CONT` | `123` | Qualquer data futura |

Para **PIX sandbox**: o QR Code gerado em sandbox pode ser "pago" acessando o painel do usuário comprador de teste em [sandbox.mercadopago.com.br](https://sandbox.mercadopago.com.br) e aprovando manualmente o pagamento pendente.

---

## 2. Melhor Envio Sandbox

### 2.1 Criar conta

1. Acesse [melhorenvio.com.br](https://melhorenvio.com.br) e clique em **Criar conta grátis**.
2. Preencha os dados básicos. Não é necessário CNPJ para conta sandbox.
3. Confirme o e-mail recebido.

### 2.2 Gerar token de sandbox

1. Acesse o **painel do Melhor Envio** → menu superior direito → **Tokens**.
2. Clique em **Gerar token**.
3. Selecione o ambiente **Sandbox** (`sandbox.melhorenvio.com.br`).
4. Marque as permissões: `cart-read`, `cart-write`, `shipping-calculate`, `shipping-checkout`, `orders-read`.
5. Copie o token gerado (começa com um hash longo). Ele não fica visível novamente.

### 2.3 CEP de origem para testes

Use um CEP genérico de São Paulo como origem durante os testes:

```
CEP de origem sugerido: 01310-100
(Av. Paulista, 1578 — SP)
```

O Melhor Envio aceita qualquer CEP válido como origem. Não precisa ser o endereço real da loja durante os testes.

---

## 3. Configuração na Plataforma

### 3.1 Preencher /admin/integracoes

1. Acesse sua instância da plataforma e faça login como **admin**.
2. No menu lateral, clique em **Integrações**.
3. Preencha os campos:

| Campo | Valor |
|---|---|
| **Mercado Pago — Access Token** | `TEST-xxxxxxxxxxxxxxxxxxxx` (token de teste) |
| **Ambiente MP** | Sandbox |
| **Melhor Envio — Token** | token gerado no passo 2.2 |
| **Ambiente ME** | Sandbox |
| **CEP de origem** | `01310100` (sem traço) |
| **Nome da loja** | Nome que aparece no User-Agent das requisições |

4. Clique em **Salvar**. A plataforma criptografa e salva em `tenant_credentials`.

### 3.2 Verificar se foi salvo corretamente

Rode esta query no **SQL Editor** do Supabase (painel web → SQL Editor):

```sql
SELECT
  tenant_id,
  CASE WHEN melhor_envio_token IS NULL THEN '❌ NULL' ELSE '✅ OK' END AS melhor_envio_token,
  CASE WHEN mp_access_token IS NULL THEN '❌ NULL' ELSE '✅ OK' END AS mp_access_token,
  CASE WHEN cep_origem IS NULL OR cep_origem = '' THEN '❌ NULL/VAZIO' ELSE cep_origem END AS cep_origem,
  COALESCE(mp_environment, 'NULL') AS mp_environment,
  COALESCE(me_environment, 'NULL') AS me_environment,
  updated_at
FROM tenant_credentials;
```

Resultado esperado: todos os campos críticos com `✅ OK` e `cep_origem` preenchido.

---

## 4. Roteiro de Teste End-to-End

Execute este roteiro completo antes de ir a produção. Faça em uma janela anônima para simular um cliente real.

### 4.1 Criar produto com variante

1. Acesse `/admin/produtos` → **Novo produto**.
2. Preencha nome, descrição, categoria, produtor (opcional).
3. Em **Variantes**, adicione pelo menos uma variante:
   - Nome: `250g`
   - Preço: `R$ 38,00`
   - Estoque: `10`
   - Peso: `300` (gramas, incluindo embalagem)
4. Defina o status como **Ativo** e clique em **Salvar**.
5. Confirme que o produto aparece em `/catalogo`.

### 4.2 Adicionar ao carrinho

1. Acesse `/catalogo` e abra o produto criado.
2. Selecione a variante `250g` e clique em **Adicionar ao carrinho**.
3. Confirme que o carrinho abre no canto direito com o item e o preço corretos.

### 4.3 Checkout 4 etapas

1. Clique em **Finalizar compra** no carrinho.
2. **Etapa 1 — Identificação:** preencha nome, e-mail e CPF. Pode ser dado fictício: `111.444.777-35` é um CPF válido para testes.
3. **Etapa 2 — Endereço:** use o CEP `01310-100` e preencha o restante.
4. **Etapa 3 — Frete:** aguarde o cálculo do Melhor Envio Sandbox. Selecione uma opção de frete. Se retornar erro aqui, verifique o passo 3.2.
5. **Etapa 4 — Pagamento:** escolha **Cartão de crédito** ou **PIX**.

### 4.4 Simular pagamento com cartão (Checkout Pro)

1. Na etapa de pagamento, selecione **Cartão de crédito → Pagar com Checkout Pro**.
2. Você será redirecionado para o ambiente sandbox do MP.
3. Use o cartão de teste com nome `APRO` (tabela no item 1.4).
4. Conclua o pagamento. Você deve ser redirecionado de volta para a loja com status `success`.

### 4.5 Verificar atualização de status via webhook

1. Acesse `/admin/pedidos` e localize o pedido criado.
2. O status de pagamento deve estar como `paid` (ou `approved`).
   - Se ainda aparecer `pending`, aguarde até 30 segundos — o webhook MP pode ter um pequeno delay no sandbox.
3. Se após 1 minuto ainda estiver `pending`, verifique:
   - Se a URL do webhook está configurada no painel MP: **Suas integrações → Webhooks** → adicione `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-payment-webhook`.
   - Se a Edge Function `mp-payment-webhook` está deployada: `supabase functions list`.

### 4.6 Testar PIX QR Code

1. Inicie um novo pedido e na etapa de pagamento selecione **PIX**.
2. Um QR Code deve ser exibido junto com o código copia-e-cola.
3. Para simular o pagamento no sandbox:
   - Acesse [sandbox.mercadopago.com.br](https://sandbox.mercadopago.com.br) com o **usuário comprador de teste** criado no passo 1.3.
   - Vá em **Atividades** e aprove o pagamento PIX pendente.
4. Volte para `/admin/pedidos` e confirme que o status atualizou para `paid`.

### 4.7 Testar exportação LGPD

1. Faça login com um usuário de teste (não admin).
2. Acesse `/minha-conta/privacidade`.
3. Clique em **Baixar meus dados (JSON)**.
4. Confirme que um arquivo `.json` é baixado com os dados do perfil, pedidos e assinaturas.
5. *(Opcional)* Teste o fluxo de exclusão digitando `excluir` no campo de confirmação. Use um usuário descartável para esse teste.

---

## 5. Checklist Final — Antes do Primeiro Cliente Real

Marque cada item antes de ativar as credenciais de produção e abrir a loja.

### Infraestrutura

- [ ] Projeto Supabase em plano pago (Free tem Edge Functions limitadas e pausa após inatividade)
- [ ] Domínio customizado apontado para o frontend (Netlify, Vercel ou similar)
- [ ] Variável `VITE_SUPABASE_URL` aponta para o projeto de produção
- [ ] Variável `VITE_SUPABASE_PUBLISHABLE_KEY` atualizada para produção

### Whitelabel

- [ ] `VITE_TENANT_NAME` com o nome real da loja
- [ ] `VITE_STORE_TAGLINE` com o slogan
- [ ] `VITE_LOGO_URL` com a URL da logo hospedada
- [ ] `VITE_SUPPORT_EMAIL` com e-mail de atendimento real
- [ ] `VITE_STORE_URL` com a URL pública do site

### Credenciais de Produção

- [ ] Access Token **de produção** do MP inserido em `/admin/integracoes` (começa com `APP_USR-...`)
- [ ] Ambiente MP alterado para **Produção**
- [ ] Token **de produção** do Melhor Envio inserido em `/admin/integracoes`
- [ ] Ambiente ME alterado para **Produção**
- [ ] CEP de origem real do remetente preenchido

### Webhooks de Produção

- [ ] Webhook de pagamento MP registrado para a URL de produção:
  `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-payment-webhook`
- [ ] Webhook de assinaturas MP registrado (se usar o Clube):
  `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-subscription-webhook`
- [ ] `MP_WEBHOOK_SECRET` configurado como secret nas Edge Functions:
  `supabase secrets set MP_WEBHOOK_SECRET=seu-secret-aqui`

### Catálogo e Operação

- [ ] Pelo menos 1 produto ativo e visível em `/catalogo`
- [ ] Fotos dos produtos hospedadas (não URLs temporárias)
- [ ] Política de privacidade e termos de uso acessíveis no rodapé
- [ ] E-mail de suporte funcional e monitorado

### Teste Final com Cartão Real

- [ ] Realizar um pedido real de **R$ 1,00** (produto de teste ou frete mínimo) com cartão próprio
- [ ] Confirmar recebimento do e-mail de confirmação (se configurado)
- [ ] Verificar no painel MP que o pagamento foi recebido
- [ ] Verificar em `/admin/pedidos` que o status atualizou corretamente
- [ ] Estornar o pagamento de R$ 1,00 no painel MP após o teste

---

> Dúvidas sobre a plataforma? Abra uma issue no repositório ou entre em contato via `VITE_SUPPORT_EMAIL`.
