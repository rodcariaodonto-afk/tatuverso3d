Correção: site não carrega produtos (visitantes deslogados) + otimização mobile  
O SITE PRECISA CARREGAR TUDO MESMO PARA QUEM NAO ESTA LOGADO, EXIGIR SE LOGAR APENAS PARA COMPRAS.

## O problema real (confirmado no site publicado)

Não é bug de celular — é bug de **visitante não logado**. No celular quase ninguém está logado, por isso aparece só a Home e as páginas mostram "Vitrine em preparação" / vazias.

Testei o site publicado simulando um iPhone: todas as chamadas ao banco voltam **401 / "permission denied for function is_admin"**. A Home carrega porque o texto dela vem do próprio código; produtos, categorias e catálogo vêm do banco e falham.

Causa: numa alteração recente o acesso público à função `is_admin` foi revogado, mas várias regras de leitura pública (produtos, categorias, banners, blog, embalagens) usam essa função na condição "é público OU é admin". Sem permissão para executá-la, a leitura inteira é bloqueada para quem não está logado.

## Correção (parte 1 — crítica)

1. Reconceder execução da função `is_admin` ao papel anônimo (a função é `SECURITY DEFINER` e para visitantes retorna apenas `false`, sem expor dado nenhum).
2. Revisar as políticas de leitura pública (`products`, `product_variants`, `categories`, `banners`, `blog_posts`, `packaging_options`) para que o caminho público não dependa da checagem de admin — assim o catálogo continua funcionando mesmo se a permissão mudar de novo.
3. Validar com navegador em modo celular e deslogado: Home, /produtos (catálogo), página de produto, carrinho e /personalizados devem carregar produtos de verdade.

## Correção (parte 2 — resiliência)

- Quando a consulta ao banco falhar, mostrar um estado de erro claro com botão "Tentar novamente", em vez da mensagem enganosa "Vitrine em preparação".
- Retry automático das consultas de catálogo (redes móveis instáveis).

## Otimização mobile (UX/UI)

- **Logo 3D na Home**: WebGL pesado em celular. Carregar a versão estática em telas pequenas / conexões lentas / `prefers-reduced-motion`, mantendo o 3D no desktop. Ganho direto de tempo de abertura.
- **Catálogo**: filtros em painel deslizante de tela cheia com botão "Aplicar", contador de filtros ativos e busca fixa no topo.
- **Cards**: alvos de toque mínimos de 44px, preço e botão sempre visíveis, imagens com `loading="lazy"` e proporção fixa (sem "pulo" de layout).
- **Página de produto**: galeria com deslize horizontal, seletor de variação em chips grandes e barra fixa inferior com preço + "Adicionar ao carrinho".
- **Checkout/carrinho**: campos com teclado correto (numérico para CEP/telefone), botões largura total.
- **Header**: menu lateral já corrigido; revisar sobreposição e rolagem travada quando aberto.

## Detalhes técnicos

- Migração SQL: `GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;` e reescrita das políticas `*_public_read` sem `OR is_admin(...)` no caminho anônimo.
- `src/hooks/useProducts.ts`: expor `error` e `retry: 2`.
- `src/routes/index.tsx`, `src/routes/catalogo.tsx`, `src/components/catalog/ProductRail.tsx`: estado de erro separado do estado vazio.
- `src/components/brand/LogoShowcase.tsx`: gate por largura de tela / `navigator.connection` antes de montar o `Logo3D`.
- Validação final por Playwright em viewport 390x844, deslogado, contando cards de produto por página.