## Objetivo
Usar a nova logo `LOGO CAFE EX_PRETO.png` em todos os lugares onde aparece o nome "CAFÉ EX" como texto/marca visual.

## Passos

1. **Subir a logo como asset CDN**
   - `lovable-assets create` a partir de `/mnt/user-uploads/LOGO_CAFE_EX_PRETO.png` → `src/assets/cafe-ex-logo.png.asset.json`
   - Remover o antigo `src/assets/cafe-ex-logo.jpeg` (logo redonda anterior, não usaremos mais).

2. **Header (`src/components/marketing/Header.tsx`)**
   - Trocar o conjunto "círculo + texto CAFÉ EX" pela logo horizontal.
   - Desktop: `<img>` com `h-8 md:h-10 w-auto`, sem o texto ao lado (a logo já contém o nome). Manter o subtítulo "cafés especiais" opcionalmente embaixo.
   - Mobile drawer: mesma logo, `h-7 w-auto`, sem texto duplicado.

3. **Footer (`src/components/marketing/Footer.tsx`)**
   - Substituir o nome textual "CAFÉ EX" pela logo (`h-8 w-auto`), mantendo descrição/colunas existentes.

4. **AdminShell (`src/components/admin/AdminShell.tsx`)**
   - Trocar o `<span>` com `tenantConfig.name` pela logo (`h-7 w-auto`) ao lado do badge "Admin".

5. **Manter como texto** (não trocar por imagem):
   - Títulos de páginas (`<h1>`, headings de hero, copy dentro de parágrafos), `<title>` SEO, meta tags, alt texts, toasts, e referências em prosa (ex.: "Vender na CAFÉ EX"). A logo entra apenas onde hoje há o nome como **marca/branding visual** (header, footer, admin sidebar).

## Observações técnicas
- Import: `import logoAsset from "@/assets/cafe-ex-logo.png.asset.json"` e usar `logoAsset.url`.
- `tenantConfig.logoUrl` continua tendo prioridade (whitelabel via env).
- A logo é preta sobre fundo branco — em áreas escuras (se houver), aplicar `className="... [filter:invert(1)]"` quando necessário. Header/Footer/Admin atuais têm fundo claro, sem ajuste extra.
