# Variações com preços diferentes (ex.: Kit 4 / Kit 8)

## O que está acontecendo hoje

Confirmado no código:

- A página do produto só mostra seletor de variação quando o produto tem **Opções** cadastradas (cor, tamanho, quantidade...). Se você criou variações "soltas" (sem opções), a loja simplesmente usa a primeira variação — por isso aparece só um preço, sem escolha.
- O botão **Gerar combinações** cria variações a partir das Opções. Como no seu produto está "Sem opções cadastradas", ele não gera nada e só mostra um aviso — parece "não funcionar".

## O que vou fazer

1. **Seletor de variação direto na loja**
   Quando o produto tiver variações sem opções vinculadas, a página do produto passa a listar as variações como botões (nome + preço), atualizando preço, estoque, imagem e o item do carrinho conforme a escolha. Nada muda para produtos que já usam opções.

2. **Preço "a partir de"**
   Com múltiplas variações de preços diferentes, a página e os cards mostram "A partir de R$ X" e o preço final ao selecionar.

3. **Admin mais claro nas Variações**
   - Botão "Gerar combinações" desabilitado com dica quando não há opções cadastradas ("Cadastre uma opção com valores para gerar combinações").
   - Atalho "Criar opção rápida" (ex.: opção "Quantidade" com valores "Kit com 4", "Kit com 8"), já com acréscimo de preço por valor, para então gerar as combinações em um clique.
   - Aviso quando existem opções cadastradas mas alguma variação está sem valores vinculados.

4. **Validação ao salvar**
   Bloqueio de salvar variações duplicadas (mesma combinação) e aviso se houver mais de uma variação sem vínculo de opção e sem nome.

## Detalhes técnicos

- `src/routes/produto.$slug.tsx`: novo caminho de seleção quando `product.options.length === 0 && product.variants.length > 1` — estado `selectedVariantId`, preço/estoque derivados da variação e envio de `variant_id` ao carrinho (já suportado por `cart-store` e `validateCart`).
- `src/components/catalog/ProductCard.tsx`: usar `min_price` + flag `fromPrice` já existente também quando as variações não têm opções.
- `src/components/admin/ProductForm.tsx`: estado desabilitado + tooltip no "Gerar combinações", helper "Criar opção rápida" e checagem de duplicidade antes do submit.
- Sem mudanças de banco de dados.
