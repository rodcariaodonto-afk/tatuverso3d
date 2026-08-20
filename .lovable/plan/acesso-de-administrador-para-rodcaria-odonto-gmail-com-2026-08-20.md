# Acesso de administrador para rodcaria.odonto@gmail.com

## Situação atual (verificada)

- O painel admin **já existe** e está completo: `/admin` com dashboard, Produtos, Estoque, Pedidos, Pagamentos, Entrega, Clientes, Cupons, Conteúdo, Config e Integrações.
- Sua conta `rodcaria.odonto@gmail.com` já existe e está com e-mail confirmado.
- Porém ela **não tem nenhum papel atribuído** na tabela de papéis — nem `customer`, nem `admin`. Por isso o painel bloqueia o acesso.

## O que será feito

1. Migração no banco que insere o papel `admin` para essa conta (busca pelo e-mail, idempotente — não duplica se rodar de novo).
2. Garantir que exista a linha de perfil correspondente (caso o gatilho de criação não tenha rodado no cadastro).
3. Nenhuma outra conta recebe privilégio; nenhuma tabela, produto ou pedido é alterado.

## Como acessar depois

1. Entrar em `/login` com `rodcaria.odonto@gmail.com`.
2. Ir para `/admin`. O menu lateral dá acesso a produtos, estoque, pedidos, frete e configurações.

## Detalhes técnicos

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users
where email = 'rodcaria.odonto@gmail.com'
on conflict (user_id, role) do nothing;

insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', email), email
from auth.users where email = 'rodcaria.odonto@gmail.com'
on conflict (id) do nothing;
```

Verificação após aplicar: consulta confirmando `admin` em `user_roles` e login real no painel via navegador para confirmar que o dashboard carrega sem o aviso de acesso negado.
