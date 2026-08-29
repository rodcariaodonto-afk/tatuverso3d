# Renomear "Loja" para "Produtos"

Trocar o rótulo do menu de navegação para "Produtos", mantendo o mesmo link (`/catalogo`).

## O que muda

- Menu principal (topo do site): "Loja" vira "Produtos".
- Rodapé: link "Loja" vira "Produtos" (consistência).
- Página do catálogo: o pequeno rótulo acima do título ("Loja") vira "Produtos".

## Detalhes técnicos

- `src/components/marketing/Header.tsx` linha 16: label do item de nav.
- `src/components/marketing/Footer.tsx` linha 34: texto do link.
- `src/routes/catalogo.tsx` linha 309: eyebrow.

Títulos SEO e metadados permanecem como estão (a palavra "Loja" ali ajuda na busca). Nenhuma rota ou lógica é alterada.
