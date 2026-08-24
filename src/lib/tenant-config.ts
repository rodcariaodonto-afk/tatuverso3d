/**
 * Configuração whitelabel do tenant (TatuVerso3D).
 * Todas as referências de marca devem usar estas variáveis
 * em vez de strings hardcoded.
 */
export const tenantConfig = {
  name: import.meta.env.VITE_TENANT_NAME ?? "TatuVerso3D",
  tagline:
    import.meta.env.VITE_STORE_TAGLINE ??
    "Um universo de ideias que ganham forma",
  description:
    "A TatuVerso3D transforma criatividade em produtos únicos por meio da impressão 3D. Criamos itens sensoriais, decoração, utilidades, presentes, colecionáveis e produtos personalizados, combinando tecnologia, cuidado e imaginação.",
  seoTitle: "TatuVerso3D | Produtos criativos em impressão 3D",
  seoDescription:
    "Produtos sensoriais, decoração, utilidades, presentes, colecionáveis e itens personalizados feitos em impressão 3D.",
  logoUrl: (import.meta.env.VITE_LOGO_URL as string | undefined) ?? null,
  primaryColor: (import.meta.env.VITE_PRIMARY_COLOR as string | undefined) ?? null,
  storeUrl: import.meta.env.VITE_STORE_URL ?? "",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "contato@tatuverso3d.com.br",
  instagram:
    (import.meta.env.VITE_INSTAGRAM as string | undefined) ??
    "https://www.instagram.com/tatuverso3d/",
  tiktok:
    (import.meta.env.VITE_TIKTOK as string | undefined) ??
    "https://www.tiktok.com/tatuverso3d/",
};

/** Aplica a cor primária do tenant como variável CSS no documento. */
export function applyTenantTheme() {
  if (typeof document === "undefined") return;
  if (tenantConfig.primaryColor) {
    document.documentElement.style.setProperty("--brand-primary", tenantConfig.primaryColor);
    document.documentElement.style.setProperty("--primary", tenantConfig.primaryColor);
  }
}

/** Helper para título de página padronizado. */
export function pageTitle(page: string) {
  return `${page} — ${tenantConfig.name}`;
}
