# Onda 1 — CAFEX vira TatuVerso3D (identidade visual e experiência pública)

Transformação da marca, do design e da navegação pública, preservando banco, autenticação, carrinho, pedidos e admin. Nenhuma tabela, dado ou migração é tocada.

## Marca e logo

- Upload da logo enviada como asset oficial do projeto, substituindo a logo CAFEX no header desktop/mobile, menu lateral, footer, painel admin, login, cadastro e área do cliente.
- Favicon quadrado gerado a partir da mesma logo (com respiro, sem distorcer).
- `src/lib/tenant-config.ts`: nome "TatuVerso3D", tagline "Um universo de ideias que ganham forma", e-mail contato@tatuverso3d.com.br, descrição institucional, links sociais (Instagram, TikTok); remoção de todos os fallbacks "Café EX"/"Cafezeira"/"Clube do Café".

## Sistema visual

- Novo tema em `src/styles.css` inspirado nas cores da logo (azul cósmico, laranja e magenta sobre fundos claros), substituindo os tokens `--espresso`, `--coffee`, `--cream`, `--gold`, `--farm` e o utilitário `gold-divider` por `--brand-primary`, `--brand-secondary`, `--brand-accent`, `--brand-warm`, `--brand-dark`, `--surface-soft`, `--surface-highlight`.
- Tipografia: título arredondado e marcante + sans-serif limpa (carregadas via `<link>` no root), no lugar da serifa editorial.
- Cards arredondados, sombras suaves, botões de alto contraste; todos os componentes migrados para os novos tokens (nenhuma cor hardcoded).

## Navegação

- Header: Início, Loja, Sensoriais, Decoração e Utilidades, Presentes, Colecionáveis, Personalizados. Ações à direita: busca, conta, favoritos, carrinho. Botão "Personalize o seu" → `/personalizados`.
- Menu mobile refeito, acessível e espelhando o desktop.
- Removidos da navegação: assinatura, private label, produtores, quiz, vender na plataforma (arquivos mantidos como legado, sem links públicos).
- Footer em 4 colunas: marca, Comprar, Atendimento, Institucional + copyright do ano atual.

## Home reconstruída

Hero ("Ideias que ganham forma..."), barra de 4 benefícios, 6 cards de categorias, "Favoritos do TatuVerso" (reutiliza a consulta de destaques atual, com estado vazio elegante), seção sensorial com aviso responsável, seção de personalização, seção sobre a marca, prova social honesta (sem depoimentos inventados) e CTA final.

## Catálogo e cards

- `ProductCard` redesenhado: imagem, nome, preço, preço promocional, badges, favorito, botão de ação e selo "Personalizável".
- Campos de café (pontuação, origem, fazenda, produtor, torra, moagem, notas, método) ocultados da UI pública — colunas permanecem no banco.
- Filtros do catálogo ajustados para categorias TatuVerso3D; filtros de café ocultos.

## Rotas institucionais

Criar `/personalizados`, `/faq`, `/cuidados`, `/envios`, `/trocas`; reescrever `/sobre`, `/contato`, `/privacidade`, `/termos` com o novo conteúdo e visual.

## Painel administrativo

Logo e cores novas; "Cafés" renomeado para "Produtos"; itens Produtores, Candidaturas, Assinaturas e Leads B2B ocultos do menu; nova entrada "Personalizações" (placeholder) e "Categorias"; textos "Café EX" substituídos. Proteções de acesso e permissões intocadas.

## SEO e acessibilidade

Título "TatuVerso3D | Produtos criativos em impressão 3D", meta description nova, Open Graph/Twitter, JSON-LD de loja no root, `head()` próprio por rota, alt texts descritivos. Revisão de contraste, foco de teclado, área de toque, labels, `prefers-reduced-motion` e responsividade.

## Detalhes técnicos

- A página de produto hoje é `/cafe/$slug`. Será criada `/produto/$slug` reutilizando o mesmo componente; `/cafe/$slug` fica como redirect legado para não quebrar links.
- `NEXT_STEPS.md` reescrito e `TATUVERSO3D_PROJECT.md` criado como fonte de verdade; próxima etapa registrada como "Onda 2 — Modelagem de produtos 3D, variações, personalizações, estoque e limpeza segura do esquema legado".
- Validação: build de produção, lint, checagem de TypeScript e revisão visual da home e rotas principais em desktop e mobile via navegador headless.
- Sem migrações, sem alteração de RLS, sem novas dependências além das fontes.

## Fora desta onda

Modelagem de produtos 3D no banco, variações, motor de personalização, estoque e remoção de tabelas/colunas legadas de café.
