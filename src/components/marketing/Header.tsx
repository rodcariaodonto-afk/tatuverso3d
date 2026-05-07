import { Link } from "@tanstack/react-router";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-primary">CAFEZEIRA</span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            cafés especiais
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link to="/catalogo" className="text-foreground/80 transition hover:text-primary">Catálogo</Link>
          <Link to="/assinatura" className="text-foreground/80 transition hover:text-primary">Assinatura</Link>
          <Link to="/produtores" className="text-foreground/80 transition hover:text-primary">Produtores</Link>
          <Link to="/quiz" className="text-foreground/80 transition hover:text-primary">Quiz Sensorial</Link>
          <Link to="/blog" className="text-foreground/80 transition hover:text-primary">Blog</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/vender-na-plataforma"
            className="hidden rounded-full border border-accent/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-accent hover:text-accent-foreground lg:inline-block"
          >
            Vender na Cafezeira
          </Link>
          <Link
            to={user ? "/minha-conta" : "/login"}
            className="rounded-full p-2 text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label={user ? "Minha conta" : "Entrar"}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/carrinho"
            className="relative rounded-full p-2 text-foreground/70 hover:bg-muted hover:text-primary"
            aria-label="Carrinho"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[var(--espresso)]">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
