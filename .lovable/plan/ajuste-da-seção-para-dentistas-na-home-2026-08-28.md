# Ajuste da seção "Para Dentistas" na Home

## Problema
A imagem enviada já tem texto embutido ("TRANSFORMAMOS SUAS IDEIAS EM 3D") na metade esquerda. No layout atual ela fica presa na coluna direita com `object-cover`, o que corta metade da imagem. Além disso, o painel de texto que criei ao lado duplica a mensagem e tem hífens/travessão no meio da frase.

## Solução
Transformar a seção em um **banner de largura total usando a imagem inteira, sem corte**, removendo o painel de texto duplicado:

1. **Remover o painel de texto à esquerda** (eyebrow, título e parágrafo com hífens) — a imagem já comunica a mensagem.
2. **Exibir a imagem completa** (proporção original ~16:9, 1672×941) ocupando toda a largura do container, dentro de um card arredondado (`rounded-3xl`) com sombra, sem `object-cover` que corta — usar a proporção natural da imagem.
3. **Sobrepor o botão "Pedir meu orçamento"** (laranja, pill, com seta) no canto inferior esquerdo do banner, com leve gradiente escuro na base para garantir contraste do botão sobre a imagem.
4. **Manter o rastreamento de analytics** (`data-track="home-dentistas:orcamento"`) e o link para `/personalizados`.
5. Mobile: imagem inteira visível, botão abaixo da imagem ou sobreposto com gradiente — o que ficar mais legível; validar com screenshot.

## Arquivos
- `src/routes/index.tsx` — apenas a seção "SPOTLIGHT PARA DENTISTAS" (linhas ~169–203). Nada mais muda.

## Validação
- Build + screenshot desktop e mobile confirmando imagem sem corte e botão visível.
