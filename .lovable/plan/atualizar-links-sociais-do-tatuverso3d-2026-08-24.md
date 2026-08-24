# Atualizar links sociais do TatuVerso3D

## Objetivo
Substituir os links placeholder do Instagram e TikTok em `src/lib/tenant-config.ts` pelos URLs oficiais fornecidos.

## Alterações
- `src/lib/tenant-config.ts`:
  - `instagram`: `https://www.instagram.com/tatuverso3d/`
  - `tiktok`: `https://www.tiktok.com/tatuverso3d/`

## Validação
- Typecheck e build devem continuar passando.
- Verificar se os links aparecem corretamente no footer e em outras referências que usam `tenantConfig`.
