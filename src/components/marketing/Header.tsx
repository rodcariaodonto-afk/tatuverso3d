import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { useCartDrawer } from "@/components/cart/CartDrawer";
import { tenantConfig } from "@/lib/tenant-config";
import logoAsset from "@/assets/tatuverso3d-logo.png.asset.json";

const defaultLogo = logoAsset.url;

export const STORE_NAV = [
  { label: "Início", to: "/" as const, search: undefined },
  { label: "Loja", to: "/catalogo" as const, search: { q: "" } },
  { label: "Sensoriais", to: "/catalogo" as const, search: { q: "sensorial" } },
  { label: "Decoração e Utilidades", to: "/catalogo" as const, search: { q: "decoração" } },
  { label: "Presentes", to: "/catalogo" as const, search: { q: "presente" } },
  { label: "Colecionáveis", to: "/catalogo" as const, search: { q: "colecionável" } },
  { label: "Personalizados", to: "/personalizados" as const, search: undefined },
];

export function Header() {
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const { user } = useAuth();
  const openDrawer = useCartDrawer((s) => s.setOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const logo = tenantConfig.logoUrl ?? defaultLogo;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 md:h-20 md:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 hover:bg-muted xl:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center leading-none" aria-label={`${tenantConfig.name} — página inicial`}>
            <img
              src={logo}
              alt={`Logotipo ${tenantConfig.name}`}
              className="h-10 w-auto md:h-14"
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-semibold xl:flex" aria-label="Navegação principal">
          {STORE_NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={n.search as never}
              className="text-foreground/80 transition hover:text-primary"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: n.to === "/", includeSearch: false }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            to="/personalizados"
            className="hidden whitespace-nowrap rounded-full bg-accent px-5 py-2 text-center text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-105 lg:inline-flex lg:items-center"
          >
            Personalize o seu
          </Link>
          <Link
            to="/catalogo"
            search={{ q: "" } as never}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label="Buscar produtos"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to={user ? "/minha-conta" : "/login"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label={user ? "Minha conta" : "Entrar"}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to={user ? "/minha-conta" : "/login"}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary sm:inline-flex"
            aria-label="Favoritos"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <button
            onClick={() => openDrawer(true)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label="Carrinho"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer (portal: header uses backdrop-blur, which traps fixed children) */}
      {mobileOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] xl:hidden">

          <div
            className="absolute inset-0 bg-brand-dark/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <img src={logo} alt={`Logotipo ${tenantConfig.name}`} className="h-10 w-auto" />
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Fechar menu"
                autoFocus
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              {STORE_NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  search={n.search as never}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-foreground hover:bg-muted"
                >
                  {n.label}
                </Link>
              ))}
              <div className="my-3 border-t border-border" />
              <Link
                to={user ? "/minha-conta" : "/login"}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                {user ? "Minha conta" : "Entrar"}
              </Link>
              <Link
                to="/contato"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                Fale conosco
              </Link>
              <Link
                to="/personalizados"
                onClick={() => setMobileOpen(false)}
                className="mt-3 block rounded-full bg-accent px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-accent-foreground"
              >
                Personalize o seu
              </Link>
            </nav>
          </aside>
        </div>,
        document.body,
      )}

    </header>
  );
}
