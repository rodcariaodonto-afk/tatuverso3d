# Upload de imagens por arrastar e colar

Hoje, na aba **Imagens** do cadastro de produto, só dá para enviar imagem abrindo o seletor de arquivos. Vamos permitir arrastar a imagem para dentro da área e também colar (Ctrl+V) direto da área de transferência.

## O que muda

**Zona de capa**
- Área tracejada grande com a prévia da capa.
- Aceita arrastar-e-soltar de arquivo de imagem.
- Aceita colar (Ctrl+V / Cmd+V) quando a aba Imagens está aberta.
- Continua com o botão "Enviar capa" para quem preferir o seletor.
- Feedback visual quando o arquivo está sobre a área e durante o envio.

**Zona da galeria**
- Mesma área tracejada, aceitando vários arquivos de uma vez (arrastar, colar ou selecionar).
- Cada imagem enviada entra na grade existente, com texto alternativo e remover.

**Regras**
- Só arquivos de imagem (`image/*`); outros tipos são ignorados com aviso.
- Envio em sequência com indicador de progresso simples ("Enviando 2 de 5…").
- Mensagens de erro/sucesso via toast, como já é hoje.

## Detalhes técnicos

- Novo componente `src/components/admin/ImageDropzone.tsx`: encapsula `onDragOver`/`onDragLeave`/`onDrop`, listener de `paste` no documento (ativo apenas quando montado), input de arquivo oculto e estados `isDragging`/`busy`.
- `ProductForm.tsx` passa a usar o dropzone nas duas seções, reaproveitando a função `uploadImage` já existente (bucket `product-images`).
- Sem mudanças de banco, RLS ou lógica de salvamento.
