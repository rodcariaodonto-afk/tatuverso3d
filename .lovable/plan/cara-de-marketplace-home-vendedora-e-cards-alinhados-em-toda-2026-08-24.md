# Cara de marketplace: home vendedora e cards alinhados em todas as páginas

Objetivo: o cliente entra e imediatamente vê produtos, preços e ofertas — não um site institucional. Tudo alinhado, mesma grade, mesmo respiro, mesma altura de card.

## 1. Home com estrutura de marketplace

Ordem nova da página inicial, do que mais vende para o que menos vende:

1. **Barra de busca em destaque** no topo do conteúdo, com atalhos de categoria (Sensoriais, Articulados, Decoração, Colecionáveis, Personalizados).
2. **Banner enxuto** (altura menor que hoje) com uma promessa curta e dois botões: Explorar produtos / Personalizar. Sem ocupar a tela inteira.
3. **Tiras de categoria** em cards horizontais compactos, rolagem lateral no celular.
4. **Vitrines de produtos em faixas**, cada uma com título e link "ver todos": Destaques, Novidades, Mais vendidos, Promoções, Personalizáveis. Faixa que não tiver produto simplesmente não aparece.
5. **Faixa de confiança** curta (entrega Brasil, pagamento seguro, feito sob medida, Pix).
6. **Chamada de personalizados** compacta.
7. Rodapé.

Fundo claro no conteúdo; azul cósmico só no topo, no banner e no rodapé. Laranja reservado para preço, promoção e botão de compra.

## 2. Card de produto único e sempre alinhado

Um só componente de card para o site inteiro, com altura de bloco idêntica: imagem quadrada, faixa de selos reservada, nome em 2 linhas, preço com desconto e parcelamento em posição fixa, botão ancorado embaixo. Cards em uma linha têm sempre a mesma altura, com ou sem promoção, com ou sem foto.

Acréscimos que aumentam conversão: percentual de desconto no selo, "em até 12x", indicação de frete grátis quando aplicável, esgotado claramente marcado.

## 3. Grade e alinhamento em todas as páginas públicas

- Grade padrão de produtos: 2 colunas no celular, 3 no tablet, **4 no desktop** (hoje o catálogo usa 3).
- Mesma largura de conteúdo e mesmos espaçamentos verticais em home, catálogo, produto, carrinho, checkout, minha conta, blog, contato e páginas de conteúdo.
- Cabeçalho de página padronizado (título, subtítulo, trilha de navegação).
- Catálogo: filtros em coluna fixa no desktop e em painel deslizante no celular, com ordenação (relevância, menor preço, maior preço, novidades) e chips de filtro ativo.
- Página de produto: bloco de compra fixo ao lado no desktop, com preço, parcelamento, prazo de produção, frete e botão principal sempre visível.
- Carrinho e checkout: mesma coluna de resumo, mesmos botões, mesma tipografia.

## 4. Estados vazios e primeira impressão

Hoje a home busca destaques e volta vazia, o que deixa a página com cara de site em construção. Vou tratar os estados: quando não houver produto cadastrado, as vitrines mostram um bloco convidando à navegação em vez de espaço em branco, e o admin vê um aviso de "cadastre seus primeiros produtos". Nada de produto fictício no banco.

## 5. Verificação

Revisão no navegador em 375, 768, 1024 e 1440 px, na home, catálogo, produto, carrinho e checkout, com prints. Confiro alturas de card iguais, nada cortado, botões alcançáveis com o polegar no celular.

## Detalhes técnicos

- `src/components/catalog/ProductCard.tsx` continua sendo o card base; ajustes de selos, parcelamento e altura reservada. Remoção de variações divergentes nas telas.
- Novos componentes de apresentação: faixa de vitrine com carrossel, cabeçalho de página, grade de produtos padrão, estado vazio.
- Home reescrita em `src/routes/index.tsx`; catálogo ajustado para 4 colunas e filtros mobile; demais rotas públicas recebem o cabeçalho e o espaçamento padrão.
- Somente frontend: nenhuma mudança de banco, RLS, checkout ou pagamentos.
- Tokens existentes em `src/styles.css` mantidos; se faltar algum token de superfície/preço, ele é adicionado lá, sem cor fixa em componente.
