import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { useCartDrawer } from "@/components/cart/CartDrawer";

const NAV = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/assinatura", label: "Assinatura" },
  { to: "/private-label", label: "Café com sua marca" },
  { to: "/produtores", label: "Produtores" },
  { to: "/quiz", label: "Quiz" },
] as const;

export function Header() {
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const { user } = useAuth();
  const openDrawer = useCartDrawer((s) => s.setOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:bg-muted md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-primary md:text-2xl">CAFEZEIRA</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
              cafés especiais
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-foreground/80 transition hover:text-primary">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            to="/vender-na-plataforma"
            className="hidden whitespace-nowrap rounded-full border border-accent/60 px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-accent hover:text-accent-foreground lg:inline-flex lg:items-center"
          >
            Vender na Cafezeira
          </Link>
          <Link
            to={user ? "/minha-conta" : "/login"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label={user ? "Minha conta" : "Entrar"}
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            onClick={() => openDrawer(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label="Carrinho"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[var(--espresso)]">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-background shadow-2xl animate-in slide-in-from-left">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-display text-xl font-bold text-primary">CAFEZEIRA</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {n.label}
                </Link>
              ))}
              <div className="my-3 border-t border-border" />
              <Link
                to={user ? "/minha-conta" : "/login"}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                {user ? "Minha conta" : "Entrar"}
              </Link>
              <Link
                to="/vender-na-plataforma"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                Vender na Cafezeira
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
