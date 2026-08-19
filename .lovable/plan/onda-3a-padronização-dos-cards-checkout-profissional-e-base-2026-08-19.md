# Onda 3A — Padronização dos cards, checkout profissional e base de entrega/frete

Entrega dividida em três partes. Esta é a **3A**. As partes 3B (Mercado Pago, webhooks, estoque transacional) e 3C (painel operacional de pedidos, área do cliente) vêm depois, cada uma revisada antes de seguir.

Nada de destrutivo: nenhum DROP de tabela/coluna, nenhum dado removido. Legado CAFEX permanece intacto.

## Fase 0 — Reverificação do hotfix da Onda 2

Antes de qualquer código novo, rodo checagens reais (não confio no documento):

- `cost_price`: consulta direta como anon e como cliente autenticado deve retornar erro de permissão; grants conferidos coluna a coluna.
- Validação de personalização no servidor: campos obrigatórios, tipos, limites, opções válidas, pertencimento ao produto e arquivos com prefixo do usuário.
- Bucket `customization-uploads`: privado, políticas por usuário, limites aplicados.
- SKU: unicidade cruzada entre produtos e variações.
- Nenhuma chave administrativa no bundle do navegador.

Se algo estiver aberto, corrijo e documento antes de avançar. O resultado dessa auditoria entra no relatório.

## Fase 1 — Cards alinhados de vez

Reescrita do componente base de card de produto, usado por todas as telas, com uma única variante configurável (compacta e completa):

- Card com altura total da célula, coluna flex, conteúdo crescendo e bloco de preço/ação ancorado embaixo.
- Imagem sempre quadrada, com placeholder ilustrado quando não houver foto.
- Faixa de badges com altura reservada fixa (Destaque, Personalizável, Sob encomenda, Esgotado) — badges nunca empurram o conteúdo.
- Nome limitado a 2 linhas, descrição a 2 linhas, ambas com altura reservada.
- Linha de preço com altura idêntica com ou sem promoção (sem inventar preço falso).
- Botão de ação sempre na mesma posição e altura; ícone de favorito em posição fixa.
- Grade com linhas de altura uniforme.

Aplico nas telas que reutilizam card: home (destaques e relacionados), catálogo, busca/filtros, favoritos, carrosséis e qualquer outra listagem encontrada por varredura global. Também padronizo os cards de categoria da home (mesma proporção de imagem, títulos e descrições alinhados, link na mesma posição).

Verificação visual real com navegador em 320, 375, 768, 1024 e 1440 px, usando produtos de teste com: nome curto, nome muito longo, com e sem promoção, muitos badges, nenhum badge, sem estoque, sob encomenda, personalizável e sem imagem. Screenshots como evidência. Dados de teste removidos ao final.

## Fase 2 — Checkout profissional (somente cliente autenticado)

`/checkout` vira um fluxo em etapas, mobile-first: Identificação → Endereço → Entrega → Pagamento → Revisão.

- Compra exige login; convidado fica para onda futura (decisão sua).
- Endereços salvos do cliente, com cadastro/edição e endereço padrão.
- Validação de CPF, e-mail, telefone e CEP; preenchimento automático por CEP com edição manual e fallback quando o serviço falhar.
- Resumo do pedido visível em todas as etapas, mostrando variação, personalizações, prazo de produção separado do prazo de transporte, subtotal, desconto, frete e total.
- Todo cálculo (preço, desconto, estoque, frete, personalização) refeito no servidor; valores do navegador ignorados.
- Produto inativo, variação inativa ou quantidade indisponível bloqueiam a finalização com mensagem clara, sem apagar o que já foi preenchido.
- Etapa de pagamento nesta parte apenas prepara o pedido; a cobrança entra na 3B.

## Fase 3 — Modelagem de entrega e pacotes

Campos de envio no produto e na variação: peso de envio, comprimento, largura, altura, exige embalagem separada, frete grátis e dias adicionais de produção. Editáveis no painel de produtos.

Novas estruturas: métodos de envio, cotações, remessas, eventos de rastreio e configurações de envio da loja — todas com grants explícitos, RLS ligada, políticas específicas, índices nas colunas das políticas e UPDATE com USING e WITH CHECK.

A cotação escolhida é gravada no pedido como snapshot (transportadora, serviço, preço, prazo, prazo extra de produção, data/hora, identificador externo e dados do pacote). Pedidos já criados nunca são recalculados.

## Fase 4 — Frete com arquitetura de provedores

Camada de provedores no servidor, sem acoplar a loja a uma transportadora. Nesta onda ficam ativos:

- Frete configurável pelo administrador (tabela de regiões/valores)
- Retirada em local definido
- Frete grátis por valor mínimo

Melhor Envio entra como provedor implementado porém desativado, aguardando a credencial sandbox (sua escolha). Quando o token chegar, é só configurar no cofre de segredos e ativar.

Painel administrativo de envio: CEP e endereço de origem, prazo de manuseio, mínimo para frete grátis, regiões atendidas, retirada local, métodos manuais, margem adicional e provedor ativo.

Regras: cotação sempre pelo servidor, cache curto, invalidação quando CEP, carrinho ou endereço mudam, tratamento de timeout, e nunca exibir frete grátis por erro de integração. O navegador não pode alterar o valor do frete.

## Fase 5 — Testes e entrega da 3A

Cards nos 5 breakpoints com os 9 cenários de conteúdo; checkout desktop e mobile; CEP válido e inválido; frete manual, frete grátis e retirada; carrinho alterado após a cotação; tentativa de alterar preço ou frete pelo navegador; produto sob encomenda e personalizado; build de produção, typecheck e console limpo.

`TATUVERSO3D_PROJECT.md` atualizado e `NEXT_STEPS.md` com a próxima etapa: **Onda 3B — Mercado Pago (Pix e cartão), webhooks idempotentes e reserva/baixa transacional de estoque.**

## Detalhes técnicos

- Card único em `src/components/catalog/ProductCard.tsx` com props de variante; remoção da duplicação atual entre card simples e card de catálogo.
- Checkout com máquina de etapas no cliente e uma server function por etapa crítica (validação de endereço, cotação de frete, criação do pedido), todas com autenticação exigida e validação de payload por schema.
- Frete: interface de provedor comum (`quote`, `capabilities`) com implementações manual/retirada/grátis e o adaptador Melhor Envio desligado por configuração.
- Migração única e idempotente para os campos de envio e as novas tabelas, apresentada para sua aprovação antes de rodar.
- Cotações salvas com validade curta e vinculadas a um hash do carrinho + CEP para invalidação automática.
- Nada de `auth.role()`, metadados de usuário para autorização ou políticas de escrita abertas.

## Pendências conhecidas

- Credenciais Mercado Pago (teste): serão pedidas no início da 3B; painel mostrará "Integração pendente" até lá.
- Token sandbox Melhor Envio: provedor fica pronto e desativado até você fornecer.
