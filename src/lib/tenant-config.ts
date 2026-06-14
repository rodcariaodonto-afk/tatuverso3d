/**
 * Configuração whitelabel do tenant.
 * Todas as referências de marca e identidade visual devem usar estas variáveis
 * em vez de strings hardcoded.
 *
 * Configure via variáveis de ambiente VITE_* no arquivo .env (ver .env.example).
 */
export const tenantConfig = {
  name: import.meta.env.VITE_TENANT_NAME ?? "Café EX",
  tagline:
    import.meta.env.VITE_STORE_TAGLINE ??
    "Cafés especiais com origem e curadoria",
  logoUrl: (import.meta.env.VITE_LOGO_URL as string | undefined) ?? null,
  primaryColor: (import.meta.env.VITE_PRIMARY_COLOR as string | undefined) ?? null,
  storeUrl: import.meta.env.VITE_STORE_URL ?? "",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "contato@cafezeira.com",
  instagram: (import.meta.env.VITE_INSTAGRAM as string | undefined) ?? null,
  clubeName: import.meta.env.VITE_CLUB_NAME ?? "Clube do Café",
};

/** Aplica a cor primária do tenant como variável CSS no documento. */
export function applyTenantTheme() {
  if (typeof document === "undefined") return;
  if (tenantConfig.primaryColor) {
    document.documentElement.style.setProperty("--primary", tenantConfig.primaryColor);
  }
}

/** Helper para título de página padronizado. */
export function pageTitle(page: string) {
  return `${page} — ${tenantConfig.name}`;
}
