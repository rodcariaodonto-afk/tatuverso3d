# Inverter ordem dos banners na Home

## Contexto
Na Home (`src/routes/index.tsx`), a ordem atual das seções é:

1. SPOTLIGHT PARA DENTISTAS (linhas 169–193)
2. BANNER DE CRIAÇÃO PERSONALIZADA / "Sob encomenda" (linhas 195–243)

## Mudança
Inverter a ordem para:

1. BANNER "Sob encomenda" primeiro
2. SPOTLIGHT PARA DENTISTAS abaixo dele

Isso é uma troca de posição dos dois blocos `<section>`, sem alterar o conteúdo de cada um.

## Implementação
- Em `src/routes/index.tsx`, mover o bloco do banner "Sob encomenda" (linhas 195–243) para antes do bloco do banner "Para Dentistas" (linhas 169–193).
- Resultado final: Sob encomenda → Dentistas.
