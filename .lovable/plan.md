# Preço com vírgula no cadastro de produtos

## O problema

Todos os campos de preço do formulário de produto são `<input type="number">` ligados
diretamente a um número. Num teclado/locale pt-BR, ao digitar `19,90` o navegador
considera o valor inválido e devolve texto vazio — o campo volta para `0` e a vírgula
"não entra". Mesmo com ponto, o valor é convertido a número a cada tecla, o que apaga
estados intermediários como `19.` enquanto se digita.

## A solução

Criar um campo de dinheiro reutilizável (`MoneyInput`) que:

- Aceita vírgula **e** ponto como separador decimal (`19,90` = `19.90`).
- Guarda o que foi digitado como texto enquanto o campo está em foco, e só converte
  para número ao sair do campo (ou ao salvar) — nada é apagado no meio da digitação.
- Mostra o valor formatado em pt-BR (`19,90`) quando não está em foco.
- Ignora caracteres inválidos, limita a 2 casas decimais e permite campo vazio
  (para preços opcionais como "preço comparativo" e "preço de custo").
- Usa `inputMode="decimal"` para abrir o teclado numérico no celular.

Substituir por esse campo todos os inputs de preço do formulário de produto:

- Preço e preço comparativo (aba Preço)
- Acréscimo por valor de opção (aba Variações)
- Preço, preço comparativo e preço de custo de cada variação
- Acréscimo por campo de personalização (aba Personalização)

Nada muda no banco nem na lógica de salvamento: continuam sendo enviados números
com ponto decimal.

## Detalhes técnicos

- Novo arquivo `src/components/admin/MoneyInput.tsx`: `type="text"`, `inputMode="decimal"`,
  props `value: number | null`, `onChange: (v: number | null) => void`, `allowEmpty`.
- Estado interno de texto sincronizado com a prop quando o campo perde o foco.
- Parser: troca `,` por `.`, remove tudo que não for dígito/ponto, arredonda em 2 casas.
- Ajustar `src/components/admin/ProductForm.tsx` para usar o componente nos pontos listados.
- Verificar depois se outros formulários admin (cupons, frete) têm o mesmo problema e
  aplicar o mesmo campo, se houver.
