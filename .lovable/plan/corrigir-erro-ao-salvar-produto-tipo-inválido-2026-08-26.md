# Corrigir erro ao salvar produto (tipo inválido)

## O problema
O formulário de novo produto começa com o tipo `decoracao`, mas o banco só aceita os valores em inglês (`decoration`, `sensory`, `utility`, `gift`, `collectible`, `articulated`, `organizer`, `personalized`, `other`). Por isso o salvamento falha com "invalid input value for enum product_type_3d".

## Correção
- Em `src/components/admin/ProductForm.tsx`, trocar o valor padrão `"decoracao"` por `"decoration"` (nas duas ocorrências: estado inicial e fallback ao carregar produto existente).
- A lista do seletor já usa as chaves corretas de `PRODUCT_TYPE_LABEL`, então nenhum outro ajuste é necessário.

## Verificação
- Criar um produto novo pelo painel e confirmar que salva sem erro.
